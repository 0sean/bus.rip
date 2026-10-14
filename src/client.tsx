import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";

// Monitoring is optional and initializes after the app begins hydrating.
if (import.meta.env.VITE_SENTRY_DSN) {
  void import("@sentry/tanstackstart-react").then((Sentry) => {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      tunnel: "/monitoring",
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
      ],
      tracesSampleRate: 1,
      replaysOnErrorSampleRate: 1,
      replaysSessionSampleRate: 0.1,
    });
  });
}
startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  );
});
