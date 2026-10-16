import { defineConfig, devices } from "@playwright/test"

// Optional: point Chromium at a preinstalled browser when the bundled revision is unavailable
// (e.g. Claude Code cloud sessions, which ship Chromium under /opt/pw-browsers).
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
const chromiumLaunch = chromiumExecutable ? { launchOptions: { executablePath: chromiumExecutable } } : {}

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], ...chromiumLaunch } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "Mobile Chrome", use: { ...devices["Pixel 5"], ...chromiumLaunch } },
    { name: "Mobile Safari", use: { ...devices["iPhone 12"] } },
  ],
  webServer: {
    command: "./node_modules/.bin/next start --hostname 127.0.0.1",
    port: 3000,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  },
})
