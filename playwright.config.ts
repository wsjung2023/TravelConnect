// Playwright E2E test configuration (T10 - disabled in Replit env, use smoke:auth instead).
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5000',
    headless: true,
  },
  reporter: 'list',
});
