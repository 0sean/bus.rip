import type { FeatureCollection, Point, Polygon } from "geojson";
import type { Stop } from "./buslane";
import type { FareItem } from "./fares";
export type TicketCoverage = { zones: FareMapArea[]; areas: FareItem[] };
export type FareMapArea = {
  id: string;
  name: string;
  stops: string[];
  membershipComplete?: boolean;
};
export type FareMapGeometry = {
  areas: FeatureCollection<Polygon>;
  points: FeatureCollection<Point>;
  labels: FeatureCollection<Point>;
  zones: {
    id: string;
    name: string;
    membershipComplete: boolean;
    stopCount: number;
    mappedStopCount: number;
  }[];
  missingAreaIds: string[];
  unmatchedStopCodes: string[];
  timetableGeneration: number;
  approximate: true;
};

export function isFareMapGeometry(value: unknown): value is FareMapGeometry {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  const collection = (value: unknown) => {
    if (!value || typeof value !== "object") return false;
    const row = value as Record<string, unknown>;
    return row.type === "FeatureCollection" && Array.isArray(row.features);
  };
  const strings = (value: unknown) =>
    Array.isArray(value) && value.every((item) => typeof item === "string");
  return (
    collection(data.areas) &&
    collection(data.points) &&
    collection(data.labels) &&
    Array.isArray(data.zones) &&
    data.zones.every(
      (zone) =>
        zone &&
        typeof zone.id === "string" &&
        typeof zone.name === "string" &&
        typeof zone.membershipComplete === "boolean" &&
        Number.isSafeInteger(zone.stopCount) &&
        zone.stopCount >= 0 &&
        Number.isSafeInteger(zone.mappedStopCount) &&
        zone.mappedStopCount >= 0 &&
        zone.mappedStopCount <= zone.stopCount,
    ) &&
    strings(data.missingAreaIds) &&
    strings(data.unmatchedStopCodes) &&
    Number.isSafeInteger(data.timetableGeneration) &&
    Number(data.timetableGeneration) > 0 &&
    data.approximate === true
  );
}

export function fareMapCoverageNote(map: FareMapGeometry): string {
  if (!map.zones.length) return "No ticket areas are published.";
  if (!map.labels.features.length)
    return "No published stops have matching timetable coordinates.";
  const missing = map.missingAreaIds.length;
  if (missing)
    return `Approximate zone coverage · ${missing} of ${map.zones.length} areas have no matching stop locations · ticket conditions apply`;
  if (map.zones.some((zone) => zone.mappedStopCount < zone.stopCount))
    return "Approximate zone coverage · some stop locations are unavailable · ticket conditions apply";
  return "Approximate zone coverage · ticket conditions apply";
}

const COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#be185d",
  "#4f46e5",
  "#a16207",
  "#0f766e",
];
export const zoneColor = (id: string) =>
  COLORS[
    Array.from(id).reduce((hash, c) => (hash * 31 + c.charCodeAt(0)) >>> 0, 0) %
      COLORS.length
  ];
const code = (id: string) => id.replace(/^(?:atco|naptan):/i, "");

// A convex envelope is a visual approximation of stop coverage, never a
// published fare boundary. It can include gaps, exclusions and unserved land.
function coverageOutline(coordinates: [number, number][]) {
  const sorted = [
    ...new Map(coordinates.map((p) => [p.join(","), p])).values(),
  ].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return null;
  const cross = (a: number[], b: number[], c: number[]) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const half = (points: [number, number][]) => {
    const hull: [number, number][] = [];
    for (const p of points) {
      while (
        hull.length >= 2 &&
        cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0
      )
        hull.pop();
      hull.push(p);
    }
    return hull.slice(0, -1);
  };
  const hull = [...half(sorted), ...half([...sorted].reverse())];
  return hull.length < 3 ? null : [...hull, hull[0]];
}
export function fareZoneFeatures(zones: FareMapArea[], stops: Stop[]) {
  const locations = new Map<string, [number, number]>();
  for (const stop of stops) {
    if (!String(stop.lon ?? "").trim() || !String(stop.lat ?? "").trim())
      continue;
    const lon = Number(stop.lon),
      lat = Number(stop.lat);
    if (
      Number.isFinite(lon) &&
      Number.isFinite(lat) &&
      Math.abs(lon) <= 180 &&
      Math.abs(lat) <= 90
    )
      locations.set(code(stop.id), [lon, lat]);
  }
  // Approximate envelopes are permitted only for fully loaded membership.
  const areas: FeatureCollection<Polygon> = {
    type: "FeatureCollection",
    features: [],
  };
  const points: FeatureCollection<Point> = {
    type: "FeatureCollection",
    features: [],
  };
  const labels: FeatureCollection<Point> = {
    type: "FeatureCollection",
    features: [],
  };
  for (const zone of zones) {
    const coords = [...new Set(zone.stops.map(code))].flatMap((id) =>
      locations.has(id) ? [locations.get(id)!] : [],
    );
    const properties = {
      zoneId: zone.id,
      name: zone.name,
      color: zoneColor(zone.id),
      approximate: false,
    };
    const outline = zone.membershipComplete ? coverageOutline(coords) : null;
    if (outline) {
      properties.approximate = true;
      areas.features.push({
        type: "Feature",
        properties,
        geometry: { type: "Polygon", coordinates: [outline] },
      });
    }
    for (const coordinate of coords)
      points.features.push({
        type: "Feature",
        properties,
        geometry: { type: "Point", coordinates: coordinate },
      });
    if (coords.length)
      labels.features.push({
        type: "Feature",
        properties,
        geometry: {
          type: "Point",
          coordinates: [
            coords.reduce((n, p) => n + p[0], 0) / coords.length,
            coords.reduce((n, p) => n + p[1], 0) / coords.length,
          ],
        },
      });
  }
  // Large envelopes sit behind smaller zones, keeping local coverage readable.
  const size = (ring: number[][]) =>
    Math.abs(
      ring
        .slice(1)
        .reduce(
          (sum, point, i) =>
            sum + ring[i][0] * point[1] - point[0] * ring[i][1],
          0,
        ),
    );
  areas.features.sort(
    (a, b) => size(b.geometry.coordinates[0]) - size(a.geometry.coordinates[0]),
  );
  return { areas, points, labels };
}
