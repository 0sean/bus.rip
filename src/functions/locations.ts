import { createServerFn } from "@tanstack/react-start";
import { cacheControl } from "@/middleware/cache-control";
import { rateLimit } from "@/middleware/rate-limit";
import type { DatafeedRouteResponse } from "@/lib/bods";
import { parseDatafeed } from "./locations.server";
import { db } from "./db.server";
import { eq } from "drizzle-orm";
import { nocLines } from "@/db/schema";
import { getOperator } from "./operators";
import { operatorCode } from "./validation";

export const getLocations = createServerFn({ method: "GET" })
  .middleware([cacheControl(10), rateLimit("locations")])
  .validator(operatorCode)
  .handler(async ({ data: nocCode }): Promise<DatafeedRouteResponse> => {
    const operator = await getOperator({ data: nocCode });
    if (!operator) throw new Error("Invalid operator code");

    const url = new URL("https://data.bus-data.dft.gov.uk/api/v1/datafeed/");
    url.searchParams.set("operatorRef", nocCode);
    url.searchParams.set("api_key", process.env.BODS_API_KEY || "");
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok)
      throw new Error("Vehicle data is temporarily unavailable");
    const vehicles = parseDatafeed(await response.text());

    let line = operator;
    if (!vehicles && !operator.hasMissingLocationData) {
      const [updatedLine] = await db
        .update(nocLines)
        .set({ hasMissingLocationData: true })
        .where(eq(nocLines.id, operator.id))
        .returning();
      if (!updatedLine) throw new Error("Invalid operator code");
      line = updatedLine;
    }
    return { line, vehicles };
  });
