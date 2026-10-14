import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL to connect to PostgreSQL");

export const db = drizzle(url, { schema });

export async function replaceOperators(lines: schema.NewNocLine[]) {
  await db.transaction(async (transaction) => {
    await transaction.delete(schema.nocLines);
    await transaction.insert(schema.nocLines).values(lines);
  });
}
