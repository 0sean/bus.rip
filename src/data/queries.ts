import { queryOptions } from "@tanstack/react-query";
import { getOperators, getOperator } from "@/functions/operators";
import { getLocations } from "@/functions/locations";
import type { NocLine } from "@/db/schema";
import {
  getStops,
  getStopTimes,
  getRoutes,
  getRoute,
  getTrip,
} from "@/functions/buslane";

export function staticQuery<T>(query: T): T {
  return { ...query, staleTime: "static" } as T;
}

const TIMETABLE_STALE_TIME = 43_200_000;
const code = (value: string) => value.toUpperCase();
export const operatorsOptions = () =>
  queryOptions({
    queryKey: ["operators"],
    queryFn: async ({ signal }): Promise<NocLine[]> => {
      const response = await getOperators({ signal });
      if (!response.ok)
        throw new Error("Operator data is temporarily unavailable");
      return response.json();
    },
    staleTime: 300_000,
  });

export const operatorOptions = (nocCode: string) =>
  queryOptions({
    queryKey: ["operator", code(nocCode)],
    queryFn: ({ signal }) => getOperator({ data: nocCode, signal }),
    staleTime: 300_000,
  });

export const locationsOptions = (nocCode: string) =>
  queryOptions({
    queryKey: ["locations", code(nocCode)],
    queryFn: ({ signal }) => getLocations({ data: nocCode, signal }),
    staleTime: 10_000,
    refetchInterval: 10_000,
    retry: false,
  });

export const stopsOptions = (nocCode: string) =>
  queryOptions({
    queryKey: ["stops", code(nocCode)],
    queryFn: ({ signal }) => getStops({ data: nocCode, signal }),
    staleTime: TIMETABLE_STALE_TIME,
  });

export const stopTimesOptions = (nocCode: string, stopId: string) =>
  queryOptions({
    queryKey: ["stop-times", code(nocCode), stopId],
    queryFn: ({ signal }) =>
      getStopTimes({ data: { nocCode, stopId }, signal }),
    staleTime: TIMETABLE_STALE_TIME,
  });

export const routesOptions = (nocCode: string) =>
  queryOptions({
    queryKey: ["routes", code(nocCode)],
    queryFn: ({ signal }) => getRoutes({ data: nocCode, signal }),
    staleTime: TIMETABLE_STALE_TIME,
  });

export const routeOptions = (routeId: string) =>
  queryOptions({
    queryKey: ["route", routeId],
    queryFn: ({ signal }) => getRoute({ data: routeId, signal }),
    staleTime: TIMETABLE_STALE_TIME,
  });

export const tripOptions = (tripId: string) =>
  queryOptions({
    queryKey: ["trip", tripId],
    queryFn: ({ signal }) => getTrip({ data: tripId, signal }),
    staleTime: TIMETABLE_STALE_TIME,
  });
