import { lazy, Suspense } from "react";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";

const MapPage = lazy(() => import("@/components/pages/Map"));

export const Route = createFileRoute("/map")({
  ssr: "data-only",
  validateSearch: (
    search: Record<string, unknown>,
  ): { vehicleId?: string } => ({
    vehicleId:
      typeof search.vehicleId === "string" ? search.vehicleId : undefined,
  }),
  component: Nearby,
});

function Nearby() {
  const { vehicleId } = Route.useSearch();
  return (
    <ClientOnly>
      <Suspense fallback={null}>
        <MapPage vehicleId={vehicleId} />
      </Suspense>
    </ClientOnly>
  );
}
