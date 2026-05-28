import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright baseline (#235). Targets the Vite dev server at localhost:5173
 * with Chromium, Firefox and WebKit projects so the eventual E2E suite
 * runs across all three engines on CI. No specs exist yet — drop the first
 * one under `tests/e2e/` to start.
 *
 * Run: `npm run test:e2e` (boots `npm run dev` automatically via webServer).
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
