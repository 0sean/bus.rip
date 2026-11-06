import { test, expect, type APIRequestContext } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const proxy = process.env.FARES_PROXY_URL || "http://127.0.0.1:3190";
const backend = process.env.BUSLANE_TEST_URL || "http://127.0.0.1:3187";
const noc = process.env.FARES_TEST_NOC || "ANEA";
const auth = {
  Authorization: `Bearer ${process.env.BUSLANE_TEST_API_KEY || "catalogue-benchmark"}`,
};
const measurements: unknown[] = [];
type Record = {
  path: string;
  status: number;
  bytes: number;
  elapsed_ms: number;
  authenticated: boolean;
};
const stats = async (request: APIRequestContext) =>
  (await (await request.get(proxy + "/__test/stats")).json()) as Record[];
async function record(request: APIRequestContext, flow: string) {
  const requests = await stats(request);
  expect(
    requests.every((r) => !/\/(entities|documents)(?:\/|\?)/.test(r.path)),
  ).toBeTruthy();
  expect(requests.every((r) => r.authenticated)).toBeTruthy();
  measurements.push({ flow, requests });
  return requests;
}
test.beforeEach(async ({ request }) => {
  await request.post(proxy + "/__test/reset");
});
test.afterAll(() => {
  mkdirSync("test-results", { recursive: true });
  writeFileSync(
    "test-results/fares-catalogue-flow.json",
    JSON.stringify(measurements, null, 2) + "\n",
  );
});
test("operator map shows all areas while catalogue cards remain paginated", async ({
  page,
  request,
}) => {
  await page.goto(`/fares/${noc}`);
  const cards = page
    .locator(`main a[href*="/fares/${noc}/area_"]`)
    .filter({ has: page.locator("h3") });
  await expect(cards).toHaveCount(50);
  await expect(
    page.getByRole("region", { name: "Published ticket-area stop locations" }),
  ).toBeVisible({ timeout: 35_000 });
  const first = await record(request, "first area page and all-zone map");
  await expect(
    page.getByRole("status").filter({ hasText: "Approximate zone coverage" }),
  ).toBeVisible();
  const coveredAreas = new Set(
    first.flatMap((r) => {
      const match = /\/areas\/(area_[a-f0-9]+)\/stops\?/.exec(r.path);
      return match ? [match[1]] : [];
    }),
  );
  expect(coveredAreas.size).toBeGreaterThan(50);
  expect(first.filter((r) => r.path.includes("/timetables/"))).toHaveLength(1);
  expect(
    first.some((r) => /\/areas\/area_.*\/stops\?/.test(r.path)),
  ).toBeTruthy();
  await expect(
    page.getByRole("combobox", { name: "Explore ticket areas" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Show more", exact: true }).click();
  await expect(cards).toHaveCount(100);
  const next = await record(request, "second area card page");
  expect(next.filter((r) => r.path.includes("/api/fares/")).length).toBe(
    first.filter((r) => r.path.includes("/api/fares/")).length + 1,
  );
  await page
    .getByRole("textbox", { name: "Search fares by name prefix" })
    .fill("Durham");
  await expect(
    page.getByRole("status").filter({ hasText: "matching your search" }),
  ).toBeVisible();
  const names = await cards.locator("h3").allTextContents();
  expect(names.length).toBeGreaterThan(0);
  expect(
    names.every((name) => name.toLowerCase().startsWith("durham")),
  ).toBeTruthy();
  await record(request, "prefix search");
});
test("direct area access shows coverage and opens useful ticket information", async ({
  page,
  request,
}) => {
  const id =
    process.env.FARES_TEST_AREA_ID ||
    "area_cb6be998fb32646d1eab12769df35d9dc187c7f5e27c535af9edb54a7202a98f";
  await page.goto(`/fares/${noc}/${id}`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Durham Zone" }),
  ).toBeVisible();
  await expect(page.getByText("£6.00", { exact: true })).toBeVisible();
  await expect(page.getByText("£29.00", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Published ticket-area stop locations" }),
  ).toBeVisible();
  const before = await record(
    request,
    "area detail, tickets and automatic coverage",
  );
  expect(before.filter((r) => r.path.includes("/api/fares/"))).toHaveLength(3);
  expect(before.some((r) => r.path.includes("/sources"))).toBeFalsy();
  expect(before.filter((r) => r.path.includes("/timetables/"))).toHaveLength(1);
  await expect(
    page
      .locator("main summary")
      .filter({ hasText: /Published (stops|sources)/ }),
  ).toHaveCount(0);
  await expect(page.locator("main li")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Load more published stops" }),
  ).toHaveCount(0);
  await page
    .getByRole("link")
    .filter({
      has: page.getByRole("heading", {
        name: "AD Durham Day Pass",
        exact: true,
      }),
    })
    .click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "AD Durham Day Pass",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("£6.00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "More info", exact: true }).click();
  const info = page.getByRole("dialog", { name: "Ticket information" });
  await expect(info.getByText("Who can travel", { exact: true })).toBeVisible();
  await expect(info.getByText("Valid for", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(info).toHaveCount(0);
  await record(request, "ticket detail and passenger information popup");
  await page.screenshot({
    path: "test-results/fares-ticket-desktop.png",
    fullPage: true,
  });
});
test("coverage failure leaves tickets usable and can be retried", async ({
  page,
  request,
}) => {
  const id =
    process.env.FARES_TEST_AREA_ID ||
    "area_cb6be998fb32646d1eab12769df35d9dc187c7f5e27c535af9edb54a7202a98f";
  await request.post(proxy + "/__test/fault", {
    data: { status: 503, path: `/areas/${id}/stops?` },
  });
  await page.goto(`/fares/${noc}/${id}`);
  await expect(page.getByText("£6.00", { exact: true })).toBeVisible();
  const coverage = page.getByRole("region", {
    name: "Published coverage",
    exact: true,
  });
  await expect(coverage.getByRole("alert")).toContainText(
    "Fares could not load",
  );
  await coverage.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(coverage.getByRole("alert")).toHaveCount(0);
  await expect(coverage).toContainText("40 published stops");
  await expect(
    coverage.getByRole("region", {
      name: "Published ticket-area stop locations",
    }),
  ).toBeVisible();
});
test("journey discovery sends an exact directed pair and date to the server", async ({
  page,
  request,
}) => {
  const read = async (path: string) => {
    const r = await request.get(
      `${backend}/api/fares/operators/${noc}/${path}`,
      { headers: auth },
    );
    expect(r.ok()).toBeTruthy();
    return r.json();
  };
  const routes = await read("routes?limit=50");
  let route, origin, destination;
  for (const candidate of routes.slice(0, 10)) {
    const origins = await read(`routes/${candidate.id}/origins?limit=50`);
    if (!origins.length) continue;
    const destinations = await read(
      `routes/${candidate.id}/destinations?origin=${origins[0].id}&limit=50`,
    );
    if (!destinations.length) continue;
    route = candidate;
    origin = origins[0];
    destination = destinations[0];
    break;
  }
  expect(route).toBeTruthy();
  await page.goto(`/fares/${noc}/${route.id}`);
  await page.getByLabel("From", { exact: true }).click();
  await page
    .getByRole("combobox", { name: "Search origins" })
    .fill(origin.name);
  await page
    .getByRole("option", { name: origin.name, exact: true })
    .first()
    .click();
  await page.getByLabel("To", { exact: true }).click();
  await page
    .getByRole("combobox", { name: "Search destinations" })
    .fill(destination.name);
  await page
    .getByRole("option", { name: destination.name, exact: true })
    .first()
    .click();
  await page.getByLabel("Travel date").fill("2026-11-04");
  await expect(
    page
      .getByText(
        /Published candidate — conditions apply|Outside published validity — do not use/,
      )
      .first(),
  ).toBeVisible();
  const records = await record(request, "directional journey lookup");
  const journey = records
    .filter((r) => r.path.includes("/journey-fares?"))
    .at(-1)!;
  const url = new URL(journey.path, backend);
  expect(url.searchParams.get("origin")).toBe(origin.id);
  expect(url.searchParams.get("destination")).toBe(destination.id);
  expect(url.searchParams.get("route_id")).toBe(route.id);
  expect(url.searchParams.get("date")).toBe("2026-11-04");
  expect(records.some((r) => r.path.includes("/stops"))).toBeFalsy();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("From", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/fares-journey-mobile.png",
    fullPage: true,
  });
});
test("a generation change hides stale pages and provides a working restart", async ({
  page,
  request,
}) => {
  await page.goto(`/fares/${noc}`);
  const cards = page
    .locator(`main a[href*="/fares/${noc}/area_"]`)
    .filter({ has: page.locator("h3") });
  await expect(cards).toHaveCount(50);
  await request.post(proxy + "/__test/fault", {
    data: { status: 409, path: "/areas?" },
  });
  await page.getByRole("button", { name: "Show more", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Fares have changed");
  await expect(cards).toHaveCount(0);
  await page.getByRole("link", { name: "Load latest fares" }).click();
  await expect(cards).toHaveCount(50);
  await record(request, "generation conflict and restart");
});
test("removed IDs and legacy numeric links offer fresh navigation", async ({
  page,
  request,
}) => {
  const id =
    process.env.FARES_TEST_AREA_ID ||
    "area_cb6be998fb32646d1eab12769df35d9dc187c7f5e27c535af9edb54a7202a98f";
  await request.post(proxy + "/__test/fault", {
    data: { status: 410, path: `/areas/${id}?` },
  });
  await page.goto(`/fares/${noc}/${id}`);
  await expect(page.getByRole("alert")).toContainText("removed or regrouped");
  await expect(
    page.getByRole("link", { name: "Load latest fares" }),
  ).toBeVisible();
  await page.goto(`/fares/${noc}/123`);
  await expect(
    page.getByRole("heading", { name: "This fare link is unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Browse latest fares" }),
  ).toBeVisible();
});
