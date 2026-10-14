import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/$nocCode/fares")({
  head: () => ({ meta: [{ title: "Fares | bus.rip" }] }),
  component: () => (
    <>
      <h1 className="text-3xl font-semibold">Fares</h1>
      <p className="text-xl py-8 font-semibold opacity-50">Coming soon.</p>
    </>
  ),
});
