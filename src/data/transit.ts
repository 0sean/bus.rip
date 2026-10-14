import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const operatorCode = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^[a-zA-Z0-9_-]+$/)
  .transform((value) => value.toUpperCase());
const resourceId = z.string().trim().min(1).max(200);

export const getOperators = createServerFn({ method: "GET" }).handler(
  async () => {
    const { readOperators } = await import("@/server/transit.server");
    return readOperators();
  },
);

export const getOperator = createServerFn({ method: "GET" })
  .validator(operatorCode)
  .handler(async ({ data }) => {
    const { readOperator } = await import("@/server/transit.server");
    return readOperator(data);
  });

export const getLocations = createServerFn({ method: "GET" })
  .validator(operatorCode)
  .handler(async ({ data }) => {
    const [{ readLocations }, { rateLimit }] = await Promise.all([
      import("@/server/transit.server"),
      import("@/server/rate-limit.server"),
    ]);
    await rateLimit("locations");
    return readLocations(data);
  });

export const getStops = createServerFn({ method: "GET" })
  .validator(operatorCode)
  .handler(async ({ data }) => {
    const [{ getStops }, { rateLimit }] = await Promise.all([
      import("@/server/buslane.server"),
      import("@/server/rate-limit.server"),
    ]);
    await rateLimit("stops");
    const stops = await getStops(data);
    if (!Array.isArray(stops)) throw new Error(stops.error);
    return stops;
  });

export const getStopTimes = createServerFn({ method: "GET" })
  .validator(z.object({ nocCode: operatorCode, stopId: resourceId }))
  .handler(async ({ data }) => {
    const [{ getStopTimes }, { rateLimit }] = await Promise.all([
      import("@/server/buslane.server"),
      import("@/server/rate-limit.server"),
    ]);
    await rateLimit("stop-times");
    const times = await getStopTimes(data.nocCode, data.stopId);
    if (!Array.isArray(times)) throw new Error(times.error);
    return times;
  });

export const getRoutes = createServerFn({ method: "GET" })
  .validator(operatorCode)
  .handler(async ({ data }) => {
    const [{ getRoutes }, { rateLimit }] = await Promise.all([
      import("@/server/buslane.server"),
      import("@/server/rate-limit.server"),
    ]);
    await rateLimit("routes");
    const routes = await getRoutes(data);
    if (!Array.isArray(routes)) throw new Error(routes.error);
    return routes;
  });

export const getRoute = createServerFn({ method: "GET" })
  .validator(resourceId)
  .handler(async ({ data }) => {
    const [{ getRoute }, { rateLimit }] = await Promise.all([
      import("@/server/buslane.server"),
      import("@/server/rate-limit.server"),
    ]);
    await rateLimit("route");
    const route = await getRoute(data);
    if ("error" in route) throw new Error(route.error);
    return route;
  });

export const getTrip = createServerFn({ method: "GET" })
  .validator(resourceId)
  .handler(async ({ data }) => {
    const [{ getTrip }, { rateLimit }] = await Promise.all([
      import("@/server/buslane.server"),
      import("@/server/rate-limit.server"),
    ]);
    await rateLimit("trip");
    const trip = await getTrip(data);
    if ("error" in trip) throw new Error(trip.error);
    return trip;
  });

// The scheduler endpoint and RPC share the same authenticated refresh operation.
export const refreshOperators = createServerFn({ method: "POST" }).handler(
  async () => {
    const { getRequest, setResponseStatus } = await import(
      "@tanstack/react-start/server"
    );
    const token = process.env.CRON_TOKEN || process.env.CRON_SECRET;
    if (
      !token ||
      getRequest().headers.get("Authorization") !== `Bearer ${token}`
    ) {
      setResponseStatus(401);
      throw new Error("Invalid token");
    }
    const { refreshOperators } = await import("@/server/transit.server");
    return refreshOperators();
  },
);
