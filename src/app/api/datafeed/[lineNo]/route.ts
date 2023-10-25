import { PrismaClient } from "@prisma/client";
import { parseStringPromise } from "xml2js";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

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
    (request.headers.get("CF-Connecting-IP") || "").split(",")[0] || "no-ip",
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
      const r = await fetch(
          `https://data.bus-data.dft.gov.uk/api/v1/datafeed/?operatorRef=${nocLine.nocCode}&api_key=${process.env.BODS_API_KEY}`,
          {
            next: { revalidate: 10 },
          },
        ),
        xml = await r.text(),
        json = await parseStringPromise(xml);

      return Response.json({ line: nocLine, data: json });
    }
  } else {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
}
