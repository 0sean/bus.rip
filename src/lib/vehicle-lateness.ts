import type { Vehicle } from "./bods";
import type { TripWithStops } from "./buslane";
import { orderedStops, timeInSeconds } from "./route-timetable";

const london = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function localTime(timestamp: number) {
  const parts = Object.fromEntries(
    london.formatToParts(timestamp).map(({ type, value }) => [type, value]),
  );
  return {
    day: Date.UTC(+parts.year, +parts.month - 1, +parts.day),
    seconds: +parts.hour * 3600 + +parts.minute * 60 + +parts.second,
  };
}

function departureSeconds(trip: TripWithStops) {
  const first = orderedStops(trip)[0];
  return timeInSeconds(first?.departure_time || first?.arrival_time);
}

/** Only use a uniquely identified journey, never the nearest departure in time. */
export function matchVehicleTrip(
  vehicle: Vehicle,
  trips: TripWithStops[],
): TripWithStops | null {
  const departure = Date.parse(vehicle.departureTime ?? "");
  if (!Number.isFinite(departure)) return null;
  const local = localTime(departure);
  let matches = trips.filter((trip) => {
    const start = departureSeconds(trip);
    if (start === null || start % 86400 !== local.seconds) return false;
    if (
      (vehicle.directionRef === "inbound" ||
        vehicle.directionRef === "outbound") &&
      trip.direction_id !== vehicle.directionRef
    )
      return false;
    // 25:00 belongs to the previous service day, including its calendar.
    const day = new Date(local.day - Math.floor(start / 86400) * 86400000);
    const date = day.toISOString().slice(0, 10);
    const service = trip.service;
    const weekday = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ] as const;
    return (
      !!service &&
      service[weekday[day.getUTCDay()]] &&
      date >= service.start_date.slice(0, 10) &&
      date <= service.end_date.slice(0, 10)
    );
  });
  const identified = matches.filter(
    (trip) =>
      vehicle.journeyRef && trip.vehicle_journey_code === vehicle.journeyRef,
  );
  if (identified.length) matches = identified;
  return matches.length === 1 ? matches[0] : null;
}

/** Compare the observation time (not the browser clock) with scheduled progress. */
export function estimateVehicleLateness(
  vehicle: Vehicle,
  trip: TripWithStops,
  now: number,
): number | null {
  const recorded = Date.parse(vehicle.recordedAt);
  const departure = Date.parse(vehicle.departureTime ?? "");
  const start = departureSeconds(trip);
  if (
    !Number.isFinite(recorded) ||
    !Number.isFinite(departure) ||
    start === null ||
    now - recorded > 120000 ||
    recorded - now > 30000 ||
    !Number.isFinite(vehicle.longitude) ||
    !Number.isFinite(vehicle.latitude)
  )
    return null;

  const stops = orderedStops(trip).map((time) => ({
    arrival: timeInSeconds(time.arrival_time || time.departure_time),
    departure: timeInSeconds(time.departure_time || time.arrival_time),
    longitude: Number(time.stop?.lon),
    latitude: Number(time.stop?.lat),
  }));
  if (
    stops.length < 2 ||
    stops.some(
      (stop, index) =>
        stop.arrival === null ||
        stop.departure === null ||
        stop.departure < stop.arrival ||
        !Number.isFinite(stop.longitude) ||
        !Number.isFinite(stop.latitude) ||
        (index > 0 && stop.arrival < stops[index - 1].departure!),
    )
  )
    return null;

  const observed = start + (recorded - departure) / 1000;
  const scale = Math.cos((vehicle.latitude * Math.PI) / 180);
  const point = (longitude: number, latitude: number) => [
    (longitude - vehicle.longitude) * 111320 * scale,
    (latitude - vehicle.latitude) * 111320,
  ];
  const candidates: { distance: number; scheduled: number }[] = [];
  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    const [x, y] = point(stop.longitude, stop.latitude);
    const distance = Math.hypot(x, y);
    // Allow scheduled dwell time at stops without reporting an artificial delay.
    if (distance <= 35)
      candidates.push({
        distance,
        scheduled: Math.max(stop.arrival!, Math.min(observed, stop.departure!)),
      });
    const next = stops[i + 1];
    if (!next) continue;
    const [nx, ny] = point(next.longitude, next.latitude);
    if (distance <= 35 || Math.hypot(nx, ny) <= 35) continue;
    const dx = nx - x,
      dy = ny - y;
    const lengthSquared = dx * dx + dy * dy;
    if (!lengthSquared) continue;
    const fraction = Math.max(
      0,
      Math.min(1, -(x * dx + y * dy) / lengthSquared),
    );
    candidates.push({
      distance: Math.hypot(x + fraction * dx, y + fraction * dy),
      scheduled: stop.departure! + fraction * (next.arrival! - stop.departure!),
    });
  }
  candidates.sort((a, b) => a.distance - b.distance);
  const closest = candidates[0];
  // Stop-to-stop lines approximate the road. Reject off-route observations and
  // ambiguous crossings/loops rather than choosing an unrelated part of a trip.
  if (
    !closest ||
    closest.distance > 500 ||
    candidates.some(
      (candidate) =>
        candidate.distance <= closest.distance + 20 &&
        Math.abs(candidate.scheduled - closest.scheduled) > 120,
    )
  )
    return null;
  return observed - closest.scheduled;
}

export function latenessStatus(seconds: number | null) {
  if (seconds === null) return { text: "Lateness unavailable", late: false };
  if (seconds >= 60)
    return { text: `Est. ${Math.floor(seconds / 60)} min late`, late: true };
  if (seconds <= -60)
    return { text: `Est. ${Math.floor(-seconds / 60)} min early`, late: false };
  return { text: "Running on time", late: false };
}
