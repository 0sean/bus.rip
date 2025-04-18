![image](https://github.com/user-attachments/assets/81b14bd4-3714-4420-b680-1da5aae508ed)

### [bus.rip](https://bus.rip/) - bus tracking powered by [Bus Open Data Service](https://data.bus-data.dft.gov.uk/).
- 🚌 Works for any UK bus operator
- 📍 Displays location of every bus for each operator, updating every 10 seconds
- 🧭 Track, follow and share buses

| ![image](https://github.com/user-attachments/assets/6bc8fbaf-f455-4eed-8617-918f92fbb020) | ![image](https://github.com/user-attachments/assets/23018253-236f-4846-869c-3a1bacf8f641) | ![image](https://github.com/user-attachments/assets/e25136f0-5180-4426-a1f2-f6084f444f1b) |
| :-------------: |:-------------:| :-----:|
| **See all buses for an operator on a map** | **View information and share link to follow** | **Follow a bus along its route** |


### Self-hosting/running locally
The app itself is a Next.js app, with Postgres (via Prisma) for storing operator data and Upstash Redis (via @upstash/ratelimit) for ratelimiting.
Configuration is done via environent variables - outside of Prisma (`DATABASE_URL`) and Upstash Ratelimit (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) environment variables, the only variables you will need to set is:
- The `BODS_API_KEY` variable, which can be obtained [here](https://data.bus-data.dft.gov.uk/account/settings/)
- The `CRON_TOKEN` variable, which should be supplied as a Bearer token to the cron job route
- If not running behind Cloudflare, you will need to set the `IP_HEADER` variable to whichever header your host/proxy supplies for getting a user's IP (it defaults to Cloudflare's `CF-Connecting-IP` header) (this is fine to leave if just running locally)

You will also need to run the job for fetching operator data from Traveline (which in production would be run once a month via a cron job).
To run the job, send a GET request with the Authorization header set with the `CRON_TOKEN` variable you set earlier to `/api/cron`.

In production, it is run on Vercel behind Cloudflare, however it should be able to run anywhere you can run a Next.js app.
