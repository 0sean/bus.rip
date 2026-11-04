import type { FeatureCollection, Point, Polygon } from "geojson";
import type { Stop } from "./buslane";
export type FareMapArea = { id: string; name: string; stops: string[] };
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
  // V1 publishes membership, not boundaries. Never turn a partial stop page
  // into an invented ticket-area polygon.
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
    };
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
  return { areas, points, labels };
}
