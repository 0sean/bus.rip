import { PrismaClient } from "@prisma/client";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { revalidatePath } from "next/cache";
import { getDatafeed } from "@/lib/bods";

const prisma = new PrismaClient(),
  ratelimit = new Ratelimit({
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
    const nocLine = await prisma.nocLine.findFirst({
      where: {
        nocCode: params.nocCode.toUpperCase(),
      },
    });

    if (!nocLine) {
      return Response.json({ error: "Invalid nocCode" }, { status: 404 });
    } else {
      const vehicles = await getDatafeed(nocLine.nocCode);
      let line = nocLine;

      if (!vehicles && !nocLine.hasMissingLocationData) {
        line = await prisma.nocLine.update({
          where: {
            id: nocLine.id,
          },
          data: {
            hasMissingLocationData: true,
          },
        });
        revalidatePath("/");
      }

      return Response.json({ line, vehicles });
    }
  } else {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
}
