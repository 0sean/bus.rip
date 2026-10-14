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

export type VehicleActivity = {
  RecordedAtTime: string[];
  ItemIdentifier: string[];
  ValidUntilTime: string[];
  MonitoredVehicleJourney: MonitoredVehicleJourney[];
  extensions: VehicleJourneyExtensions[];
};

type MonitoredVehicleJourney = {
  LineRef: string[];
  DirectionRef: "inbound" | "outbound";
  FramedVehicleJourneyRef: FramedVehicleJourneyRef[];
  PublishedLineName: string[];
  OperatorRef: string[];
  OriginRef: string[];
  OriginName: string[];
  DestinationRef: string[];
  DestinationName: string[];
  OriginAimedDepartureTime: string[];
  DestinationAimedArrivalTime: string[];
  VehicleLocation: VehicleLocation[];
  Bearing?: number[];
  BlockRef: string[];
  VehicleRef: string[];
};

type FramedVehicleJourneyRef = {
  DataFrameRef: string[];
  DatedVehicleJourneyRef: string[];
};

type VehicleLocation = {
  Longitude: string[];
  Latitude: string[];
};

type VehicleJourneyExtensions = {
  extensions: {
    VehicleJourney: {
      Operational: Operational[];
      VehicleUniqueId: string[];
    }[];
  }[];
};

type Operational = {
  TicketMachine: TicketMachine[];
};

type TicketMachine = {
  TicketMachineServiceCode: string[];
  JourneyCode: string[];
};
