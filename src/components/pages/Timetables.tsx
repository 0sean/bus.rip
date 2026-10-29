import { getRouteRow, type RouteRow, type RouteWithTrips } from "@/lib/buslane";
import { Link, useLocation } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Input } from "../ui/input";
import { useDebounce } from "@uidotdev/usehooks";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export default function Timetables({
  noc,
  routes,
}: {
  noc: string;
  routes: RouteWithTrips[];
}) {
  const [search, setSearch] = useState(""),
    debouncedSearch = useDebounce(search, 150),
    routeRows = useMemo<RouteRow[]>(
      () => routes.map((route) => getRouteRow(route)),
      [routes],
    ),
    filteredRoutes = useMemo(
      () =>
        routeRows.filter(
          (route) =>
            route.route.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            route.mainRoute
              .toLowerCase()
              .includes(debouncedSearch.toLowerCase()) ||
            route.additionalRoutes.some((additional) =>
              additional.toLowerCase().includes(debouncedSearch.toLowerCase()),
            ),
        ),
      [debouncedSearch, routeRows],
    );

  return (
    <>
      <Input
        placeholder="Search routes"
        className="py-2 mt-2"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-background">
        <div className="w-full my-2 rounded-md flex flex-col gap-2">
          {filteredRoutes.map((route) => (
            <TimetableRow key={route.id} route={route} noc={noc} />
          ))}
        </div>
      </div>
    </>
  );
}

function TimetableRow({ route, noc }: { route: RouteRow; noc: string }) {
  const mapView = useLocation({ select: (location) => location.state.mapView });
  return (
    <div
      key={route.id}
      className="border rounded-sm bg-muted/25 hover:bg-accent/50 transition-colors cursor-pointer p-4"
    >
      <div className="flex gap-2 items-center">
        <h2 className="text-sm font-semibold bg-primary !text-primary-foreground w-fit px-1 rounded">
          {route.route}
        </h2>
        <div className="font-medium">
          <Link
            to="/timetables/$nocCode/route/$route"
            params={{ nocCode: noc, route: String(route.id) }}
            state={{ mapView }}
          >
            {route.mainRoute || route.route}
          </Link>
          {route.additionalRoutes.length > 0 && (
            <Tooltip>
              <TooltipTrigger>
                <span className="italic text-muted-foreground text-sm ms-2">
                  + {route.additionalRoutes.length} route
                  {route.additionalRoutes.length > 1 ? "s" : ""}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-center">
                  {route.additionalRoutes.map((route) => (
                    <span className="block font-medium" key={route}>
                      {route}
                    </span>
                  ))}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      {/* <p className="italic text-muted-foreground text-sm w-full">every x minutes</p> */}
      {/* TODO: route frequency? */}
    </div>
  );
}
