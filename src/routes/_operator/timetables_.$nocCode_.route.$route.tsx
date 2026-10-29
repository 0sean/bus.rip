import { loadOperator } from "@/data/operator";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { routeOptions, staticQuery } from "@/data/queries";
import RouteDetails from "@/components/pages/Route";
export const Route = createFileRoute(
  "/_operator/timetables_/$nocCode_/route/$route",
)({
  loader: async ({ context, params }) => {
    const [, data] = await Promise.all([
      loadOperator(context.queryClient, params.nocCode),
      context.queryClient.query(staticQuery(routeOptions(params.route))),
    ]);
    return data;
  },
  head: () => ({ meta: [{ title: "Route details | bus.rip" }] }),
  component: RoutePage,
});
function RoutePage() {
  const { route: routeId, nocCode } = Route.useParams();
  const { data: route } = useSuspenseQuery(routeOptions(routeId));
  return <RouteDetails route={route} noc={nocCode} />;
}
