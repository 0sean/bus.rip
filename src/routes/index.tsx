import { createFileRoute } from "@tanstack/react-router";
import { operatorsOptions, staticQuery } from "@/data/queries";
import StackedLogo from "@/components/StackedLogo";
import { CircleQuestionMark } from "lucide-react";
import { OperatorForm } from "@/components/OperatorForm";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await context.queryClient.query(staticQuery(operatorsOptions()));
  },
  headers: () => ({
    "Cache-Control":
      "public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=86400",
  }),
  component: Home,
});

function Home() {
  return (
    <div className="flex flex-col justify-between h-svh px-4 py-6">
      <Header />
      <Content />
    </div>
  );
}

export function Header() {
  return (
    <div className="flex w-full items-center justify-between">
      <StackedLogo />
      <div className="flex gap-2 text-muted">
        <p className="font-semibold text-xs">Bus info that actually works</p>
        <CircleQuestionMark size={16} />
      </div>
    </div>
  );
}

function Content() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold">Find any bus in the UK</h1>
        <p className="text-muted font-semibold">
          Powered by Bus Open Data Service
        </p>
      </div>
      <OperatorForm to="/$nocCode" />
    </div>
  );
}
