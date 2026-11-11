import { drizzle } from "drizzle-orm/node-postgres";
import { inArray, sql } from "drizzle-orm";
import * as schema from "./schema.postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL to connect to PostgreSQL");

export const db = drizzle(url, { schema });

export async function updateOperators(
  lines: schema.NewNocLine[],
  removedLineNos: number[],
) {
  await db.transaction(async (transaction) => {
    if (removedLineNos.length) {
      await transaction
        .delete(schema.nocLines)
        .where(inArray(schema.nocLines.lineNo, removedLineNos));
    }
    if (lines.length) {
      await transaction
        .insert(schema.nocLines)
        .values(lines)
        .onConflictDoUpdate({
          target: schema.nocLines.lineNo,
          set: {
            nocCode: sql`excluded."nocCode"`,
            publicName: sql`excluded."publicName"`,
            referenceName: sql`excluded."referenceName"`,
            // Keep locally observed flags unless the line belongs to a new operator.
            hasMissingLocationData: sql`case
              when ${schema.nocLines.nocCode} = excluded."nocCode"
              then ${schema.nocLines.hasMissingLocationData}
              else false end`,
          },
        });
    }
  });
}
