import HomeForm from "@/components/HomeForm";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { operatorsOptions } from "@/data/queries";

export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(operatorsOptions()),
  headers: ({ loaderData }) => ({
    "Cache-Control":
      loaderData === undefined
        ? "no-store"
        : "public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=86400",
  }),
  component: Home,
});

function Home() {
  const { data: lines } = useSuspenseQuery(operatorsOptions());

  return (
    <div className="flex flex-col justify-center h-svh p-8 md:p-12">
      <HomeForm lines={lines} />
      <div className="absolute bottom-8 left-8 md:bottom-12 md:left-12 flex flex-col gap-1">
        <a
          href="https://transit.fyi/"
          className="text-zinc-500 hover:text-zinc-100 transition-colors text-sm"
          target="_blank"
        >
          A <span className="font-semibold">Transit.fyi</span> project
        </a>
        <a
          href="https://www.bus-data.dft.gov.uk/"
          className="text-zinc-500 hover:text-zinc-100 transition-colors text-xs"
          target="_blank"
        >
          Powered by{" "}
          <span className="font-semibold">Bus Open Data Service</span>
        </a>
      </div>
    </div>
  );
}
