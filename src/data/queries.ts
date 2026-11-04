import { getFareCatalogue } from "@/functions/fares";
import {
  readFareResponse,
  type FareRequest,
  type FareItem,
  type FarePage,
  type JourneyFares,
} from "@/lib/fares";
import { infiniteQueryOptions } from "@tanstack/react-query";
import { queryOptions, skipToken } from "@tanstack/react-query";
import type { BoundingBox } from "@/lib/bods";
import { getOperators, getOperator } from "@/functions/operators";
import { getLocations } from "@/functions/locations";
import type { NocLine } from "@/db/schema";
import {
  getStops,
  getStopTimes,
  getRoutes,
  getRoute,
  getTrip,
  getRouteNetwork,
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

export const locationsOptions = (filter: string | BoundingBox | null) =>
  queryOptions({
    queryKey: ["locations", typeof filter === "string" ? code(filter) : filter],
    queryFn:
      filter === null
        ? skipToken
        : ({ signal }) =>
            getLocations({
              data:
                typeof filter === "string" ? filter : { boundingBox: filter },
              signal,
            }),
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

export const routeNetworkOptions = (nocCode: string) =>
  queryOptions({
    queryKey: ["route-network", code(nocCode)],
    queryFn: ({ signal }) => getRouteNetwork({ data: nocCode, signal }),
    staleTime: TIMETABLE_STALE_TIME,
  });

export const tripOptions = (tripId: string) =>
  queryOptions({
    queryKey: ["trip", tripId],
    queryFn: ({ signal }) => getTrip({ data: tripId, signal }),
    staleTime: TIMETABLE_STALE_TIME,
  });

// Every scope/filter and the interpretation version participate in cache keys.
// Root cursors already bind their generation; adding a generation query parameter
// halfway through pagination would change the cursor's filter binding.
export const farePagesOptions = <T = FareItem[]>(request: FareRequest) =>
  infiniteQueryOptions({
    queryKey: ["fares-v1", code(request.noc), "pages", request],
    initialPageParam: undefined as
      { cursor: string; generation: string } | undefined,
    queryFn: async ({ signal, pageParam }): Promise<FarePage<T>> =>
      readFareResponse<T>(
        await getFareCatalogue({
          data: {
            ...request,
            cursor: pageParam?.cursor,
            expectedGeneration: pageParam?.generation,
          },
          signal,
        }),
      ),
    getNextPageParam: (lastPage: FarePage<T>) =>
      lastPage.nextCursor
        ? { cursor: lastPage.nextCursor, generation: lastPage.generation }
        : undefined,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
export const fareDetailOptions = (
  noc: string,
  id: string,
  generation?: string,
) =>
  queryOptions({
    queryKey: ["fares-v1", code(noc), "detail", id, generation],
    queryFn: async ({ signal }) =>
      readFareResponse<FareItem>(
        await getFareCatalogue({
          data: { noc, action: "detail", id, generation },
          signal,
        }),
      ),
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
export const journeyFaresOptions = (request: FareRequest) =>
  farePagesOptions<JourneyFares>(request);
