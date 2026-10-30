import { createFileRoute } from "@tanstack/react-router";
import { operatorsOptions, staticQuery } from "@/data/queries";
import { Header } from ".";
import { OperatorForm } from "@/components/OperatorForm";
import { Navbar } from "@/components/Navbar";

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
    <div className="safe-area-page flex flex-col min-h-svh gap-6">
      <Header />
      <Content />
      <Navbar />
    </div>
  );
}

function Content() {
  return (
    <div className="flex flex-col gap-4 grow justify-end">
      <div>
        <h1 className="text-3xl font-bold">Find any bus timetable in the UK</h1>
        <p className="text-muted-foreground font-semibold">
          Powered by Bus Open Data Service
        </p>
      </div>
      <OperatorForm to="/timetables/$nocCode" />
    </div>
  );
}
