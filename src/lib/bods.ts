import type { NocLine } from "@/db/schema";

export type DatafeedRouteResponse = {
  error?: string;
  line?: NocLine;
  vehicles: Vehicle[] | null;
};

// BODS uses west, south, east, north coordinate order.
export type BoundingBox = [number, number, number, number];

export function nearbyBoundingBox(
  longitude: number,
  latitude: number,
): BoundingBox {
  const latitudeDelta = 5 / 111.32;
  const longitudeDelta =
    latitudeDelta / Math.max(Math.cos((latitude * Math.PI) / 180), 0.01);
  return [
    Math.max(-180, longitude - longitudeDelta),
    Math.max(-90, latitude - latitudeDelta),
    Math.min(180, longitude + longitudeDelta),
    Math.min(90, latitude + latitudeDelta),
  ];
}

export type Vehicle = {
  lineName: string;
  ref: string;

  longitude: number;
  latitude: number;
  bearing: number | null;

  arrivalTime?: string;
  departureTime?: string;

  originName: string;
  destinationName: string;

  validUntil: string;
  recordedAt: string;

  validity: Validity; // Server will always return Valid, turns invalid on client
};

export enum Validity {
  Valid,
  Expiring1,
  Expiring2,
  Invalid,
}
