import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Only the public Sentry DSN may enter the client build.
  const sentryDsn = env.VITE_SENTRY_DSN || env.SENTRY_DSN || "";
  return {
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    define: { "import.meta.env.VITE_SENTRY_DSN": JSON.stringify(sentryDsn) },
    nitro: {
      preset:
        process.env.NITRO_PRESET ||
        (process.env.VERCEL ? "vercel" : "node-server"),
      compressPublicAssets: true,
    },
    plugins: [
      tanstackStart(),
      nitro(),
      react(),
      tailwindcss(),
      ...(env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT
        ? [
            sentryVitePlugin({
              authToken: env.SENTRY_AUTH_TOKEN,
              org: env.SENTRY_ORG,
              project: env.SENTRY_PROJECT,
              sourcemaps: {
                filesToDeleteAfterUpload: [
                  "./dist/**/*.map",
                  "./.output/**/*.map",
                  "./.vercel/output/**/*.map",
                ],
              },
              telemetry: false,
            }),
          ]
        : []),
    ],
    build: {
      sourcemap:
        env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT
          ? "hidden"
          : false,
    },
    server: { port: 3000 },
  };
});
