import { prisma } from "./db.server";
import { cached, invalidateCache } from "./cache.server";
import { getDatafeed } from "./bods.server";
import { fetchNocLines } from "./traveline.server";
import type { DatafeedRouteResponse } from "@/lib/bods";

export const readOperators = () =>
  cached("operators:all", 3_600_000, () => prisma.nocLine.findMany());
export const readOperator = (nocCode: string) =>
  cached(`operators:${nocCode}`, 3_600_000, () =>
    prisma.nocLine.findFirst({ where: { nocCode } }),
  );

export async function readLocations(
  nocCode: string,
): Promise<DatafeedRouteResponse> {
  const operator = await readOperator(nocCode);
  if (!operator) throw new Error("Invalid operator code");
  const vehicles = await getDatafeed(nocCode);
  let line = operator;
  if (!vehicles && !operator.hasMissingLocationData) {
    line = await prisma.nocLine.update({
      where: { id: operator.id },
      data: { hasMissingLocationData: true },
    });
    invalidateCache("operators:");
  }
  return { line, vehicles };
}

export async function refreshOperators() {
  const lines = await fetchNocLines();
  if (!lines.length) throw new Error("Operator feed is empty");
  await prisma.$transaction([
    prisma.nocLine.deleteMany({}),
    prisma.nocLine.createMany({ data: lines }),
  ]);
  invalidateCache("operators:");
  return { success: true };
}
