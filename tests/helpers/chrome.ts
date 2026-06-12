/**
 * Minimal in-memory `chrome.*` stub for jsdom unit tests. Covers only the
 * surface StyleSpy's panel/table code touches: storage (local/session), tabs,
 * and runtime. Install one per test via {@link installChrome}; tweak behaviour
 * with the returned handle (e.g. make a storage area reject to simulate quota).
 */
import { vi } from 'vitest';

interface FakeArea {
  data: Record<string, unknown>;
  /** When set, the next `set` rejects with this message (then clears). */
  failNextSet: string | null;
  get: (key?: string | string[] | null) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (key: string | string[]) => Promise<void>;
}

function makeArea(): FakeArea {
  const area: FakeArea = {
    data: {},
    failNextSet: null,
    get: vi.fn(async (key?: string | string[] | null) => {
      if (key === undefined || key === null) return { ...area.data };
      const keys = Array.isArray(key) ? key : [key];
      const out: Record<string, unknown> = {};
      for (const k of keys) if (k in area.data) out[k] = area.data[k];
      return out;
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      if (area.failNextSet) {
        const msg = area.failNextSet;
        area.failNextSet = null;
        throw new Error(msg);
      }
      Object.assign(area.data, items);
    }),
    remove: vi.fn(async (key: string | string[]) => {
      for (const k of Array.isArray(key) ? key : [key]) delete area.data[k];
    }),
  };
  return area;
}

export interface FakeChrome {
  local: FakeArea;
  session: FakeArea;
  tabs: {
    query: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    sendMessage: ReturnType<typeof vi.fn>;
  };
  runtime: {
    getURL: (p: string) => string;
    sendMessage: ReturnType<typeof vi.fn>;
    onMessage: { addListener: ReturnType<typeof vi.fn>; removeListener: ReturnType<typeof vi.fn> };
  };
}

export function installChrome(opts?: {
  activeTab?: { id?: number; url?: string };
}): FakeChrome {
  const local = makeArea();
  const session = makeArea();
  const tab = opts?.activeTab ?? { id: 1, url: 'https://example.com/' };

  const fake = {
    storage: { local, session },
    tabs: {
      query: vi.fn(async () => [tab]),
      create: vi.fn(async () => ({ id: 99 })),
      sendMessage: vi.fn(async () => undefined),
    },
    runtime: {
      getURL: (p: string) => `chrome-extension://stylespy/${p}`,
      sendMessage: vi.fn(async () => undefined),
      onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  };

  (globalThis as unknown as { chrome: unknown }).chrome = fake;

  return {
    local,
    session,
    tabs: fake.tabs,
    runtime: fake.runtime,
  };
}

export function uninstallChrome(): void {
  delete (globalThis as unknown as { chrome?: unknown }).chrome;
}
