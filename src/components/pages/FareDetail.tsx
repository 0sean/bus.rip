import { lazy, Suspense, useState } from "react";
import { ClientOnly, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { IconArrowLeft } from "@tabler/icons-react";
import { farePagesOptions, stopsOptions } from "@/data/queries";
import {
  FareApiError,
  ticketPrice,
  fareDate,
  fareTerm,
  type FareItem,
  type FarePage,
  type FareSource,
  type FareStop,
} from "@/lib/fares";
import { FareCatalogueList, FareError } from "./FareCatalogueList";
import FareJourney from "./FareJourney";
import { FareMapPlaceholder } from "../map/FareMapPlaceholder";
import { Button } from "../ui/button";
const FareMap = lazy(() => import("../map/FareMap"));
function Coverage({
  noc,
  item,
  generation,
}: {
  noc: string;
  item: FareItem;
  generation: string;
}) {
  const membership = useInfiniteQuery(
    farePagesOptions<FareStop[]>({
      noc,
      action: "stops",
      id: item.id,
      generation,
    }),
  );
  const [showLocations, setShowLocations] = useState(false);
  // Coordinate data is an optional timetable request, never a prerequisite for
  // browsing fares. Membership itself always comes from this catalogue snapshot.
  const locations = useQuery({ ...stopsOptions(noc), enabled: showLocations });
  const expired =
    membership.error instanceof FareApiError &&
    [404, 409, 410].includes(membership.error.status);
  const stops = expired
    ? []
    : (membership.data?.pages.flatMap((p) => p.data) ?? []);
  return (
    <section
      className="flex flex-col gap-4 min-w-0"
      aria-label="Published coverage"
    >
      <h2 className="font-semibold">Published stops</h2>
      <p className="text-sm text-muted-foreground">
        {item.membership === "incomplete"
          ? "Published membership is incomplete. "
          : ""}
        Stop membership is not a ticket boundary. No boundary polygon is
        available.
      </p>
      {membership.isPending ? (
        <p role="status">Loading published stops…</p>
      ) : null}
      {membership.error ? (
        <FareError
          error={membership.error}
          noc={noc}
          retry={() => {
            void (membership.isFetchNextPageError
              ? membership.fetchNextPage()
              : membership.refetch());
          }}
        />
      ) : null}
      {showLocations && !expired ? (
        <>
          {locations.isPending ? (
            <FareMapPlaceholder />
          ) : (
            <ClientOnly fallback={<FareMapPlaceholder />}>
              <Suspense fallback={<FareMapPlaceholder />}>
                <FareMap
                  noc={noc}
                  generation={generation}
                  zones={[
                    {
                      id: item.id,
                      name: item.name,
                      stops: stops.map((s) => s.code),
                    },
                  ]}
                  stops={locations.data ?? []}
                  unavailable={!!locations.error}
                />
              </Suspense>
            </ClientOnly>
          )}
          <p className="text-xs text-muted-foreground">
            The map shows only loaded published stops with matching timetable
            coordinates. Load more stops below to extend it.
          </p>
        </>
      ) : stops.length ? (
        <Button
          className="self-start"
          variant="outline"
          onClick={() => setShowLocations(true)}
        >
          Show stop locations on map
        </Button>
      ) : null}
      {stops.length ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {stops.map((stop) => (
            <li key={stop.code} className="rounded-md border p-2">
              {stop.name || stop.code}
              <span className="block text-xs text-muted-foreground">
                {stop.code}
              </span>
            </li>
          ))}
        </ul>
      ) : !membership.isPending && !membership.error ? (
        <p className="text-sm text-muted-foreground">
          No stop membership is published.
        </p>
      ) : null}
      {!expired && membership.hasNextPage ? (
        <Button
          variant="outline"
          disabled={membership.isFetchingNextPage}
          onClick={() => void membership.fetchNextPage()}
        >
          Load more published stops
        </Button>
      ) : null}
    </section>
  );
}
function Sources({
  noc,
  item,
  generation,
}: {
  noc: string;
  item: FareItem;
  generation: string;
}) {
  const query = useInfiniteQuery(
    farePagesOptions<FareSource[]>({
      noc,
      action: "sources",
      id: item.id,
      generation,
    }),
  );
  const expired =
    query.error instanceof FareApiError &&
    [404, 409, 410].includes(query.error.status);
  return (
    <section
      className="flex flex-col gap-3 text-sm"
      aria-label="Fare provenance"
    >
      <h2 className="font-semibold">Published sources</h2>
      {query.isPending ? <p role="status">Loading sources…</p> : null}
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
      {!expired
        ? query.data?.pages
            .flatMap((p) => p.data)
            .map((source) => (
              <div
                key={`${source.document_id}:${source.anchor}`}
                className="rounded-md border p-3 wrap-anywhere"
              >
                <p>{source.name}</p>
                <p className="text-xs text-muted-foreground">
                  Document {source.document_id} · {source.source_ref} · Version{" "}
                  {source.source_version || "unspecified"}
                </p>
                {source.context ? (
                  <pre className="mt-2 text-xs whitespace-pre-wrap">
                    {JSON.stringify(source.context, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))
        : null}
      {!expired && query.hasNextPage ? (
        <Button
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          Show more sources
        </Button>
      ) : null}
    </section>
  );
}
function TicketConditions({ item }: { item: FareItem }) {
  const fields = [
    ["Passengers", item.eligibility],
    ["Sales channels", item.sales_channels],
    ["Duration", item.duration],
    ["Valid from", [...new Set(item.valid_from?.map(fareDate))]],
    ["Valid until", [...new Set(item.valid_until?.map(fareDate))]],
    ["Line restrictions", item.line_refs],
    ["Direction restrictions", item.direction_refs],
  ] as const;
  return (
    <section className="flex flex-col gap-3 text-sm">
      <h2 className="font-semibold">Published ticket conditions</h2>
      <p className="text-lg font-semibold">{ticketPrice(item)}</p>
      {item.price_basis === "conditional" && item.prices?.length ? (
        <p className="text-muted-foreground">
          Price amounts depend on unresolved conditions. Confirm the applicable
          price with the operator.
        </p>
      ) : null}
      {item.prices_truncated ? (
        <p>
          Only some price evidence is shown. Check the full published
          conditions.
        </p>
      ) : null}
      <dl className="space-y-2">
        {fields
          .filter(([, values]) => values?.length)
          .map(([label, values]) => (
            <div key={label}>
              <dt className="font-medium">{label}</dt>
              <dd className="text-muted-foreground wrap-anywhere">
                {values!.map(fareTerm).join(" · ")}
              </dd>
            </div>
          ))}
      </dl>
      {item.duration_rules?.length ? (
        <div>
          <h3 className="font-medium">Duration rules</h3>
          {item.duration_rules.map((rule, i) => (
            <p key={i} className="text-muted-foreground">
              {[
                rule.name,
                rule.duration && rule.duration !== item.duration?.[0]
                  ? fareTerm(rule.duration)
                  : undefined,
                rule.start_time,
                rule.end_time,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ))}
        </div>
      ) : null}
      {item.resolution === "unresolved" || item.detail?.unresolved_count ? (
        <p role="status" className="rounded-md border p-3">
          Some published conditions could not be resolved. Check with the
          operator before using this ticket.
        </p>
      ) : null}
      {item.journey_support?.status === "partial_or_unresolved" ? (
        <p className="text-muted-foreground">
          Journey lookup covers only part of this ticket's published matrix.
        </p>
      ) : null}
      <details>
        <summary className="cursor-pointer underline">
          More published conditions
        </summary>
        <dl className="mt-3 space-y-2">
          {Object.entries(item.detail?.conditions ?? {}).map(
            ([name, values]) => (
              <div key={name}>
                <dt className="font-medium wrap-anywhere">{name}</dt>
                <dd className="text-muted-foreground wrap-anywhere">
                  {values.join(" · ")}
                </dd>
              </div>
            ),
          )}
        </dl>
        {item.detail?.conditions_truncated ? (
          <p>
            Condition evidence is abbreviated. Consult the original publication.
          </p>
        ) : null}
        {item.detail?.lookup_issues?.length ? (
          <p className="mt-3 text-muted-foreground wrap-anywhere">
            Lookup limitations: {item.detail.lookup_issues.join(", ")}
          </p>
        ) : null}
      </details>
      <p className="text-xs text-muted-foreground">
        Dates above are published validity evidence, not publication timestamps.
        Passenger, time, sales and other rules are not fully evaluated; this is
        not a guaranteed payable fare.
      </p>
    </section>
  );
}
export default function FareDetail({
  noc,
  detail,
}: {
  noc: string;
  detail: FarePage<FareItem>;
}) {
  const { data: item, generation } = detail;
  const [coverage, setCoverage] = useState(false);
  const [sources, setSources] = useState(false);
  const [routes, setRoutes] = useState(false);
  return (
    <main className="flex flex-col gap-6">
      <Link
        to="/fares/$nocCode"
        params={{ nocCode: noc }}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground self-start"
      >
        <IconArrowLeft aria-hidden className="size-4" />
        All fares
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{item.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {item.kind === "area"
            ? `${item.stop_count ?? 0} published stops · ${item.ticket_count} ticket variants`
            : item.kind === "family"
              ? "Choose a variant to check passenger, duration and sales conditions"
              : item.kind === "route"
                ? `Journey fares${item.directions?.length ? ` · ${item.directions.join(" / ")}` : ""}`
                : "Published ticket"}
        </p>
      </div>
      {item.kind === "area" ? (
        <>
          <div className="rounded-[14px] border bg-muted/30 p-6">
            <h2 className="font-semibold">Ticket area coverage</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Browse tickets below. Published stops and map locations load
              separately.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setCoverage((v) => !v)}
              aria-expanded={coverage}
            >
              {coverage ? "Hide coverage" : "Show published coverage"}
            </Button>
          </div>
          {coverage ? (
            <Coverage noc={noc} item={item} generation={generation} />
          ) : null}
          <h2 className="font-semibold">Tickets in this area</h2>
          <FareCatalogueList
            request={{ noc, action: "areaTickets", id: item.id, generation }}
          />
        </>
      ) : item.kind === "family" ? (
        <FareCatalogueList
          request={{ noc, action: "familyTickets", id: item.id, generation }}
        />
      ) : item.kind === "route" ? (
        <FareJourney noc={noc} route={item} generation={generation} />
      ) : item.kind === "ticket" ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <TicketConditions item={item} />
            <div className="flex flex-col gap-4 min-w-0">
              <h2 className="font-semibold">Ticket areas</h2>
              <FareCatalogueList
                compact
                request={{
                  noc,
                  action: "ticketAreas",
                  id: item.id,
                  generation,
                }}
              />
            </div>
          </div>
          <Button
            variant="outline"
            className="self-start"
            aria-expanded={routes}
            onClick={() => setRoutes((v) => !v)}
          >
            {routes
              ? "Hide routes and journey prices"
              : "Show routes and journey prices"}
          </Button>
          {routes ? (
            <section className="space-y-4">
              <h2 className="font-semibold">Routes and journey prices</h2>
              <p className="text-sm text-muted-foreground">
                Choose a route to look up a directional journey. Results can
                include other ticket variants; compare the passenger and sales
                conditions.
              </p>
              <FareCatalogueList
                request={{
                  noc,
                  action: "ticketRoutes",
                  id: item.id,
                  generation,
                }}
              />
            </section>
          ) : null}
        </>
      ) : (
        <Coverage noc={noc} item={item} generation={generation} />
      )}
      <Button
        className="self-start"
        variant="outline"
        aria-expanded={sources}
        onClick={() => setSources((v) => !v)}
      >
        {sources
          ? "Hide published sources"
          : `View published sources${item.source_count ? ` (${item.source_count})` : ""}`}
      </Button>
      {sources ? (
        <Sources noc={noc} item={item} generation={generation} />
      ) : null}
      <p className="text-xs text-muted-foreground">
        Fares supplied through Bus Open Data Service. Confirm ticket conditions
        with the operator before travelling.
      </p>
    </main>
  );
}
