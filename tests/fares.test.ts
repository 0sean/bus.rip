import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fareAmounts,
  money,
  stopCodes,
  zonePrices,
  groupFares,
  type FareEntity,
  type FareCatalogue,
} from "../src/lib/fares";
import { fareZoneFeatures, publishedPolygons } from "../src/lib/fare-map";
import type { Stop } from "../src/lib/buslane";
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      validator: () => builder,
      handler: (handler: unknown) => handler,
    };
    return builder;
  },
}));
vi.mock("../src/middleware/cache-control", () => ({ cacheControl: vi.fn() }));
vi.mock("../src/middleware/rate-limit", () => ({ rateLimit: vi.fn() }));
import {
  getFares,
  getFareDetail,
  getFarePublications,
} from "../src/functions/fares";
const entity = (overrides: Partial<FareEntity> = {}): FareEntity => ({
  id: 1,
  document_id: 10,
  category: "zone",
  kind: "FareZone",
  ref: "zone:A",
  version: "1",
  name: "Town",
  amount: null,
  currency: "GBP",
  product_ref: null,
  profile_ref: null,
  package_ref: null,
  start_ref: null,
  end_ref: null,
  data: { name: "FareZone", attributes: {}, children: [] },
  ...overrides,
});
const product = (overrides: Partial<FareEntity> = {}) =>
  entity({
    category: "product",
    kind: "PreassignedFareProduct",
    name: "Adult single",
    ref: "ticket",
    ...overrides,
  });
const zone = (id: number, stops: string[]) =>
  entity({
    id,
    data: {
      name: "FareZone",
      attributes: {},
      children: stops.map((ref) => ({
        name: "ScheduledStopPointRef",
        attributes: { ref: "atco:" + ref },
        children: [],
      })),
    },
  });
const document = (id = 10, route = "14") => ({
  id,
  publication_timestamp: "2026-11-01",
  links: [
    { kind: "operator", code: "TEST", ref: "noc:TEST" },
    { kind: "line", code: route, ref: route, qualifier: "noc:TEST" },
  ],
});
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("BUSLANE_ENABLED", "1");
  vi.stubEnv("BUSLANE_BASE_URL", "https://buslane.test");
  fetchMock.mockReset();
});
const response = (body: unknown, generation = "1", status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "x-fares-generation": generation, ...extra },
  });
const listResponse = getFares as unknown as (arg: {
  data: { noc: string };
}) => Promise<Response>;
const list = async (
  arg: Parameters<typeof listResponse>[0],
): Promise<FareCatalogue> => (await listResponse(arg)).json();
const detailResponse = getFareDetail as unknown as (arg: {
  data: { noc: string; id: number; documentId?: number };
}) => Promise<Response>;
const detail = async (
  arg: Parameters<typeof detailResponse>[0],
): Promise<unknown> => (await detailResponse(arg)).json();
const publicationsResponse = getFarePublications as unknown as (arg: {
  data: { noc: string; ids: number[]; generation: string | null };
}) => Promise<Response>;
describe("published fares", () => {
  it("keeps document-scoped zone associations, both directions, and every price version", () => {
    const price = entity({
      category: "price",
      matrices: [{ start_ref: "zone:B", end_ref: "zone:A", version: "1" }],
      referenced_prices: [
        { amount: "2.00", currency: "GBP", version: "1" },
        { amount: "2.50", currency: "GBP", version: "2" },
      ],
    });
    expect(
      zonePrices(entity(), [
        price,
        entity({ ...price, document_id: 11 }),
        entity({ category: "price", start_ref: "other" }),
      ]),
    ).toEqual([price]);
    expect(fareAmounts(price).map((p) => money(p.amount, p.currency))).toEqual([
      "£2.00",
      "£2.50",
    ]);
    expect(fareAmounts(entity({ amount: "0.00" }))).toEqual([
      { amount: "0.00", currency: "GBP" },
    ]);
    expect(money("2.00", null)).toContain("currency not supplied");
  });
  it("groups route-specific copies of a ticket without collapsing different ticket types", () => {
    const grouped = groupFares([
      product(),
      product({
        id: 2,
        document_id: 20,
        name: " Adult  Single ",
        publication: { lines: ["3"], published: null },
      }),
      product({ id: 3, name: "Child single" }),
      product({ id: 4, name: "Single Ticket - Adult" }),
    ]);
    expect(grouped).toHaveLength(2);
    expect(grouped[0].members.map((e) => e.id)).toEqual([1, 2, 4]);
    expect(grouped[0].lines).toEqual(["3"]);
  });
  it("groups zones only when their published stop membership matches", () => {
    expect(stopCodes(zone(1, ["A", "B", "A"]))).toEqual(["A", "B"]);
    expect(
      groupFares([
        zone(1, ["A", "B"]),
        zone(2, ["B", "A"]),
        zone(3, ["C"]),
      ]).map((g) => g.members.length),
    ).toEqual([2, 1]);
  });
  it("loads all catalogue pages before returning, with no price-matrix requests", async () => {
    fetchMock.mockImplementation(async (input: string) => {
      const url = new URL(input);
      if (url.pathname.includes("/documents/"))
        return response(
          document(
            Number(url.pathname.split("/").at(-1)),
            url.pathname.endsWith("20") ? "3" : "14",
          ),
        );
      expect(url.searchParams.get("noc")).toBe("TEST");
      if (url.searchParams.get("category") === "zone")
        return url.searchParams.has("cursor")
          ? response([zone(2, ["LAST"])])
          : response([zone(1, ["FIRST"])], "1", 200, {
              "x-next-cursor": "opaque+cursor",
            });
      expect(url.searchParams.get("category")).toBe("product");
      return response([
        product({ id: 3 }),
        product({ id: 4, document_id: 20 }),
      ]);
    });
    const result = await list({ data: { noc: "TEST" } });
    expect(result.zones).toHaveLength(2);
    expect(result.zones.flatMap((g) => g.stops)).toContain("LAST");
    expect(result.tickets).toHaveLength(1);
    expect(result.tickets[0].lines).toEqual(["3", "14"]);
    expect(
      fetchMock.mock.calls.some(
        ([input]) =>
          new URL(input).searchParams.get("cursor") === "opaque+cursor",
      ),
    ).toBe(true);
  });
  it("returns a large complete catalogue as plain JSON instead of an RPC object graph", async () => {
    const zones = Array.from({ length: 3000 }, (_, index) =>
      zone(index + 1, [`STOP${index}`]),
    );
    fetchMock.mockImplementation(async (input: string) => {
      const url = new URL(input);
      if (url.pathname.includes("/documents/")) return response(document());
      if (url.searchParams.get("category") === "product") return response([]);
      const offset = Number(url.searchParams.get("cursor") || "0");
      return response(
        zones.slice(offset, offset + 1000),
        "1",
        200,
        offset + 1000 < zones.length
          ? { "x-next-cursor": String(offset + 1000) }
          : {},
      );
    });
    const result = await listResponse({ data: { noc: "TEST" } });
    expect(result).toBeInstanceOf(Response);
    expect(result.headers.get("content-type")).toContain("application/json");
    const catalogue = await result.json();
    expect(catalogue.zones).toHaveLength(3000);
    expect(
      catalogue.zones.flatMap(
        (group: FareCatalogue["zones"][number]) => group.stops,
      ),
    ).toContain("STOP2999");
  });
  it("keeps a large operator within the subrequest budget and sends only one geometry copy per group", async () => {
    const products = Array.from({ length: 1054 }, (_, i) =>
      product({ id: i + 1, document_id: i + 1 }),
    );
    fetchMock.mockImplementation(async (input: string) => {
      const url = new URL(input);
      expect(url.pathname).toBe("/api/fares/entities");
      if (url.searchParams.get("category") === "zone") return response([]);
      return url.searchParams.has("cursor")
        ? response(products.slice(1000))
        : response(products.slice(0, 1000), "1", 200, {
            "x-next-cursor": "next",
          });
    });
    const result = await list({ data: { noc: "TEST" } });
    expect(result.pendingDocumentIds).toHaveLength(1054);
    expect(result.generation).toBe("1");
    expect(result.tickets).toHaveLength(1);
    expect(result.tickets[0].documentIds).toHaveLength(1054);
    expect(result.tickets[0].members).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it("returns compact publication metadata and rejects generation changes across catalogue batches", async () => {
    fetchMock.mockResolvedValueOnce(response(document()));
    const result = await publicationsResponse({
      data: { noc: "TEST", ids: [10], generation: "1" },
    });
    expect(await result.json()).toEqual([
      { id: 10, lines: ["14"], published: "2026-11-01" },
    ]);
    fetchMock.mockResolvedValueOnce(response(document(), "2"));
    await expect(
      publicationsResponse({
        data: { noc: "TEST", ids: [10], generation: "1" },
      }),
    ).rejects.toThrow("Fares have changed");
  });
  it("rejects an incomplete catalogue when a later page fails", async () => {
    fetchMock.mockImplementation(async (input: string) => {
      const url = new URL(input);
      if (url.searchParams.get("category") === "product") return response([]);
      return url.searchParams.has("cursor")
        ? response({}, "1", 503)
        : response([zone(1, ["A"])], "1", 200, { "x-next-cursor": "next" });
    });
    await expect(list({ data: { noc: "TEST" } })).rejects.toThrow(
      "temporarily unavailable",
    );
  });
  it("rejects details belonging to another operator before fetching any prices", async () => {
    fetchMock
      .mockResolvedValueOnce(response(product()))
      .mockResolvedValueOnce(response([]));
    expect(await detail({ data: { noc: "TEST", id: 1 } })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("returns not found for unknown IDs", async () => {
    fetchMock.mockResolvedValueOnce(response({}, "1", 404));
    expect(await detail({ data: { noc: "TEST", id: 999 } })).toBeNull();
  });
  it("rejects a dataset change between independent requests", async () => {
    fetchMock
      .mockResolvedValueOnce(response(product(), "1"))
      .mockResolvedValueOnce(response([product()], "2"));
    await expect(detail({ data: { noc: "TEST", id: 1 } })).rejects.toThrow(
      "Fares have changed",
    );
  });
  it("finds grouped route variants but reads prices only for the chosen route, across every price page", async () => {
    fetchMock.mockImplementation(async (input: string) => {
      const url = new URL(input);
      if (url.pathname.endsWith("/entities/1")) return response(product());
      if (url.pathname.includes("/documents/")) {
        const id = Number(url.pathname.split("/").at(-1));
        return response(document(id, id === 10 ? "14" : "3"));
      }
      if (!url.searchParams.has("document_id"))
        return response([product(), product({ id: 2, document_id: 20 })]);
      expect(url.searchParams.get("document_id")).toBe("20");
      if (url.searchParams.get("category") === "price") {
        expect(url.searchParams.get("product_ref")).toBe("ticket");
        return url.searchParams.has("cursor")
          ? response([entity({ id: 4, document_id: 20 })])
          : response([entity({ id: 3, document_id: 20 })], "1", 200, {
              "x-next-cursor": "page2",
            });
      }
      return response([]);
    });
    expect(
      await detail({ data: { noc: "TEST", id: 1, documentId: 20 } }),
    ).toMatchObject({
      document: { id: 20 },
      variants: [
        { documentId: 20, lines: ["3"] },
        { documentId: 10, lines: ["14"] },
      ],
      prices: [
        { id: 3, document_id: 20 },
        { id: 4, document_id: 20 },
      ],
    });
  });
  it("combines files for the same route and dated edition without joining references across documents", async () => {
    fetchMock.mockImplementation(async (input: string) => {
      const url = new URL(input);
      if (url.pathname.endsWith("/entities/1")) return response(product());
      if (url.pathname.includes("/documents/"))
        return response(document(Number(url.pathname.split("/").at(-1)), "14"));
      if (!url.searchParams.has("document_id"))
        return response([product(), product({ id: 2, document_id: 20 })]);
      const documentId = Number(url.searchParams.get("document_id"));
      if (url.searchParams.get("category") === "price")
        return response([
          entity({
            id: documentId + 100,
            document_id: documentId,
            amount: documentId === 10 ? "2.00" : "3.00",
          }),
        ]);
      return response([
        entity({
          id: documentId + 200,
          document_id: documentId,
          ref: "same-ref",
          name: documentId === 10 ? "First name" : "Second name",
        }),
      ]);
    });
    expect(await detail({ data: { noc: "TEST", id: 1 } })).toMatchObject({
      variants: [{ documentId: 10, documentIds: [10, 20], lines: ["14"] }],
      prices: [
        { document_id: 10, amount: "2.00" },
        { document_id: 20, amount: "3.00" },
      ],
      labels: expect.arrayContaining([
        expect.objectContaining({ document_id: 10, name: "First name" }),
        expect.objectContaining({ document_id: 20, name: "Second name" }),
      ]),
    });
  });
  it("does not allow selecting a publication outside the ticket group", async () => {
    fetchMock.mockImplementation(async (input: string) => {
      const url = new URL(input);
      if (url.pathname.endsWith("/entities/1")) return response(product());
      if (url.pathname.includes("/documents/")) return response(document());
      return response([product()]);
    });
    expect(
      await detail({ data: { noc: "TEST", id: 1, documentId: 999 } }),
    ).toBeNull();
  });
});
describe("zone coverage geometry", () => {
  const stop = (id: string, lon: number, lat: number) =>
    ({ id, lon: String(lon), lat: String(lat) }) as Stop;
  it("draws separate coloured approximate coverage and labels for each zone, preserving sparse zones", () => {
    const features = fareZoneFeatures(
      groupFares([
        zone(1, ["A", "B", "C"]),
        { ...zone(2, ["D"]), name: "Other" },
      ]),
      [
        stop("A", -1, 51),
        stop("B", -1.1, 51),
        stop("C", -1.1, 51.1),
        stop("D", 0, 52),
      ],
    );
    expect(features.areas.features).toHaveLength(1);
    expect(features.areas.features[0].properties?.approximate).toBe(true);
    expect(features.points.features).toHaveLength(4);
    expect(features.labels.features).toHaveLength(2);
    expect(features.labels.features[0].properties?.color).not.toBe(
      features.labels.features[1].properties?.color,
    );
  });
  it("uses published GML outlines in their stated coordinate system", () => {
    const polygon = {
      name: "Polygon",
      attributes: { srsName: "urn:ogc:def:crs:EPSG::4326" },
      children: [
        {
          name: "LinearRing",
          attributes: {},
          children: [
            {
              name: "posList",
              attributes: {},
              children: ["51 -1 51 -2 52 -2 51 -1"],
            },
          ],
        },
      ],
    };
    expect(publishedPolygons(polygon)).toEqual([
      [
        [
          [-1, 51],
          [-2, 51],
          [-2, 52],
          [-1, 51],
        ],
      ],
    ]);
    expect(
      publishedPolygons({ ...polygon, attributes: { srsName: "unknown" } }),
    ).toEqual([]);
  });
  it("does not create polygons from collinear stops or invalid coordinates", () => {
    const features = fareZoneFeatures(
      groupFares([zone(1, ["A", "B", "C", "D"])]),
      [stop("A", 0, 50), stop("B", 1, 50), stop("C", 2, 50), stop("D", 0, 100)],
    );
    expect(features.areas.features).toHaveLength(0);
    expect(features.points.features).toHaveLength(3);
  });
});
