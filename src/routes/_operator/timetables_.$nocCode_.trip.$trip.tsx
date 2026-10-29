import { loadOperator } from "@/data/operator";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { staticQuery, tripOptions } from "@/data/queries";
import Trip from "@/components/pages/Trip";
export const Route = createFileRoute(
  "/_operator/timetables_/$nocCode_/trip/$trip",
)({
  loader: async ({ context, params }) => {
    const [, data] = await Promise.all([
      loadOperator(context.queryClient, params.nocCode),
      context.queryClient.query(staticQuery(tripOptions(params.trip))),
    ]);
    return data;
  },
  head: () => ({ meta: [{ title: "Trip details | bus.rip" }] }),
  component: TripPage,
});
function TripPage() {
  const { trip: tripId } = Route.useParams();
  const { data: trip } = useSuspenseQuery(tripOptions(tripId));
  return <Trip trip={trip} />;
}
