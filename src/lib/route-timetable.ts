import type { RouteWithStops, TripWithStops } from "./buslane";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export type DayFilter = "weekdays" | "saturday" | "sunday";

export function runsOn(trip: TripWithStops, day: DayFilter): boolean {
  if (!trip.service) return false;
  return day === "weekdays"
    ? DAYS.slice(0, 5).some((day) => trip.service?.[day])
    : trip.service[day];
}

export function serviceDays(trip: TripWithStops): string {
  if (!trip.service) return "Service days unavailable";
  const days = DAYS.filter((day) => trip.service?.[day]);
  if (days.length === 7) return "Runs daily";
  if (days.join(",") === DAYS.slice(0, 5).join(",")) return "Runs weekdays";
  if (days.join(",") === "saturday,sunday") return "Runs weekends";
  return days.length
    ? `Runs ${days.map((day) => day.slice(0, 3).replace(/^./, (s) => s.toUpperCase())).join(", ")}`
    : "No regular service days";
}

export function orderedStops(trip: TripWithStops) {
  return [...(trip.stop_times ?? [])].sort(
    (a, b) => (a.stop_sequence ?? 0) - (b.stop_sequence ?? 0),
  );
}

// GTFS hours may exceed 24; retain the service-day ordering after midnight.
export function timeInSeconds(time?: string): number | null {
  if (!time || !/^\d+:\d{2}:\d{2}$/.test(time)) return null;
  const [hours, minutes, seconds] = time.split(":").map(Number);
  if (minutes > 59 || seconds > 59) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

export function formatTime(time?: string): string {
  return timeInSeconds(time) === null
    ? "—"
    : time!.split(":").slice(0, 2).join(":");
}

export function frequencySummary(trips: TripWithStops[]): string | null {
  const declared = trips
    .flatMap((trip) =>
      (trip.frequencies ?? []).map((frequency) => frequency.headway_secs),
    )
    .filter((seconds) => Number.isFinite(seconds) && seconds > 0);
  const departures = [
    ...new Set(
      scheduledTrips(trips)
        .map(({ departure }) => timeInSeconds(departure))
        .filter((time): time is number => time !== null),
    ),
  ].sort((a, b) => a - b);
  const gaps = departures
    .slice(1)
    .map((time, index) => time - departures[index]);
  // Prefer declared headways when available for every journey. Otherwise the
  // median departure gap gives a useful estimate without an overnight gap
  // skewing the result. Duplicate departures do not inflate the frequency.
  const intervals = (
    trips.length &&
    trips.every((trip) => trip.frequencies?.length) &&
    declared.length
      ? declared
      : gaps.length
        ? gaps
        : declared
  ).sort((a, b) => a - b);
  if (!intervals.length) return null;
  const middle = Math.floor(intervals.length / 2);
  const seconds =
    intervals.length % 2
      ? intervals[middle]
      : (intervals[middle - 1] + intervals[middle]) / 2;
  const rawMinutes = seconds / 60;
  const minutes = Math.max(
    1,
    rawMinutes >= 10 ? Math.round(rawMinutes / 5) * 5 : Math.round(rawMinutes),
  );
  return `Every ${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export function timetableUpdatedAt(route: RouteWithStops): Date | null {
  // Some timetable API versions return only the import/creation timestamp.
  const timestamps = [route, ...route.trips]
    .map((record) => {
      const updated = Date.parse(record.updated_at);
      return Number.isFinite(updated) ? updated : Date.parse(record.created_at);
    })
    .filter(Number.isFinite);
  return timestamps.length ? new Date(Math.max(...timestamps)) : null;
}

export function scheduledTrips(trips: TripWithStops[]) {
  return trips
    .map((trip) => {
      const stops = orderedStops(trip);
      const first = stops[0],
        last = stops.at(-1);
      return {
        trip,
        first,
        last,
        departure: first?.departure_time || first?.arrival_time,
        arrival: last?.arrival_time || last?.departure_time,
      };
    })
    .sort(
      (a, b) =>
        (timeInSeconds(a.departure) ?? Infinity) -
          (timeInSeconds(b.departure) ?? Infinity) ||
        a.trip.id.localeCompare(b.trip.id),
    );
}
