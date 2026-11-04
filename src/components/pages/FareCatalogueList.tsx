import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { IconChevronRight, IconSearch } from "@tabler/icons-react";
import { farePagesOptions } from "@/data/queries";
import {
  FareApiError,
  ticketPrice,
  fareTerm,
  type FareItem,
  type FareRequest,
} from "@/lib/fares";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function FareError({
  error,
  noc,
  retry,
}: {
  error: Error;
  noc: string;
  retry?: () => void;
}) {
  const expired =
    error instanceof FareApiError && [404, 409, 410].includes(error.status);
  return (
    <div role="alert" className="rounded-[14px] border p-4 text-sm space-y-3">
      <p>
        {expired ? error.message : "Fares could not load. Please try again."}
      </p>
      {expired ? (
        <a href={`/fares/${encodeURIComponent(noc)}`} className="underline">
          Load latest fares
        </a>
      ) : retry ? (
        <Button variant="outline" onClick={retry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
export function FareCard({
  item,
  noc,
  generation,
  priceLabel,
}: {
  item: FareItem;
  noc: string;
  generation: string;
  priceLabel?: string;
}) {
  return (
    <Link
      to="/fares/$nocCode/$fare"
      params={{ nocCode: noc, fare: item.id }}
      search={{ generation }}
      className="group flex min-w-0 items-center gap-3 rounded-[14px] bg-card p-4 text-card-foreground ring-1 ring-foreground/10 shadow-sm hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium wrap-anywhere">{item.name}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {item.kind === "area"
            ? `${item.stop_count ?? 0} published stops · ${item.ticket_count} ticket variants${item.membership === "incomplete" ? " · Incomplete coverage" : ""}`
            : item.kind === "family"
              ? `${item.variant_count ?? item.ticket_count} variants · Check passenger and ticket conditions`
              : item.kind === "route"
                ? `Choose your journey${item.directions?.length ? ` · ${item.directions.join(" / ")}` : ""}`
                : (priceLabel ?? ticketPrice(item))}
        </p>
        {item.kind === "ticket" ? (
          <p className="text-xs text-muted-foreground mt-1">
            {[
              ...(item.eligibility ?? []),
              ...(item.duration ?? []),
              ...(item.sales_channels ?? []),
            ]
              .map(fareTerm)
              .join(" · ") || "Published ticket conditions apply"}
          </p>
        ) : null}
      </div>
      <IconChevronRight
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground"
      />
    </Link>
  );
}
export function FareCatalogueList({
  request,
  compact = false,
}: {
  request: FareRequest;
  compact?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [prefix, setPrefix] = useState("");
  useEffect(() => {
    const timeout = setTimeout(() => setPrefix(search.trim()), 250);
    return () => clearTimeout(timeout);
  }, [search]);
  const searchable = [
    "areas",
    "families",
    "tickets",
    "routes",
    "areaFamilies",
    "areaTickets",
    "familyTickets",
  ].includes(request.action);
  const query = useInfiniteQuery(
    farePagesOptions({
      ...request,
      q: searchable ? prefix || undefined : undefined,
    }),
  );
  const expired =
    query.error instanceof FareApiError &&
    [404, 409, 410].includes(query.error.status);
  const items = expired ? [] : (query.data?.pages.flatMap((p) => p.data) ?? []);
  const generation = query.data?.pages[0]?.generation;
  return (
    <div className="flex flex-col gap-4 min-w-0">
      {searchable ? (
        <div className="relative sm:max-w-80">
          <IconSearch
            aria-hidden
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
          />
          <Input
            aria-label="Search fares by name prefix"
            placeholder="Search by beginning of name"
            maxLength={120}
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      ) : null}
      {query.isPending ? (
        <p role="status" className="text-sm text-muted-foreground py-8">
          Loading fares…
        </p>
      ) : null}
      {query.error ? (
        <FareError
          error={query.error}
          noc={request.noc}
          retry={() => {
            void (query.isFetchNextPageError
              ? query.fetchNextPage()
              : query.refetch());
          }}
        />
      ) : null}
      {generation && items.length ? (
        <>
          <p role="status" className="text-sm text-muted-foreground">
            Showing {items.length}{" "}
            {query.hasNextPage
              ? "results so far"
              : items.length === 1
                ? "result"
                : "results"}
            {prefix ? " matching your search" : ""}
          </p>
          <div
            className={`grid grid-cols-1 ${compact ? "sm:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-4"} gap-4`}
          >
            {items.map((item) => (
              <FareCard
                key={item.id}
                item={item}
                noc={request.noc}
                generation={generation}
              />
            ))}
          </div>
        </>
      ) : null}
      {!query.isPending && !query.error && !items.length ? (
        <p role="status" className="text-sm text-muted-foreground py-8">
          {prefix
            ? "No fares match this name prefix."
            : "No items are published here. Try another category or check with the operator."}
        </p>
      ) : null}
      {!expired && query.hasNextPage ? (
        <Button
          className="self-center"
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? "Loading…" : "Show more"}
        </Button>
      ) : null}
    </div>
  );
}
