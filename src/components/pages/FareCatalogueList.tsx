import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { IconChevronRight, IconSearch } from "@tabler/icons-react";
import { farePagesOptions, routesOptions } from "@/data/queries";
import { fareRouteTitles } from "@/lib/fare-route";
import { FareRouteCard } from "./FareRouteCard";
import {
  FareApiError,
  ticketPrice,
  familyPrice,
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
  presentation = "default",
  routeTitle,
}: {
  item: FareItem;
  noc: string;
  generation: string;
  priceLabel?: string;
  presentation?: "default" | "zone";
  routeTitle?: string;
}) {
  if (item.kind === "route")
    return (
      <FareRouteCard
        item={item}
        noc={noc}
        generation={generation}
        title={routeTitle}
      />
    );
  const variants = item.variant_count ?? item.ticket_count;
  const zoneTicket = presentation === "zone" && item.kind === "ticket";
  const duration = item.duration?.length
    ? item.duration.map(fareTerm).join(" · ")
    : [
        ...new Set(
          item.duration_rules
            ?.map(
              (rule) =>
                rule.name ||
                (rule.duration ? fareTerm(rule.duration.toUpperCase()) : ""),
            )
            .filter(Boolean),
        ),
      ].join(" · ");
  const zoneDescription = [
    duration || (item.product_type === "singleTrip" ? "Single journey" : ""),
    ...(item.eligibility ?? []).map(fareTerm),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link
      to="/fares/$nocCode/$fare"
      params={{
        nocCode: noc,
        fare:
          item.kind === "family" ? (item.single_ticket_id ?? item.id) : item.id,
      }}
      search={{ generation }}
      className="group flex min-h-[70px] min-w-0 items-center gap-3 rounded-[14px] bg-card p-4 text-card-foreground ring-1 ring-foreground/10 shadow-sm hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium wrap-anywhere">{item.name}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {zoneTicket
            ? zoneDescription || "Published ticket conditions apply"
            : item.kind === "area"
              ? `${item.stop_count ?? 0} published stops · ${item.ticket_count} ${item.ticket_count === 1 ? "ticket" : "ticket variants"}${item.membership === "incomplete" ? " · Incomplete coverage" : ""}`
              : item.kind === "family"
                ? `${variants > 1 ? `${variants} variants · ` : ""}Check passenger and ticket conditions`
                : (priceLabel ?? ticketPrice(item))}
        </p>
        {item.kind === "ticket" && !zoneTicket ? (
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
      {item.kind === "family" || zoneTicket ? (
        <p className="max-w-[45%] shrink-0 text-right text-sm font-medium wrap-anywhere">
          {zoneTicket ? (priceLabel ?? ticketPrice(item)) : familyPrice(item)}
        </p>
      ) : null}
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
  toolbarStart,
  presentation = "default",
}: {
  request: FareRequest;
  compact?: boolean;
  toolbarStart?: ReactNode;
  presentation?: "default" | "zone";
}) {
  const [search, setSearch] = useState("");
  const [prefix, setPrefix] = useState("");
  const routeList =
    request.action === "routes" || request.action === "ticketRoutes";
  const timetables = useQuery({
    ...routesOptions(request.noc),
    enabled: routeList,
    retry: false,
  });
  const routeTitles = useMemo(
    () => fareRouteTitles(routeList ? (timetables.data ?? []) : []),
    [routeList, timetables.data],
  );
  useEffect(() => {
    const timeout = setTimeout(() => setPrefix(search.trim()), 250);
    return () => clearTimeout(timeout);
  }, [search]);
  const searchable =
    presentation !== "zone" &&
    [
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
  const resultCount =
    generation && items.length ? (
      <p role="status" className="text-sm text-muted-foreground">
        Showing {items.length}{" "}
        {query.hasNextPage
          ? "results so far"
          : items.length === 1
            ? "result"
            : "results"}
        {prefix ? " matching your search" : ""}
      </p>
    ) : null;
  const searchField = searchable ? (
    <div
      className={
        toolbarStart
          ? "relative w-full sm:w-80 sm:shrink-0"
          : "relative w-full sm:max-w-80"
      }
    >
      <IconSearch
        aria-hidden
        className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
      />
      <Input
        aria-label="Search fares by name prefix"
        placeholder="Search by beginning of name"
        maxLength={120}
        className="h-8 pl-9"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  ) : null;
  return (
    <div className="flex flex-col gap-4 min-w-0">
      {toolbarStart ? (
        <div
          className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
          aria-label="Fare browsing controls"
        >
          {toolbarStart}
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
            <div className="shrink-0">{resultCount}</div>
            {searchField}
          </div>
        </div>
      ) : (
        searchField
      )}
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
          {!toolbarStart && presentation !== "zone" ? resultCount : null}
          <div
            className={`grid grid-cols-1 ${presentation === "zone" || compact ? "sm:grid-cols-2" : routeList ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4"} gap-4`}
          >
            {items.map((item) => (
              <FareCard
                key={item.id}
                item={item}
                noc={request.noc}
                generation={generation}
                presentation={presentation}
                routeTitle={
                  item.kind === "route"
                    ? routeTitles.get(item.line?.trim().toLowerCase() ?? "")
                    : undefined
                }
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
