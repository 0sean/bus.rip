import { createServerFn } from "@tanstack/react-start";
import { db, updateOperators } from "./db.server";
import { fetchNocLines } from "./traveline.server";
import { eq } from "drizzle-orm";
import { nocLines } from "@/db/schema";
import { cacheControl } from "@/middleware/cache-control";
import { operatorCode } from "./validation";

export const getOperators = createServerFn({ method: "GET" })
  .middleware([cacheControl(2_592_000, { staleWhileRevalidate: 86_400 })])
  .handler(async () => {
    const [lines, incoming] = await Promise.all([
      db.select().from(nocLines),
      fetchNocLines(),
    ]);
    if (!incoming.length) throw new Error("Operator feed is empty");

    const existing = new Map(lines.map((line) => [line.lineNo, line]));
    const incomingLineNos = new Set(incoming.map((line) => line.lineNo));
    if (
      incomingLineNos.size !== incoming.length ||
      incoming.some((line) => !Number.isInteger(line.lineNo))
    ) {
      throw new Error("Operator feed contains invalid line numbers");
    }
    const changed = incoming.filter((line) => {
      const current = existing.get(line.lineNo);
      return (
        !current ||
        current.nocCode !== line.nocCode ||
        current.publicName !== line.publicName ||
        current.referenceName !== line.referenceName
      );
    });
    const removed = lines
      .filter((line) => !incomingLineNos.has(line.lineNo))
      .map((line) => line.lineNo);
    if (!changed.length && !removed.length) return lines;

    await updateOperators(changed, removed);
    return db.select().from(nocLines);
  });

export const getOperator = createServerFn({ method: "GET" })
  .middleware([cacheControl(2_592_000, { staleWhileRevalidate: 86_400 })])
  .validator(operatorCode)
  .handler(async ({ data: nocCode }) => {
    const [operator] = await db
      .select()
      .from(nocLines)
      .where(eq(nocLines.nocCode, nocCode))
      .limit(1);
    return operator ?? null;
  });
