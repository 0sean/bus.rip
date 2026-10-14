import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseStatus } from "@tanstack/react-start/server";
import { db, replaceOperators } from "./db.server";
import { eq } from "drizzle-orm";
import { nocLines } from "@/db/schema";
import { parseOperators } from "./traveline.server";
import { operatorCode } from "./validation";

export const getOperators = createServerFn({ method: "GET" }).handler(() => db.select().from(nocLines));

export const getOperator = createServerFn({ method: "GET" })
  .validator(operatorCode)
  .handler(async ({ data: nocCode }) => {
    const [operator] = await db
      .select()
      .from(nocLines)
      .where(eq(nocLines.nocCode, nocCode))
      .limit(1);
    return operator ?? null;
  });