import { defineConfig } from '@playwright/test';

/**
 * E2E config. Tests load the built extension from dist/ into a persistent
 * Chromium context, so `npm run build` must run first (the `test:e2e` script
 * does this for you). Single worker — extension contexts don't parallelise.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
});
