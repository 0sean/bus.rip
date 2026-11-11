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
  if (isMap)
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
        <Outlet />
      </>
    );
  return (
    <InfoLayout operator={operator!}>
      <Outlet />
    </InfoLayout>
  );
}
