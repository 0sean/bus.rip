import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";

vi.mock("../src/data/queries", () => ({}));
vi.mock("../src/routes/monitoring", async () => {
  const { createFileRoute } = await import("@tanstack/react-router");
  return { Route: createFileRoute("/monitoring")({}) };
});

import { routeTree } from "../src/routeTree.gen";

function router() {
  return createRouter({
    routeTree,
    history: createMemoryHistory(),
    context: { queryClient: new QueryClient() },
  });
}

describe("public routes", () => {
  it.each([
    ["/map", "/map", {}],
    ["/map/TEST", "/_operator/map/$nocCode", { nocCode: "TEST" }],
    ["/fares/TEST", "/_operator/fares_/$nocCode", { nocCode: "TEST" }],
    [
      "/timetables/TEST",
      "/_operator/timetables_/$nocCode",
      { nocCode: "TEST" },
    ],
    [
      "/timetables/TEST/route/123",
      "/_operator/timetables_/$nocCode_/route/$route",
      { nocCode: "TEST", route: "123" },
    ],
    [
      "/timetables/TEST/trip/456",
      "/_operator/timetables_/$nocCode_/trip/$trip",
      { nocCode: "TEST", trip: "456" },
    ],
  ])("matches %s with the correct parameters", (path, routeId, params) => {
    const matches = router().matchRoutes(path);
    expect(matches.at(-1)?.routeId).toBe(routeId);
    expect(matches.at(-1)?.params).toEqual(params);
    if ("nocCode" in params) {
      expect(matches.map((match) => match.routeId)).toContain("/_operator");
    }
    // Detail pages must render directly in the shared layout, rather than
    // nesting inside the timetable list (which has no Outlet).
    if ("route" in params || "trip" in params) {
      expect(matches).toHaveLength(3);
    }
  });

  it.each(["/", "/fares", "/timetables"])("keeps the %s landing page", (path) =>
    expect(router().matchRoutes(path).at(-1)?.routeId).toBe(path),
  );

  it.each(["/nearby", "/TEST", "/TEST/fares", "/TEST/timetables"])(
    "no longer matches %s",
    (path) => {
      expect(router().matchRoutes(path).at(-1)?.routeId).toBe("__root__");
    },
  );
});
