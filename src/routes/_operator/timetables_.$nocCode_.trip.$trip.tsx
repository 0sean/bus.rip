import { loadOperator } from "@/data/operator";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { routeOptions, staticQuery, tripOptions } from "@/data/queries";
import Trip from "@/components/pages/Trip";
export const Route = createFileRoute(
  "/_operator/timetables_/$nocCode_/trip/$trip",
)({
  loader: async ({ context, params }) => {
    const [, data] = await Promise.all([
      loadOperator(context.queryClient, params.nocCode),
      context.queryClient.query(staticQuery(tripOptions(params.trip))),
    ]);
    await context.queryClient.query(
      staticQuery(routeOptions(String(data.route_id))),
    );
    return data;
  },
  head: () => ({ meta: [{ title: "Trip details | bus.rip" }] }),
  component: TripPage,
});
function TripPage() {
  const { trip: tripId, nocCode } = Route.useParams();
  const { data: trip } = useSuspenseQuery(tripOptions(tripId));
  const { data: route } = useSuspenseQuery(routeOptions(String(trip.route_id)));
  return <Trip trip={trip} route={route} noc={nocCode} />;
}
