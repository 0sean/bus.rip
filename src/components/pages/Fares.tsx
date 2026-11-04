import { lazy, Suspense, useMemo, useState } from "react";
import { ClientOnly, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { IconChevronRight, IconSearch } from "@tabler/icons-react";
import { fareCatalogueOptions, stopsOptions } from "@/data/queries";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { FareMapPlaceholder } from "../map/FareMapPlaceholder";
const FareMap = lazy(() => import("../map/FareMap"));
export default function Fares({ noc }: { noc: string }) {
  const [category, setCategory] = useState<"zone" | "product">("zone");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(60);
  const query = useQuery(fareCatalogueOptions(noc));
  const stops = useQuery(stopsOptions(noc));
  const groups = category === "zone" ? query.data?.zones : query.data?.tickets;
  const filtered = useMemo(() => {
    const text = search.trim().toLocaleLowerCase("en-GB");
    return (groups ?? []).filter((group) =>
      [group.name, ...group.lines].some((value) =>
        value.toLocaleLowerCase("en-GB").includes(text),
      ),
    );
  }, [groups, search]);
  return (
    <main className="flex flex-col gap-6">
      <h1 className="sr-only">Fares</h1>
      {query.isPending || stops.isPending ? (
        <FareMapPlaceholder />
      ) : query.data ? (
        <ClientOnly fallback={<FareMapPlaceholder />}>
          <Suspense fallback={<FareMapPlaceholder />}>
            <FareMap
              noc={noc}
              zones={query.data.zones}
              stops={stops.data ?? []}
              unavailable={!!stops.error}
            />
          </Suspense>
        </ClientOnly>
      ) : null}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex gap-2" aria-label="Fare categories">
          <Button
            variant={category === "zone" ? "default" : "outline"}
            aria-pressed={category === "zone"}
            onClick={() => {
              setCategory("zone");
              setLimit(60);
            }}
          >
            Fare zones{query.data ? ` (${query.data.zones.length})` : ""}
          </Button>
          <Button
            variant={category === "product" ? "default" : "outline"}
            aria-pressed={category === "product"}
            onClick={() => {
              setCategory("product");
              setLimit(60);
            }}
          >
            Tickets{query.data ? ` (${query.data.tickets.length})` : ""}
          </Button>
        </div>
        <div className="relative sm:w-80">
          <IconSearch
            aria-hidden
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
          />
          <Input
            aria-label="Search fares and routes"
            placeholder="Search fares or routes"
            disabled={!query.data}
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setLimit(60);
            }}
          />
        </div>
      </div>
      {query.data ? (
        <p role="status" className="text-sm text-muted-foreground">
          {filtered.length} {category === "zone" ? "fare zone" : "ticket type"}
          {filtered.length === 1 ? "" : "s"}
          {search.trim() ? " matching your search" : ""}
        </p>
      ) : null}
      <div
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
        aria-label={category === "zone" ? "Fare zones" : "Tickets"}
      >
        {filtered.slice(0, limit).map((group) => (
          <Link
            key={group.id}
            to="/fares/$nocCode/$fare"
            params={{ nocCode: noc, fare: String(group.id) }}
            className="group flex min-w-0 items-center gap-3 rounded-[14px] bg-card p-4 text-card-foreground ring-1 ring-foreground/10 shadow-sm hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-medium wrap-anywhere">
                {group.name}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {category === "zone"
                  ? `${group.stops.length} published stop${group.stops.length === 1 ? "" : "s"}`
                  : "Choose a route to see journey prices"}
                {group.lines.length
                  ? ` · ${group.lines.length} route${group.lines.length === 1 ? "" : "s"}`
                  : ""}
              </p>
              {group.lines.length ? (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  Routes {group.lines.join(", ")}
                </p>
              ) : null}
            </div>
            <IconChevronRight
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground"
            />
          </Link>
        ))}
      </div>
      {query.isPending ? (
        <p role="status" className="text-muted-foreground py-8 text-center">
          Loading all fare zones and ticket types…
        </p>
      ) : null}
      {query.error ? (
        <div role="alert" className="text-center py-8">
          <p>Fares could not load. Please try again.</p>
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : null}
      {query.data && !filtered.length ? (
        <p role="status" className="text-muted-foreground text-center py-8">
          {search.trim()
            ? "No fares match your search."
            : category === "zone"
              ? "No fare zones are published for this operator. Try Tickets."
              : "No tickets are published for this operator yet."}
        </p>
      ) : null}
      {filtered.length > limit ? (
        <Button
          variant="outline"
          className="self-center"
          onClick={() => setLimit((n) => n + 60)}
        >
          Show more {category === "zone" ? "zones" : "ticket types"} (
          {filtered.length - limit} remaining)
        </Button>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Published fares from Bus Open Data Service. Availability and prices may
        vary by journey and ticket conditions.
      </p>
    </main>
  );
}
