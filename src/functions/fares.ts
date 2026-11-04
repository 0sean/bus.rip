import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cacheControl } from "@/middleware/cache-control";
import { rateLimit } from "@/middleware/rate-limit";
import { operatorCode } from "./validation";
import {
  fareGroupKey,
  groupFares,
  zonePrices,
  type FareEntity,
  type FareDocument,
  type NetexNode,
  type FareCatalogue,
} from "@/lib/fares";

class DatasetChanged extends Error {
  constructor() {
    super("Fares have changed. Refresh to load the latest fares.");
  }
}
async function request(path: string, allowMissing = false) {
  if (process.env.BUSLANE_ENABLED === "0")
    throw new Error("Fares data is temporarily unavailable");
  const response = await fetch(
    `${process.env.BUSLANE_BASE_URL || "http://localhost:3000"}/api/fares/${path}`,
    {
      headers: { Authorization: `Bearer ${process.env.BUSLANE_API_KEY}` },
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (response.status === 409) throw new DatasetChanged();
  if (response.status === 404 && allowMissing) return response;
  if (!response.ok) throw new Error("Fares data is temporarily unavailable");
  return response;
}
// Each catalogue/detail is one generation, including independent pages and documents.
function snapshot(expectedGeneration?: string | null) {
  let generation: string | null | undefined = expectedGeneration;
  const read = async (path: string, allowMissing = false) => {
    const response = await request(path, allowMissing);
    const current = response.headers.get("x-fares-generation");
    if (generation !== undefined && current !== generation)
      throw new DatasetChanged();
    generation = current;
    return response;
  };
  const all = async (
    filters: Record<string, string>,
    project: (entity: FareEntity) => FareEntity = (entity) => entity,
  ) => {
    const params = new URLSearchParams({ ...filters, limit: "1000" });
    const entities: FareEntity[] = [];
    const seen = new Set<string>();
    let cursor: string | null;
    do {
      const response = await read(`entities?${params}`);
      const items = (await response.json()) as FareEntity[];
      if (!Array.isArray(items))
        throw new Error("Fares data is temporarily unavailable");
      entities.push(...items.map(project));
      cursor = response.headers.get("x-next-cursor");
      if (cursor) {
        if (seen.has(cursor))
          throw new Error("Fares data is temporarily unavailable");
        seen.add(cursor);
        params.set("cursor", cursor);
      }
    } while (cursor);
    return entities;
  };
  return {
    read,
    all,
    get generation() {
      return generation;
    },
  };
}
async function mapConcurrent<T, R>(
  items: T[],
  task: (item: T) => Promise<R>,
  concurrency = 4,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await task(items[index]);
      }
    }),
  );
  return results;
}
function lines(document: FareDocument, noc: string) {
  const operators = new Set(
    document.links
      .filter((l) => l.kind === "operator" && l.code === noc)
      .map((l) => l.ref),
  );
  return [
    ...new Set(
      document.links
        .filter(
          (l) =>
            l.kind === "line" && (!l.qualifier || operators.has(l.qualifier)),
        )
        .map((l) => l.code),
    ),
  ];
}
// Send only the nodes used for catalogue identity, stop membership, and outlines.
// Price matrices stay on the server until a route/publication is selected.
function compact(entity: FareEntity): FareEntity {
  const keep = new Set([
    "TypeOfFareProductRef",
    "Description",
    "ScheduledStopPointRef",
    "StopPlaceRef",
    "Polygon",
    "MultiSurface",
  ]);
  const children: NetexNode[] = [];
  function visit(node: NetexNode) {
    if (keep.has(node.name)) {
      children.push(
        node.name.endsWith("PointRef") || node.name === "StopPlaceRef"
          ? {
              name: node.name,
              attributes: { ref: node.attributes.ref },
              children: [],
            }
          : node,
      );
      return;
    }
    for (const child of node.children)
      if (typeof child !== "string") visit(child);
  }
  for (const child of entity.data.children)
    if (typeof child !== "string") visit(child);
  return { ...entity, data: { ...entity.data, children } };
}
function catalogueIndex(
  entities: FareEntity[],
  pendingDocumentIds?: number[],
): FareCatalogue {
  const project = (group: ReturnType<typeof groupFares>[number]) => ({
    ...group,
    members: [group.members[0]],
  });
  return {
    zones: groupFares(entities.filter((e) => e.category === "zone")).map(
      project,
    ),
    tickets: groupFares(entities.filter((e) => e.category === "product")).map(
      project,
    ),
    ...(pendingDocumentIds ? { pendingDocumentIds } : {}),
  };
}
const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const getFares = createServerFn({ method: "GET" })
  .middleware([cacheControl(3600), rateLimit("fares")])
  .validator(z.object({ noc: operatorCode }))
  .handler(async ({ data: { noc } }) => {
    const api = snapshot();
    const [zones, products] = await Promise.all([
      api.all({ noc, category: "zone" }, compact),
      api.all({ noc, category: "product" }, compact),
    ]);
    const entities = [...zones, ...products];
    const ids = [...new Set(entities.map((e) => e.document_id))];
    // Large catalogues need several bounded RPCs, rather than exceeding a
    // worker's subrequest budget while fetching every publication in one call.
    if (ids.length > 250) {
      return Response.json({
        ...catalogueIndex(entities, ids),
        generation: api.generation,
      });
    }
    const documents = new Map(
      await mapConcurrent(ids, async (id) => {
        const document = (await (
          await api.read(`documents/${id}`)
        ).json()) as FareDocument;
        return [id, document] as const;
      }),
    );
    const summaries = entities.map((entity) => {
      const document = documents.get(entity.document_id)!;
      return {
        ...compact(entity),
        publication: {
          lines: lines(document, noc),
          published: document.publication_timestamp,
        },
      };
    });
    // Plain JSON avoids the RPC object-graph expansion and its 32 MB limit.
    return Response.json(catalogueIndex(summaries));
  });
export const getFarePublications = createServerFn({ method: "GET" })
  .middleware([cacheControl(3600), rateLimit("fare-publications")])
  .validator(
    z.object({
      noc: operatorCode,
      ids: z.array(id).min(1).max(250),
      generation: z.string().max(128).nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const api = snapshot(data.generation);
    const publications = await mapConcurrent(
      [...new Set(data.ids)],
      async (id) => {
        const document = (await (
          await api.read(`documents/${id}`)
        ).json()) as FareDocument;
        if (
          !document.links.some(
            (link) =>
              link.kind === "operator" &&
              link.code === data.noc &&
              !link.ref.startsWith("uic:"),
          )
        )
          throw new Error("Fare publication does not belong to this operator");
        return {
          id: document.id,
          lines: lines(document, data.noc),
          published: document.publication_timestamp,
        };
      },
      8,
    );
    return Response.json(publications);
  });
export const getFareDetail = createServerFn({ method: "GET" })
  .middleware([cacheControl(3600), rateLimit("fare-detail")])
  .validator(z.object({ noc: operatorCode, id, documentId: id.optional() }))
  .handler(async ({ data }) => {
    const api = snapshot();
    const response = await api.read(`entities/${data.id}`, true);
    if (response.status === 404) return Response.json(null);
    const original = (await response.json()) as FareEntity;
    if (!["zone", "product"].includes(original.category))
      return Response.json(null);
    // Membership in the operator's complete catalogue authorises this ID.
    const candidates = await api.all(
      {
        noc: data.noc,
        category: original.category,
      },
      compact,
    );
    if (!candidates.some((e) => e.id === original.id))
      return Response.json(null);
    const key = fareGroupKey(original);
    const members = candidates.filter((e) => fareGroupKey(e) === key);
    const ids = [...new Set(members.map((e) => e.document_id))];
    const documents = await mapConcurrent(
      ids,
      async (id) =>
        (await (await api.read(`documents/${id}`)).json()) as FareDocument,
    );
    // Several files can publish parts of the same route's fare table.
    // Keep dated editions separate, but combine those files for journey lookup.
    const variantGroups = new Map<
      string,
      {
        documentId: number;
        documentIds: number[];
        lines: string[];
        published: string | null;
      }
    >();
    for (const document of documents) {
      const routeLines = lines(document, data.noc).sort((a, b) =>
        a.localeCompare(b, "en", { numeric: true }),
      );
      const key = JSON.stringify([routeLines, document.publication_timestamp]);
      const group = variantGroups.get(key);
      if (group) group.documentIds.push(document.id);
      else
        variantGroups.set(key, {
          documentId: document.id,
          documentIds: [document.id],
          lines: routeLines,
          published: document.publication_timestamp,
        });
    }
    const variants = [...variantGroups.values()].sort(
      (a, b) =>
        (b.published ?? "").localeCompare(a.published ?? "") ||
        a.lines
          .join(",")
          .localeCompare(b.lines.join(","), "en", { numeric: true }),
    );
    const variant = data.documentId
      ? variants.find((v) => v.documentIds.includes(data.documentId!))
      : variants[0];
    if (!variant) return Response.json(null);
    const document = documents.find((d) => d.id === variant.documentId)!;
    const selected = members.filter((e) =>
      variant.documentIds.includes(e.document_id),
    );
    const entity = selected[0];
    const results = await mapConcurrent(
      variant.documentIds,
      async (documentId) => {
        const products = [
          ...new Set(
            selected
              .filter((e) => e.document_id === documentId)
              .map((e) => e.ref),
          ),
        ];
        const filters = { noc: data.noc, document_id: String(documentId) };
        const [prices, labels] = await Promise.all([
          entity.category === "zone"
            ? api.all({ ...filters, category: "price" })
            : mapConcurrent(products, (ref) =>
                api.all({ ...filters, category: "price", product_ref: ref }),
              ).then((groups) => groups.flat()),
          Promise.all(
            ["zone", "product", "profile", "offer"].map((category) =>
              api.all({ ...filters, category }),
            ),
          ).then((groups) => groups.flat()),
        ]);
        return { prices, labels };
      },
    );
    const pricePages = results.flatMap((result) => result.prices);
    const prices = [
      ...new Map(pricePages.map((price) => [price.id, price])).values(),
    ];
    return Response.json({
      entity,
      document,
      variants,
      prices:
        entity.category === "zone"
          ? prices.filter((price) =>
              selected.some((zone) => zonePrices(zone, [price]).length),
            )
          : prices,
      labels: results.flatMap((result) => result.labels),
    });
  });
