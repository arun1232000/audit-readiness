import { defineConfig, devices } from '@playwright/test';

/** The Web3Forms build: no server at all; the browser posts to api.web3forms.com (intercepted in the test). */
const PORT = 5175;

export default defineConfig({
  testDir: './tests/e2e-web3forms',
  timeout: 60_000,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL || undefined } }],
  webServer: {
    command: `vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    env: { VITE_WEB3FORMS_ACCESS_KEY: 'test-access-key', VITE_DEMO_MODE: 'true' },
  },
});
