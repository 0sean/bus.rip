import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseStatus } from "@tanstack/react-start/server";
import { prisma } from "./db.server";
import { cached, invalidateCache } from "./cache.server";
import { parseOperators } from "./traveline.server";
import { operatorCode } from "./validation";

export const getOperators = createServerFn({ method: "GET" }).handler(() =>
  cached("operators:all", 3_600_000, () => prisma.nocLine.findMany()),
);

export const getOperator = createServerFn({ method: "GET" })
  .validator(operatorCode)
  .handler(({ data: nocCode }) =>
    cached(`operators:${nocCode}`, 3_600_000, () =>
      prisma.nocLine.findFirst({ where: { nocCode } }),
    ),
  );

export const refreshOperators = createServerFn({ method: "POST" }).handler(
  async () => {
    const token = process.env.CRON_TOKEN || process.env.CRON_SECRET;
    if (
      !token ||
      getRequest().headers.get("Authorization") !== `Bearer ${token}`
    ) {
      setResponseStatus(401);
      throw new Error("Invalid token");
    }
    const response = await fetch(
      "https://www.travelinedata.org.uk/noc/api/1.0/nocrecords.xml",
      { signal: AbortSignal.timeout(30_000) },
    );
    if (!response.ok)
      throw new Error("Operator data is temporarily unavailable");
    const lines = await parseOperators(await response.text());
    if (!lines.length) throw new Error("Operator feed is empty");
    await prisma.$transaction([
      prisma.nocLine.deleteMany({}),
      prisma.nocLine.createMany({ data: lines }),
    ]);
    invalidateCache("operators:");
    return { success: true };
  },
);
