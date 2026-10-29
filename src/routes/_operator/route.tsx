import { lazy, Suspense } from "react";
import {
  ClientOnly,
  createFileRoute,
  notFound,
  Outlet,
  useLocation,
  useParams,
} from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { operatorOptions } from "@/data/queries";
import InfoLayout from "@/components/InfoLayout";

const MapPage = lazy(() => import("@/components/pages/Map"));
const PageDrawer = lazy(() => import("@/components/PageDrawer"));
export const Route = createFileRoute("/_operator")({
  component: OperatorLayout,
});

function OperatorLayout() {
  const nocCode = useParams({
    strict: false,
    select: (params) => {
      if (!params.nocCode) throw notFound();
      return params.nocCode;
    },
  });
  const { data: operator } = useSuspenseQuery(operatorOptions(nocCode));
  const location = useLocation();
  const isMap = location.pathname.replace(/\/$/, "") === `/map/${nocCode}`;
  const showMap = isMap || location.state.mapView === true;
  if (showMap)
    return (
      <>
        <ClientOnly>
          <Suspense fallback={null}>
            <MapPage
              nocCode={nocCode}
              vehicleId={
                typeof location.search.vehicleId === "string"
                  ? location.search.vehicleId
                  : undefined
              }
            />
          </Suspense>
        </ClientOnly>
        {isMap ? (
          <Outlet />
        ) : (
          <Suspense
            fallback={
              <p
                role="status"
                className="fixed bottom-[calc(var(--safe-area-bottom)+1rem)] left-[calc(var(--safe-area-left)+1rem)]"
              >
                Loading…
              </p>
            }
          >
            <PageDrawer nocCode={nocCode}>
              <Outlet />
            </PageDrawer>
          </Suspense>
        )}
      </>
    );
  return (
    <InfoLayout operator={operator!}>
      <Outlet />
    </InfoLayout>
  );
}
