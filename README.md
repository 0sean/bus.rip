<img width="1200" height="450" alt="image" src="https://github.com/user-attachments/assets/9c14397a-6387-4570-9e6d-7137c8d005d3" />


| <img width="492" height="492" alt="Track buses" src="https://github.com/user-attachments/assets/fae97bac-c3e9-40d8-95d6-6b3e8dcfe1e9" /> | <img width="492" height="492" alt="View timetables" src="https://github.com/user-attachments/assets/727437d4-429a-4230-b636-3fd17cea83ab" /> | <img width="492" height="492" alt="Check fares" src="https://github.com/user-attachments/assets/8533b3b8-7b43-4bce-b9c5-4442b852ea23" /> |
| :-------------: |:-------------:| :-----:|
| 📍 **Track any bus in the UK** | 🕒 **View timetables for any bus service** | 💸 **Check fares for any journey** |


### How it works

Since ~2021, all UK bus operators are legally required to publish timetable, fare and vehicle location data to the Bus Open Data Service. bus.rip takes this data and gives it an easy to use UI. It tends to be a lot more reliable than bus operator’s own apps, and doesn’t require you to install a new app for every operator you use.

### Self-hosting/running locally

bus.rip works anywhere you can run a TanStack Start app (in production, it runs on Cloudflare). You’ll also need to pick a database to store the operator list - either Postgres or Cloudflare D1.

bus.rip also has a companion service called Buslane for accessing timetables and fares data - instead of having a proper API, these use individual XML files, which are not easy to consume in a web app. Buslane ingests this data and turns it into an API which bus.rip can use easily.

You can use bus.rip without Buslane, but you won’t have access to any timetables or fares data.

#### PostgreSQL

Set the `DATABASE_URL` environment variable (or set in `.env`) then run the database migrations:

```bash
pnpm db:migrate
pnpm dev
# Production (for running on Node):
pnpm build
pnpm start
```

This uses Nitro, which can be deployed to many different providers, such as Vercel, often with no extra config needed.

#### Cloudflare D1 (Workers)

Create a Wrangler config from the `wrangler.jsonc.example` file - this is set up to use D1 by default. Then, run database migrations:

```bash
pnpm db:migrate:d1
pnpm dev
# Build and run the production Worker locally:
yarn build
yarn start
# To deploy to production:
yarn db:migrate:d1:remote
yarn wrangler deploy
```

### Configuration options

Configure these as environment variables, or in `.env`.

| Variable | Purpose |
| --- | --- |
| `DATABASE_PROVIDER` 
**(required)** | Build-time database choice: `postgres` (default) or `d1` |
| `DATABASE_URL`
**(required if using Postgres)** | PostgreSQL connection URL |
| `BODS_API_KEY` 
**(required)** | Bus Open Data Service API key |
| `IP_HEADER` | Trusted proxy IP header; defaults to `CF-Connecting-IP` |
| `RATE_LIMIT_ENABLED` | Set to `0` or `false` to disable app rate limiting; enabled by default |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` 
**(required if using ratelimiting)** | Redis connection details |
| `BUSLANE_BASE_URL`, `BUSLANE_API_KEY` | Buslane timetable service URL and API key |
| `SENTRY_DSN` | Optional Sentry DSN for server monitoring; set at build time too to expose it to the browser |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Optional build-time source map upload credentials |