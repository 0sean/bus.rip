import type { NocLine } from "@/db/schema";

export type DatafeedRouteResponse = {
  error?: string;
  line: NocLine;
  vehicles: Vehicle[] | null;
};

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
