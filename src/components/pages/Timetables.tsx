"use client";

import { getRouteRow, type RouteRow, type RouteWithTrips } from "@/lib/buslane";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Input } from "../ui/input";
import { useDebounce } from "use-debounce";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export default function Timetables({
  noc,
  routes,
}: {
  noc: string;
  routes: RouteWithTrips[];
}) {
  const router = useRouter(),
    [search, setSearch] = useState(""),
    [debouncedSearch] = useDebounce(search, 150),
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
      <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-zinc-900">
        <div className="w-full my-2 rounded-md flex flex-col gap-2">
          {filteredRoutes.map((route) => (
            <TimetableRow
              key={route.id}
              route={route}
              router={router}
              noc={noc}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function TimetableRow({
  route,
  router,
  noc,
}: {
  route: RouteRow;
  router: ReturnType<typeof useRouter>;
  noc: string;
}) {
  return (
    <div
      key={route.id}
      className="border rounded-sm bg-zinc-800/25 hover:bg-zinc-800/50 transition-colors cursor-pointer p-4"
      onClick={() => router.push(`/${noc}/timetables/route/${route.id}`)}
    >
      <div className="flex gap-2 items-center">
        <h2 className="text-sm font-semibold bg-zinc-100 !text-zinc-800 w-fit px-1 rounded">
          {route.route}
        </h2>
        <p className="font-medium">
          {route.mainRoute}
          {route.additionalRoutes.length > 0 && (
            <Tooltip>
              <TooltipTrigger>
                <span className="italic text-zinc-400 text-sm ms-2">
                  + {route.additionalRoutes.length} route
                  {route.additionalRoutes.length > 1 ? "s" : ""}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-center">
                  {route.additionalRoutes.map((route) => (
                    <>
                      <span className="font-medium">{route}</span>
                      <br />
                    </>
                  ))}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </p>
      </div>
      {/* <p className="italic text-zinc-400 text-sm w-full">every x minutes</p> */}
      {/* TODO: route frequency? */}
    </div>
  );
}
