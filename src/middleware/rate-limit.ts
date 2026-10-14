import { createMiddleware } from "@tanstack/react-start";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  getRequest,
  setResponseStatus,
  setResponseHeader,
} from "@tanstack/react-start/server";
let limiter: Ratelimit | undefined;

export const rateLimit = (resource: string) =>
  createMiddleware({ type: "function" }).server(async ({ next }) => {
    const enabled = process.env.RATE_LIMIT_ENABLED?.trim().toLowerCase();
    if (enabled === "0" || enabled === "false") return next();

    limiter ??= new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, "10s"),
      analytics: process.env.NODE_ENV === "production",
      prefix: "bus-rip:server-functions",
    });
    const ip =
      (
        getRequest().headers.get(process.env.IP_HEADER || "CF-Connecting-IP") ||
        ""
      )
        .split(",")[0]
        .trim() || "no-ip";
    const result = await limiter.limit(`${resource}:${ip}`);
    if (!result.success) {
      setResponseStatus(429);
      setResponseHeader(
        "Retry-After",
        String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))),
      );
      throw new Error("Too many requests. Please try again shortly.");
    }
    return next();
  });
