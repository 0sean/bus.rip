import { defineConfig } from "drizzle-kit";

const provider = process.env.DATABASE_PROVIDER || "postgres";
if (provider !== "postgres" && provider !== "d1") {
  throw new Error("DATABASE_PROVIDER must be postgres or d1");
}

export default defineConfig(
  provider === "d1"
    ? {
        schema: "./src/db/schema.d1.ts",
        out: "./drizzle/d1",
        dialect: "sqlite",
      }
    : {
        schema: "./src/db/schema.postgres.ts",
        out: "./drizzle",
        dialect: "postgresql",
        dbCredentials: { url: process.env.DATABASE_URL! },
      },
);
