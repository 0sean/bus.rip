import { describe, expect, it } from "vitest";
import { fareZoneFeatures } from "../src/lib/fare-map";
import type { Stop } from "../src/lib/buslane";

const stops = [
  { id: "atco:A", lon: "-2", lat: "54" },
  { id: "B", lon: "-1", lat: "54" },
  { id: "C", lon: "-1", lat: "55" },
  { id: "D", lon: "-2", lat: "55" },
  { id: "MIDDLE", lon: "-1.5", lat: "54.5" },
  { id: "INVALID", lon: "-2", lat: "100" },
] as Stop[];
const zone = {
  id: "area_a",
  name: "Town",
  stops: ["A", "B", "C", "D", "MIDDLE", "A", "INVALID", "MISSING"],
};

describe("approximate zone coverage", () => {
  it("outlines fully loaded coverage with a closed envelope and marks it approximate", () => {
    const result = fareZoneFeatures(
      [{ ...zone, membershipComplete: true }],
      stops,
    );
    expect(result.areas.features).toHaveLength(1);
    const shape = result.areas.features[0];
    expect(shape.properties).toMatchObject({
      zoneId: zone.id,
      approximate: true,
    });
    const ring = shape.geometry.coordinates[0];
    expect(ring).toHaveLength(5);
    expect(ring[0]).toEqual(ring.at(-1));
    expect(ring.slice(0, -1)).toEqual(
      expect.arrayContaining([
        [-2, 54],
        [-1, 54],
        [-1, 55],
        [-2, 55],
      ]),
    );
    expect(result.points.features).toHaveLength(5);
  });
  it("does not turn partial or unknown membership into a shaded zone", () => {
    for (const membershipComplete of [false, undefined]) {
      const result = fareZoneFeatures([{ ...zone, membershipComplete }], stops);
      expect(result.areas.features).toHaveLength(0);
      expect(result.points.features).toHaveLength(5);
    }
  });
  it("keeps point coverage for degenerate or insufficient coordinates", () => {
    for (const codes of [["A"], ["A", "B"], ["A", "MIDDLE", "C"]]) {
      const result = fareZoneFeatures(
        [{ ...zone, stops: codes, membershipComplete: true }],
        stops,
      );
      expect(result.areas.features).toHaveLength(0);
      expect(result.points.features).toHaveLength(codes.length);
    }
  });
  it("draws larger zones behind smaller ones", () => {
    const result = fareZoneFeatures(
      [
        {
          ...zone,
          id: "small",
          stops: ["A", "B", "MIDDLE"],
          membershipComplete: true,
        },
        { ...zone, id: "large", membershipComplete: true },
      ],
      stops,
    );
    expect(
      result.areas.features.map((feature) => feature.properties?.zoneId),
    ).toEqual(["large", "small"]);
  });
});
