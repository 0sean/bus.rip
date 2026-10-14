import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { routesOptions } from "@/data/queries";
import Timetables from "@/components/pages/Timetables";
export const Route = createFileRoute("/$nocCode/timetables")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(routesOptions(params.nocCode)),
  head: () => ({ meta: [{ title: "Timetables | bus.rip" }] }),
  component: TimetablesPage,
});
function TimetablesPage() {
  const { nocCode } = Route.useParams();
  const { data: routes } = useSuspenseQuery(routesOptions(nocCode));
  return (
    <>
      <h1 className="text-3xl font-semibold">Timetables</h1>
      <Timetables routes={routes} noc={nocCode} />
    </>
  );
}
