import { defineConfig, devices } from '@playwright/test';

const externalURL = process.env.TEST_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: externalURL || 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: externalURL
    ? undefined
    : {
        command: 'npm run dev -- --host 0.0.0.0',
        url: 'http://127.0.0.1:5173/@vite/client',
        reuseExistingServer: false,
      },
});
