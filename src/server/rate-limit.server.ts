import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  getRequest,
  setResponseStatus,
  setResponseHeader,
} from "@tanstack/react-start/server";
let limiter: Ratelimit | undefined;

export async function rateLimit(resource: string) {
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
}
