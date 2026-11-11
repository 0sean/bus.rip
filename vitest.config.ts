import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@database-schema": fileURLToPath(
        new URL("./src/db/schema.postgres.ts", import.meta.url),
      ),
    },
  },
  test: { include: ["tests/**/*.test.ts"] },
});
