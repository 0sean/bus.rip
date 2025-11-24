import Route from "@/components/pages/Route";
import { DrawerTitle } from "@/components/ui/drawer";
import { getRoute } from "@/lib/buslane";

export default async function RouteModal({
  params,
}: {
  params: Promise<{ nocCode: string; route: string }>;
}) {
  const { route: routeId, nocCode } = await params,
    route = await getRoute(routeId);

  return (
    <>
      <DrawerTitle className="sr-only">Route Details</DrawerTitle>
      <div className="px-4 pb-4 h-full flex flex-col">
        {!("error" in route) && <Route route={route} noc={nocCode} />}
      </div>
    </>
  );
}
