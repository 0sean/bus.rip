"use client";

import {
  getRouteRow,
  type RouteWithStops,
  type RouteRow,
  type Trip,
  TripWithStops,
} from "@/lib/buslane";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Back } from "../Back";

export default function Route({
  route,
  noc,
}: {
  route: RouteWithStops;
  noc: string;
}) {
  const outboundTrips = route.trips?.filter(
      (t) => t.direction_id == "outbound",
    ),
    inboundTrips = route.trips?.filter((t) => t.direction_id == "inbound"),
    routeRow: RouteRow = useMemo(() => getRouteRow(route), [route]);

  return (
    <div className="flex flex-col h-full">
      <Back />
      <div className="flex gap-2 items-center mb-1 mt-2">
        <h1 className="font-semibold bg-zinc-100 !text-zinc-800 w-fit px-1 rounded">
          {route.short_name}
        </h1>
        <h2 className="text-xl font-semibold">{routeRow.mainRoute}</h2>
      </div>
      <RouteTrips
        outboundTrips={outboundTrips}
        inboundTrips={inboundTrips}
        noc={noc}
      />
    </div>
  );
}

function RouteTrips({
  outboundTrips,
  inboundTrips,
  noc,
}: {
  outboundTrips: TripWithStops[];
  inboundTrips: TripWithStops[];
  noc: string;
}) {
  const [tab, setTab] = useState<"outbound" | "inbound">("outbound"),
    trips = useMemo(
      () => (tab == "outbound" ? outboundTrips : inboundTrips),
      [tab, outboundTrips, inboundTrips],
    ),
    router = useRouter();

  return (
    <div className="flex flex-col gap-2 p-2 bg-zinc-800/25 rounded flex-1 mt-2 border border-zinc-800 min-h-0">
      <div className="flex gap-2">
        <div
          className={`${tab == "outbound" ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800/50 hover:bg-zinc-800"} transition-colors cursor-pointer text-xs font-medium p-2 grow text-center rounded`}
          onClick={() => setTab("outbound")}
        >
          Outbound
        </div>
        <div
          className={`${tab == "inbound" ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800/50 hover:bg-zinc-800"} transition-colors cursor-pointer text-xs font-medium p-2 grow text-center rounded`}
          onClick={() => setTab("inbound")}
        >
          Inbound
        </div>
      </div>
      <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent flex-1 min-h-0">
        <div className="w-full my-2 rounded-md flex flex-col gap-2">
          {trips
            .sort((a, b) =>
              (a.stop_times || [])[0]?.departure_time.localeCompare(
                (b.stop_times || [])[0]?.departure_time,
              ),
            )
            .map((trip) => (
              <RouteTripRow
                key={trip.id}
                trip={trip}
                router={router}
                noc={noc}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

function RouteTripRow({
  trip,
  router,
  noc,
}: {
  trip: TripWithStops;
  router: ReturnType<typeof useRouter>;
  noc: string;
}) {
  return (
    <div
      key={trip.id}
      className="border rounded-sm bg-zinc-800/25 hover:bg-zinc-800/50 transition-colors cursor-pointer p-4"
      onClick={() => router.push(`/${noc}/timetables/trip/${trip.id}`)}
    >
      <div className="flex gap-2 items-center">
        <h2 className="text-sm font-semibold flex gap-2">
          <span className="text-zinc-400">
            {trip.stop_times[0]?.departure_time
              .split(":")
              .slice(0, 2)
              .join(":")}{" "}
            -{" "}
            {trip.stop_times[trip.stop_times.length - 1]?.arrival_time
              .split(":")
              .slice(0, 2)
              .join(":")}
          </span>{" "}
          {trip.headsign}
        </h2>
      </div>
    </div>
  );
}
