import { createStart, createCsrfMiddleware } from "@tanstack/react-start";
import * as Sentry from "@sentry/tanstackstart-react";

export const startInstance = createStart(() => ({
  requestMiddleware: [
    createCsrfMiddleware({
      filter: (context) => context.handlerType === "serverFn",
    }),
    Sentry.sentryGlobalRequestMiddleware,
  ],
  functionMiddleware: [Sentry.sentryGlobalFunctionMiddleware],
}));
