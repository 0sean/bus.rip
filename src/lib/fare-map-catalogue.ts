import {
  FareApiError,
  type FareItem,
  type FarePage,
  type FareRequest,
  type FareStop,
} from "./fares";
import type { FareMapArea } from "./fare-map";

// Fully traverse the published catalogue; never draw an operator overview from
// just the first page of each zone. Limit concurrency and total upstream work.
export async function collectFareMap(
  noc: string,
  read: (request: FareRequest) => Promise<FarePage<FareItem[] | FareStop[]>>,
  ticket?: { id: string; generation: string },
) {
  let reads = 0;
  let generation: string | undefined = ticket?.generation;
  async function pages<T>(request: FareRequest): Promise<T[]> {
    const items: T[] = [];
    const cursors = new Set<string>();
    let cursor: string | undefined;
    do {
      if (++reads > 1000)
        throw new Error("Map catalogue request budget exceeded");
      const page = await read({
        ...request,
        cursor,
        expectedGeneration: generation,
      });
      generation ??= page.generation;
      if (generation !== page.generation)
        throw new FareApiError(
          409,
          "Fares have changed. Load the latest fares to continue.",
        );
      items.push(...(page.data as T[]));
      cursor = page.nextCursor ?? undefined;
      if (cursor && cursors.has(cursor))
        throw new Error("Repeated map catalogue cursor");
      if (cursor) cursors.add(cursor);
    } while (cursor);
    return items;
  }
  const areas = await pages<FareItem>(
    ticket
      ? {
          noc,
          action: "ticketAreas",
          id: ticket.id,
          generation: ticket.generation,
        }
      : { noc, action: "areas" },
  );
  const zones: FareMapArea[] = new Array(areas.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, areas.length) }, async () => {
      while (next < areas.length) {
        const index = next++;
        const area = areas[index];
        const stops = await pages<FareStop>({
          noc,
          action: "stops",
          id: area.id,
          generation,
        });
        zones[index] = {
          id: area.id,
          name: area.name,
          stops: stops.map((stop) => stop.code),
          membershipComplete: area.membership === "published_stops",
        };
      }
    }),
  );
  return { zones, generation: generation! };
}
