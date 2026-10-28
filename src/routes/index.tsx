import HomeForm from "@/components/HomeForm";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { operatorsOptions, staticQuery } from "@/data/queries";
import StackedLogo from "@/components/StackedLogo";
import {
  CircleQuestionMark,
  Loader2,
  MapPin,
  Route as RouteIcon,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { OperatorCombobox } from "@/components/OperatorCombobox";
import { Button } from "@/components/ui/button";
import { transformOperators } from "@/lib/utils";
import { useIsClient, useLocalStorage } from "@uidotdev/usehooks";
import { ClientOnlyStorage } from "@/components/ClientOnlyStorage";

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

function Header() {
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
      <Form />
    </div>
  );
}

function Form() {
  const navigate = useNavigate();
  const { data, isLoading } = useSuspenseQuery(operatorsOptions());
  const operators = useMemo(() => transformOperators(data), [data]);
  const [operator, setOperator] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <ClientOnlyStorage key="favourites" defaultValue={[] as string[]}>
        {(favourites, setFavourites) => (
          <OperatorCombobox
            options={operators}
            setValue={setOperator}
            value={operator}
            favourites={favourites}
            setFavourites={setFavourites}
            loading={isLoading}
          />
        )}
      </ClientOnlyStorage>
      <div className="grid gap-2 grid-cols-2">
        <Button variant="secondary" size="lg">
          <MapPin /> Find nearby
        </Button>
        <Button
          size="lg"
          disabled={isLoading || !operator || isPending}
          onClick={() =>
            startTransition(() => {
              navigate({ to: "/$nocCode", params: { nocCode: operator! } });
            })
          }
        >
          {isPending ? (
            <>
              <Loader2 className="animate-spin" /> Loading...
            </>
          ) : (
            <>
              <RouteIcon /> Track
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
