import {
  createFileRoute,
  notFound,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { loadOperator } from "@/data/operator";
import { fareDetailOptions } from "@/data/queries";
import { fareIdPattern } from "@/lib/fares";
import FareDetail from "@/components/pages/FareDetail";
import { FareError } from "@/components/pages/FareCatalogueList";
export const Route = createFileRoute("/_operator/fares_/$nocCode_/$fare")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { generation?: string } => ({
    generation:
      typeof search.generation === "string" &&
      /^[1-9]\d{0,19}$/.test(search.generation)
        ? search.generation
        : undefined,
  }),
  loaderDeps: ({ search }) => ({ generation: search.generation }),
  loader: async ({ context, params, deps }) => {
    if (!fareIdPattern.test(params.fare)) throw notFound();
    const [, detail] = await Promise.all([
      loadOperator(context.queryClient, params.nocCode),
      context.queryClient.ensureQueryData(
        fareDetailOptions(params.nocCode, params.fare, deps.generation),
      ),
    ]);
    return detail;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.data.name || "Fare details"} | bus.rip` }],
  }),
  errorComponent: FareRouteError,
  notFoundComponent: MissingFare,
  component: FarePage,
});
function FareRouteError({ error, reset }: ErrorComponentProps) {
  const { nocCode } = Route.useParams();
  return (
    <main className="py-8">
      <FareError
        noc={nocCode}
        error={
          error instanceof Error ? error : new Error("Fares could not load")
        }
        retry={reset}
      />
    </main>
  );
}
function MissingFare() {
  const { nocCode } = Route.useParams();
  return (
    <main className="py-8 space-y-4">
      <h1 className="text-xl font-semibold">This fare link is unavailable</h1>
      <p>
        Fares now use stable catalogue links. Choose a ticket from the latest
        fares.
      </p>
      <a className="underline" href={`/fares/${encodeURIComponent(nocCode)}`}>
        Browse latest fares
      </a>
    </main>
  );
}
function FarePage() {
  const { nocCode, fare } = Route.useParams();
  const { generation } = Route.useSearch();
  const { data } = useSuspenseQuery(
    fareDetailOptions(nocCode, fare, generation),
  );
  return (
    <FareDetail
      key={`${fare}:${data.generation}`}
      noc={nocCode}
      detail={data}
    />
  );
}
