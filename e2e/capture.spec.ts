/**
 * End-to-end proof that the extension loads and its content script captures a
 * real page. Serves a fixture over http (content scripts don't run on
 * about:blank/data:), then drives `capture-page` from the service worker and
 * asserts snapshots come back.
 */
import { test, expect } from './fixtures';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

const FIXTURE = `<!doctype html><html><head><style>
  .btn:hover { color: rgb(1,2,3); }
  #modal { display: none; }
</style></head><body>
  <h1 class="title">Inspect anything</h1>
  <button class="btn" data-testid="go">Get started</button>
  <p>Trusted by teams</p>
  <div id="modal">Hidden modal</div>
</body></html>`;

let server: Server;
let baseUrl: string;

test.beforeAll(async () => {
  server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(FIXTURE);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}/`;
});

test.afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('loads the extension and registers a service worker', async ({ extensionId }) => {
  expect(extensionId).toMatch(/^[a-z]{32}$/);
});

test('content script captures every element with locators', async ({
  context,
  serviceWorker,
}) => {
  const page = await context.newPage();
  await page.goto(baseUrl);
  await page.waitForFunction(
    () => document.documentElement.hasAttribute('data-stylespy-ready'),
    null,
    { timeout: 10_000 },
  );

  const snapshots = await serviceWorker.evaluate(async (url) => {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find((t) => t.url?.startsWith(url));
    if (!tab?.id) throw new Error('fixture tab not found');
    return await new Promise<unknown[]>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('capture timed out')), 8000);
      const listener = (msg: { type?: string; snapshots?: unknown[] }): void => {
        if (msg?.type === 'capture-result') {
          clearTimeout(timer);
          chrome.runtime.onMessage.removeListener(listener);
          resolve(msg.snapshots ?? []);
        }
      };
      chrome.runtime.onMessage.addListener(listener);
      void chrome.tabs.sendMessage(tab.id!, { type: 'capture-page', scope: 'all' });
    });
  }, baseUrl);

  expect(Array.isArray(snapshots)).toBe(true);
  expect(snapshots.length).toBeGreaterThan(3);

  const button = (snapshots as Array<{ identity: { tag: string; testId: string | null }; text: string }>).find(
    (s) => s.identity.tag === 'button',
  );
  expect(button?.identity.testId).toBe('go');
  expect(button?.text).toBe('Get started');
});

/** Send a command to the fixture tab and await one matching event from it. */
async function commandAndWait(
  serviceWorker: import('@playwright/test').Worker,
  url: string,
  command: Record<string, unknown>,
  awaitType: string,
): Promise<unknown> {
  return serviceWorker.evaluate(
    async ({ url, command, awaitType }) => {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find((t) => t.url?.startsWith(url));
      if (!tab?.id) throw new Error('fixture tab not found');
      return await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('event timed out')), 8000);
        const listener = (msg: { type?: string }): void => {
          if (msg?.type === awaitType) {
            clearTimeout(timer);
            chrome.runtime.onMessage.removeListener(listener);
            resolve(msg);
          }
        };
        chrome.runtime.onMessage.addListener(listener);
        void chrome.tabs.sendMessage(tab.id!, command);
      });
    },
    { url, command, awaitType },
  );
}

test('Freeze captures the hovered element and pauses the page', async ({
  context,
  serviceWorker,
}) => {
  const page = await context.newPage();
  await page.goto(baseUrl);
  await page.waitForFunction(() =>
    document.documentElement.hasAttribute('data-stylespy-ready'),
  );

  // Real pointer hover — the mouse stays over the button while we freeze.
  await page.hover('button.btn');

  const evt = (await commandAndWait(
    serviceWorker,
    baseUrl,
    { type: 'freeze' },
    'element-inspected',
  )) as { snapshot: { state: string; identity: { tag: string } } };

  // The frozen snapshot is captured in the hover state…
  expect(evt.snapshot.state).toBe('hover');
  expect(['button', 'p', 'h1', 'div', 'body']).toContain(evt.snapshot.identity.tag);

  // …and the page is visibly frozen (pause stylesheet injected into shared DOM).
  await expect(page.locator('#stylespy-freeze-style')).toHaveCount(1);

  // Unfreeze removes it again.
  await commandAndWait(serviceWorker, baseUrl, { type: 'unfreeze' }, 'freeze-changed');
  await expect(page.locator('#stylespy-freeze-style')).toHaveCount(0);
});

test('3s capture (countdown) freezes after the delay', async ({
  context,
  serviceWorker,
}) => {
  const page = await context.newPage();
  await page.goto(baseUrl);
  await page.waitForFunction(() =>
    document.documentElement.hasAttribute('data-stylespy-ready'),
  );
  await page.hover('button.btn');

  // Use a 1s countdown to keep the test quick.
  await serviceWorker.evaluate(async (url) => {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find((t) => t.url?.startsWith(url));
    if (!tab?.id) throw new Error('fixture tab not found');
    await chrome.tabs.sendMessage(tab.id, { type: 'countdown-freeze', seconds: 1 });
  }, baseUrl);

  // Not frozen immediately…
  await expect(page.locator('#stylespy-freeze-style')).toHaveCount(0);
  // …but frozen after the countdown elapses.
  await expect(page.locator('#stylespy-freeze-style')).toHaveCount(1, { timeout: 4000 });
});
