import { lazy, Suspense, useMemo } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fareMapOptions } from "@/data/queries";
import { FareError } from "./FareCatalogueList";
import { FareMapPlaceholder } from "../map/FareMapPlaceholder";
import type { Stop } from "@/lib/buslane";

const NO_STOPS: Stop[] = [];

const FareMap = lazy(() => import("../map/FareMap"));

export function FareOverviewMap({ noc }: { noc: string }) {
  const areas = useQuery(fareMapOptions(noc));
  const geometry = areas.data?.data;
  const zones = useMemo(
    () => geometry?.zones.map((zone) => ({ ...zone, stops: [] })) ?? [],
    [geometry],
  );
  return (
    <section aria-label="All ticket areas" className="min-w-0">
      {areas.error ? (
        <FareError
          error={areas.error}
          noc={noc}
          retry={() => void areas.refetch()}
        />
      ) : areas.isPending ? (
        <FareMapPlaceholder overview />
      ) : areas.data ? (
        <ClientOnly fallback={<FareMapPlaceholder overview />}>
          <Suspense fallback={<FareMapPlaceholder overview />}>
            <FareMap
              noc={noc}
              generation={areas.data.generation}
              zones={zones}
              stops={NO_STOPS}
              precomputed={geometry}
              overview
            />
          </Suspense>
        </ClientOnly>
      ) : null}
    </section>
  );
}
