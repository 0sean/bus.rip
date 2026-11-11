import { describe, expect, it } from "vitest";
import type { Vehicle } from "../src/lib/bods";
import type { TripWithStops } from "../src/lib/buslane";
import {
  estimateVehicleLateness,
  latenessStatus,
  matchVehicleTrip,
} from "../src/lib/vehicle-lateness";

function trip(overrides: Partial<TripWithStops> = {}): TripWithStops {
  return {
    id: "trip-1",
    vehicle_journey_code: "journey-1",
    direction_id: "outbound",
    service: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true,
      start_date: "2026-01-01",
      end_date: "2026-12-31",
    },
    stop_times: [
      {
        stop_sequence: 1,
        arrival_time: "10:00:00",
        departure_time: "10:00:00",
        stop: { lon: "0", lat: "51" },
      },
      {
        stop_sequence: 2,
        arrival_time: "10:10:00",
        departure_time: "10:12:00",
        stop: { lon: "0.02", lat: "51" },
      },
      {
        stop_sequence: 3,
        arrival_time: "10:22:00",
        departure_time: "10:22:00",
        stop: { lon: "0.04", lat: "51" },
      },
    ],
    ...overrides,
  } as TripWithStops;
}
function vehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    operatorRef: "TEST",
    journeyRef: "journey-1",
    directionRef: "outbound",
    departureTime: "2026-11-11T10:00:00Z",
    recordedAt: "2026-11-11T10:08:00Z",
    longitude: 0.01,
    latitude: 51,
    ...overrides,
  } as Vehicle;
}
const estimate = (bus = vehicle(), journey = trip()) =>
  estimateVehicleLateness(bus, journey, Date.parse(bus.recordedAt));

describe("vehicle timetable matching", () => {
  it("matches a unique departure, calendar and direction, using journey identity to resolve duplicates", () => {
    const journey = trip();
    const other = trip({ id: "trip-2", vehicle_journey_code: "journey-2" });
    expect(matchVehicleTrip(vehicle(), [journey, other])).toBe(journey);
    expect(
      matchVehicleTrip(vehicle({ journeyRef: undefined }), [journey]),
    ).toBe(journey);
    expect(
      matchVehicleTrip(vehicle({ journeyRef: undefined }), [journey, other]),
    ).toBeNull();
    expect(
      matchVehicleTrip(vehicle(), [trip({ direction_id: "inbound" })]),
    ).toBeNull();
    expect(
      matchVehicleTrip(vehicle(), [trip({ service: undefined })]),
    ).toBeNull();
    expect(
      matchVehicleTrip(vehicle({ departureTime: undefined }), [journey]),
    ).toBeNull();
    expect(
      matchVehicleTrip(vehicle({ departureTime: "2026-11-11T10:01:00Z" }), [
        journey,
      ]),
    ).toBeNull();
    expect(
      matchVehicleTrip(vehicle(), [
        trip({ service: { ...journey.service!, wednesday: false } }),
      ]),
    ).toBeNull();
    expect(
      matchVehicleTrip(vehicle(), [
        trip({ service: { ...journey.service!, end_date: "2026-11-10" } }),
      ]),
    ).toBeNull();
  });

  it("uses UK summer time independently of the browser timezone", () => {
    expect(
      matchVehicleTrip(vehicle({ departureTime: "2026-07-01T09:00:00Z" }), [
        trip(),
      ])?.id,
    ).toBe("trip-1");
  });

  it("matches extended GTFS hours to the previous service day", () => {
    const journey = trip();
    journey.stop_times[0].departure_time = "25:00:00";
    journey.service!.wednesday = false;
    const bus = vehicle({ departureTime: "2026-11-11T01:00:00Z" });
    expect(matchVehicleTrip(bus, [journey])).toBe(journey);
    journey.service!.tuesday = false;
    expect(matchVehicleTrip(bus, [journey])).toBeNull();
  });
});

describe("position-based lateness", () => {
  it("interpolates scheduled time between stops using the observation timestamp", () => {
    expect(estimate()).toBeCloseTo(180);
    expect(
      estimate(vehicle({ recordedAt: "2026-11-11T10:05:00Z" })),
    ).toBeCloseTo(0);
    expect(
      estimate(vehicle({ recordedAt: "2026-11-11T10:03:00Z" })),
    ).toBeCloseTo(-120);
    // A more recent fix further along the route updates the estimate.
    expect(
      estimate(
        vehicle({ longitude: 0.03, recordedAt: "2026-11-11T10:18:00Z" }),
      ),
    ).toBeCloseTo(60);
    const bus = vehicle();
    expect(
      estimateVehicleLateness(bus, trip(), Date.parse(bus.recordedAt) + 60000),
    ).toBeCloseTo(180);
  });

  it("accounts for dwell time at a stop", () => {
    expect(
      estimate(
        vehicle({ longitude: 0.02, recordedAt: "2026-11-11T10:11:00Z" }),
      ),
    ).toBe(0);
    expect(
      estimate(
        vehicle({ longitude: 0.0201, recordedAt: "2026-11-11T10:11:00Z" }),
      ),
    ).toBe(0);
    expect(
      estimate(
        vehicle({ longitude: 0.02, recordedAt: "2026-11-11T10:15:00Z" }),
      ),
    ).toBe(180);
  });

  it("handles a journey crossing midnight", () => {
    const journey = trip();
    for (const stop of journey.stop_times) {
      stop.arrival_time = stop.arrival_time.replace("10:", "24:");
      stop.departure_time = stop.departure_time.replace("10:", "24:");
    }
    expect(
      estimate(
        vehicle({
          departureTime: "2026-11-10T00:00:00Z",
          recordedAt: "2026-11-10T00:08:00Z",
        }),
        journey,
      ),
    ).toBeCloseTo(180);
  });

  it("rejects stale fixes, off-route positions and unusable stop data", () => {
    const bus = vehicle();
    expect(
      estimateVehicleLateness(bus, trip(), Date.parse(bus.recordedAt) + 120001),
    ).toBeNull();
    expect(
      estimateVehicleLateness(bus, trip(), Date.parse(bus.recordedAt) - 30001),
    ).toBeNull();
    expect(estimate(vehicle({ latitude: 52 }))).toBeNull();
    expect(estimate(vehicle({ longitude: NaN }))).toBeNull();
    expect(estimate(vehicle({ recordedAt: "invalid" }))).toBeNull();
    expect(estimate(bus, trip({ stop_times: [] }))).toBeNull();
    const invalid = trip();
    invalid.stop_times[1].arrival_time = "09:00:00";
    expect(estimate(bus, invalid)).toBeNull();
  });

  it("does not guess a position on an ambiguous out-and-back section", () => {
    const journey = trip();
    journey.stop_times[2].stop.lon = "0";
    expect(estimate(vehicle(), journey)).toBeNull();
  });

  it("formats late, early, on-time and unavailable statuses", () => {
    expect(latenessStatus(null)).toEqual({
      text: "Lateness unavailable",
      late: false,
    });
    expect(latenessStatus(59)).toEqual({
      text: "Running on time",
      late: false,
    });
    expect(latenessStatus(-59)).toEqual({
      text: "Running on time",
      late: false,
    });
    expect(latenessStatus(60)).toEqual({ text: "Est. 1 min late", late: true });
    expect(latenessStatus(185)).toEqual({
      text: "Est. 3 min late",
      late: true,
    });
    expect(latenessStatus(-120)).toEqual({
      text: "Est. 2 min early",
      late: false,
    });
  });
});
