import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end configuration.
 *
 * Chromium is provided by the environment (PLAYWRIGHT_BROWSERS_PATH), so no
 * browser download is attempted. Tests run serially against one server instance
 * because they share a database.
 */
/**
 * Use an explicitly provided Chromium when the environment ships one whose
 * build number differs from the one this Playwright release expects. Falls back
 * to Playwright's own resolution when the variable is unset.
 */
const launchOptions = {
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
  // Required when the test runner has no user namespace available.
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
};

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], launchOptions },
    },
    // §52 — the same critical flows must work on a phone viewport.
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions } },
  ],
});
