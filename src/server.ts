import { createServerEntry } from "@tanstack/react-start/server-entry";
import handler from "@tanstack/react-start/server-entry";
import * as Sentry from "@sentry/tanstackstart-react";

if (process.env.SENTRY_DSN && !Sentry.getClient())
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 1 });
export default createServerEntry(
  Sentry.wrapFetchWithSentry({ fetch: handler.fetch }),
);
