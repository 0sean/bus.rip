import { loadOperator } from "@/data/operator";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_operator/map/$nocCode")({
  loader: ({ context, params }) =>
    loadOperator(context.queryClient, params.nocCode),
  ssr: "data-only",
  validateSearch: (
    search: Record<string, unknown>,
  ): { vehicleId?: string } => ({
    vehicleId:
      typeof search.vehicleId === "string" ? search.vehicleId : undefined,
  }),
  component: () => null,
});
