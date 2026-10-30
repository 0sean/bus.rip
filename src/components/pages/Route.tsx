import { getRouteRow, type RouteWithStops } from "@/lib/buslane";
import {
  formatTime,
  frequencySummary,
  runsOn,
  scheduledTrips,
  serviceDays,
  timetableUpdatedAt,
  type DayFilter,
} from "@/lib/route-timetable";
import { ClientOnly, Link } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import {
  IconArrowLeft,
  IconArrowRight,
  IconClock,
  IconCalendarMonth,
  IconHourglass,
} from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { Button } from "../ui/button";

const RouteMap = lazy(() => import("../map/OperatorRouteMap"));
const DAY_FILTERS = [
  ["weekdays", "Weekdays"],
  ["saturday", "Saturday"],
  ["sunday", "Sunday"],
] as const;

export default function Route({
  route,
  noc,
}: {
  route: RouteWithStops;
  noc: string;
}) {
  return <RouteTimetable key={route.id} route={route} noc={noc} />;
}

function RouteTimetable({
  route,
  noc,
}: {
  route: RouteWithStops;
  noc: string;
}) {
  const [direction, setDirection] = useState<"outbound" | "inbound">(
    route.trips.some((trip) => trip.direction_id === "outbound")
      ? "outbound"
      : "inbound",
  );
  const [day, setDay] = useState<DayFilter | null>(
    () =>
      DAY_FILTERS.find(([day]) =>
        route.trips.some(
          (trip) => trip.direction_id === direction && runsOn(trip, day),
        ),
      )?.[0] ?? null,
  );
  const row = useMemo(() => getRouteRow(route), [route]);
  const mapRoutes = useMemo(() => [route], [route]);
  const journeys = useMemo(() => scheduledTrips(route.trips), [route.trips]);
  const filtered = journeys.filter(
    ({ trip }) =>
      trip.direction_id === direction && (!day || runsOn(trip, day)),
  );
  const updated = useMemo(() => timetableUpdatedAt(route), [route]);
  const frequency = frequencySummary(filtered.map(({ trip }) => trip));

  return (
    <main className="flex flex-col gap-4">
      <div className="relative">
        <ClientOnly fallback={<MapPlaceholder />}>
          <Suspense fallback={<MapPlaceholder />}>
            <RouteMap noc={noc} routes={mapRoutes} route={route} />
          </Suspense>
        </ClientOnly>
        <section
          aria-label="Route summary"
          className="absolute left-3 top-3 w-[348px] max-w-[calc(100%-5rem)] rounded-[14px] bg-card text-card-foreground ring-1 ring-foreground/10 shadow-sm"
        >
          <div className="flex items-center gap-2 p-4">
            <span className="flex min-w-8 h-8 shrink-0 items-center justify-center rounded-[10px] bg-neutral-100 dark:bg-neutral-800 px-2 text-base font-medium">
              {route.short_name}
            </span>
            <div className="min-w-0">
              <h1 className="text-sm font-medium leading-5">{row.mainRoute}</h1>
              {row.additionalRoutes.length ? (
                <p className="text-xs leading-4 text-muted-foreground">
                  + {row.additionalRoutes.length} route
                  {row.additionalRoutes.length === 1 ? "" : "s"}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t px-4 py-3 text-xs text-muted-foreground">
            <span
              className="flex items-center gap-1"
              title={
                frequency
                  ? "Approximate frequency for the selected journeys"
                  : undefined
              }
            >
              {frequency ? (
                <IconHourglass aria-hidden className="size-4 shrink-0" />
              ) : (
                <IconCalendarMonth aria-hidden className="size-4 shrink-0" />
              )}
              {frequency ??
                `${journeys.length} scheduled trip${journeys.length === 1 ? "" : "s"}`}
            </span>
            {updated && !Number.isNaN(updated.getTime()) ? (
              <span className="flex items-center gap-1">
                <IconClock aria-hidden className="size-4 shrink-0" />
                Updated {formatDistanceToNow(updated, { addSuffix: true })}
              </span>
            ) : null}
          </div>
        </section>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-4">
        <div
          role="group"
          aria-label="Direction"
          className="flex flex-wrap items-center gap-2"
        >
          <span className="mr-2 text-sm text-muted-foreground">Direction</span>
          {(["outbound", "inbound"] as const).map((value) => (
            <Button
              key={value}
              variant="outline"
              aria-pressed={direction === value}
              onClick={() => setDirection(value)}
              className="rounded-[10px] not-aria-pressed:bg-transparent"
            >
              {value === "outbound" ? (
                <IconArrowRight aria-hidden />
              ) : (
                <IconArrowLeft aria-hidden />
              )}
              {value === "outbound" ? "Outbound" : "Inbound"}
            </Button>
          ))}
        </div>
        <div
          role="group"
          aria-label="Service days"
          aria-description="Select the active day filter again to show all days."
          className="flex flex-wrap items-center gap-2"
        >
          <span className="mr-2 text-sm text-muted-foreground">Days</span>
          {DAY_FILTERS.map(([value, label]) => (
            <Button
              key={value}
              variant="outline"
              aria-pressed={day === value}
              onClick={() => setDay(day === value ? null : value)}
              title={day === value ? "Show all days" : undefined}
              className="rounded-[10px] not-aria-pressed:bg-transparent"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      <div
        aria-label="Scheduled journeys"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
      >
        {filtered.map(({ trip, first, last, departure, arrival }) => (
          <Link
            key={trip.id}
            to="/timetables/$nocCode/trip/$trip"
            params={{ nocCode: noc, trip: trip.id }}
            className="flex min-w-0 flex-col gap-4 pt-4 rounded-[14px] bg-card text-card-foreground ring-1 ring-foreground/10 shadow-sm hover:bg-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 px-4">
              <p className="text-[32px] font-medium leading-[44px] tabular-nums">
                {formatTime(departure)}
              </p>
              <IconArrowRight aria-hidden className="size-6" />
              <p className="text-right text-[32px] font-medium leading-[44px] tabular-nums">
                {formatTime(arrival)}
              </p>
              <p className="col-span-2 text-sm leading-5 text-muted-foreground">
                {first?.stop?.name || "Start stop unavailable"}
              </p>
              <p className="text-right text-sm leading-5 text-muted-foreground">
                {last?.stop?.name || trip.headsign || "Destination unavailable"}
              </p>
            </div>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                {trip.direction_id === "outbound" ? (
                  <IconArrowRight aria-hidden className="size-4" />
                ) : (
                  <IconArrowLeft aria-hidden className="size-4" />
                )}
                {trip.direction_id === "outbound" ? "Outbound" : "Inbound"}
              </span>
              <span className="flex items-center gap-1">
                <IconClock aria-hidden className="size-4 shrink-0" />
                {serviceDays(trip)}
              </span>
            </div>
          </Link>
        ))}
      </div>
      {!filtered.length ? (
        <p role="status" className="py-10 text-center text-muted-foreground">
          {journeys.length
            ? "No journeys match these filters."
            : "No scheduled journeys are available for this route yet."}
        </p>
      ) : null}
    </main>
  );
}

function MapPlaceholder() {
  return (
    <div
      role="status"
      className="h-[352px] rounded-[14px] border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground"
    >
      Loading route map…
    </div>
  );
}
