import { defineConfig, devices } from "@playwright/test";

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL?.replace(/\/$/, "");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  timeout: 45_000,
  expect: { timeout: 7_500 },
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: externalBaseURL ?? "http://127.0.0.1:4173", screenshot: "only-on-failure", trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: externalBaseURL ? undefined : {
    command: "npm run dev -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { ...process.env, VITE_DEMO_MODE: "true", VITE_ATTRIBUTE_PROVIDER: "mock" },
  },
});
