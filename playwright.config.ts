import { defineConfig, devices } from '@playwright/test';

const API_PORT = 8788;
const WEB_PORT = 5174;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    // Set PW_CHANNEL=chrome to use an installed Google Chrome instead of Playwright's bundled Chromium.
    channel: process.env.PW_CHANNEL || undefined,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL || undefined } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: process.env.PW_CHANNEL || undefined } },
  ],
  webServer: [
    {
      // HubSpot is mocked (HUBSPOT_MOCK=true): the full flow runs without a HubSpot account.
      command: 'tsx server/index.ts',
      url: `http://localhost:${API_PORT}/api/health`,
      reuseExistingServer: false,
      env: {
        NODE_ENV: 'test',
        PORT: String(API_PORT),
        HUBSPOT_MOCK: 'true',
        MIN_COMPLETION_MS: '0',
        RATE_LIMIT_MAX: '1000',
        CORS_ORIGIN: `http://localhost:${WEB_PORT}`,
        QUEUE_DIR: './test-results/queue',
        QUEUE_INTERVAL_MS: '0',
        LOG_LEVEL: 'warn',
      },
    },
    {
      command: `vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      env: { PORT: String(API_PORT) },
    },
  ],
});
