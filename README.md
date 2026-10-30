![image](https://github.com/user-attachments/assets/81b14bd4-3714-4420-b680-1da5aae508ed)

### [bus.rip](https://bus.rip/) - bus tracking powered by [Bus Open Data Service](https://data.bus-data.dft.gov.uk/).

- 🚌 Works for any UK bus operator
- 📍 Displays location of every bus for each operator, updating every 10 seconds
- 🧭 Track, follow and share buses

| ![image](https://github.com/user-attachments/assets/6bc8fbaf-f455-4eed-8617-918f92fbb020) | ![image](https://github.com/user-attachments/assets/23018253-236f-4846-869c-3a1bacf8f641) | ![image](https://github.com/user-attachments/assets/e25136f0-5180-4426-a1f2-f6084f444f1b) |
| :---------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------: |
|                        **See all buses for an operator on a map**                         |                       **View information and share link to follow**                       |                             **Follow a bus along its route**                              |

### Self-hosting/running locally

This app uses TanStack Start, TanStack Router, and TanStack Query with Vite. It requires Node.js 22.12+ and Yarn 4. Choose the database **when building the deployment** with `DATABASE_PROVIDER=postgres` (default) or `DATABASE_PROVIDER=d1`. PostgreSQL runs on Node/Vercel; D1 runs on Cloudflare Workers with a native `DB` binding. Changing provider requires rebuilding and does not copy data between databases.

```sh
corepack enable
yarn install
```

#### PostgreSQL (Node or Vercel)

Set `DATABASE_PROVIDER=postgres` and `DATABASE_URL` in `.env` locally or your deployment environment, then run:

```sh
yarn db:migrate
yarn dev
# Production:
yarn build
yarn start
```

The PostgreSQL schema in `src/db/schema.postgres.ts` preserves the existing quoted `"NocLine"` table, column names, serial primary key, and unique line-number index. The baseline migration in `drizzle/0000_baseline.sql` keeps existing Prisma rows and IDs, adds the location-data flag only when missing, and records Drizzle migration history. The old `_prisma_migrations` table can remain. Run `yarn db:migrate` once when adopting Drizzle and on subsequent deployments.

Node builds produce a Nitro server. Vercel builds use Nitro's Vercel preset. `yarn start` loads `.env` when present and starts the chosen provider's production server: Node for PostgreSQL, a local Worker preview for D1. `yarn preview` also previews either build through Vite.

#### Cloudflare D1 (Workers)

Set `DATABASE_PROVIDER=d1` in `.env` or your build environment. Configure the `DB` binding in `wrangler.jsonc` with your D1 database's name. Local development works without a database ID; add your database's `database_id` before remote migrations or deployment.

```sh
yarn db:migrate:d1
yarn dev
# Build and run the production Worker locally:
yarn build
yarn start
# After configuring your Cloudflare account and database ID:
yarn db:migrate:d1:remote
yarn wrangler deploy
```

The local database persists in `.wrangler/state`; local migrations never touch the remote database. For local Worker secrets, use `.dev.vars` (ignored by Git). For deployed Workers, use Wrangler secrets for API keys and tokens and Wrangler `vars` for non-secret settings. `DATABASE_URL` is unnecessary for D1. The database binding is server-only.

D1 uses the SQLite schema in `src/db/schema.d1.ts` and migrations in `drizzle/d1`. Both providers expose the same `db` import and operator row types; booleans are mapped by Drizzle.

#### Configuration and schema changes

Configure these server-only variables in `.env` for Node, or `.dev.vars` / Wrangler secrets and variables for Workers:

| Variable                                             | Purpose                                                                                      |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `DATABASE_PROVIDER`                                  | Build-time database choice: `postgres` (default) or `d1`                                     |
| `DATABASE_URL`                                       | PostgreSQL connection URL; required only for PostgreSQL                                      |
| `RATE_LIMIT_ENABLED`                                 | Set to `0` or `false` to disable app rate limiting; enabled by default                       |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Redis connection; required only when app rate limiting is enabled                            |
| `BODS_API_KEY`                                       | Bus Open Data Service API key                                                                |
| `IP_HEADER`                                          | Trusted proxy IP header; defaults to `CF-Connecting-IP`                                      |
| `BUSLANE_BASE_URL`, `BUSLANE_API_KEY`                | Buslane timetable service URL and API key                                                    |
| `BUSLANE_ENABLED`                                    | Set to `0` to disable timetable integration                                                  |
| `SENTRY_DSN`                                         | Optional Sentry DSN for server monitoring; set at build time too to expose it to the browser |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`  | Optional build-time source map upload credentials                                            |

Never prefix database URLs or API keys with `VITE_`. Only the public Sentry DSN is exposed to the browser.

Update both schemas for shared changes, run `yarn db:generate --name=<change>`, and review the generated SQL before applying it. This command always generates migrations for both PostgreSQL and D1, regardless of `DATABASE_PROVIDER`, and forwards the same options to both generators. `yarn db:migrate` follows `DATABASE_PROVIDER`; D1 defaults to local migrations, with `--remote` required for the deployed database. Keep the PostgreSQL and D1 migrations separate. Use `yarn db:migrate:d1` and `yarn db:migrate:d1:remote` to explicitly apply D1 migrations locally or remotely.

`yarn db:studio` opens PostgreSQL Drizzle Studio. Inspect D1 with `yarn wrangler d1 execute DB --local --command="<SQL>"` (or `--remote`). Schema generation and application builds do not connect to your remote database.

### Data fetching and performance

All application data reads use validated TanStack Start server functions in `src/functions`. Route loaders and polling share query options in `src/data/queries.ts`; each operation is defined directly in its server-function handler. Shared database and XML parsing helpers stay in `*.server.ts` modules. Per-resource rate limiting is attached with `src/middleware/rate-limit.ts`. Set `RATE_LIMIT_ENABLED=0` to use your hosting platform's rate limiting instead; the app then skips Upstash entirely and does not require Redis credentials.

- The SSR integration hydrates and streams query results.
- Critical route data loads in parallel across matched routes. Secondary map stops are prefetched without blocking live vehicle data.
- Intent preloading, automatic route code splitting, and scroll restoration are enabled. MapLibre and the map view load only for tracking; analytics and speed insights load after hydration.
- The browser-only map uses selective SSR. Timetables, routes, and trips render their data on the server.
- The index renders a cacheable shell with an accessible loading status. After hydration, a separate cacheable request loads operators as plain JSON. On a cache miss, that request still fetches Traveline, compares the feed with the database, and commits changes before returning the operator list. No cron or platform-specific background execution is required. The operator list is sorted in the browser and is not serialized into the SSR hydration payload.
- The Traveline importer projects only the fields needed from `NOCLines`, with linear-time NOC-code deduplication. It avoids materializing the entire XML document and rejects incomplete tables before updating the database. A field-name fallback handles changes to the export's column order.
- Vehicle feeds refresh every 10 seconds and pause polling in hidden tabs.
- Dynamic tracking pages stay live. They are not statically prerendered, so builds do not require database or transit API access.
- Fonts are self-hosted, and Node/Vercel builds emit compressed public assets. Map tiles remain direct renderer requests to OpenStreetMap.

Timetables, routes, and trips open as separate pages, including links from tracking. The operator timetable page includes a route-network map with hover/tap links and searchable route cards. Lines connect ordered scheduled stops (not road-following shapes); representative journeys cover the known shapes, directions, and destinations of each route. Network requests use bounded upstream concurrency and report missing routes without hiding the timetable list.

### Verification

```sh
yarn lint
yarn typecheck # checks both database dialects
yarn vitest run
DATABASE_PROVIDER=postgres yarn build
DATABASE_PROVIDER=d1 yarn build
```

To compare XML parsing costs with the same feed snapshot:

```sh
curl -fsSL https://www.travelinedata.org.uk/noc/api/1.0/nocrecords.xml -o /tmp/nocrecords.xml
TRAVELINE_FEED_PATH=/tmp/nocrecords.xml yarn vitest bench --run
```

The benchmark measures parsing independently of network latency, database operations, and framework overhead. Verify the complete uncached request against your deployment's CPU metrics when checking a hosting CPU limit.

<blockquote>
  <details>
  <summary>License</summary>
  <br>

    Copyright (C) 2023-2025 0sean

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

</details>
</blockquote>
