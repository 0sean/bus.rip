import { createServerFn } from "@tanstack/react-start";
import { cacheControl } from "@/middleware/cache-control";
import { rateLimit } from "@/middleware/rate-limit";
import type { DatafeedRouteResponse } from "@/lib/bods";
import { parseDatafeed } from "./locations.server";
import { db } from "./db.server";
import { eq } from "drizzle-orm";
import { nocLines } from "@/db/schema";
import { getOperator } from "./operators";
import { locationFilter } from "./validation";

export const getLocations = createServerFn({ method: "GET" })
  .middleware([cacheControl(10), rateLimit("locations")])
  .validator(locationFilter)
  .handler(async ({ data: filter }): Promise<DatafeedRouteResponse> => {
    const operator =
      typeof filter === "string"
        ? await getOperator({ data: filter })
        : undefined;
    if (typeof filter === "string" && !operator)
      throw new Error("Invalid operator code");

    const url = new URL("https://data.bus-data.dft.gov.uk/api/v1/datafeed/");
    if (typeof filter === "string") url.searchParams.set("operatorRef", filter);
    else url.searchParams.set("boundingBox", filter.boundingBox.join(","));
    url.searchParams.set("api_key", process.env.BODS_API_KEY || "");
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok)
      throw new Error("Vehicle data is temporarily unavailable");
    const vehicles = parseDatafeed(await response.text());

    let line = operator;
    if (!vehicles && operator && !operator.hasMissingLocationData) {
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
