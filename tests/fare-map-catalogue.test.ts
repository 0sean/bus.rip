import { describe, expect, it, vi } from "vitest";
import { collectFareMap } from "../src/lib/fare-map-catalogue";
import {
  FareApiError,
  type FareItem,
  type FarePage,
  type FareRequest,
  type FareStop,
} from "../src/lib/fares";

const area = (n: number): FareItem => ({
  id: `area_${n.toString(16).padStart(64, "0")}`,
  name: `Zone ${n}`,
  kind: "area",
  revision: 1,
  ticket_count: 1,
  membership: "published_stops",
});
const page = (
  data: FareItem[] | FareStop[],
  nextCursor: string | null = null,
  generation = "8",
): FarePage<FareItem[] | FareStop[]> => ({
  data,
  generation,
  version: "1",
  nextCursor,
});

describe("complete operator fare map", () => {
  it("restricts a ticket map to that ticket's areas at the selected generation", async () => {
    const read = vi.fn(async (request: FareRequest) =>
      request.action === "ticketAreas"
        ? page([area(1)])
        : page([{ code: "A", name: null }]),
    );
    const result = await collectFareMap("ANEA", read, {
      id: "ticket_test",
      generation: "8",
    });
    expect(read).toHaveBeenNthCalledWith(1, {
      noc: "ANEA",
      action: "ticketAreas",
      id: "ticket_test",
      generation: "8",
      cursor: undefined,
      expectedGeneration: "8",
    });
    expect(result.zones).toHaveLength(1);
    expect(result.zones[0].stops).toEqual(["A"]);
    expect(
      read.mock.calls.some(([request]) => request.action === "areas"),
    ).toBe(false);
  });
  it("loads every area and membership page, preserving cursor and generation scopes", async () => {
    const read = vi.fn(async (request: FareRequest) => {
      if (request.action === "areas")
        return request.cursor ? page([area(2)]) : page([area(1)], "areas-next");
      if (request.id === area(1).id)
        return request.cursor
          ? page([{ code: "B", name: null }])
          : page([{ code: "A", name: null }], "stops-next");
      return page([{ code: "C", name: null }]);
    });
    const result = await collectFareMap("ANEA", read);
    expect(result).toEqual({
      generation: "8",
      zones: [
        {
          id: area(1).id,
          name: "Zone 1",
          stops: ["A", "B"],
          membershipComplete: true,
        },
        {
          id: area(2).id,
          name: "Zone 2",
          stops: ["C"],
          membershipComplete: true,
        },
      ],
    });
    expect(read).toHaveBeenCalledWith({
      noc: "ANEA",
      action: "areas",
      cursor: "areas-next",
      expectedGeneration: "8",
    });
    expect(read).toHaveBeenCalledWith({
      noc: "ANEA",
      action: "stops",
      id: area(1).id,
      generation: "8",
      cursor: "stops-next",
      expectedGeneration: "8",
    });
  });
  it("does not mark incomplete or unspecified source membership as complete", async () => {
    const result = await collectFareMap("ANEA", async (request) =>
      request.action === "areas"
        ? page([
            { ...area(1), membership: "incomplete" },
            { ...area(2), membership: undefined },
          ])
        : page([]),
    );
    expect(result.zones.every((zone) => !zone.membershipComplete)).toBe(true);
  });
  it("keeps concurrent upstream membership reads at four or fewer", async () => {
    let active = 0,
      peak = 0;
    const result = await collectFareMap("ANEA", async (request) => {
      if (request.action === "areas")
        return page(Array.from({ length: 12 }, (_, n) => area(n)));
      peak = Math.max(peak, ++active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
      return page([]);
    });
    expect(peak).toBe(4);
    expect(result.zones).toHaveLength(12);
  });
  it("rejects a catalogue change instead of returning mixed or partial coverage", async () => {
    await expect(
      collectFareMap("ANEA", async (request) =>
        request.action === "areas" ? page([area(1)]) : page([], null, "9"),
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("preserves lifecycle errors from a removed zone", async () => {
    await expect(
      collectFareMap("ANEA", async (request) => {
        if (request.action === "areas") return page([area(1)]);
        throw new FareApiError(410, "This fare has been removed or regrouped.");
      }),
    ).rejects.toMatchObject({ status: 410 });
  });
  it("stops repeated cursors and runaway catalogue pagination", async () => {
    await expect(
      collectFareMap("ANEA", async () => page([], "repeated")),
    ).rejects.toThrow("Repeated map catalogue cursor");
    let cursor = 0;
    await expect(
      collectFareMap("ANEA", async () => page([], String(++cursor))),
    ).rejects.toThrow("request budget exceeded");
    expect(cursor).toBe(1000);
  });
});
