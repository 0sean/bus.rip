import { parseStringPromise } from "xml2js";

import type { NocLine } from "@prisma/client";

export async function getDatafeed(nocCode: string): Promise<Vehicle[] | null> {
  const r = await fetch(
      `https://data.bus-data.dft.gov.uk/api/v1/datafeed/?operatorRef=${nocCode}&api_key=${process.env.BODS_API_KEY}`,
      {
        next: { revalidate: 10 },
      },
    ),
    xml = await r.text(),
    data: DatafeedResponse = await parseStringPromise(xml);

  return formatDatafeedResponse(data);
}

function formatDatafeedResponse(data: DatafeedResponse): Vehicle[] | null {
  const activities =
    data.Siri.ServiceDelivery[0].VehicleMonitoringDelivery[0].VehicleActivity;
  return activities
    ? activities.map((activity) => ({
        lineName: activity.MonitoredVehicleJourney[0].PublishedLineName[0],
        ref: activity.MonitoredVehicleJourney[0].VehicleRef[0],
        longitude: Number(
          activity.MonitoredVehicleJourney[0].VehicleLocation[0].Longitude[0],
        ),
        latitude: Number(
          activity.MonitoredVehicleJourney[0].VehicleLocation[0].Latitude[0],
        ),
        bearing: activity.MonitoredVehicleJourney[0].Bearing
          ? Number(activity.MonitoredVehicleJourney[0].Bearing[0])
          : null,
        arrivalTime:
          activity.MonitoredVehicleJourney[0].OriginAimedDepartureTime ? activity.MonitoredVehicleJourney[0].OriginAimedDepartureTime[0] : null,
        departureTime:
          activity.MonitoredVehicleJourney[0].DestinationAimedArrivalTime ? activity.MonitoredVehicleJourney[0].DestinationAimedArrivalTime[0] : null,
        originName:
          activity.MonitoredVehicleJourney[0].OriginName[0].replaceAll(
            "_",
            " ",
          ),
        destinationName:
          activity.MonitoredVehicleJourney[0].DestinationName[0].replaceAll(
            "_",
            " ",
          ),
        validUntil: activity.ValidUntilTime[0] + "Z",
        recordedAt: activity.RecordedAtTime[0],
        validity: Validity.Valid
      }))
    : null;
}

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
  Invalid
}

/* TransXChange datafeed response types */

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
