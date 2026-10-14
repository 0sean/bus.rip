import type {
  ApiError,
  Stop,
  StopTimeWithAssociations,
  RouteWithTrips,
  TripWithAssociations,
  RouteWithStops,
} from "@/lib/buslane";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rateLimit } from "@/middleware/rate-limit";
import { operatorCode, resourceId } from "./validation";

async function get<T>(url: string): Promise<T | ApiError> {
  if (process.env.BUSLANE_ENABLED === "0")
    return { error: "Buslane is not enabled." };
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
}

export const getStops = createServerFn({ method: "GET" })
  .middleware([rateLimit("stops")])
  .validator(operatorCode)
  .handler(async ({ data: nocCode }) => {
    const stops = await get<Stop[]>(
      `/timetables/agencies/noc:${encodeURIComponent(nocCode)}/stops`,
    );
    if (!Array.isArray(stops))
      throw new Error("error" in stops ? stops.error : "Failed to fetch stops");
    return stops;
  });

export const getStopTimes = createServerFn({ method: "GET" })
  .middleware([rateLimit("stop-times")])
  .validator(z.object({ nocCode: operatorCode, stopId: resourceId }))
  .handler(async ({ data: { nocCode, stopId } }) => {
    const times = await get<StopTimeWithAssociations[]>(
      `/timetables/stops/${encodeURIComponent(stopId)}/stop_times`,
    );
    if (!Array.isArray(times))
      throw new Error(
        "error" in times ? times.error : "Failed to fetch stop times",
      );
    return times.filter(
      (time) =>
        time.trip.route.agency.noc.toLowerCase() === nocCode.toLowerCase(),
    );
  });

export const getRoutes = createServerFn({ method: "GET" })
  .middleware([rateLimit("routes")])
  .validator(operatorCode)
  .handler(async ({ data: nocCode }) => {
    const routes = await get<RouteWithTrips[]>(
      `/timetables/agencies/noc:${encodeURIComponent(nocCode)}/routes`,
    );
    if (!Array.isArray(routes))
      throw new Error(
        "error" in routes ? routes.error : "Failed to fetch routes",
      );
    return routes;
  });

export const getTrip = createServerFn({ method: "GET" })
  .middleware([rateLimit("trip")])
  .validator(resourceId)
  .handler(async ({ data: tripId }) => {
    const trip = await get<TripWithAssociations>(
      `/timetables/trips/${encodeURIComponent(tripId)}`,
    );
    if ("error" in trip) throw new Error(trip.error);
    return trip;
  });

export const getRoute = createServerFn({ method: "GET" })
  .middleware([rateLimit("route")])
  .validator(resourceId)
  .handler(async ({ data: routeId }) => {
    const route = await get<RouteWithStops>(
      `/timetables/routes/${encodeURIComponent(routeId)}`,
    );
    if ("error" in route) throw new Error(route.error);
    return route;
  });
