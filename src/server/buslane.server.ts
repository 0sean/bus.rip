import type {
  ApiError,
  Stop,
  StopTimeWithAssociations,
  RouteWithTrips,
  TripWithAssociations,
  RouteWithStops,
} from "@/lib/buslane";
import { cached } from "./cache.server";

async function get<T>(url: string, cache = true): Promise<T | ApiError> {
  if (process.env.BUSLANE_ENABLED === "0")
    return { error: "Buslane is not enabled." };
  const load = async () => {
    const response = await fetch(
      `${process.env.BUSLANE_BASE_URL || "http://localhost:3000"}/api${url}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.BUSLANE_API_KEY}`,
        },
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!response.ok)
      throw new Error("Timetable data is temporarily unavailable");
    const data: T | ApiError = await response.json();
    if (data && typeof data === "object" && "error" in data)
      throw new Error("Timetable data is temporarily unavailable");
    return data;
  };
  return cache ? cached(`buslane:${url}`, 43_200_000, load) : load();
}

export async function getStops(noc: string): Promise<Stop[] | ApiError> {
  return await get<Stop[]>(
    `/timetables/agencies/noc:${encodeURIComponent(noc)}/stops`,
  );
}

export async function getStopTimes(
  noc: string,
  stopId: string,
): Promise<StopTimeWithAssociations[] | ApiError> {
  const data = await get<StopTimeWithAssociations[]>(
    `/timetables/stops/${encodeURIComponent(stopId)}/stop_times`,
    true,
  );
  if (Array.isArray(data)) {
    return data.filter(
      (stopTime) =>
        stopTime.trip.route.agency.noc.toLowerCase() === noc.toLowerCase(),
    );
  } else {
    return { error: "Failed to fetch stop times" };
  }
}

export async function getRoutes(
  noc: string,
): Promise<RouteWithTrips[] | ApiError> {
  const data = await get<RouteWithTrips[]>(
    `/timetables/agencies/noc:${encodeURIComponent(noc)}/routes`,
  );
  if (Array.isArray(data)) {
    return data;
  } else {
    return { error: "Failed to fetch routes" };
  }
}

export async function getTrip(
  tripId: string,
): Promise<TripWithAssociations | ApiError> {
  const data = await get<TripWithAssociations>(
    `/timetables/trips/${encodeURIComponent(tripId)}`,
  );
  if ("error" in data) {
    return { error: "Failed to fetch trip" };
  }
  return data;
}

export async function getRoute(
  routeId: string,
): Promise<RouteWithStops | ApiError> {
  const data = await get<RouteWithStops>(
    `/timetables/routes/${encodeURIComponent(routeId)}`,
  );
  if ("error" in data) {
    return { error: "Failed to fetch route" };
  }
  return data;
}
