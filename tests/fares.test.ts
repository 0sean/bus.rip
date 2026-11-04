import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InfiniteQueryObserver, QueryClient } from "@tanstack/react-query";
import {
  FareApiError,
  fareDate,
  fareTerm,
  londonDate,
  money,
  readFareResponse,
  ticketPrice,
  type FareItem,
  type FareRequest,
} from "../src/lib/fares";
import { fareZoneFeatures, zoneColor } from "../src/lib/fare-map";
import type { Stop } from "../src/lib/buslane";
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate: { parse: (data: unknown) => unknown };
    const builder = {
      middleware: () => builder,
      validator: (schema: typeof validate) => {
        validate = schema;
        return builder;
      },
      handler:
        (handler: (args: { data: unknown }) => unknown) =>
        (args: { data: unknown }) =>
          handler({ data: validate.parse(args.data) }),
    };
    return builder;
  },
}));
vi.mock("../src/middleware/rate-limit", () => ({ rateLimit: vi.fn() }));
import { fareRequestSchema, getFareCatalogue } from "../src/functions/fares";
import {
  fareDetailOptions,
  farePagesOptions,
  journeyFaresOptions,
} from "../src/data/queries";
vi.mock("../src/functions/operators", () => ({}));
vi.mock("../src/functions/locations", () => ({}));
vi.mock("../src/functions/buslane", () => ({}));
const id = (kind: string, n = "a") => `${kind}_${n.repeat(64)}`;
const item = (kind: FareItem["kind"] = "ticket", n = "a"): FareItem => ({
  id: id(kind, n),
  kind,
  name: "Adult ticket",
  revision: 1,
  ticket_count: 1,
  price_basis: "published",
  prices: [{ amount: "6.00", currency: "GBP" }],
});
const response = (body: unknown, generation = "1", status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "x-catalogue-generation": generation,
      "x-catalogue-version": "1",
      ...extra,
    },
  });
const fetchMock = vi.fn();
const call = getFareCatalogue as unknown as (arg: {
  data: FareRequest;
}) => Promise<Response>;
const read = async <T = FareItem[]>(data: FareRequest) =>
  readFareResponse<T>(await call({ data }));
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("BUSLANE_ENABLED", "1");
  vi.stubEnv("BUSLANE_BASE_URL", "https://buslane.test/");
  vi.stubEnv("BUSLANE_API_KEY", "server-only-key");
  fetchMock.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("derived catalogue adapter", () => {
  it("loads one canonical page with server-only authentication and preserves equal-named variants", async () => {
    fetchMock.mockResolvedValue(
      response([item(), item("ticket", "b")], "6", 200, {
        "x-next-cursor": "opaque+cursor/=",
      }),
    );
    const result = await read({ noc: "anea", action: "tickets", q: "ad" });
    expect(result).toMatchObject({
      generation: "6",
      version: "1",
      nextCursor: "opaque+cursor/=",
      data: [item(), item("ticket", "b")],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(new URL(url).pathname).toBe("/api/fares/operators/ANEA/tickets");
    expect(new URL(url).searchParams.get("limit")).toBe("50");
    expect(new URL(url).searchParams.get("q")).toBe("ad");
    expect(options.headers.Authorization).toBe("Bearer server-only-key");
    expect(JSON.stringify(result)).not.toContain("server-only-key");
    expect(
      (await call({ data: { noc: "ANEA", action: "areas" } })).headers.get(
        "cache-control",
      ),
    ).toBe("no-store");
  });
  it("root pagination waits for Show more and never changes the cursor's filter binding", async () => {
    const first = item("area"),
      second = item("area", "b");
    fetchMock
      .mockResolvedValueOnce(
        response([first], "6", 200, { "x-next-cursor": "opaque+cursor/=" }),
      )
      .mockResolvedValueOnce(response([second], "6"));
    const client = new QueryClient();
    const options = farePagesOptions({ noc: "ANEA", action: "areas", q: "ad" });
    const initial = await client.fetchInfiniteQuery(options);
    expect(initial.pages[0].data).toEqual([first]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const observer = new InfiniteQueryObserver(client, options);
    const next = await observer.fetchNextPage();
    expect(next.data?.pages.flatMap((p) => p.data)).toEqual([first, second]);
    const url = new URL(fetchMock.mock.calls[1][0]);
    expect(url.searchParams.get("cursor")).toBe("opaque+cursor/=");
    expect(url.searchParams.has("generation")).toBe(false);
    expect(url.searchParams.get("q")).toBe("ad");
    observer.destroy();
    client.clear();
  });
  it("keeps generation, operator, resource and filter scopes in query keys", () => {
    const base = {
      noc: "ANEA",
      action: "areaTickets" as const,
      id: id("area"),
      generation: "6",
    };
    const requests = [
      base,
      { ...base, generation: "7" },
      { ...base, noc: "OTHER" },
      { ...base, id: id("area", "b") },
      { ...base, q: "ad" },
      { ...base, familyId: id("family") },
    ];
    expect(
      new Set(requests.map((q) => JSON.stringify(farePagesOptions(q).queryKey)))
        .size,
    ).toBe(requests.length);
    expect(fareDetailOptions("ANEA", id("ticket"), "6").queryKey).not.toEqual(
      fareDetailOptions("ANEA", id("ticket"), "7").queryKey,
    );
  });
  it.each([
    ["areaTickets", "area", "areas", "tickets"],
    ["areaFamilies", "area", "areas", "families"],
    ["familyTickets", "family", "families", "tickets"],
    ["ticketAreas", "ticket", "tickets", "areas"],
    ["ticketRoutes", "ticket", "tickets", "routes"],
    ["stops", "area", "areas", "stops"],
    ["sources", "ticket", "tickets", "sources"],
  ] as const)(
    "uses bounded direct associations for %s",
    async (action, kind, resource, child) => {
      fetchMock.mockResolvedValue(response([], "6"));
      await read({ noc: "ANEA", action, id: id(kind), generation: "6" });
      const url = new URL(fetchMock.mock.calls[0][0]);
      expect(url.pathname).toBe(
        `/api/fares/operators/ANEA/${resource}/${id(kind)}/${child}`,
      );
      expect(url.searchParams.get("generation")).toBe("6");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
  it("preserves an explicit generation and area-family filter across pages", async () => {
    fetchMock.mockResolvedValue(response([], "6"));
    await read({
      noc: "ANEA",
      action: "areaTickets",
      id: id("area"),
      familyId: id("family"),
      generation: "6",
      cursor: "signed",
      expectedGeneration: "6",
    });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("family_id")).toBe(id("family"));
    expect(url.searchParams.get("generation")).toBe("6");
    expect(url.searchParams.has("expectedGeneration")).toBe(false);
  });
  it("loads ticket detail with one scoped request and no operator scan", async () => {
    fetchMock.mockResolvedValue(response(item(), "6"));
    const detail = await read<FareItem>({
      noc: "ANEA",
      action: "detail",
      id: id("ticket"),
      generation: "6",
    });
    expect(detail.data.id).toBe(id("ticket"));
    expect(new URL(fetchMock.mock.calls[0][0]).pathname).toBe(
      `/api/fares/operators/ANEA/tickets/${id("ticket")}`,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("preserves exact route, direction, date, decimal price and candidate validity", async () => {
    const candidate = {
      ...item(),
      amount: "2.40",
      currency: "GBP",
      status: "outside_published_validity",
      date: "2026-11-04",
      unresolved_count: 1,
    };
    const body = {
      status: "published_candidates",
      candidates: [candidate],
      conditions_evaluated: false,
      unsupported_patterns_possible: true,
    };
    fetchMock.mockResolvedValue(response(body, "6"));
    const req = {
      noc: "ANEA",
      action: "journey" as const,
      id: id("route"),
      origin: id("point", "b"),
      destination: id("point", "c"),
      date: "2026-11-04",
      generation: "6",
    };
    expect((await read(req)).data).toEqual(body);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/api/fares/operators/ANEA/journey-fares");
    expect(url.searchParams.get("origin")).toBe(req.origin);
    expect(url.searchParams.get("destination")).toBe(req.destination);
    expect(url.searchParams.get("route_id")).toBe(req.id);
    expect(url.searchParams.get("date")).toBe("2026-11-04");
    expect(journeyFaresOptions(req).queryKey).not.toEqual(
      journeyFaresOptions({
        ...req,
        origin: req.destination,
        destination: req.origin,
      }).queryKey,
    );
  });
  it("preserves an unsupported empty journey result without inventing a fare", async () => {
    const body = {
      status: "no_supported_published_fare",
      candidates: [],
      conditions_evaluated: false,
      unsupported_patterns_possible: true,
    };
    fetchMock.mockResolvedValue(response(body));
    expect(
      (
        await read({
          noc: "ANEA",
          action: "journey",
          id: id("route"),
          origin: id("point", "b"),
          destination: id("point", "c"),
          date: "2026-11-04",
        })
      ).data,
    ).toEqual(body);
  });
  it.each([404, 409, 410, 503])(
    "propagates actionable status %i without caching failures",
    async (status) => {
      fetchMock.mockResolvedValue(
        response({ error: "sensitive upstream details" }, "6", status),
      );
      const result = await call({
        data: { noc: "ANEA", action: "detail", id: id("ticket") },
      });
      expect(result.status).toBe(status);
      expect(result.headers.get("cache-control")).toBe("no-store");
      const body = await result.clone().json();
      expect(body.error).not.toContain("sensitive");
      await expect(readFareResponse(result)).rejects.toBeInstanceOf(
        FareApiError,
      );
    },
  );
  it("rejects changed generations even if an upstream response is incorrectly successful", async () => {
    fetchMock.mockResolvedValue(response([], "7"));
    await expect(
      read({
        noc: "ANEA",
        action: "areas",
        cursor: "signed",
        expectedGeneration: "6",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it.each([
    new Response("bad json", {
      headers: { "x-catalogue-generation": "6", "x-catalogue-version": "1" },
    }),
    response({ not: "an array" }),
    response([], "6", 200, { "x-catalogue-version": "2" }),
    response([], "6", 200, { "x-catalogue-generation": "" }),
  ])("rejects incomplete or incompatible responses", async (upstream) => {
    fetchMock.mockResolvedValue(upstream);
    await expect(read({ noc: "ANEA", action: "areas" })).rejects.toMatchObject({
      status: 503,
    });
  });
  it("handles timeout/network failure and disabled integration", async () => {
    fetchMock.mockRejectedValue(new Error("network"));
    await expect(read({ noc: "ANEA", action: "areas" })).rejects.toMatchObject({
      status: 503,
    });
    vi.stubEnv("BUSLANE_ENABLED", "0");
    fetchMock.mockClear();
    await expect(read({ noc: "ANEA", action: "areas" })).rejects.toMatchObject({
      status: 503,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([
    { noc: "../TEST", action: "areas" },
    { noc: "TEST", action: "detail", id: 123 },
    { noc: "TEST", action: "detail", id: "123" },
    { noc: "TEST", action: "areaTickets", id: id("ticket") },
    { noc: "TEST", action: "origins", id: id("area") },
    { noc: "TEST", action: "areas", q: "x".repeat(121) },
    { noc: "TEST", action: "areas", generation: "0" },
    {
      noc: "TEST",
      action: "journey",
      id: id("route"),
      origin: id("point"),
      destination: id("point", "b"),
      date: "2026-02-30",
    },
    {
      noc: "TEST",
      action: "journey",
      id: id("route"),
      origin: id("point"),
      destination: id("point", "b"),
    },
  ])("validates public resources before fetching: %j", (data) => {
    expect(fareRequestSchema.safeParse(data).success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
describe("passenger-facing evidence and coverage", () => {
  it("formats passenger-facing evidence without changing its meaning", () => {
    expect(fareDate("2026-11-03T00:00:00Z")).toBe("3 Nov 2026");
    expect(fareDate("unknown")).toBe("unknown");
    expect(fareTerm("onBoard")).toBe("On Board");
    expect(fareTerm("youngPerson")).toBe("Young Person");
    expect(fareTerm("P1D")).toBe("1 day");
    expect(fareTerm("P2W")).toBe("2 weeks");
  });
  it("never presents journey bands or conditional price evidence as a flat price", () => {
    expect(
      ticketPrice({
        ...item(),
        price_basis: "journey",
        prices: [
          { amount: "1.80", currency: "GBP" },
          { amount: "5.20", currency: "GBP" },
        ],
      }),
    ).toBe("Choose a journey");
    expect(ticketPrice({ ...item(), price_basis: "conditional" })).toBe(
      "Check ticket conditions",
    );
    expect(ticketPrice(item())).toBe("£6.00");
    expect(money("0.00", "GBP")).toBe("£0.00");
    expect(money("2.00", null)).toContain("currency not supplied");
  });
  it("uses the UK calendar date across UTC midnight and daylight saving", () => {
    expect(londonDate(new Date("2026-06-30T23:30:00Z"))).toBe("2026-07-01");
    expect(londonDate(new Date("2026-11-04T23:30:00Z"))).toBe("2026-11-04");
  });
  it("plots only loaded membership with valid coordinates and never invents a boundary", () => {
    const stops = [
      { id: "atco:A", lon: "-1", lat: "51" },
      { id: "B", lon: "-2", lat: "51" },
      { id: "C", lon: "-2", lat: "52" },
      { id: "D", lon: "0", lat: "100" },
      { id: "OUTSIDE", lon: "0", lat: "51" },
    ] as Stop[];
    const zone = {
      id: id("area"),
      name: "Town",
      stops: ["A", "B", "C", "D", "A"],
    };
    const result = fareZoneFeatures([zone], stops);
    expect(result.areas.features).toHaveLength(0);
    expect(result.points.features).toHaveLength(3);
    expect(result.labels.features).toHaveLength(1);
    expect(result.labels.features[0].properties?.zoneId).toBe(id("area"));
    expect(zoneColor(id("area"))).toBe(zoneColor(id("area")));
    expect(
      fareZoneFeatures([{ ...zone, stops: [] }], stops).points.features,
    ).toHaveLength(0);
  });
});
