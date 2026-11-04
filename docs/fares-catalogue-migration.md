# Buslane passenger catalogue migration

The WIP fares UI now uses Buslane catalogue interpretation version 1 (fares database schema 2). Deploy the matching Buslane importer/API and complete its catalogue backfill **before** deploying this consumer. Existing server-only `BUSLANE_BASE_URL`, `BUSLANE_API_KEY` and `BUSLANE_ENABLED` configuration continues to apply. No bus.rip database migration or new credential is required. No production deployment is performed by this change.

## Passenger flow

* Operator → **Ticket areas** → area → applicable ticket variants → ticket conditions. The card layout, search, Show more controls and operator navigation are retained.
* **Tickets** provides navigation families, including tickets without a browsing area. Selecting a family shows its variants; similar names never imply the same eligibility, price, validity or coverage.
* **Journey fares** provides routes → origin → directional destination → travel date → conditional published candidates. Ticket details also offer a separately expanded list of applicable catalogue routes. Route/point IDs are fare-catalogue IDs, not timetable route IDs or arbitrary stop codes.
* A selected area's **Show published coverage** loads only its paginated membership. **Show stop locations on map** is an additional explicit action. It can reuse cached timetable stops; otherwise it requests the operator's timetable stop coordinates. This optional coordinate request remains operator-wide because the current timetable API has no bounded stop-code batch lookup. It never blocks fare browsing, ticket details or membership. Only loaded membership is plotted; no polygon is invented from a partial stop page.
* Provenance is separately paginated and fetched only when expanded. No raw XML tree, complete source-document list or matrix is downloaded.

The main overview now uses a ticket-navigation panel instead of eagerly building an operator-wide map. Coverage remains available on area details. Search is case-insensitive **name-prefix** search, reflecting the upstream indexed contract; it is labelled accordingly.

## Data and cache behaviour

`src/functions/fares.ts` validates the operator, action, typed stable IDs, cursor, date, generation and search length. It constructs an allowlisted operator-scoped path and makes exactly one upstream request with `limit=50` for each invocation. The bearer key stays on the server. Errors do not relay upstream secrets or internal details. The retired raw entity scans, document metadata batches, name-based deduplication, publication-timestamp edition grouping and client-side matrix matching have been removed.

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
BUSLANE_ENABLED=1
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

The browser suite verifies first/next-page request counts, prefix search, direct Durham day/week area access, lazy stops/provenance, exact directed/date lookup, mobile width, generation restart, removed IDs and legacy-link recovery. `BUSRIP_TEST_URL`, `BUSLANE_TEST_URL`, `BUSLANE_TEST_API_KEY`, `FARES_PROXY_URL`, `FARES_TEST_NOC` and `FARES_TEST_AREA_ID` can select an equivalent local setup. The default Durham ID belongs to the documented 4 November 2026 snapshot and may need replacing for another snapshot. This exercises a local full-operator catalogue, not a national import or a production deployment.

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
