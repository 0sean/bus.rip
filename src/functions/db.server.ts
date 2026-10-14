import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";

if (process.env.DATABASE_URL) {
  throw new Error(
    "Set DATABASE_URL or POSTGRES_PRISMA_URL to connect to PostgreSQL",
  );
}

export const db = drizzle(process.env.DATABASE_URL!, { schema });

