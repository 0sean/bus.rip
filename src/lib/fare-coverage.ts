import {
  FareApiError,
  type FarePage,
  type FareRequest,
  type FareStop,
} from "./fares";

// Collect every page before exposing a complete stop list or zone coverage.
// Keep the original filters and pin the catalogue generation across pages.
export async function collectFarePages<T>(
  request: FareRequest,
  read: (request: FareRequest) => Promise<FarePage<T[]>>,
): Promise<FarePage<T[]>> {
  const stops: T[] = [];
  const cursors = new Set<string>();
  let cursor: string | undefined;
  let current = request.generation;
  let reads = 0;
  let version = "";
  do {
    if (++reads > 1000) throw new Error("Coverage request budget exceeded");
    const page = await read({
      ...request,
      cursor,
      expectedGeneration: current,
    });
    current ??= page.generation;
    if (page.generation !== current)
      throw new FareApiError(
        409,
        "Fares have changed. Load the latest fares to continue.",
      );
    version = page.version;
    stops.push(...page.data);
    cursor = page.nextCursor ?? undefined;
    if (cursor && cursors.has(cursor))
      throw new Error("Repeated coverage cursor");
    if (cursor) cursors.add(cursor);
  } while (cursor);
  return { data: stops, generation: current!, version, nextCursor: null };
}

export function collectFareCoverage(
  request: { noc: string; id: string; generation?: string },
  read: (request: FareRequest) => Promise<FarePage<FareStop[]>>,
) {
  return collectFarePages({ ...request, action: "stops" }, read);
}
