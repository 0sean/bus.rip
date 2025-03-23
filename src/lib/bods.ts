import { parseStringPromise } from "xml2js";

import type { NocLine } from "@prisma/client";

export async function getDatafeed(nocCode: string): Promise<DatafeedResponse> {
  const r = await fetch(
      `https://data.bus-data.dft.gov.uk/api/v1/datafeed/?operatorRef=${nocCode}&api_key=${process.env.BODS_API_KEY}`,
      {
        next: { revalidate: 10 },
      },
    ),
    xml = await r.text();

  return await parseStringPromise(xml);
}

export type DatafeedRouteResponse = {
  error?: string;
  line: NocLine;
  data: DatafeedResponse;
};

type DatafeedResponse = {
  Siri: {
    $: { version: string; xmlns: string };
    ServiceDelivery: ServiceDelivery[];
  };
};

type ServiceDelivery = {
  ResponseTimestamp: string[];
  ProducerRef: "DepartmentForTransport";
  VehicleMonitoringDelivery: VehicleMonitoringDelivery[];
};

type VehicleMonitoringDelivery = {
  ResponseTimestamp: string[];
  RequestMessageRef: string[];
  ValidUntil: string[];
  ShortestPossibleCycle: string[];
  VehicleActivity: VehicleActivity[]; // > 1
};

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
