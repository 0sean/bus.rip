import type { FeatureCollection, Point, Polygon } from "geojson";
import type { Stop } from "./buslane";
import { nodes, type FareGroup, type NetexNode } from "./fares";
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
export const zoneColor = (id: number) => COLORS[id % COLORS.length];
type Coordinate = [number, number];
function hull(points: Coordinate[]): Coordinate[] {
  const sorted = [
    ...new Map(points.map((p) => [p.join(","), p])).values(),
  ].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return [];
  const cross = (o: Coordinate, a: Coordinate, b: Coordinate) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (values: Coordinate[]) => {
    const result: Coordinate[] = [];
    for (const point of values) {
      while (
        result.length > 1 &&
        cross(result.at(-2)!, result.at(-1)!, point) <= 0
      )
        result.pop();
      result.push(point);
    }
    return result;
  };
  const ring = [
    ...half(sorted).slice(0, -1),
    ...half([...sorted].reverse()).slice(0, -1),
  ];
  return ring.length < 3 ? [] : [...ring, ring[0]];
}
function valid([lon, lat]: Coordinate) {
  return (
    Number.isFinite(lon) &&
    Number.isFinite(lat) &&
    Math.abs(lon) <= 180 &&
    Math.abs(lat) <= 90
  );
}
// GML EPSG:4326 uses latitude/longitude; CRS84 explicitly uses longitude/latitude.
// Unknown coordinate systems are left to the stop-based approximation.
export function publishedPolygons(root: NetexNode): Coordinate[][][] {
  const result: Coordinate[][][] = [];
  function visit(node: NetexNode, inherited = "") {
    const srs = node.attributes.srsName || inherited;
    if (node.name === "Polygon") {
      const rings: Coordinate[][] = [];
      for (const ring of nodes(node).filter((n) => n.name === "LinearRing")) {
        const list = nodes(ring).find((n) => n.name === "posList");
        const crs = list?.attributes.srsName || ring.attributes.srsName || srs;
        if (
          !list ||
          (!/4326$/.test(crs) && !/CRS84$/i.test(crs)) ||
          (list.attributes.srsDimension && list.attributes.srsDimension !== "2")
        )
          continue;
        const values = list.children
          .filter((c) => typeof c === "string")
          .join(" ")
          .trim()
          .split(/\s+/)
          .map(Number);
        if (values.length < 6 || values.length % 2) continue;
        const coords: Coordinate[] = [];
        for (let i = 0; i < values.length; i += 2)
          coords.push(
            /CRS84$/i.test(crs)
              ? [values[i], values[i + 1]]
              : [values[i + 1], values[i]],
          );
        if (!coords.every(valid)) continue;
        if (coords[0].join(",") !== coords.at(-1)!.join(","))
          coords.push(coords[0]);
        rings.push(coords);
      }
      if (rings.length) result.push(rings);
      return;
    }
    for (const child of node.children)
      if (typeof child !== "string") visit(child, srs);
  }
  visit(root);
  return result;
}
export function fareZoneFeatures(zones: FareGroup[], stops: Stop[]) {
  const locations = new Map<string, Coordinate>();
  for (const stop of stops) {
    if (!String(stop.lon ?? "").trim() || !String(stop.lat ?? "").trim())
      continue;
    const coordinate: Coordinate = [Number(stop.lon), Number(stop.lat)];
    if (valid(coordinate)) locations.set(stop.id, coordinate);
  }
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
    const coords = zone.stops.flatMap((code) =>
      locations.has(code) ? [locations.get(code)!] : [],
    );
    const published = zone.members.flatMap((e) => publishedPolygons(e.data));
    const ring = published.length ? [] : hull(coords);
    const polygons = published.length ? published : ring.length ? [[ring]] : [];
    const properties = {
      zoneId: zone.id,
      name: zone.name,
      color: zoneColor(zone.id),
      approximate: !published.length,
    };
    for (const coordinates of polygons)
      areas.features.push({
        type: "Feature",
        properties,
        geometry: { type: "Polygon", coordinates },
      });
    for (const coordinate of coords)
      points.features.push({
        type: "Feature",
        properties,
        geometry: { type: "Point", coordinates: coordinate },
      });
    const centres = coords.length ? coords : polygons.flatMap((p) => p[0]);
    if (centres.length)
      labels.features.push({
        type: "Feature",
        properties,
        geometry: {
          type: "Point",
          coordinates: [
            centres.reduce((sum, p) => sum + p[0], 0) / centres.length,
            centres.reduce((sum, p) => sum + p[1], 0) / centres.length,
          ],
        },
      });
  }
  return { areas, points, labels };
}
