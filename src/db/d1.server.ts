import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { sql } from "drizzle-orm";
import * as schema from "./schema.d1";

export const db = drizzle(env.DB, { schema });

export async function replaceOperators(lines: schema.NewNocLine[]) {
  // D1 batches roll back together. JSON uses one parameter regardless of feed size,
  // avoiding D1's 100-bound-parameter limit for a regular bulk insert.
  await db.batch([
    db.delete(schema.nocLines),
    db.insert(schema.nocLines).select(
      db
        .select({
          id: sql`null`.as("id"),
          lineNo: sql<number>`json_extract(value, '$.lineNo')`.as("lineNo"),
          nocCode: sql<string>`json_extract(value, '$.nocCode')`.as("nocCode"),
          publicName: sql<string>`json_extract(value, '$.publicName')`.as(
            "publicName",
          ),
          referenceName: sql<string>`json_extract(value, '$.referenceName')`.as(
            "referenceName",
          ),
          hasMissingLocationData:
            sql<boolean>`coalesce(json_extract(value, '$.hasMissingLocationData'), 0)`.as(
              "hasMissingLocationData",
            ),
        })
        .from(sql`json_each(${JSON.stringify(lines)})`),
    ),
  ]);
}
