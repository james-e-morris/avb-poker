// config/playwright.config.js - Playwright E2E test configuration

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '../tests/e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'Mobile (iPhone 12)',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'Mobile (Pixel 5)',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Tablet (iPad Pro)',
      use: { ...devices['iPad Pro'] },
    },
    {
      name: 'Desktop (1920x1080)',
      use: {
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: 'Desktop (1366x768)',
      use: {
        viewport: { width: 1366, height: 768 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: 'Small Desktop (1024x768)',
      use: {
        viewport: { width: 1024, height: 768 },
        deviceScaleFactor: 1,
      },
    },
  ],

  webServer: {
    command: 'python3 -m http.server 8000',
    url: 'http://localhost:8000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
