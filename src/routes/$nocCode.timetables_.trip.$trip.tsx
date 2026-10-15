import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { staticQuery, tripOptions } from "@/data/queries";
import Trip from "@/components/pages/Trip";
export const Route = createFileRoute("/$nocCode/timetables_/trip/$trip")({
  loader: ({ context, params }) =>
    context.queryClient.query(staticQuery(tripOptions(params.trip))),
  head: () => ({ meta: [{ title: "Trip details | bus.rip" }] }),
  component: TripPage,
});
function TripPage() {
  const { trip: tripId } = Route.useParams();
  const { data: trip } = useSuspenseQuery(tripOptions(tripId));
  return <Trip trip={trip} />;
}
