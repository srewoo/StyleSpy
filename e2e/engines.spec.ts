/**
 * End-to-end coverage for the inspection engines beyond plain capture: ghost
 * reveal, forced states, the live mutation feed, the click picker, and the
 * full-table page. Each test drives the real content script (and, for the
 * table, the real extension page) in Chromium via the service worker.
 */
import { test, expect } from './fixtures';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Worker } from '@playwright/test';

const FIXTURE = `<!doctype html><html><head><style>
  .btn { color: rgb(0, 0, 0); }
  .btn:hover { color: rgb(1, 2, 3); }
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

/** Open the fixture and wait until the content script has announced itself. */
async function openFixture(context: import('@playwright/test').BrowserContext) {
  const page = await context.newPage();
  await page.goto(baseUrl);
  await page.waitForFunction(
    () => document.documentElement.hasAttribute('data-stylespy-ready'),
    null,
    { timeout: 10_000 },
  );
  return page;
}

/** Fire a command at the fixture tab from the service worker. */
async function sendCommand(
  sw: Worker,
  url: string,
  command: Record<string, unknown>,
): Promise<void> {
  await sw.evaluate(
    async ({ url, command }) => {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find((t) => t.url?.startsWith(url));
      if (!tab?.id) throw new Error('fixture tab not found');
      await chrome.tabs.sendMessage(tab.id, command);
    },
    { url, command },
  );
}

/** Send a command and await one matching event emitted back by the page. */
async function commandAndWait(
  sw: Worker,
  url: string,
  command: Record<string, unknown>,
  awaitType: string,
): Promise<Record<string, unknown>> {
  return sw.evaluate(
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
            resolve(msg as Record<string, unknown>);
          }
        };
        chrome.runtime.onMessage.addListener(listener);
        void chrome.tabs.sendMessage(tab.id!, command);
      });
    },
    { url, command, awaitType },
  );
}

test('Ghost DOM lists a hidden element and force-reveals it', async ({
  context,
  serviceWorker,
}) => {
  const page = await openFixture(context);

  const list = (await commandAndWait(
    serviceWorker,
    baseUrl,
    { type: 'list-ghosts' },
    'ghost-list',
  )) as { nodes: Array<{ nodeId: string; tag: string; reason: string; text: string }> };

  const modal = list.nodes.find((n) => n.text === 'Hidden modal');
  expect(modal).toBeDefined();
  expect(modal!.reason).toBe('display-none');

  // The modal is genuinely not rendered yet.
  await expect(page.locator('#modal')).toBeHidden();

  // Force-reveal it, then assert it actually renders.
  await sendCommand(serviceWorker, baseUrl, {
    type: 'reveal-ghost',
    nodeId: modal!.nodeId,
    revealed: true,
  });
  await expect(page.locator('#modal')).toBeVisible();
  await expect(page.locator('#modal')).toHaveAttribute('data-stylespy-reveal', '1');
});

test('Force-state applies the page\'s own :hover rule without a pointer', async ({
  context,
  serviceWorker,
}) => {
  const page = await openFixture(context);
  const colorOf = () =>
    page.$eval('button.btn', (el) => getComputedStyle(el).color);

  // Base colour is black.
  expect(await colorOf()).toBe('rgb(0, 0, 0)');

  await sendCommand(serviceWorker, baseUrl, {
    type: 'force-state',
    selector: 'button.btn',
    state: 'hover',
    enabled: true,
  });
  // The :hover rule (rgb(1,2,3)) is now forced on with no real hover.
  expect(await colorOf()).toBe('rgb(1, 2, 3)');

  await sendCommand(serviceWorker, baseUrl, {
    type: 'force-state',
    selector: 'button.btn',
    state: 'hover',
    enabled: false,
  });
  expect(await colorOf()).toBe('rgb(0, 0, 0)');
});

test('Mutation feed reports a node added to the page', async ({
  context,
  serviceWorker,
}) => {
  const page = await openFixture(context);
  await sendCommand(serviceWorker, baseUrl, {
    type: 'toggle-mutation-log',
    enabled: true,
  });

  // Start listening before triggering the mutation (the feed batches ~400ms).
  const waitBatch = serviceWorker.evaluate((url) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('no mutation batch')), 8000);
      const listener = (msg: { type?: string; entries?: unknown[] }): void => {
        if (msg?.type === 'mutation-batch') {
          clearTimeout(timer);
          chrome.runtime.onMessage.removeListener(listener);
          resolve(msg.entries ?? []);
        }
      };
      chrome.runtime.onMessage.addListener(listener);
      void url;
    });
  }, baseUrl);

  await page.evaluate(() => {
    const el = document.createElement('div');
    el.id = 'injected';
    el.textContent = 'popup';
    document.body.appendChild(el);
  });

  const entries = (await waitBatch) as Array<{ kind: string; target: string }>;
  const added = entries.find((e) => e.kind === 'added');
  expect(added).toBeDefined();
  // Cheap descriptor, not a resolved selector.
  expect(added!.target).toContain('div');
});

test('Picker inspects the element that is clicked', async ({
  context,
  serviceWorker,
}) => {
  const page = await openFixture(context);

  // Enable the picker, then set up the wait and click the button.
  await sendCommand(serviceWorker, baseUrl, {
    type: 'toggle-picker',
    enabled: true,
  });

  const waitInspect = serviceWorker.evaluate(() => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('no inspect event')), 8000);
      const listener = (msg: { type?: string; snapshot?: unknown }): void => {
        if (msg?.type === 'element-inspected') {
          clearTimeout(timer);
          chrome.runtime.onMessage.removeListener(listener);
          resolve(msg.snapshot);
        }
      };
      chrome.runtime.onMessage.addListener(listener);
    });
  });

  await page.click('button.btn');

  const snapshot = (await waitInspect) as {
    identity: { tag: string; testId: string | null };
  };
  expect(snapshot.identity.tag).toBe('button');
  expect(snapshot.identity.testId).toBe('go');
});

test('Full-table page renders a stashed capture', async ({
  context,
  serviceWorker,
  extensionId,
}) => {
  // Stash a capture the way openFullTable() does (storage.local under the key).
  await serviceWorker.evaluate(() => {
    const mk = (id: string, tag: string) => ({
      snapshotId: id,
      text: tag,
      identity: {
        tag,
        id: null,
        classNames: [],
        cssSelector: tag,
        xpath: `//${tag}`,
        testId: null,
        ariaLabel: null,
        role: null,
      },
      styles: {
        color: 'rgb(0, 0, 0)',
        backgroundColor: 'rgb(255, 255, 255)',
        fontFamily: 'Inter',
        fontSize: '14px',
        fontWeight: '400',
        fontStyle: 'normal',
        lineHeight: '20px',
        letterSpacing: 'normal',
        textAlign: 'left',
        textDecoration: 'none',
        textTransform: 'none',
        padding: '0px',
        margin: '0px',
        border: 'none',
        borderRadius: '0px',
        boxShadow: 'none',
        opacity: '1',
        display: 'block',
      },
      visibility: 'visible',
      state: 'base',
      capturedAt: 0,
    });
    return chrome.storage.local.set({
      'stylespy:capture': {
        snapshots: [mk('s1', 'button'), mk('s2', 'a'), mk('s3', 'h1')],
        url: 'https://example.com/',
        capturedAt: 0,
      },
    });
  });

  const tablePage = await context.newPage();
  await tablePage.goto(`chrome-extension://${extensionId}/src/table/index.html`);

  // Three data rows render in the virtualized grid.
  await expect(tablePage.locator('table.grid tbody tr:not(.spacer)')).toHaveCount(3);
  await expect(tablePage.locator('.tbar .title')).toHaveText('StyleSpy');
});
