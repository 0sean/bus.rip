import { createFileRoute } from "@tanstack/react-router";
import { createSentryTunnelRoute } from "@sentry/tanstackstart-react";
export const Route = createFileRoute("/monitoring")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const dsn = process.env.SENTRY_DSN || process.env.VITE_SENTRY_DSN;
        if (!dsn) return new Response(null, { status: 404 });
        return createSentryTunnelRoute({ allowedDsns: [dsn] }).handlers.POST({
          request,
        });
      },
    },
  },
});
