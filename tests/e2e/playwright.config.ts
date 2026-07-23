import { defineConfig } from '@playwright/test';

// Drives all apps incl. the real-time order→kitchen→pay loop. In CI the full stack
// comes up via docker-compose.ci.yml; the base URL points at web-staff.
export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.STAFF_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
  },
});
