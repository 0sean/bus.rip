import { describe, expect, it } from "vitest";
import {
  representativeTrips,
  routeLines,
  networkBounds,
  type RouteNetwork,
} from "../src/lib/route-network";
import {
  getRouteRow,
  type RouteWithTrips,
  type TripWithStops,
} from "../src/lib/buslane";

function trip(points: [number, string, string][]): TripWithStops {
  return {
    stop_times: points.map(([stop_sequence, lon, lat]) => ({
      stop_sequence,
      stop: { lon, lat },
    })),
  } as TripWithStops;
}

describe("operator route network", () => {
  it("selects representatives across shapes, directions and destinations", () => {
    const trips = [
      { id: "a", shape_id: null, direction_id: "outbound", headsign: "Town" },
      { id: "b", shape_id: null, direction_id: "outbound", headsign: "Town" },
      { id: "c", shape_id: null, direction_id: "inbound", headsign: "Station" },
      {
        id: "d",
        shape_id: "branch",
        direction_id: "outbound",
        headsign: "Town",
      },
      {
        id: "e",
        shape_id: null,
        direction_id: "outbound",
        headsign: "Hospital",
      },
    ] as TripWithStops[];
    expect(representativeTrips(trips).map((trip) => trip.id)).toEqual([
      "a",
      "c",
      "d",
      "e",
    ]);
  });
  it("sorts stops and deduplicates repeat journeys while retaining branches and both directions", () => {
    const a = trip([
      [2, "-1", "55"],
      [1, "-2", "54"],
    ]);
    expect(
      routeLines([
        a,
        a,
        trip([
          [1, "-1", "55"],
          [2, "-2", "54"],
        ]),
        trip([
          [1, "-2", "54"],
          [2, "-3", "53"],
        ]),
      ]),
    ).toEqual([
      [
        [-2, 54],
        [-1, 55],
      ],
      [
        [-1, 55],
        [-2, 54],
      ],
      [
        [-2, 54],
        [-3, 53],
      ],
    ]);
    expect(a.stop_times[0].stop_sequence).toBe(2);
  });
  it("splits at bad coordinates and omits isolated or duplicate points", () => {
    expect(
      routeLines([
        trip([
          [1, "0", "51"],
          [2, "0", "51"],
          [3, "1", "52"],
          [4, "", "53"],
          [5, "2", "54"],
          [6, "3", "55"],
          [7, "181", "56"],
          [8, "4", "57"],
        ]),
      ]),
    ).toEqual([
      [
        [0, 51],
        [1, 52],
      ],
      [
        [2, 54],
        [3, 55],
      ],
    ]);
    expect(
      routeLines([
        trip([
          [1, "NaN", "51"],
          [2, "0", "91"],
        ]),
      ]),
    ).toEqual([]);
  });
  it("fits all routes and handles an empty network", () => {
    const network: RouteNetwork = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { routeId: 1 },
          geometry: {
            type: "MultiLineString",
            coordinates: [
              [
                [-2, 54],
                [-1, 55],
              ],
              [
                [-3, 53],
                [0, 56],
              ],
            ],
          },
        },
      ],
    };
    expect(networkBounds(network)).toEqual([-3, 53, 0, 56]);
    expect(
      networkBounds({ type: "FeatureCollection", features: [] }),
    ).toBeNull();
  });
  it("retains useful destinations for inbound-only and empty routes", () => {
    expect(
      getRouteRow({
        id: 1,
        short_name: "5",
        long_name: "Town - Station",
        trips: [{ direction_id: "inbound", headsign: "Town" }],
      } as RouteWithTrips).mainRoute,
    ).toBe("Town");
    expect(
      getRouteRow({
        id: 2,
        short_name: "6",
        long_name: "Town - Hospital",
        trips: [],
      } as unknown as RouteWithTrips).mainRoute,
    ).toBe("Town - Hospital");
  });
});
