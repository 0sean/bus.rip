import { createStart, createCsrfMiddleware } from "@tanstack/react-start";
import { serverFunctionCacheHeaders } from "@/middleware/cache-control";
import * as Sentry from "@sentry/tanstackstart-react";

export const startInstance = createStart(() => ({
  requestMiddleware: [
    serverFunctionCacheHeaders,
    createCsrfMiddleware({
      filter: (context) => context.handlerType === "serverFn",
    }),
    Sentry.sentryGlobalRequestMiddleware,
  ],
  functionMiddleware: [Sentry.sentryGlobalFunctionMiddleware],
}));
