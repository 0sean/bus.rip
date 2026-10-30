import { describe, expect, it } from "vitest";
import type { RouteWithStops, TripWithStops } from "../src/lib/buslane";
import {
  formatTime,
  frequencySummary,
  runsOn,
  scheduledTrips,
  serviceDays,
  timetableUpdatedAt,
} from "../src/lib/route-timetable";

function trip(
  id: string,
  departure = "09:00:00",
  days?: string[],
): TripWithStops {
  return {
    id,
    service: days
      ? Object.fromEntries(
          [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ].map((day) => [day, days.includes(day)]),
        )
      : undefined,
    stop_times: [
      {
        stop_sequence: 2,
        arrival_time: "10:00:00",
        departure_time: "10:01:00",
        stop: { name: "Destination" },
      },
      {
        stop_sequence: 1,
        departure_time: departure,
        arrival_time: "",
        stop: { name: "Origin" },
      },
    ],
  } as TripWithStops;
}

describe("route timetable", () => {
  it("filters actual service days without treating unknown calendars as daily", () => {
    const monday = trip("monday", undefined, ["monday"]);
    expect(runsOn(monday, "weekdays")).toBe(true);
    expect(runsOn(monday, "saturday")).toBe(false);
    const weekend = trip("weekend", undefined, ["saturday", "sunday"]);
    expect(runsOn(weekend, "weekdays")).toBe(false);
    expect(runsOn(weekend, "saturday")).toBe(true);
    expect(runsOn(weekend, "sunday")).toBe(true);
    expect(runsOn(trip("unknown"), "weekdays")).toBe(false);
    expect(serviceDays(monday)).toBe("Runs Mon");
    expect(serviceDays(weekend)).toBe("Runs weekends");
    expect(serviceDays(trip("unknown"))).toBe("Service days unavailable");
    expect(
      serviceDays(
        trip("weekdays", undefined, [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
        ]),
      ),
    ).toBe("Runs weekdays");
  });

  it("sorts journeys numerically across midnight and orders endpoints without mutating input", () => {
    const early = trip("early", "9:00:00");
    const late = trip("late", "23:10:00");
    const overnight = trip("overnight", "25:10:00");
    const empty = { id: "empty", stop_times: [] } as unknown as TripWithStops;
    const rows = scheduledTrips([empty, overnight, late, early]);
    expect(rows.map(({ trip }) => trip.id)).toEqual([
      "early",
      "late",
      "overnight",
      "empty",
    ]);
    expect(rows[0].first?.stop.name).toBe("Origin");
    expect(rows[0].last?.stop.name).toBe("Destination");
    expect(rows[0].arrival).toBe("10:00:00");
    expect(early.stop_times[0].stop_sequence).toBe(2);
    expect(formatTime(rows[3].departure)).toBe("—");
    expect(formatTime("25:10:00")).toBe("25:10");
    expect(formatTime("12:72:00")).toBe("—");
  });

  it("uses declared headways and approximates differing frequencies", () => {
    const a = trip("a"),
      b = trip("b");
    a.frequencies = [{ headway_secs: 1800 }] as NonNullable<
      TripWithStops["frequencies"]
    >;
    expect(frequencySummary([a])).toBe("Every 30 minutes");
    expect(frequencySummary([a, b])).toBe("Every 30 minutes");
    b.frequencies = [{ headway_secs: 3600 }] as NonNullable<
      TripWithStops["frequencies"]
    >;
    expect(frequencySummary([a, b])).toBe("Every 45 minutes");
    expect(frequencySummary([])).toBeNull();
  });
  it("estimates a typical interval from departures, ignoring duplicates and long overnight gaps", () => {
    expect(
      frequencySummary([
        trip("a", "09:00:00"),
        trip("duplicate", "09:00:00"),
        trip("b", "09:31:00"),
        trip("c", "10:00:00"),
        trip("d", "10:30:00"),
        trip("late", "23:00:00"),
      ]),
    ).toBe("Every 30 minutes");
    expect(
      frequencySummary([trip("a", "23:30:00"), trip("b", "24:00:00")]),
    ).toBe("Every 30 minutes");
    expect(
      frequencySummary([trip("a", "09:00:00"), trip("b", "09:00:20")]),
    ).toBe("Every 1 minute");
    expect(frequencySummary([trip("a")])).toBeNull();
    expect(frequencySummary([trip("a", ""), trip("b", "invalid")])).toBeNull();
  });

  it("uses the latest known timetable timestamp and falls back to import dates", () => {
    const route = {
      created_at: "2026-10-01T00:00:00Z",
      trips: [{ created_at: "2026-10-02T00:00:00Z" }],
    } as RouteWithStops;
    expect(timetableUpdatedAt(route)?.toISOString()).toBe(
      "2026-10-02T00:00:00.000Z",
    );
    route.updated_at = "2026-10-15T00:00:00Z";
    expect(timetableUpdatedAt(route)?.toISOString()).toBe(
      "2026-10-15T00:00:00.000Z",
    );
    expect(
      timetableUpdatedAt({ trips: [] } as unknown as RouteWithStops),
    ).toBeNull();
  });
});
