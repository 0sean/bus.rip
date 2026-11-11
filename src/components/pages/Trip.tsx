import {
  getRouteRow,
  type RouteWithStops,
  type TripWithAssociations,
} from "@/lib/buslane";
import {
  adjacentTrips,
  formatTime,
  orderedStops,
  serviceDays,
} from "@/lib/route-timetable";
import { ClientOnly, Link } from "@tanstack/react-router";
import { lazy, Suspense, useMemo } from "react";
import {
  IconArrowLeft,
  IconArrowRight,
  IconClock,
  IconWheelchair,
} from "@tabler/icons-react";
import { buttonVariants } from "../ui/button";

const RouteMap = lazy(() => import("../map/OperatorRouteMap"));

export default function Trip({
  trip,
  route,
  noc,
}: {
  trip: TripWithAssociations;
  route: RouteWithStops;
  noc: string;
}) {
  const stops = useMemo(() => orderedStops(trip), [trip]);
  const row = useMemo(() => getRouteRow(route), [route]);
  const mapRoutes = useMemo(() => [route], [route]);
  const { previous, next } = useMemo(
    () => adjacentTrips(trip, route.trips),
    [trip, route.trips],
  );
  const first = stops[0];
  const last = stops.at(-1);
  const DirectionIcon =
    trip.direction_id === "inbound" ? IconArrowLeft : IconArrowRight;

  return (
    <main className="grid items-start gap-4 lg:grid-cols-2">
      <div className="relative min-w-0 lg:sticky lg:top-6">
        <ClientOnly fallback={<MapPlaceholder />}>
          <Suspense fallback={<MapPlaceholder />}>
            <RouteMap
              noc={noc}
              routes={mapRoutes}
              route={route}
              variant="trip"
              stopTimes={stops}
            />
          </Suspense>
        </ClientOnly>
        <div className="absolute left-3 top-3 flex w-[348px] max-w-[calc(100%-1.5rem)] flex-col gap-4 sm:max-w-[calc(100%-5rem)]">
          <Link
            to="/timetables/$nocCode/route/$route"
            params={{ nocCode: noc, route: String(trip.route_id) }}
            aria-label={`View route ${trip.route.short_name} timetable`}
            className="flex min-h-[70px] items-center gap-2 rounded-[14px] bg-card p-4 text-card-foreground shadow-sm ring-1 ring-foreground/10 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-[10px] bg-neutral-100 px-2 text-base font-medium dark:bg-neutral-800">
              {trip.route.short_name}
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
          </Link>
          <section
            aria-label="Trip summary"
            className="flex flex-col gap-4 rounded-[14px] bg-card pt-4 text-card-foreground shadow-sm ring-1 ring-foreground/10"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 px-4">
              <p className="text-[32px] font-medium leading-[44px] tabular-nums">
                {formatTime(first?.departure_time || first?.arrival_time)}
              </p>
              <IconArrowRight aria-hidden className="size-6" />
              <p className="text-right text-[32px] font-medium leading-[44px] tabular-nums">
                {formatTime(last?.arrival_time || last?.departure_time)}
              </p>
              <p className="col-span-2 text-sm leading-5 text-muted-foreground">
                {first?.stop?.name || "Start stop unavailable"}
              </p>
              <p className="text-right text-sm leading-5 text-muted-foreground">
                {last?.stop?.name || trip.headsign || "Destination unavailable"}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <DirectionIcon aria-hidden className="size-4 shrink-0" />
                {trip.direction_id === "inbound" ? "Inbound" : "Outbound"}
              </span>
              <span className="flex items-center gap-1">
                <IconClock aria-hidden className="size-4 shrink-0" />
                {serviceDays(trip)}
              </span>
              {trip.wheelchair_accessible ? (
                <span className="flex items-center gap-1">
                  <IconWheelchair aria-hidden className="size-4 shrink-0" />
                  Wheelchair accessible
                </span>
              ) : null}
            </div>
          </section>
          <nav
            aria-label="Trip navigation"
            className="flex gap-3 justify-between"
          >
            {(
              [
                ["Previous", previous, IconArrowLeft],
                ["Next", next, IconArrowRight],
              ] as const
            ).map(([label, journey, Icon]) => {
              const className = buttonVariants({
                variant: "outline",
                size: "sm",
                className: "rounded-full! bg-card shadow-sm",
              });
              const content = (
                <>
                  {label === "Previous" ? <Icon aria-hidden /> : null}
                  {label}
                  {label === "Next" ? <Icon aria-hidden /> : null}
                </>
              );
              return journey ? (
                <Link
                  key={label}
                  to="/timetables/$nocCode/trip/$trip"
                  params={{ nocCode: noc, trip: journey.trip.id }}
                  preload={false}
                  aria-label={`${label} trip, departing ${formatTime(journey.departure)}`}
                  className={className}
                >
                  {content}
                </Link>
              ) : (
                <button
                  key={label}
                  type="button"
                  disabled
                  aria-label={`No ${label.toLowerCase()} trip`}
                  className={className}
                >
                  {content}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
      <section aria-label="Trip stops" className="min-w-0">
        {stops.length ? (
          <ol>
            {stops.map((stopTime) => (
              <li
                key={stopTime.id}
                className="group/stop relative flex min-h-9 items-stretch text-sm"
              >
                <span aria-hidden className="relative w-6 shrink-0">
                  <span className="absolute bottom-0 left-1/2 top-0 w-1 -translate-x-1/2 bg-border group-first/stop:top-1/2 group-last/stop:bottom-1/2" />
                  <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground group-first/stop:bg-primary group-last/stop:bg-primary" />
                </span>
                <span className="min-w-0 flex-1 p-2 font-medium leading-5">
                  {stopTime.stop?.name || "Stop unavailable"}
                </span>
                <span className="shrink-0 p-2 text-right leading-5 tabular-nums text-muted-foreground">
                  {formatTime(stopTime.departure_time || stopTime.arrival_time)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p role="status" className="py-10 text-center text-muted-foreground">
            No stops are available for this trip yet.
          </p>
        )}
      </section>
    </main>
  );
}

function MapPlaceholder() {
  return (
    <div
      role="status"
      className="flex h-[648px] items-end justify-center rounded-[14px] border bg-muted/30 pb-10 text-sm text-muted-foreground"
    >
      Loading route map…
    </div>
  );
}
