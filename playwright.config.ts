import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "fares.browser.spec.ts",
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: process.env.BUSRIP_TEST_URL || "http://127.0.0.1:3188",
    browserName: "chromium",
    locale: "en-GB",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
