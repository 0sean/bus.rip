import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/$nocCode/")({
  ssr: "data-only",
  validateSearch: (
    search: Record<string, unknown>,
  ): { vehicleId?: string } => ({
    vehicleId:
      typeof search.vehicleId === "string" ? search.vehicleId : undefined,
  }),
  component: () => null,
});
