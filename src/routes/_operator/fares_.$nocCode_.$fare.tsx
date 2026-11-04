import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { loadOperator } from "@/data/operator";
import { fareDetailOptions, staticQuery } from "@/data/queries";
import FareDetail from "@/components/pages/FareDetail";
export const Route = createFileRoute("/_operator/fares_/$nocCode_/$fare")({
  loader: async ({ context, params }) => {
    const id = Number(params.fare);
    if (!/^[1-9]\d*$/.test(params.fare) || !Number.isSafeInteger(id))
      throw notFound();
    const [, detail] = await Promise.all([
      loadOperator(context.queryClient, params.nocCode),
      context.queryClient.query(
        staticQuery(fareDetailOptions(params.nocCode, id)),
      ),
    ]);
    if (!detail) throw notFound();
    return detail;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.entity.name || "Fare details"} | bus.rip` }],
  }),
  component: FarePage,
});
function FarePage() {
  const { nocCode, fare } = Route.useParams();
  const { data } = useSuspenseQuery(fareDetailOptions(nocCode, Number(fare)));
  if (!data) throw notFound();
  return <FareDetail key={fare} noc={nocCode} detail={data} />;
}
