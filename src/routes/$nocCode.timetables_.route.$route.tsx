import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { routeOptions } from "@/data/queries";
import RouteDetails from "@/components/pages/Route";
export const Route = createFileRoute("/$nocCode/timetables_/route/$route")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(routeOptions(params.route)),
  head: () => ({ meta: [{ title: "Route details | bus.rip" }] }),
  component: RoutePage,
});
function RoutePage() {
  const { route: routeId, nocCode } = Route.useParams();
  const { data: route } = useSuspenseQuery(routeOptions(routeId));
  return <RouteDetails route={route} noc={nocCode} />;
}
