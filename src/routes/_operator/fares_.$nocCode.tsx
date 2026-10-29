import { loadOperator } from "@/data/operator";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_operator/fares_/$nocCode")({
  loader: ({ context, params }) =>
    loadOperator(context.queryClient, params.nocCode),
  head: () => ({ meta: [{ title: "Fares | bus.rip" }] }),
  component: () => (
    <>
      <h1 className="text-3xl font-semibold">Fares</h1>
      <p className="text-xl py-8 font-semibold opacity-50">Coming soon.</p>
    </>
  ),
});
