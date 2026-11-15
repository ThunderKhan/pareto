import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Always test the production build. Dev HMR can reject loopback-origin assets
    // and leave React unhydrated on Windows, making every click-dependent test fail.
    // CI builds in a separate step; local runs build automatically for correctness.
    command: process.env.CI ? "pnpm start" : "pnpm build && pnpm start",
    url: "http://127.0.0.1:3000/api/health",
    // Never silently reuse an unrelated `pnpm dev` process at port 3000.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
