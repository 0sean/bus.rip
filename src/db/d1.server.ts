import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { sql } from "drizzle-orm";
import * as schema from "./schema.d1";

export const db = drizzle(env.DB, { schema });

export async function updateOperators(
  lines: schema.NewNocLine[],
  removedLineNos: number[],
) {
  // Each JSON payload uses one parameter, avoiding D1's bound-parameter limit.
  const remove = db.delete(schema.nocLines)
    .where(sql`${schema.nocLines.lineNo} in (
      select value from json_each(${JSON.stringify(removedLineNos)})
    )`);
  const upsert = db
    .insert(schema.nocLines)
    .select(
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
        .from(sql`json_each(${JSON.stringify(lines)})`)
        // SQLite requires WHERE to disambiguate INSERT SELECT ... ON CONFLICT.
        .where(sql`true`),
    )
    .onConflictDoUpdate({
      target: schema.nocLines.lineNo,
      set: {
        nocCode: sql`excluded."nocCode"`,
        publicName: sql`excluded."publicName"`,
        referenceName: sql`excluded."referenceName"`,
        hasMissingLocationData: sql`case
          when ${schema.nocLines.nocCode} = excluded."nocCode"
          then ${schema.nocLines.hasMissingLocationData}
          else false end`,
      },
    });

  // D1 batches roll back together; single statements are already atomic.
  if (removedLineNos.length && lines.length) await db.batch([remove, upsert]);
  else if (removedLineNos.length) await remove;
  else if (lines.length) await upsert;
}
