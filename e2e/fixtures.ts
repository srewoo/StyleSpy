/**
 * Playwright fixtures for testing the StyleSpy extension end-to-end. Loads the
 * built extension from dist/ into a persistent Chromium context and exposes
 * the extension's service worker + id.
 */
import { test as base, chromium, type BrowserContext, type Worker } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(here, '..', 'dist');

export const test = base.extend<{
  context: BrowserContext;
  serviceWorker: Worker;
  extensionId: string;
}>({
  context: async ({}, use) => {
    // `channel: 'chromium'` selects the new headless mode, which (unlike the
    // bundled old-headless build) runs MV3 extension service workers.
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      args: [
        `--disable-extensions-except=${distPath}`,
        `--load-extension=${distPath}`,
      ],
    });
    await use(context);
    await context.close();
  },

  serviceWorker: async ({ context }, use) => {
    let [sw] = context.serviceWorkers();
    if (!sw) sw = await context.waitForEvent('serviceworker');
    await use(sw);
  },

  extensionId: async ({ serviceWorker }, use) => {
    const id = serviceWorker.url().split('/')[2] ?? '';
    await use(id);
  },
});

export const expect = test.expect;
