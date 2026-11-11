import type { FeatureCollection, MultiLineString } from "geojson";
import type { Trip, TripWithStops } from "./buslane";

export type RouteNetwork = FeatureCollection<
  MultiLineString,
  { routeId: number }
>;

// The route index has no stop geometry. Pick one journey per known shape,
// direction and destination instead of downloading every repeated departure.
export function representativeTrips(trips: Trip[]): Trip[] {
  const patterns = new Map<string, Trip>();
  for (const trip of trips) {
    const key = JSON.stringify([
      trip.shape_id,
      trip.direction_id,
      trip.headsign,
    ]);
    if (!patterns.has(key)) patterns.set(key, trip);
  }
  return [...patterns.values()];
}

// Include every distinct stop pattern, in both directions. Never join trips
// together or bridge a missing/invalid stop with a made-up segment.
export function routeLines(trips: TripWithStops[]): number[][][] {
  const patterns = new Map<string, number[][]>();
  for (const trip of trips) {
    const times = [...(trip.stop_times ?? [])].sort(
      (a, b) => (a.stop_sequence ?? 0) - (b.stop_sequence ?? 0),
    );
    let segment: number[][] = [];
    const save = () => {
      if (segment.length > 1) patterns.set(JSON.stringify(segment), segment);
      segment = [];
    };
    for (const { stop } of times) {
      const lon = Number(stop?.lon),
        lat = Number(stop?.lat);
      if (
        !stop ||
        stop.lon == null ||
        stop.lat == null ||
        String(stop.lon).trim() === "" ||
        String(stop.lat).trim() === "" ||
        !Number.isFinite(lon) ||
        !Number.isFinite(lat) ||
        Math.abs(lon) > 180 ||
        Math.abs(lat) > 90
      ) {
        save();
        continue;
      }
      const previous = segment.at(-1);
      if (!previous || previous[0] !== lon || previous[1] !== lat)
        segment.push([lon, lat]);
    }
    save();
  }
  return [...patterns.values()];
}

export function networkBounds(
  network: RouteNetwork,
): [number, number, number, number] | null {
  let west = Infinity,
    south = Infinity,
    east = -Infinity,
    north = -Infinity;
  for (const feature of network.features)
    for (const line of feature.geometry.coordinates)
      for (const [lon, lat] of line) {
        west = Math.min(west, lon);
        east = Math.max(east, lon);
        south = Math.min(south, lat);
        north = Math.max(north, lat);
      }
  return Number.isFinite(west) ? [west, south, east, north] : null;
}
