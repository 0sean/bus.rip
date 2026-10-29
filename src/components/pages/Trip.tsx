import type { TripWithAssociations } from "@/lib/buslane";
import { useMemo } from "react";
import { FiArrowDown, FiArrowUp, FiClock } from "react-icons/fi";
import { TbDisabled } from "react-icons/tb";
import { Back } from "../Back";

export default function Trip({ trip }: { trip: TripWithAssociations }) {
  const days = useMemo(
      () =>
        trip.service
          ? [
              trip.service.monday && "Mon",
              trip.service.tuesday && "Tue",
              trip.service.wednesday && "Wed",
              trip.service.thursday && "Thu",
              trip.service.friday && "Fri",
              trip.service.saturday && "Sat",
              trip.service.sunday && "Sun",
            ].filter((v) => v)
          : [],
      [trip.service],
    ),
    daysString = useMemo(() => {
      if (days.length === 7) return "all week";
      if (days.join(",") == "Mon,Tue,Wed,Thu,Fri") return "weekdays";
      if (days.join(",") == "Sat,Sun") return "weekends";
      return days.join(", ");
    }, [days]);

  return (
    <>
      <Back />
      <div className="flex gap-2 items-center my-1">
        <h1 className="font-semibold bg-primary !text-primary-foreground w-fit px-1 rounded">
          {trip.route && trip.route.short_name}
        </h1>
        <h2 className="text-3xl font-semibold">{trip.headsign}</h2>
      </div>
      <div className="flex gap-4 items-center">
        <p className="text-xl font-semibold text-muted-foreground">
          {trip.stop_times[0]?.departure_time.split(":").slice(0, 2).join(":")}{" "}
          -{" "}
          {trip.stop_times[trip.stop_times.length - 1]?.arrival_time
            .split(":")
            .slice(0, 2)
            .join(":")}
        </p>
        <Direction direction={trip.direction_id} />
        {days.length > 0 && (
          <span className="text-sm font-medium text-muted-foreground flex gap-1 items-center">
            <FiClock />
            Runs {daysString}
          </span>
        )}
        {trip.wheelchair_accessible && (
          <span className="text-sm font-medium text-muted-foreground flex gap-1 items-center">
            <TbDisabled />
            Wheelchair accessible
          </span>
        )}
      </div>
      <div className="relative overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-background">
        <table className="group-[&]/drawer-content:w-full">
          <tbody>
            {trip.stop_times.map((stopTime) => (
              <TripStopTimeRow key={stopTime.id} stopTime={stopTime} />
            ))}
          </tbody>
        </table>
        {/* <div className="w-1 h-[calc(100%-2rem)] bg-muted absolute rounded top-4 left-2 ms-[2px]"></div> */}
      </div>
    </>
  );
}

function Direction({ direction }: { direction: "inbound" | "outbound" }) {
  return (
    <span className="text-sm font-medium text-muted-foreground flex gap-1 items-center">
      {direction === "inbound" ? <FiArrowDown /> : <FiArrowUp />}
      {direction === "inbound" ? "Inbound" : "Outbound"}
    </span>
  );
}

function TripStopTimeRow({
  stopTime,
}: {
  stopTime: TripWithAssociations["stop_times"][number];
}) {
  return (
    <tr className="border-b hover:bg-accent/25 transition-colors group/row">
      <td className="p-2">
        <div className="relative !w-2">
          <div className="size-2 relative z-10 bg-muted-foreground group-first/row:bg-primary group-last/row:bg-primary rounded-full"></div>
          <div className="w-1 h-10 bg-border absolute left-1/2 -translate-x-1/2 top-1 rounded-full group-last/row:hidden"></div>
        </div>
      </td>
      <td className="p-2">
        <span className="text-sm font-medium">{stopTime.stop.name}</span>
      </td>
      <td className="p-2 text-end">
        <span className="text-sm text-muted-foreground">
          {(stopTime.departure_time || stopTime.arrival_time)
            .split(":")
            .slice(0, 2)
            .join(":")}
        </span>
      </td>
    </tr>
  );
}
