import { memo, useEffect, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { IconHourglass } from "@tabler/icons-react";
import { routeOptions, routesOptions } from "@/data/queries";
import type { Vehicle } from "@/lib/bods";
import {
  estimateVehicleLateness,
  latenessStatus,
  matchVehicleTrip,
} from "@/lib/vehicle-lateness";

function VehicleLateness({ vehicle }: { vehicle: Vehicle }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(timer);
  }, []);

  const canCheck = !!vehicle.operatorRef && !!vehicle.departureTime;
  const { data: routes, isPending: routesPending } = useQuery({
    ...routesOptions(vehicle.operatorRef ?? ""),
    enabled: canCheck,
  });
  const timetables = useQueries({
    queries: (routes ?? [])
      .filter(
        (route) =>
          route.short_name.trim().toLowerCase() ===
          vehicle.lineName.trim().toLowerCase(),
      )
      .map((route) => routeOptions(String(route.id))),
  });
  const ready =
    timetables.length > 0 && timetables.every((query) => query.isSuccess);
  const trip = ready
    ? matchVehicleTrip(
        vehicle,
        timetables.flatMap((query) => query.data?.trips ?? []),
      )
    : null;
  const status = latenessStatus(
    trip && now !== null ? estimateVehicleLateness(vehicle, trip, now) : null,
  );
  const checking =
    canCheck &&
    (routesPending ||
      (timetables.some((query) => query.isPending) &&
        !timetables.some((query) => query.isError)) ||
      (ready && now === null));

  return (
    <p
      role="status"
      aria-busy={checking}
      className={`text-xs flex gap-1 ${status.late ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}
    >
      <IconHourglass size={16} />
      <span className={checking ? "lateness-shimmer" : undefined}>
        {checking ? "Checking lateness" : status.text}
      </span>
    </p>
  );
}

export default memo(VehicleLateness);
