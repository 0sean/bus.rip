import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      validator: () => builder,
      handler: (handler: unknown) => handler,
    };
    return builder;
  },
}));
vi.mock("../src/middleware/cache-control", () => ({ cacheControl: vi.fn() }));
vi.mock("../src/functions/db.server", () => ({
  db: { select: () => ({ from: state.select }) },
  updateOperators: state.update,
}));
vi.mock("../src/functions/traveline.server", () => ({
  fetchNocLines: state.fetch,
}));

import { getOperators } from "../src/functions/operators";

const existing = {
  id: 42,
  lineNo: 1,
  nocCode: "TEST",
  publicName: "Test buses",
  referenceName: "Test Ltd",
  hasMissingLocationData: true,
};
const incoming = {
  lineNo: 1,
  nocCode: "TEST",
  publicName: "Test buses",
  referenceName: "Test Ltd",
  hasMissingLocationData: false,
};

beforeEach(() => vi.resetAllMocks());

describe("operator refresh", () => {
  it("returns plain JSON and preserves database IDs and flags on unchanged feeds", async () => {
    state.select.mockResolvedValue([existing]);
    state.fetch.mockResolvedValue([incoming]);
    const response = await getOperators();
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(await response.json()).toEqual([existing]);
    expect(state.update).not.toHaveBeenCalled();
  });

  it("updates changed rows, removes ceased rows, and returns the committed data", async () => {
    const updated = { ...existing, publicName: "New name" };
    state.select
      .mockResolvedValueOnce([existing, { ...existing, lineNo: 2 }])
      .mockResolvedValueOnce([updated]);
    state.fetch.mockResolvedValue([{ ...incoming, publicName: "New name" }]);
    state.update.mockResolvedValue(undefined);
    const response = await getOperators();
    expect(state.update).toHaveBeenCalledWith(
      [{ ...incoming, publicName: "New name" }],
      [2],
    );
    expect(await response.json()).toEqual([updated]);
  });

  it.each([
    { label: "empty feeds", rows: [] },
    { label: "duplicate line numbers", rows: [incoming, incoming] },
    { label: "invalid line numbers", rows: [{ ...incoming, lineNo: NaN }] },
  ])("rejects $label without updating the database", async ({ rows }) => {
    state.select.mockResolvedValue([existing]);
    state.fetch.mockResolvedValue(rows);
    await expect(getOperators()).rejects.toThrow();
    expect(state.update).not.toHaveBeenCalled();
  });
});
