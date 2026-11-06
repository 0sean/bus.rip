import { describe, expect, it } from "vitest";
import { fareRouteDirections, fareRouteTitles } from "../src/lib/fare-route";
import type { FareItem } from "../src/lib/fares";
import type { RouteWithTrips } from "../src/lib/buslane";

const route = (destination: string): RouteWithTrips =>
  ({
    short_name: "28A",
    long_name: "",
    trips: [
      { direction_id: "outbound", headsign: destination },
      { direction_id: "inbound", headsign: "Bus station" },
    ],
  }) as RouteWithTrips;
const fare = {
  kind: "route",
  name: "Arriva Durham 28A Inbound",
  directions: [],
} as unknown as FareItem;

describe("journey fare route labels", () => {
  it("uses the timetable endpoint names and deduplicates repeated line variants", () => {
    const titles = fareRouteTitles([
      route("High Street"),
      route("High Street"),
    ]);
    expect(titles.get("28a")).toBe("High Street - Bus station");
  });
  it("retains distinct names when a line number matches several timetable routes", () => {
    expect(
      fareRouteTitles([route("High Street"), route("Town centre")]).get("28a"),
    ).toBe("High Street - Bus station / Town centre - Bus station");
    expect(
      fareRouteTitles([{ ...route("High Street"), trips: [] }]).has("28a"),
    ).toBe(false);
  });
  it("uses explicit directions, with published names as a fallback", () => {
    expect(fareRouteDirections(fare)).toEqual(["inbound"]);
    expect(
      fareRouteDirections({ ...fare, directions: ["outbound", "Outbound"] }),
    ).toEqual(["outbound"]);
    expect(
      fareRouteDirections({
        ...fare,
        name: "28A",
        directions: ["inbound", "outbound"],
      }),
    ).toEqual(["inbound", "outbound"]);
    expect(fareRouteDirections({ ...fare, name: "28A" })).toEqual([]);
  });
});
