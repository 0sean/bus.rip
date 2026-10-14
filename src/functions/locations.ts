import { createServerFn } from "@tanstack/react-start";
import { rateLimit } from "@/middleware/rate-limit";
import { parseStringPromise } from "xml2js";
import {
  Validity,
  type DatafeedRouteResponse,
  type Vehicle,
  type VehicleActivity,
} from "@/lib/bods";
import { db } from "./db.server";
import { eq } from "drizzle-orm";
import { nocLines } from "@/db/schema";
import { cached, invalidateCache } from "./cache.server";
import { getOperator } from "./operators";
import { operatorCode } from "./validation";

export const getLocations = createServerFn({ method: "GET" })
  .middleware([rateLimit("locations")])
  .validator(operatorCode)
  .handler(async ({ data: nocCode }): Promise<DatafeedRouteResponse> => {
    const operator = await getOperator({ data: nocCode });
    if (!operator) throw new Error("Invalid operator code");
    const vehicles = await cached(`vehicles:${nocCode}`, 10_000, async () => {
      const url = new URL("https://data.bus-data.dft.gov.uk/api/v1/datafeed/");
      url.searchParams.set("operatorRef", nocCode);
      url.searchParams.set("api_key", process.env.BODS_API_KEY || "");
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok)
        throw new Error("Vehicle data is temporarily unavailable");
      return parseDatafeed(await response.text());
    });
    let line = operator;
    if (!vehicles && !operator.hasMissingLocationData) {
      const [updatedLine] = await db
        .update(nocLines)
        .set({ hasMissingLocationData: true })
        .where(eq(nocLines.id, operator.id))
        .returning();
      if (!updatedLine) throw new Error("Invalid operator code");
      line = updatedLine;
      invalidateCache("operators:");
    }
    return { line, vehicles };
  });

async function parseDatafeed(xml: string): Promise<Vehicle[] | null> {
  return formatDatafeedResponse(await parseStringPromise(xml));
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
