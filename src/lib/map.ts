import type { StyleSpecification } from "maplibre-gl";

// TODO: Make this type better
export const mapStyle = {
  version: 8 as const,
  sources: {
    "raster-tiles": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: "tiles",
      type: "raster",
      source: "raster-tiles",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
} as unknown as StyleSpecification;

function renderHours(time?: string) {
  return time != undefined
    ? new Date(time).getHours().toString().padStart(2, "0")
    : "-";
}

function renderMinutes(time?: string) {
  return time != undefined
    ? new Date(time).getMinutes().toString().padStart(2, "0")
    : "-";
}

export function renderTime(time?: string) {
  return `${renderHours(time)}:${renderMinutes(time)}`;
}
