import type { Stop } from "@/lib/buslane";

import { Popup } from "react-map-gl/maplibre";
import { useQuery } from "@tanstack/react-query";
import { stopTimesOptions } from "@/data/queries";
import { FiLoader } from "react-icons/fi";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";

export default function StopPopup({
  stop,
  noc,
  togglePopup,
}: {
  stop: Stop;
  noc: string;
  togglePopup: () => void;
}) {
  const { data, isLoading, error } = useQuery(stopTimesOptions(noc, stop.id)),
    [start, setStart] = useState(0),
    upcomingTimes = useMemo(() => {
      if (!data || !Array.isArray(data)) return [];
      const date = new Date(),
        dayOfWeek = date
          .toLocaleDateString("en-US", { weekday: "long" })
          .toLowerCase();
      // TODO: make this work nicely with next day + wkend
      return data
        .filter((d) => {
          const [h, m] = d.departure_time.split(":").map(Number),
            isInFuture =
              h > date.getHours() ||
              (h === date.getHours() && m >= date.getMinutes()),
            runsToday =
              !d.trip.service ||
              (d.trip.service as Record<string, number | string | boolean>)[
                dayOfWeek
              ],
            serviceIsActive =
              !d.trip.service ||
              !d.trip.service.start_date ||
              !d.trip.service.end_date ||
              (new Date(d.trip.service.start_date) <= date &&
                new Date(d.trip.service.end_date) >= date);

          return runsToday && isInFuture && serviceIsActive;
        })
        .sort((a, b) => {
          const [aH, aM] = a.departure_time.split(":").map(Number),
            [bH, bM] = b.departure_time.split(":").map(Number);
          return aH - bH || aM - bM;
        })
        .slice(start, start + 5);
    }, [data, start]);

  return (
    <Popup
      longitude={Number(stop.lon)}
      latitude={Number(stop.lat)}
      closeOnClick={false} // This must be false or the popup doesn't show for some reason..
      onClose={togglePopup}
      className="pb-2 !min-w-64"
    >
      <div className="flex gap-2 items-center justify-between">
        <h1 className="text-md font-semibold">{stop.name}</h1>
        {stop.platform_code && (
          <span className="text-xs font-semibold text-zinc-500">
            Platform {stop.platform_code}
          </span>
        )}
      </div>
      {error && (
        <p role="alert">Unable to load departures. Please try again.</p>
      )}
      {isLoading ? (
        <div className="p-2 flex justify-center">
          <FiLoader className="animate-spin text-lg text-zinc-500" />
        </div>
      ) : (
        <>
          <div className="rounded overflow-hidden">
            {upcomingTimes.map((stopTime) => (
              <Link
                to="/timetables/$nocCode/trip/$trip"
                params={{ nocCode: noc, trip: stopTime.trip.id }}
                state={{ mapView: true }}
                key={stopTime.id}
                className="flex gap-2 items-center p-1 border-b last:border-b-0 font-medium hover:bg-zinc-800/50 transition-colors"
              >
                <span
                  className={`shrink-0 size-4 bg-zinc-100 text-zinc-900 flex justify-center items-center rounded ${stopTime.trip.route.short_name.length > 1 ? (stopTime.trip.route.short_name.length > 2 ? "text-[8px]" : "text-[10px]") : "text-xs"}`}
                >
                  {stopTime.trip.route.short_name}
                </span>
                <span>{stopTime.trip.headsign || "-"}</span>
                <span className="shrink-0 ms-auto">
                  {stopTime.departure_time.split(":").slice(0, 2).join(":")}
                </span>
              </Link>
            ))}
          </div>
          {upcomingTimes.length == 5 && (
            <button
              onClick={() => setStart((prev) => prev + 5)}
              className="grow p-1.5 outline-0 rounded-sm mt-2 w-full border bg-zinc-800/25 hover:bg-zinc-800/50 transition-colors border-zinc-600/50"
            >
              Show more
            </button>
          )}
        </>
      )}
    </Popup>
  );
}
