import { createFileRoute } from "@tanstack/react-router";
import { locationsOptions, staticQuery, stopsOptions } from "@/data/queries";
export const Route = createFileRoute("/$nocCode/")({
  ssr: "data-only",
  validateSearch: (
    search: Record<string, unknown>,
  ): { vehicleId?: string } => ({
    vehicleId:
      typeof search.vehicleId === "string" ? search.vehicleId : undefined,
  }),
  loader: async ({ context, params }) => {
    // Secondary stop data streams through the SSR Query integration.
    void context.queryClient.query(stopsOptions(params.nocCode));
    await context.queryClient.query(staticQuery(locationsOptions(params.nocCode)));
  },
  component: () => null,
});
