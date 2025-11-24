import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getStops } from "@/lib/buslane";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "10s"),
  analytics: process.env.NODE_ENV == "production",
});

export async function GET(
  request: Request,
  props: { params: Promise<{ nocCode: string }> },
) {
  const params = await props.params;
  const rl = await ratelimit.limit(
    (
      request.headers.get(process.env.IP_HEADER || "CF-Connecting-IP") || ""
    ).split(",")[0] || "no-ip",
  );
  if (rl.success) {
    const data = await getStops(params.nocCode.toUpperCase());
    if (Array.isArray(data)) {
      return Response.json(data, { status: 200 });
    } else {
      return Response.json({ error: "Failed to fetch stops" }, { status: 500 });
    }
  } else {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
}
