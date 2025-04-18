import { PrismaClient } from "@prisma/client";
import { parseStringPromise } from "xml2js";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getDatafeed } from "@/lib/bods";

const prisma = new PrismaClient(),
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, "10s"),
    analytics: process.env.NODE_ENV == "production",
  });

export async function GET(
  request: Request,
  { params }: { params: { lineNo: string } },
) {
  const rl = await ratelimit.limit(
    (
      request.headers.get(process.env.IP_HEADER || "CF-Connecting-IP") || ""
    ).split(",")[0] || "no-ip",
  );
  if (rl.success) {
    const nocLine = await prisma.nocLine.findUnique({
      where: {
        lineNo: Number(params.lineNo),
      },
    });

    if (!nocLine) {
      return Response.json({ error: "Invalid lineNo" }, { status: 404 });
    } else {
      const data = await getDatafeed(nocLine.nocCode);

      return Response.json({ line: nocLine, data });
    }
  } else {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
}
