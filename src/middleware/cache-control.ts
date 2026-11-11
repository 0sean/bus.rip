import { createMiddleware } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

type CacheScope = { depth: number; value: string };

export const serverFunctionCacheHeaders = createMiddleware().server(
  async ({ handlerType, request, next }) => {
    if (handlerType !== "serverFn") {
      return next({
        context: { serverFunctionCache: undefined as CacheScope | undefined },
      });
    }

    const scope: CacheScope = { depth: 0, value: "no-store" };
    setResponseHeader("Cache-Control", "no-store");
    const result = await next({ context: { serverFunctionCache: scope } });
    const value =
      request.method === "GET" && result.response.ok ? scope.value : "no-store";
    setResponseHeader("Cache-Control", value);
    result.response.headers.set("Cache-Control", value);
    // TanStack's RPC header changes the response serialization for the same URL.
    const vary = result.response.headers.get("Vary");
    if (vary !== "*") {
      result.response.headers.set(
        "Vary",
        [vary, "x-tsr-serverfn"].filter(Boolean).join(", "),
      );
    }
    return result;
  },
);

export const cacheControl = (
  seconds: number,
  { staleWhileRevalidate = 0 }: { staleWhileRevalidate?: number } = {},
) =>
  createMiddleware({ type: "function" })
    .middleware([serverFunctionCacheHeaders])
    .server(async ({ context, method, next }) => {
      const scope = context.serverFunctionCache;
      // SSR calls have no RPC response; nested calls use their caller's policy.
      if (!scope) return next();
      const outermost = scope.depth++ === 0;
      try {
        const result = await next();
        if (outermost && method === "GET") {
          scope.value =
            `public, max-age=${seconds}, s-maxage=${seconds}` +
            (staleWhileRevalidate > 0
              ? `, stale-while-revalidate=${staleWhileRevalidate}`
              : "");
        }
        return result;
      } finally {
        scope.depth--;
      }
    });
