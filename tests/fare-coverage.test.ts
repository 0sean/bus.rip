import { describe, expect, it, vi } from "vitest";
import {
  collectFareCoverage,
  collectFarePages,
} from "../src/lib/fare-coverage";
import {
  FareApiError,
  type FarePage,
  type FareRequest,
  type FareStop,
} from "../src/lib/fares";

const page = (
  codes: string[],
  nextCursor: string | null = null,
  generation = "8",
): FarePage<FareStop[]> => ({
  data: codes.map((code) => ({ code, name: code })),
  nextCursor,
  generation,
  version: "1",
});
const request = { noc: "ANEA", id: "area_test", generation: "8" };

describe("complete zone coverage", () => {
  it("loads every stop page before returning one complete result", async () => {
    const read = vi.fn(async (data: FareRequest) =>
      data.cursor ? page(["C"]) : page(["A", "B"], "more"),
    );
    const result = await collectFareCoverage(request, read);
    expect(result.data.map((stop) => stop.code)).toEqual(["A", "B", "C"]);
    expect(result.nextCursor).toBeNull();
    expect(read).toHaveBeenLastCalledWith({
      ...request,
      action: "stops",
      cursor: "more",
      expectedGeneration: "8",
    });
  });
  it("does not change an unpinned cursor's original generation filter", async () => {
    const read = vi.fn(async (data: FareRequest) =>
      data.cursor ? page(["B"]) : page(["A"], "next"),
    );
    await collectFareCoverage({ noc: request.noc, id: request.id }, read);
    expect(read).toHaveBeenLastCalledWith({
      noc: request.noc,
      id: request.id,
      action: "stops",
      cursor: "next",
      expectedGeneration: "8",
    });
  });
  it("rejects changed generations and failed later pages instead of returning partial stops", async () => {
    await expect(
      collectFareCoverage(request, async () => page([], null, "9")),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      collectFareCoverage(request, async (data) => {
        if (data.cursor) throw new FareApiError(503, "Unavailable");
        return page(["A"], "next");
      }),
    ).rejects.toMatchObject({ status: 503 });
  });
  it("bounds repeated or runaway pagination", async () => {
    await expect(
      collectFareCoverage(request, async () => page([], "same")),
    ).rejects.toThrow("Repeated coverage cursor");
    let reads = 0;
    await expect(
      collectFareCoverage(request, async () => page([], String(++reads))),
    ).rejects.toThrow("request budget exceeded");
    expect(reads).toBe(1000);
  });
});

it.each(["origins", "destinations"] as const)(
  "collects all %s while retaining directional IDs and generation",
  async (action) => {
    const request = {
      noc: "ANEA",
      action,
      id: "route_exact",
      origin: action === "destinations" ? "point_selected" : undefined,
      generation: "8",
    };
    const read = vi.fn(async (data: FareRequest) =>
      data.cursor
        ? page(["last"])
        : page(
            Array.from({ length: 50 }, (_, i) => String(i)),
            "next",
          ),
    );
    const result = await collectFarePages(request, read);
    expect(result.data).toHaveLength(51);
    expect(result.nextCursor).toBeNull();
    expect(read).toHaveBeenLastCalledWith({
      ...request,
      cursor: "next",
      expectedGeneration: "8",
    });
  },
);
