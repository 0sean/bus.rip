import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fareMapOptions, stopsOptions } from "@/data/queries";
import { FareError } from "./FareCatalogueList";
import { FareMapPlaceholder } from "../map/FareMapPlaceholder";
import { Button } from "../ui/button";

const FareMap = lazy(() => import("../map/FareMap"));

export function FareOverviewMap({ noc }: { noc: string }) {
  const areas = useQuery(fareMapOptions(noc));
  const locations = useQuery(stopsOptions(noc));
  return (
    <section aria-label="All ticket areas" className="min-w-0">
      {areas.error ? (
        <FareError
          error={areas.error}
          noc={noc}
          retry={() => void areas.refetch()}
        />
      ) : areas.isPending || locations.isPending ? (
        <FareMapPlaceholder overview />
      ) : areas.data ? (
        <ClientOnly fallback={<FareMapPlaceholder overview />}>
          <Suspense fallback={<FareMapPlaceholder overview />}>
            <FareMap
              noc={noc}
              generation={areas.data.generation}
              zones={areas.data.data}
              stops={locations.data ?? []}
              unavailable={!!locations.error}
              overview
            />
          </Suspense>
        </ClientOnly>
      ) : null}
      {locations.error ? (
        <Button variant="outline" onClick={() => void locations.refetch()}>
          Retry stop locations
        </Button>
      ) : null}
    </section>
  );
}
