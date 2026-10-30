import type { Stop } from "@/lib/buslane";

import { Popup } from "react-map-gl/maplibre";
import { useQuery } from "@tanstack/react-query";
import { stopTimesOptions } from "@/data/queries";
import { FiLoader } from "react-icons/fi";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { IconChevronRight } from "@tabler/icons-react";

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
      closeButton={false}
      className="pb-2 !min-w-64"
    >
      <Card className="w-xs !font-sans gap-0 py-0">
        <CardHeader className="bg-muted/50 flex justify-between items-center !py-3 border-b">
          <p className="font-medium">{stop.name}</p>
          <Button variant="secondary" size="sm">
            View all
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <FiLoader className="animate-spin" />
            </div>
          ) : (
            upcomingTimes.map((stopTime) => (
              <Link
                to="/timetables/$nocCode/trip/$trip"
                params={{ nocCode: noc, trip: stopTime.trip.id }}
                state={{ mapView: true }}
                key={stopTime.id}
                className="flex gap-2 items-center px-4 py-3 border-b last:border-b-0 font-medium hover:bg-accent/50 transition-colors"
              >
                <span
                  className={`shrink-0 size-6 bg-muted text-primary flex justify-center items-center rounded-md ${stopTime.trip.route.short_name.length > 1 ? (stopTime.trip.route.short_name.length > 2 ? "text-[10px]" : "text-xs") : "text-sm"}`}
                >
                  {stopTime.trip.route.short_name}
                </span>
                <span>{stopTime.trip.headsign || "-"}</span>
                <span className="shrink-0 ms-auto inline-flex items-center gap-1">
                  {stopTime.departure_time.split(":").slice(0, 2).join(":")}
                  <span className="text-muted">
                    <IconChevronRight size={16} />
                  </span>
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </Popup>
  );
}
