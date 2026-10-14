![image](https://github.com/user-attachments/assets/81b14bd4-3714-4420-b680-1da5aae508ed)

### [bus.rip](https://bus.rip/) - bus tracking powered by [Bus Open Data Service](https://data.bus-data.dft.gov.uk/).

- 🚌 Works for any UK bus operator
- 📍 Displays location of every bus for each operator, updating every 10 seconds
- 🧭 Track, follow and share buses

| ![image](https://github.com/user-attachments/assets/6bc8fbaf-f455-4eed-8617-918f92fbb020) | ![image](https://github.com/user-attachments/assets/23018253-236f-4846-869c-3a1bacf8f641) | ![image](https://github.com/user-attachments/assets/e25136f0-5180-4426-a1f2-f6084f444f1b) |
| :---------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------: |
|                        **See all buses for an operator on a map**                         |                       **View information and share link to follow**                       |                             **Follow a bus along its route**                              |

### Self-hosting/running locally

This app uses TanStack Start, TanStack Router, and TanStack Query with Vite. It requires Node.js 22.12+ and Yarn 4. PostgreSQL stores operators through Drizzle ORM and a shared node-postgres connection pool; Upstash Redis provides server-function rate limits.

```sh
corepack enable
yarn install
yarn db:migrate
yarn dev
```

Configure these server-only variables in `.env` locally or your hosting environment:

| Variable                                             | Purpose                                                                             |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `DATABASE_URL`                                       | PostgreSQL connection URL used by the application, usually pooled                   |
| `POSTGRES_PRISMA_URL`                                | Legacy fallback for `DATABASE_URL`; existing deployments can keep this variable     |
| `POSTGRES_URL_NON_POOLING`                           | Optional direct PostgreSQL URL used by Drizzle migrations                           |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Redis connection for rate limiting                                                  |
| `BODS_API_KEY`                                       | Bus Open Data Service API key                                                       |
| `CRON_TOKEN` or `CRON_SECRET`                        | Bearer token for the operator refresh job; Vercel sends `CRON_SECRET` automatically |
| `IP_HEADER`                                          | Trusted proxy IP header; defaults to `CF-Connecting-IP`                             |
| `BUSLANE_BASE_URL`, `BUSLANE_API_KEY`                | Buslane timetable service URL and API key                                           |
| `BUSLANE_ENABLED`                                    | Set to `0` to disable the timetable integration                                     |
| `SENTRY_DSN`                                         | Optional Sentry DSN for server and browser monitoring                               |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`  | Optional build-time source map upload credentials                                   |

The runtime prefers `DATABASE_URL`, falling back to `POSTGRES_PRISMA_URL`. Migrations prefer `POSTGRES_URL_NON_POOLING`, then use the runtime URL. A `DATABASE_URL` alone is sufficient. Never prefix database URLs or API keys with `VITE_`. Only the public Sentry DSN is exposed to the browser.

The Drizzle schema is defined in `src/db/schema.ts` and preserves the existing quoted `"NocLine"` table, column names, serial primary key, and unique line-number index. The baseline migration in `drizzle/0000_baseline.sql` is safe for existing Prisma databases: it keeps operator rows and IDs, adds the location-data flag only when missing, and records Drizzle migration history. The old `_prisma_migrations` table can remain; Drizzle does not modify it. Run `yarn db:migrate` once when adopting Drizzle and on subsequent deployments.

For schema changes, edit `src/db/schema.ts`, run `yarn db:generate --name=<change>`, review the generated SQL, then run `yarn db:migrate`. `yarn db:studio` opens Drizzle Studio. Schema generation and application builds do not connect to the database.

Populate operators by sending an authenticated GET request to `/api/cron`. The job replaces the operator list atomically and invalidates the server's operator cache. The existing monthly cron schedule is retained in `vercel.json`.

`yarn build` produces a Nitro Node server; `yarn start` serves it and loads `.env` when present. Vercel builds use Nitro's Vercel preset with explicit TanStack Start framework detection.

### Data fetching and performance

All application data reads use validated TanStack Start server functions in `src/functions`. Route loaders and polling share query options in `src/data/queries.ts`; each operation is defined directly in its server-function handler. Shared cache, database, and XML parsing helpers stay in `*.server.ts` modules. Per-resource rate limiting is attached with `src/middleware/rate-limit.ts`. The authenticated cron URL remains an HTTP endpoint for schedulers.

- Each SSR request gets its own QueryClient. The SSR integration hydrates and streams query results, so fresh page data is reused in the browser.
- Critical route data loads in parallel across matched routes. Secondary map stops are prefetched without blocking live vehicle data.
- Intent preloading, automatic route code splitting, and scroll restoration are enabled. MapLibre and the map view load only for tracking; analytics and speed insights load after hydration.
- The browser-only map uses selective SSR. Timetables, routes, trips, and operator selection render their data on the server.
- Vehicle feeds refresh every 10 seconds and pause polling in hidden tabs. Server caching deduplicates concurrent public reads: 10 seconds for vehicle feeds, 12 hours for timetable data, and one hour for operators. Failed reads are evicted. Browser query freshness is 10 seconds for vehicles, 12 hours for timetables, and five minutes for operators.
- The public home page advertises a five-minute shared-cache window with stale revalidation. Dynamic tracking pages stay live. They are not statically prerendered, so builds do not require database or transit API access.
- Fonts are self-hosted, and Nitro emits compressed public assets. Map tiles remain direct renderer requests to OpenStreetMap.

Timetable links opened from tracking use a drawer over the mounted map. Direct timetable URLs use a full-page layout. Query caches are reused through drawer navigation and browser history.

### Verification

```sh
yarn lint
yarn typecheck
yarn build
```

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
