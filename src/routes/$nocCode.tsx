import { lazy, Suspense } from "react";
import {
  ClientOnly,
  createFileRoute,
  notFound,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { operatorOptions, staticQuery } from "@/data/queries";
import InfoLayout from "@/components/InfoLayout";

const MapPage = lazy(() => import("@/components/pages/Map"));
const PageDrawer = lazy(() => import("@/components/PageDrawer"));
export const Route = createFileRoute("/$nocCode")({
  loader: async ({ context, params }) => {
    const operator = await context.queryClient.query(
      staticQuery(operatorOptions(params.nocCode)),
    );
    if (!operator) throw notFound();
    return operator;
  },
  component: OperatorLayout,
});

function OperatorLayout() {
  const { nocCode } = Route.useParams();
  const { data: operator } = useSuspenseQuery(operatorOptions(nocCode));
  const location = useLocation();
  const isMap = location.pathname.replace(/\/$/, "") === `/${nocCode}`;
  const showMap = isMap || location.state.mapView === true;
  if (showMap)
    return (
      <>
        <ClientOnly
          fallback={
            <p role="status" className="p-8">
              Loading map…
            </p>
          }
        >
          <Suspense
            fallback={
              <p role="status" className="p-8">
                Loading map…
              </p>
            }
          >
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
              <p role="status" className="fixed bottom-4 left-4">
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
