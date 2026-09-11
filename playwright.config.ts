import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end and accessibility tests (Chromium only).
 *
 *  - `e2e`           storefront journeys (tests/e2e/*.spec.ts), desktop viewport
 *  - `a11y-desktop`  axe-core scans of the key pages (tests/e2e/a11y/*.a11y.ts)
 *  - `a11y-mobile`   the same scans at a phone viewport
 *
 * Locally the config attaches to an already running dev server on :3000 (or starts
 * `npm run dev`); in CI the app is built first and served with `npm run start`.
 */
const isCI = Boolean(process.env.CI);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "tests/e2e",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  outputDir: "test-results",
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    locale: "de-AT",
    timezoneId: "Europe/Vienna",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "e2e",
      testMatch: /.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
    {
      name: "a11y-desktop",
      testMatch: /.*\.a11y\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
    {
      name: "a11y-mobile",
      testMatch: /.*\.a11y\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: {
    command: isCI ? "npm run start" : "npm run dev",
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
    env: {
      NEXT_TELEMETRY_DISABLED: "1",
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? "test1234",
      ADMIN_SECRET: process.env.ADMIN_SECRET ?? "devsecret-devsecret",
    },
  },
});
