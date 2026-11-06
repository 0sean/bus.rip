import { lazy, Suspense, useState } from "react";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { fareRouteDirections } from "@/lib/fare-route";
import { FareMapPlaceholder } from "../map/FareMapPlaceholder";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  fareJourneyPointsOptions,
  fareRouteNetworkOptions,
  journeyFaresOptions,
} from "@/data/queries";
import {
  FareApiError,
  londonDate,
  money,
  type FareItem,
  type FareRequest,
} from "@/lib/fares";
import { FareCard, FareError } from "./FareCatalogueList";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Combobox,
  ComboboxTrigger,
  ComboboxContent,
  ComboboxInput,
  ComboboxEmpty,
  ComboboxList,
  ComboboxItem,
} from "../ui/combobox";
const OperatorRouteMap = lazy(() => import("../map/OperatorRouteMap"));

function PointPicker({
  request,
  label,
  value,
  onChange,
  enabled = true,
}: {
  enabled?: boolean;
  request: FareRequest;
  label: string;
  value: string;
  onChange: (id: string) => void;
}) {
  const query = useQuery({ ...fareJourneyPointsOptions(request), enabled });
  const points = query.data?.data ?? [];
  const expired =
    query.error instanceof FareApiError &&
    [404, 409, 410].includes(query.error.status);
  const selected = expired
    ? null
    : (points.find((point) => point.id === value) ?? null);
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <Combobox<FareItem>
        items={expired ? [] : points}
        value={selected}
        onValueChange={(point) => onChange(point?.id ?? "")}
        itemToStringLabel={(point) => point.name}
        itemToStringValue={(point) => point.id}
        isItemEqualToValue={(point, selected) => point.id === selected.id}
        disabled={!enabled || query.isPending || expired}
        autoHighlight
      >
        <ComboboxTrigger
          aria-label={label}
          render={
            <Button
              variant="outline"
              className="h-9 w-full min-w-0 justify-between bg-background px-3 font-normal [&>svg]:shrink-0"
            />
          }
        >
          <span className="truncate">
            {selected?.name ||
              (!enabled
                ? "Choose destination"
                : query.isPending
                  ? "Loading…"
                  : `Choose ${label === "From" ? "origin" : "destination"}`)}
          </span>
        </ComboboxTrigger>
        <ComboboxContent className="min-w-0">
          <ComboboxInput
            aria-label={
              label === "From" ? "Search origins" : "Search destinations"
            }
            placeholder="Search stops…"
            showTrigger={false}
          />
          <ComboboxEmpty>No stops found.</ComboboxEmpty>
          <ComboboxList>
            {(point: FareItem) => (
              <ComboboxItem key={point.id} value={point}>
                {point.name}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {query.error ? (
        <FareError
          error={query.error}
          noc={request.noc}
          retry={() => {
            void query.refetch();
          }}
        />
      ) : null}
      {enabled && !query.isPending && !query.error && !points.length ? (
        <p className="text-sm text-muted-foreground">
          No supported {label === "From" ? "origins" : "destinations"} are
          available for this direction.
        </p>
      ) : null}
    </div>
  );
}
export default function FareJourney({
  noc,
  route,
  generation,
}: {
  noc: string;
  route: FareItem;
  generation: string;
}) {
  const directions = fareRouteDirections(route);
  const mapQuery = useQuery({
    ...fareRouteNetworkOptions(noc, route.line ?? "", directions),
    enabled: !!route.line,
  });
  const routeTitle =
    [
      ...new Set(
        mapQuery.data?.routes.map((item) => item.long_name).filter(Boolean),
      ),
    ].join(" / ") || route.name.replace(/\s+(inbound|outbound)\s*$/i, "");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState(() => londonDate());
  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date;
  const query = useInfiniteQuery({
    ...journeyFaresOptions({
      noc,
      action: "journey",
      id: route.id,
      origin,
      destination,
      date,
      generation,
    }),
    enabled: !!origin && !!destination && validDate,
  });
  const expired =
    query.error instanceof FareApiError &&
    [404, 409, 410].includes(query.error.status);
  const candidates = expired
    ? []
    : (query.data?.pages.flatMap((p) => p.data.candidates) ?? []);
  return (
    <main className="fare-zone-page">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)] gap-4 items-start">
        <div className="relative min-w-0">
          {mapQuery.data ? (
            <Suspense fallback={<FareMapPlaceholder tall />}>
              <OperatorRouteMap
                noc={noc}
                routes={mapQuery.data.routes}
                networkData={mapQuery.data}
                variant="fare"
              />
            </Suspense>
          ) : (
            <div className="relative h-[var(--fare-zone-map-height,648px)] rounded-[14px] border bg-muted/30 flex items-center justify-center p-6">
              <p role="status" className="text-sm text-muted-foreground">
                {mapQuery.isPending && route.line
                  ? "Loading route map…"
                  : "Route map is unavailable."}
              </p>
              {mapQuery.error ? (
                <Button
                  className="absolute bottom-4"
                  variant="outline"
                  onClick={() => void mapQuery.refetch()}
                >
                  Retry map
                </Button>
              ) : null}
            </div>
          )}
          <div className="absolute left-3 top-3 right-3 sm:right-auto sm:max-w-[min(348px,calc(100%-24px))] rounded-[14px] bg-card p-4 shadow-sm ring-1 ring-foreground/10 flex items-start gap-3">
            <span className="rounded-sm bg-muted px-2 h-8 min-w-8 flex items-center justify-center text-sm font-medium shrink-0">
              {route.line || "Bus"}
            </span>
            <div className="min-w-0">
              <h1 className="text-sm font-medium leading-5">{routeTitle}</h1>
              {directions.length ? (
                <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
                  {directions[0] === "inbound" ? (
                    <IconArrowLeft className="size-3.5 shrink-0" />
                  ) : (
                    <IconArrowRight className="size-3.5 shrink-0" />
                  )}
                  <span className="capitalize">{directions.join(" / ")}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <section
          aria-label="Journey fares"
          className="min-w-0 flex flex-col gap-4 p-px lg:max-h-[var(--fare-zone-map-height)] lg:overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-muted-foreground/30"
        >
          <h2 className="sr-only">Find a journey fare</h2>
          <div className="rounded-[14px] bg-card p-4 ring-1 ring-foreground/10 flex flex-col gap-4">
            <div className="grid grid-cols-[minmax(0,1fr)_16px_minmax(0,1fr)] gap-3 items-start">
              <PointPicker
                request={{ noc, action: "origins", id: route.id, generation }}
                label="From"
                value={origin}
                onChange={(value) => {
                  setOrigin(value);
                  setDestination("");
                }}
              />
              <IconArrowRight
                aria-hidden
                className="size-4 mt-2.5 text-muted-foreground"
              />
              <PointPicker
                enabled={!!origin}
                key={origin}
                request={{
                  noc,
                  action: "destinations",
                  id: route.id,
                  origin,
                  generation,
                }}
                label="To"
                value={destination}
                onChange={setDestination}
              />
            </div>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              <span className="sr-only">Travel date</span>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>
          {!origin || !destination ? (
            <p className="text-sm text-muted-foreground">
              Choose your origin, destination and travel date to see published
              tickets.
            </p>
          ) : null}
          {origin && destination && validDate && query.isPending ? (
            <p role="status" className="text-sm text-muted-foreground">
              Looking up published fares…
            </p>
          ) : null}
          {query.error ? (
            <FareError
              error={query.error}
              noc={noc}
              retry={() => {
                void (query.isFetchNextPageError
                  ? query.fetchNextPage()
                  : query.refetch());
              }}
            />
          ) : null}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {candidates.map((candidate) => (
              <div
                key={`${candidate.id}:${candidate.amount}:${candidate.currency}`}
                className="flex flex-col gap-2"
              >
                <FareCard
                  item={candidate}
                  noc={noc}
                  generation={generation}
                  presentation="zone"
                  priceLabel={money(candidate.amount, candidate.currency)}
                />
              </div>
            ))}
          </div>
          {query.data && !expired && !candidates.length ? (
            <p role="status" className="text-sm text-muted-foreground">
              No supported published fare was found for this direction and date.
              Other ticket patterns may exist; check with the operator.
            </p>
          ) : null}
          {!expired && query.hasNextPage ? (
            <Button
              variant="outline"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              Show more fare candidates
            </Button>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Passenger eligibility, sales channels, time restrictions and other
            rules are not fully evaluated. These are published candidates, not a
            guaranteed payable or cheapest fare.
          </p>
        </section>
      </div>
    </main>
  );
}
