import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'responsive-audit.spec.ts',
  timeout: 300_000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5174',
    channel: 'chrome',
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
});
