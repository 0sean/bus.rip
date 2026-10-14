import { createServerFn } from "@tanstack/react-start";
import { db } from "./db.server";
import { eq } from "drizzle-orm";
import { nocLines } from "@/db/schema";
import { cacheControl } from "@/middleware/cache-control";
import { operatorCode } from "./validation";

export const getOperators = createServerFn({ method: "GET" })
  .middleware([cacheControl(2_592_000, { staleWhileRevalidate: 86_400 })])
  .handler(() => db.select().from(nocLines));

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
