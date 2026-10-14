import { parseStringPromise } from "xml2js";

import { Validity, type Vehicle, type VehicleActivity } from "@/lib/bods";
import { cached } from "./cache.server";

export function getDatafeed(nocCode: string): Promise<Vehicle[] | null> {
  return cached(`vehicles:${nocCode}`, 10_000, () => fetchDatafeed(nocCode));
}

async function fetchDatafeed(nocCode: string): Promise<Vehicle[] | null> {
  const r = await fetch(
      `https://data.bus-data.dft.gov.uk/api/v1/datafeed/?operatorRef=${nocCode}&api_key=${process.env.BODS_API_KEY}`,
      { signal: AbortSignal.timeout(15_000) },
    ),
    xml = await checkedText(r),
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
        arrivalTime: activity.MonitoredVehicleJourney[0]
          .DestinationAimedArrivalTime
          ? activity.MonitoredVehicleJourney[0].DestinationAimedArrivalTime[0]
          : undefined,
        departureTime: activity.MonitoredVehicleJourney[0]
          .OriginAimedDepartureTime
          ? activity.MonitoredVehicleJourney[0].OriginAimedDepartureTime[0]
          : undefined,
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
        validUntil: /(?:Z|[+-]\d{2}:\d{2})$/.test(activity.ValidUntilTime[0])
          ? activity.ValidUntilTime[0]
          : activity.ValidUntilTime[0] + "Z",
        recordedAt: activity.RecordedAtTime[0],
        validity: Validity.Valid,
      }))
    : null;
}

async function checkedText(response: Response) {
  if (!response.ok) throw new Error("Vehicle data is temporarily unavailable");
  return response.text();
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
