import { getRouteRow } from "@/lib/buslane";
import type {
  ApiError,
  Stop,
  StopTimeWithAssociations,
  RouteWithTrips,
  TripWithAssociations,
  TripWithStops,
} from "@/lib/buslane";
import {
  representativeTrips,
  routeLines,
  type RouteNetwork,
} from "@/lib/route-network";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cacheControl } from "@/middleware/cache-control";
import { rateLimit } from "@/middleware/rate-limit";
import { operatorCode, resourceId } from "./validation";

async function get<T>(
  url: string,
  signal?: AbortSignal,
): Promise<T | ApiError> {
  if (process.env.BUSLANE_ENABLED === "0")
    return { error: "Buslane is not enabled." };
  const response = await fetch(
    `${process.env.BUSLANE_BASE_URL || "http://localhost:3000"}/api${url}`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.BUSLANE_API_KEY}`,
      },
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15_000)])
        : AbortSignal.timeout(15_000),
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
  .middleware([cacheControl(43_200), rateLimit("stops")])
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
  .middleware([cacheControl(43_200), rateLimit("stop-times")])
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
  .middleware([cacheControl(43_200), rateLimit("routes")])
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
  .middleware([cacheControl(43_200), rateLimit("trip")])
  .validator(resourceId)
  .handler(async ({ data: tripId }) => {
    const trip = await get<TripWithAssociations>(
      `/timetables/trips/${encodeURIComponent(tripId)}`,
    );
    if ("error" in trip) throw new Error(trip.error);
    return trip;
  });

export const getRoute = createServerFn({ method: "GET" })
  .middleware([cacheControl(43_200), rateLimit("route")])
  .validator(resourceId)
  .handler(async ({ data: routeId }) => {
    const [route, trips] = await Promise.all([
      get<RouteWithTrips>(`/timetables/routes/${encodeURIComponent(routeId)}`),
      get<TripWithStops[]>(
        `/timetables/routes/${encodeURIComponent(routeId)}/trips`,
      ),
    ]);
    if ("error" in route) throw new Error(route.error);
    if (!Array.isArray(trips)) throw new Error(trips.error);
    return { ...route, trips };
  });

type OperatorGeometry = {
  network: RouteNetwork;
  missingRouteIds: number[];
};

export const getRouteNetwork = createServerFn({ method: "GET" })
  .middleware([rateLimit("route-network")])
  .validator(operatorCode)
  .handler(async ({ data: nocCode }) => {
    const result = await get<OperatorGeometry>(
      `/timetables/agencies/noc:${encodeURIComponent(nocCode)}/geometry`,
    );
    if ("error" in result) throw new Error(result.error);
    return result;
  });

// Fetch geometry only for the selected line and published direction, rather
// than downloading every route in the operator's network.
export const getFareRouteNetwork = createServerFn({ method: "GET" })
  .middleware([cacheControl(43_200), rateLimit("fare-route-network")])
  .validator(
    z.object({
      noc: operatorCode,
      line: z.string().trim().min(1).max(100),
      directions: z.array(z.enum(["inbound", "outbound"])).max(2),
    }),
  )
  .handler(async ({ data }) => {
    const signal = AbortSignal.timeout(30_000);
    const all = await get<RouteWithTrips[]>(
      `/timetables/agencies/noc:${encodeURIComponent(data.noc)}/routes`,
      signal,
    );
    if (!Array.isArray(all))
      throw new Error("Timetable data is temporarily unavailable");
    const routes = all.filter(
      (route) =>
        route.short_name?.trim().toLowerCase() === data.line.toLowerCase(),
    );
    const tasks = routes.flatMap((route) =>
      representativeTrips(
        route.trips.filter(
          (trip) =>
            !data.directions.length ||
            data.directions.includes(
              trip.direction_id as "inbound" | "outbound",
            ),
        ),
      ).map((trip) => ({ routeId: route.id, trip })),
    );
    if (tasks.length > 200)
      throw new Error("Route map is temporarily unavailable");
    const lines = new Map<number, number[][][]>();
    const missing = new Set<number>();
    let index = 0;
    await Promise.all(
      Array.from({ length: Math.min(4, tasks.length) }, async () => {
        while (index < tasks.length) {
          signal.throwIfAborted();
          const { routeId, trip } = tasks[index++];
          try {
            const detail = await get<TripWithStops>(
              `/timetables/trips/${encodeURIComponent(trip.id)}`,
              signal,
            );
            if ("error" in detail) throw new Error("Unavailable trip");
            const coordinates = routeLines([detail]);
            if (!coordinates.length) missing.add(routeId);
            lines.set(routeId, [...(lines.get(routeId) ?? []), ...coordinates]);
          } catch {
            missing.add(routeId);
          }
        }
      }),
    );
    const network: RouteNetwork = {
      type: "FeatureCollection",
      features: [...lines]
        .filter(([, coordinates]) => coordinates.length)
        .map(([routeId, coordinates]) => ({
          type: "Feature",
          id: routeId,
          properties: { routeId },
          geometry: { type: "MultiLineString", coordinates },
        })),
    };
    return {
      network,
      missingRouteIds: [...missing],
      routes: routes.map((route) => ({
        ...route,
        long_name: getRouteRow(route).mainRoute,
        trips: [],
      })),
    };
  });
