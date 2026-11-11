<img width="1200" height="450" alt="image" src="https://github.com/user-attachments/assets/9c14397a-6387-4570-9e6d-7137c8d005d3" />
<br/><br/>

<table>
  <tr>
    <td><img width="492" height="492" alt="Track buses" src="https://github.com/user-attachments/assets/fae97bac-c3e9-40d8-95d6-6b3e8dcfe1e9" style="height: 320px; width: 320px;" /></td>
    <td><img width="492" height="492" alt="View timetables" src="https://github.com/user-attachments/assets/727437d4-429a-4230-b636-3fd17cea83ab"  style="height: 320px; width: 320px;" /></td>
    <td><img width="492" height="492" alt="Check fares" src="https://github.com/user-attachments/assets/8533b3b8-7b43-4bce-b9c5-4442b852ea23" style="height: 320px; width: 320px;" /></td>
  </tr>
  <tr>
    <td align="center">📍 <b>Track any bus in the UK</b></td>
    <td align="center">🕒 <b>View timetables for any service</b></td>
    <td align="center">💸 <b>Check fares for any journey</b></td>
  </tr>
</table>


## How it works

Since ~2021, all UK bus operators are legally required to publish timetable, fare and vehicle location data to the <a href="https://www.bus-data.dft.gov.uk/">Bus Open Data Service</a>. bus.rip takes this data and gives it an easy to use UI. It tends to be a lot more reliable than bus operator’s own apps, and doesn’t require you to install a new app for every operator you use.

## Self-hosting/running locally

bus.rip works anywhere you can run a TanStack Start app (in production, it runs on Cloudflare). You’ll also need to pick a database to store the operator list - either Postgres or Cloudflare D1.

bus.rip also has a companion service called <a href="https://github.com/0sean/buslane">Buslane</a> for accessing timetables and fares data - instead of having a proper API, these use individual XML files, which are not easy to consume in a web app. Buslane ingests this data and turns it into an API which bus.rip can use easily.

You can use bus.rip without Buslane, but you won’t have access to any timetables or fares data.

### PostgreSQL

Set the `DATABASE_URL` environment variable (or set in `.env`) then run the database migrations:

```bash
pnpm db:migrate
pnpm dev
# Production (for running on Node):
pnpm build
pnpm start
```

This uses <a href="https://nitro.build/deploy">Nitro</a>, which can be deployed to many different providers, such as Vercel, often with no extra config needed.

### Cloudflare D1 (Workers)

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

<table>
  <thead>
    <tr>
      <th>Variable</th>
      <th>Purpose</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>DATABASE_PROVIDER</code><br/><b>(required)</b></td>
      <td>Build-time database choice: <code>postgres</code> (default) or <code>d1</code></td>
    </tr>
    <tr>
      <td><code>DATABASE_URL</code><br/><b>(required if using Postgres)</b></td>
      <td>PostgreSQL connection URL</td>
    </tr>
    <tr>
      <td><code>BODS_API_KEY</code><br/><b>(required)</b></td>
      <td>Bus Open Data Service API key; <a href="https://data.bus-data.dft.gov.uk/account/settings/">get here</a></td>
    </tr>
    <tr>
      <td><code>IP_HEADER</code></td>
      <td>Trusted proxy IP header; defaults to <code>CF-Connecting-IP</code></td>
    </tr>
    <tr>
      <td><code>RATE_LIMIT_ENABLED</code></td>
      <td>Set to <code>0</code> or <code>false</code> to disable app rate limiting; enabled by default</td>
    </tr>
    <tr>
      <td><code>UPSTASH_REDIS_REST_URL</code>, <code>UPSTASH_REDIS_REST_TOKEN</code><br/><b>(required if using ratelimiting)</b></td>
      <td>Redis connection details</td>
    </tr>
    <tr>
      <td><code>BUSLANE_BASE_URL</code>, <code>BUSLANE_API_KEY</code></td>
      <td>Buslane timetable service URL and API key</td>
    </tr>
    <tr>
      <td><code>SENTRY_DSN</code>, <code>SENTRY_AUTH_TOKEN</code>, <code>SENTRY_ORG</code>, <code>SENTRY_PROJECT</code></td>
      <td>Set to enable Sentry monitoring</td>
    </tr>
  </tbody>
</table>
