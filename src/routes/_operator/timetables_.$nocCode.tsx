import { loadOperator } from "@/data/operator";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { routesOptions, staticQuery } from "@/data/queries";
import Timetables from "@/components/pages/Timetables";
export const Route = createFileRoute("/_operator/timetables_/$nocCode")({
  loader: async ({ context, params }) => {
    const [, data] = await Promise.all([
      loadOperator(context.queryClient, params.nocCode),
      context.queryClient.query(staticQuery(routesOptions(params.nocCode))),
    ]);
    return data;
  },
  head: () => ({ meta: [{ title: "Timetables | bus.rip" }] }),
  component: TimetablesPage,
});
function TimetablesPage() {
  const { nocCode } = Route.useParams();
  const { data: routes } = useSuspenseQuery(routesOptions(nocCode));
  return <Timetables key={nocCode} routes={routes} noc={nocCode} />;
}
