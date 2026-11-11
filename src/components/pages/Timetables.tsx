import { getRouteRow, type RouteWithTrips } from "@/lib/buslane";
import { Link, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import {
  IconChevronRight,
  IconClock,
  IconCalendarMonth,
  IconSearch,
} from "@tabler/icons-react";
import { Input } from "../ui/input";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";

const RouteMap = lazy(() => import("../map/OperatorRouteMap"));

export default function Timetables({
  noc,
  routes,
}: {
  noc: string;
  routes: RouteWithTrips[];
}) {
  const [search, setSearch] = useState("");
  const rows = useMemo(
    () =>
      routes.map((route) => ({
        ...getRouteRow(route),
        longName: route.long_name,
        trips: route.trips.length,
        updated: route.updated_at,
      })),
    [routes],
  );
  const query = search.trim().toLowerCase();
  const filtered = rows.filter((route) =>
    [
      route.route,
      route.mainRoute,
      route.longName,
      ...route.additionalRoutes,
    ].some((text) => text?.toLowerCase().includes(query)),
  );
  return (
    <main className="flex flex-col gap-6">
      <h1 className="sr-only">Timetables</h1>
      <div className="relative">
        <ClientOnly fallback={<MapPlaceholder />}>
          <Suspense fallback={<MapPlaceholder />}>
            <RouteMap noc={noc} routes={routes} />
          </Suspense>
        </ClientOnly>
        <div className="absolute top-3 left-3 w-[calc(100%-5rem)] sm:max-w-sm">
          <IconSearch
            aria-hidden
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
          />
          <Input
            aria-label="Search routes"
            placeholder="Search routes or destinations"
            className="pl-9 rounded-xl bg-background/95 shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        aria-label="Operator routes"
      >
        {filtered.map((route) => {
          const updated = route.updated ? new Date(route.updated) : null;
          return (
            <Link
              key={route.id}
              to="/timetables/$nocCode/route/$route"
              params={{ nocCode: noc, route: String(route.id) }}
              className="group flex min-w-0 flex-col rounded-[14px] bg-card text-card-foreground ring-1 ring-foreground/10 shadow-sm hover:bg-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-center gap-2 p-4 min-h-[70px]">
                <span className="flex min-w-8 h-8 shrink-0 items-center justify-center rounded-[10px] bg-neutral-100 dark:bg-neutral-800 px-2 text-base font-semibold">
                  {route.route}
                </span>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-medium leading-5">
                    {route.mainRoute || route.longName || route.route}
                  </h2>
                  {route.additionalRoutes.length > 0 ? (
                    <p className="text-xs leading-4 text-muted-foreground">
                      + {route.additionalRoutes.length} route
                      {route.additionalRoutes.length === 1 ? "" : "s"}
                    </p>
                  ) : null}
                </div>
                <IconChevronRight
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground"
                />
              </div>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t px-4 py-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <IconCalendarMonth aria-hidden className="size-4" />
                  {route.trips} scheduled trip{route.trips === 1 ? "" : "s"}
                </span>
                {updated && !Number.isNaN(updated.getTime()) ? (
                  <span className="flex items-center gap-1">
                    <IconClock aria-hidden className="size-4" />
                    Updated {formatDistanceToNow(updated, { addSuffix: true })}
                  </span>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
      {!filtered.length ? (
        <p role="status" className="py-10 text-center text-muted-foreground">
          {routes.length
            ? "No routes match your search."
            : "No timetables are available for this operator yet."}
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
