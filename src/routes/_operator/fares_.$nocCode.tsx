import { loadOperator } from "@/data/operator";
import { createFileRoute } from "@tanstack/react-router";
import Fares from "@/components/pages/Fares";
export const Route = createFileRoute("/_operator/fares_/$nocCode")({
  loader: ({ context, params }) =>
    loadOperator(context.queryClient, params.nocCode),
  head: () => ({ meta: [{ title: "Fares | bus.rip" }] }),
  component: FaresPage,
});
function FaresPage() {
  const { nocCode } = Route.useParams();
  return <Fares key={nocCode} noc={nocCode} />;
}
