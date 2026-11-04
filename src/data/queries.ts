import {
  applyFarePublications,
  type FareCatalogue,
  type FareDetailData,
  type FarePublication,
} from "@/lib/fares";
import {
  getFares,
  getFareDetail,
  getFarePublications,
} from "@/functions/fares";
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

export const fareCatalogueOptions = (noc: string) =>
  queryOptions({
    queryKey: ["fare-catalogue", code(noc)],
    queryFn: async ({ signal }): Promise<FareCatalogue> => {
      const response = await getFares({ data: { noc }, signal });
      if (!response.ok)
        throw new Error("Fares data is temporarily unavailable");
      const catalogue: FareCatalogue = await response.json();
      if (!catalogue.pendingDocumentIds?.length) return catalogue;
      const ids = catalogue.pendingDocumentIds;
      const batches = Array.from(
        { length: Math.ceil(ids.length / 250) },
        (_, i) => ids.slice(i * 250, (i + 1) * 250),
      );
      const publications: FarePublication[] = [];
      let next = 0;
      await Promise.all(
        Array.from({ length: Math.min(2, batches.length) }, async () => {
          while (next < batches.length) {
            const batch = batches[next++];
            const response = await getFarePublications({
              data: {
                noc,
                ids: batch,
                generation: catalogue.generation ?? null,
              },
              signal,
            });
            if (!response.ok)
              throw new Error("Fares data is temporarily unavailable");
            publications.push(
              ...((await response.json()) as FarePublication[]),
            );
          }
        }),
      );
      return applyFarePublications(catalogue, publications);
    },
    staleTime: 3_600_000,
    retry: false,
  });

export const fareDetailOptions = (
  noc: string,
  id: number,
  documentId?: number,
) =>
  queryOptions({
    queryKey: ["fare-detail", code(noc), id, documentId],
    queryFn: async ({ signal }): Promise<FareDetailData | null> => {
      const response = await getFareDetail({
        data: { noc, id, documentId },
        signal,
      });
      if (!response.ok)
        throw new Error("Fares data is temporarily unavailable");
      return response.json();
    },
    staleTime: 3_600_000,
  });
