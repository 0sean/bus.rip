import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { operatorsOptions, staticQuery } from "@/data/queries";
import { Header } from ".";
import { OperatorForm } from "@/components/OperatorForm";

export const Route = createFileRoute("/timetables")({
  loader: async ({ context }) => {
    await context.queryClient.query(staticQuery(operatorsOptions()));
  },
  headers: () => ({
    "Cache-Control":
      "public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=86400",
  }),
  component: Timetables,
});

function Timetables() {
  return (
    <div className="flex flex-col justify-between h-svh px-4 py-6">
      <Header />
      <Content />
    </div>
  );
}

function Content() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold">Find any bus timetable in the UK</h1>
        <p className="text-muted font-semibold">
          Powered by Bus Open Data Service
        </p>
      </div>
      <OperatorForm to="/$nocCode/timetables" />
    </div>
  );
}
