import Route from "@/components/pages/Route";
import { getRoute } from "@/lib/buslane";

export default async function RoutePage({
  params,
}: {
  params: Promise<{ nocCode: string; route: string }>;
}) {
  const { route: routeId, nocCode } = await params,
    route = await getRoute(routeId);

  return <>{!("error" in route) && <Route route={route} noc={nocCode} />}</>;
}
