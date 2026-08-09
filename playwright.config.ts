import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run start:dev',
      cwd: '../Multi-Rate-BE',
      url: 'http://localhost:3000/api/v1/health',
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        CORS_ORIGIN: 'http://localhost:5174',
        OTP_FIXED_CODE: '123456',
        OTP_SKIP_SEND: 'true',
      },
    },
    {
      command: 'npm run dev -- --port 5174 --strictPort',
      url: 'http://localhost:5174',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
