import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { installChrome, uninstallChrome, type FakeChrome } from './helpers/chrome';
import {
  copyText,
  downloadText,
  loadTheme,
  saveTheme,
  THEME_KEY,
} from '../src/ui/io';

describe('copyText', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns true when the clipboard write succeeds', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn(async () => undefined) },
      configurable: true,
    });
    expect(await copyText('hi')).toBe(true);
  });

  it('returns false when the clipboard write throws', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn(async () => {
          throw new Error('blocked');
        }),
      },
      configurable: true,
    });
    expect(await copyText('hi')).toBe(false);
  });
});

describe('downloadText', () => {
  it('builds a blob URL and clicks an anchor, then revokes', () => {
    const create = vi.fn(() => 'blob:fake');
    const revoke = vi.fn();
    // jsdom doesn't implement these — provide them.
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = create;
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = revoke;
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    downloadText('out.csv', 'a,b\n1,2', 'text/csv');

    expect(create).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith('blob:fake');
    click.mockRestore();
  });
});

describe('theme persistence', () => {
  let chrome: FakeChrome;
  beforeEach(() => {
    chrome = installChrome();
  });
  afterEach(() => uninstallChrome());

  it('defaults to light when nothing is stored', async () => {
    expect(await loadTheme()).toBe('light');
  });

  it('round-trips dark', async () => {
    await saveTheme('dark');
    expect(chrome.local.data[THEME_KEY]).toBe('dark');
    expect(await loadTheme()).toBe('dark');
  });

  it('treats any non-dark stored value as light', async () => {
    chrome.local.data[THEME_KEY] = 'banana';
    expect(await loadTheme()).toBe('light');
  });
});
