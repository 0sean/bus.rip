# Buslane passenger catalogue migration

The WIP fares UI now uses Buslane catalogue interpretation version 1 (fares database schema 2). Deploy the matching Buslane importer/API and complete its catalogue backfill **before** deploying this consumer. Existing server-only `BUSLANE_BASE_URL` and `BUSLANE_API_KEY` configuration continues to apply. Omit `BUSLANE_API_KEY` to disable Buslane integration. No bus.rip database migration or new credential is required. No production deployment is performed by this change.

## Passenger flow

* Operator → **Ticket areas** → area → applicable ticket variants → ticket conditions. The card layout, search, Show more controls and operator navigation are retained.
* **Tickets** provides navigation families, including tickets without a browsing area. Each loaded family page is enriched server-side with price summaries from every page of its variants, pinned to the same generation. Cards show one price or a minimum–maximum range per currency, with journey-dependent and conditional amounts labelled. Truncated or missing price evidence is not advertised as a complete range. Price aggregation has a separate rate-limit budget, at most four simultaneous upstream reads, a 30-second deadline and a 1,000-read limit. Selecting a family shows its variants; similar names never imply the same eligibility, price, validity or coverage.
* **Journey fares** provides routes → origin → directional destination → travel date → conditional published candidates. Ticket details also offer a separately expanded list of applicable catalogue routes. Route/point IDs are fare-catalogue IDs, not timetable route IDs or arbitrary stop codes.
* Area details use a viewport-height map with an overlaid zone title and stop/ticket counts beside a two-column ticket grid. Prices sit beside each card’s arrow, with duration/passenger information beneath the published name. The grid scrolls independently on desktop and stacks below the map on mobile. Stops are shown only on the map; the zone page has no stop list, source list or membership pagination control. A dedicated coverage request collects every upstream stop page server-side at the selected generation, with a separate rate-limit budget, 30-second deadline and 1,000-read limit, then returns one complete response. Timetable coordinates load in parallel. Full published membership can produce a clearly labelled approximate convex coverage envelope; these envelopes may include unserved land or exclusions and are never official ticket boundaries.

* The operator fares overview shows all ticket areas together. A dedicated map server function traverses all area and stop-membership pages, pinned to a single generation, with at most four upstream reads in flight, a 30-second deadline and a 1,000-read limit. It fails explicitly rather than presenting an incomplete overview as complete. The map request has its own rate-limit budget so automatic coverage reads do not exhaust interactive fare browsing. Timetable coordinates remain shared with area details. Hovering previews a timetable-style card with named zone rows, colour badges and chevrons. Clicking pins the card; its rows open the matching zones. Overlapping coverage is shown as a scrollable list. The paginated area cards provide keyboard-accessible zone links.
* Individual ticket pages use the full-height split map layout, with a summary of price, passenger type and sales channel over the map and applicable area cards alongside. Ticket coverage traverses only that ticket's area associations and all their stop pages, pinned to the selected generation. **More info** opens an accessible, scrollable dialog with icons and passenger-friendly labels for duration, purchase options, payment methods, ticket format, travel-day hours, service restrictions and published fare dates when available. Source references, raw conditions and technical diagnostics are omitted. Fare publication dates remain distinct from ticket duration; far-future administrative end dates are not shown as a passenger expiry. Journey-dependent tickets retain route selection and price lookup inside the dialog. Source provenance remains separately available on other catalogue resource pages.


The overview map displays approximate shaded coverage envelopes for all published areas with matching stop coordinates. The Paper layout places the 565px desktop map first, followed by one toolbar with categories, result count and prefix search, then the four-column card grid. The toolbar stacks on small screens. Search is case-insensitive **name-prefix** search, reflecting the upstream indexed contract; it is labelled accordingly.

## Data and cache behaviour

`src/functions/fares.ts` validates the operator, action, typed stable IDs, cursor, date, generation and search length. Each catalogue page invocation constructs an allowlisted operator-scoped path and makes one upstream request with `limit=50`. The dedicated overview map function aggregates these bounded reads as described above. The bearer key stays on the server. Errors do not relay upstream secrets or internal details. The retired raw entity scans, document metadata batches, name-based deduplication, publication-timestamp edition grouping and client-side matrix matching have been removed.

Catalogue server-function responses use `Cache-Control: no-store`. TanStack Query caches include interpretation version, operator, endpoint, filters and generation, with a 60-second stale time. Infinite queries request one page initially and another only on Show more. Root cursors already pin the generation and their original filter binding: the adapter verifies the expected generation in the response without adding a new upstream `generation` parameter halfway through pagination. A selected detail link carries `?generation=N`; all its child requests retain it. Direct stable URLs without this parameter use the current generation.

A 409 hides the stale paginated results and offers a full navigation restart. A 410 explains that the item was removed/regrouped and offers the latest catalogue. Removed/merged IDs are not silently redirected to an arbitrary replacement. Legacy numeric entity URLs cannot safely identify a canonical area/ticket; they show an explicit link to browse the new catalogue. Names and source row IDs are no longer public identity keys.

Journey bands are never advertised as flat ticket prices. Exact amounts remain decimal strings until presentation. Candidate date status, unresolved conditions, partial lookup support, eligibility, sales channels and effective validity evidence are retained. Outside-validity candidates are explicitly labelled not usable for that date. Unsupported/empty lookup results do not claim that no ticket exists. Dates default to the UK calendar day, including summer-time boundaries. No cheapest-fare, payable-fare or capping promise is made.

## Verification

```sh
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm exec vitest run
DATABASE_PROVIDER=postgres corepack pnpm build
DATABASE_PROVIDER=d1 corepack pnpm build
corepack pnpm lint
```

`tests/fares.test.ts` covers bounded single-request pages/details/associations, exact directional/date lookup, equal-named variants, independent cache scopes, cursor binding, generation changes, incompatible versions, malformed upstream responses, missing/removed IDs, timeouts, disabled integration, typed input validation, exact amount presentation and membership-only mapping. Other existing test suites remain in place. `@types/geojson` is now a direct development dependency so both existing route maps and fare maps typecheck with pnpm's isolated dependencies.

The browser suite uses the built D1 consumer, an isolated local operator database and a real Buslane ANEA catalogue. `scripts/fares-test-proxy.mjs` is a loopback-only instrumented forwarder for request counts and injected 409/410 responses. It is a testing tool, never a deployment service. The production app does not contain test fault hooks. Screenshots, traces on failure and request measurements are written under ignored `test-results/`.

To reproduce the browser checks, start a matching Buslane API at `http://127.0.0.1:3187` using the complete measured ANEA snapshot (or supply a comparable catalogue and override the test IDs). Configure its test-only bearer key as `catalogue-benchmark`. Create the ignored local D1 config from `wrangler.jsonc.example`, apply local migrations and insert the operator into the isolated local database:

```sh
cp wrangler.jsonc.example wrangler.jsonc
corepack pnpm exec wrangler d1 migrations apply DB --local
corepack pnpm exec wrangler d1 execute DB --local --command \
  "INSERT INTO NocLine (lineNo,nocCode,publicName,referenceName) VALUES (1,'ANEA','Arriva North East','Arriva North East');"
```

For this test environment only, set these ignored `.dev.vars` values:

```dotenv
RATE_LIMIT_ENABLED=0
BUSLANE_BASE_URL=http://127.0.0.1:3190
BUSLANE_API_KEY=catalogue-benchmark
```

Then use separate terminals:

```sh
node scripts/fares-test-proxy.mjs
DATABASE_PROVIDER=d1 corepack pnpm build
DATABASE_PROVIDER=d1 corepack pnpm preview --host 127.0.0.1 --port 3188
corepack pnpm exec playwright install chromium
corepack pnpm exec playwright test
```

The browser suite verifies first/next-page request counts, prefix search, direct Durham day/week area access, automatic coverage, shaded all-zone overview, coverage retry, passenger information dialogs, exact directed/date lookup, mobile width, generation restart, removed IDs and legacy-link recovery. `BUSRIP_TEST_URL`, `BUSLANE_TEST_URL`, `BUSLANE_TEST_API_KEY`, `FARES_PROXY_URL`, `FARES_TEST_NOC` and `FARES_TEST_AREA_ID` can select an equivalent local setup. The default Durham ID belongs to the documented 4 November 2026 snapshot and may need replacing for another snapshot. This exercises a local full-operator catalogue, not a national import or a production deployment.

## Measured local verification — 4 November 2026

Final checks: **101 unit tests and five real-API browser scenarios passed**, both database-dialect type checks passed, PostgreSQL and D1 production builds passed, and lint passed for every changed code file. Client output contains neither the test bearer token nor the unit-test credential. The full repository linter still reports eight pre-existing unused-variable errors in unchanged `FollowCard.tsx`, `StopPopup.tsx`, `VehiclePopup.tsx` and `lib/utils.ts`; these were left outside the migration.

The browser ran against the complete 5,761-document ANEA catalogue, generation 4 after controlled update/removal/restoration checks in Buslane. Request recordings are saved in [the raw verification report](fares-catalogue-verification-2026-11-04.json). Recorded examples:

| Flow | Upstream fares requests | Uncompressed upstream body bytes |
| --- | ---: | ---: |
| First 50 areas | 1 | 11,907 |
| Next 50 areas | 1 additional | 11,915 additional |
| Durham area detail + applicable tickets | 2 | 7,148 |
| Expand its 40 published stops | 1 additional | 1,773 additional |
| Selected ticket detail + related area | 2 additional | 3,591 additional |
| Expand selected ticket provenance | 1 additional | 361 additional |
| Direct route detail → origins → destinations → exact journey pair | 4 | 12,381 |

No recorded consumer request accessed raw fares entities, source documents or complete matrices. Every upstream request carried server-side authentication. The first usable overview did not request stop membership or timetable coordinates. Journey origin/destination/date parameters were verified against the actual selected values. Desktop and 390-pixel mobile screenshots were inspected; the mobile journey view fits without horizontal overflow. Injected 409/410 responses verified UI recovery, not a second live importer mutation during the browser run.

These are local request-count/body measurements for selected flows, not full page-transfer sizes: JavaScript, fonts, HTML, RPC envelopes, map assets and operator metadata are excluded. Timings in the raw proxy trace are diagnostic single observations, not production latency benchmarks. Complete national catalogues, a deployed bus.rip instance and optional map-coordinate completeness were not verified. The current backend's interpretation limits still apply.


## Journey fare page — 6 November 2026

Journey details use the Paper split layout: a full-height route map and summary, with origin, destination and date controls above compact priced ticket cards. The map requests only matching timetable line records for the same operator and published direction, using representative trips and the existing ordered-stop geometry. All exact line matches are retained when a line number has multiple timetable records; missing geometry is reported separately. Geometry does not determine fare-point identity or the selected journey's price.

Origins and destinations are collected across all upstream pages before returning a single complete selector response. Catalogue generation and the selected directional origin remain fixed across pagination; failures do not return a partial list. Changing origin clears the destination. Candidate fare pagination and validity/condition notices remain in place.

Verified against the local app on port 3001 with live ANEA data: route 28A rendered geometry, complete origin/destination selectors produced priced candidates, resetting the origin cleared the destination, desktop and 390-pixel mobile layouts fit, and Chrome reported no page errors. Both TypeScript configurations and 137 unit tests passed, including multi-page origins/destinations and catalogue-generation checks.
