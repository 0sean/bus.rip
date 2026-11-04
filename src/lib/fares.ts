export type NetexNode = {
  name: string;
  attributes: Record<string, string>;
  children: (NetexNode | string)[];
};
export type FareEntity = {
  publication?: { lines: string[]; published: string | null };
  id: number;
  document_id: number;
  category: string;
  kind: string;
  ref: string;
  version: string;
  name: string | null;
  amount: string | null;
  currency: string | null;
  product_ref: string | null;
  profile_ref: string | null;
  package_ref: string | null;
  start_ref: string | null;
  end_ref: string | null;
  data: NetexNode;
  referenced_prices?: {
    amount: string;
    currency: string | null;
    version: string;
  }[];
  matrices?: {
    start_ref: string | null;
    end_ref: string | null;
    version: string;
  }[];
};
export type FareDocument = {
  id: number;
  publication_timestamp: string | null;
  links: {
    kind: string;
    code: string;
    ref: string;
    name: string | null;
    qualifier: string;
  }[];
};
export function nodes(root: NetexNode): NetexNode[] {
  return [
    root,
    ...root.children.flatMap((child) =>
      typeof child === "string" ? [] : nodes(child),
    ),
  ];
}
export function fareText(entity: FareEntity, name: string) {
  return (
    nodes(entity.data)
      .find((n) => n.name === name)
      ?.children.filter((c) => typeof c === "string")
      .join(" ") ?? ""
  );
}
export function fareAmounts(price: FareEntity) {
  return price.amount !== null
    ? [{ amount: price.amount, currency: price.currency }]
    : (price.referenced_prices ?? []);
}
export function money(amount: string, currency: string | null) {
  if (!currency || !/^[A-Z]{3}$/.test(currency))
    return `${amount}${currency ? ` ${currency}` : " (currency not supplied)"}`;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    Number(amount),
  );
}
export function zonePrices(zone: FareEntity, prices: FareEntity[]) {
  return prices.filter(
    (p) =>
      p.document_id === zone.document_id &&
      (p.start_ref === zone.ref ||
        p.end_ref === zone.ref ||
        p.matrices?.some(
          (m) => m.start_ref === zone.ref || m.end_ref === zone.ref,
        )),
  );
}
export function stopCodes(zone: FareEntity) {
  return [
    ...new Set(
      nodes(zone.data)
        .filter((n) =>
          ["ScheduledStopPointRef", "StopPlaceRef"].includes(n.name),
        )
        .map((n) => n.attributes.ref?.replace(/^(atco|naptan):/, ""))
        .filter((s): s is string => !!s),
    ),
  ];
}

export type FareGroup = {
  id: number;
  name: string;
  category: string;
  members: FareEntity[];
  documentIds: number[];
  lines: string[];
  stops: string[];
};
export type FareCatalogue = {
  zones: FareGroup[];
  tickets: FareGroup[];
  pendingDocumentIds?: number[];
  generation?: string | null;
};
export type FarePublication = {
  id: number;
  lines: string[];
  published: string | null;
};
export function applyFarePublications(
  catalogue: FareCatalogue,
  publications: FarePublication[],
): FareCatalogue {
  const byId = new Map(publications.map((p) => [p.id, p]));
  const update = (group: FareGroup) => ({
    ...group,
    lines: [
      ...new Set(group.documentIds.flatMap((id) => byId.get(id)?.lines ?? [])),
    ].sort((a, b) => a.localeCompare(b, "en", { numeric: true })),
  });
  return {
    zones: catalogue.zones.map(update),
    tickets: catalogue.tickets.map(update),
  };
}
export const fareKey = (documentId: number, ref: string) =>
  `${documentId}:${ref}`;
const normalise = (text: string) =>
  text.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-GB");
export function fareGroupKey(entity: FareEntity) {
  const name = normalise(entity.name || entity.ref);
  if (entity.category === "zone")
    return JSON.stringify([
      entity.kind,
      name,
      stopCodes(entity).sort(),
      nodes(entity.data)
        .filter((n) => n.name === "posList")
        .map((n) => n.children.filter((c) => typeof c === "string").join(" ")),
    ]);
  // A group is a ticket type, not a promise of identical prices or validity.
  // Preserve every publication underneath it and resolve prices within that document.
  const type =
    nodes(entity.data).find((n) => n.name === "TypeOfFareProductRef")
      ?.attributes.ref ?? "";
  const ticketName = name
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word && !["ticket", "tickets"].includes(word))
    .sort()
    .join(" ");
  return JSON.stringify([entity.kind, ticketName, type]);
}
export function groupFares(entities: FareEntity[]): FareGroup[] {
  const groups = new Map<string, FareGroup>();
  for (const entity of entities) {
    const key = fareGroupKey(entity);
    let group = groups.get(key);
    if (!group) {
      group = {
        id: entity.id,
        name: entity.name || "Unnamed fare",
        category: entity.category,
        members: [],
        documentIds: [],
        lines: [],
        stops: [],
      };
      groups.set(key, group);
    }
    group.members.push(entity);
  }
  for (const group of groups.values()) {
    group.members.sort((a, b) => a.id - b.id);
    group.id = group.members[0].id;
    group.documentIds = [
      ...new Set(group.members.map((member) => member.document_id)),
    ];
    const latest = [...group.members].sort((a, b) =>
      (b.publication?.published ?? "").localeCompare(
        a.publication?.published ?? "",
      ),
    )[0];
    group.name = latest.name || group.name;
    group.lines = [
      ...new Set(group.members.flatMap((m) => m.publication?.lines ?? [])),
    ].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
    group.stops = [...new Set(group.members.flatMap(stopCodes))];
  }
  return [...groups.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "en", { numeric: true }),
  );
}

export type FareDetailData = {
  entity: FareEntity;
  document: FareDocument;
  variants: {
    documentId: number;
    documentIds: number[];
    lines: string[];
    published: string | null;
  }[];
  prices: FareEntity[];
  labels: FareEntity[];
};
