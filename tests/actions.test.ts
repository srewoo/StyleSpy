/**
 * Side-panel action tests. Focus on the storage-failure handling added to stop
 * silently swallowing rejections, plus the persist/restore/clear round-trip.
 * Uses the in-memory chrome stub.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ElementSnapshot } from '../src/types';
import { installChrome, uninstallChrome, type FakeChrome } from './helpers/chrome';
import { getState, setState } from '../src/sidepanel/state';
import {
  persistCapture,
  restoreSession,
  openFullTable,
  clearCapture,
  toggleTheme,
} from '../src/sidepanel/actions';
import { PANEL_STORAGE_KEY, CAPTURE_STORAGE_KEY, THEME_KEY } from '../src/ui/io';

function fakeSnapshot(id: string): ElementSnapshot {
  return {
    snapshotId: id,
    text: 't',
    identity: {
      tag: 'button',
      id: null,
      classNames: [],
      cssSelector: 'button',
      xpath: '//button',
      testId: null,
      ariaLabel: null,
      role: null,
    },
    styles: {} as ElementSnapshot['styles'],
    visibility: 'visible',
    state: 'base',
    capturedAt: 0,
  };
}

let chrome: FakeChrome;

beforeEach(() => {
  chrome = installChrome();
  setState({
    snapshots: [],
    url: 'https://example.com/',
    selected: null,
    ghosts: [],
    mutations: [],
    status: 'Ready',
    theme: 'light',
  });
});

afterEach(() => uninstallChrome());

describe('persistCapture', () => {
  it('stashes the capture in session storage', async () => {
    setState({ snapshots: [fakeSnapshot('a')], url: 'https://x/' });
    await persistCapture();
    expect(chrome.session.data[PANEL_STORAGE_KEY]).toEqual({
      snapshots: [fakeSnapshot('a')],
      url: 'https://x/',
    });
  });

  it('surfaces a status message on quota failure instead of swallowing', async () => {
    setState({ snapshots: [fakeSnapshot('a')] });
    chrome.session.failNextSet = 'QUOTA_BYTES quota exceeded';
    await persistCapture();
    expect(getState().status).toMatch(/won't persist/i);
    expect(getState().status).toMatch(/too large/i);
  });
});

describe('openFullTable', () => {
  it('stashes the capture and opens the table tab', async () => {
    setState({ snapshots: [fakeSnapshot('a')], url: 'https://x/' });
    await openFullTable();
    expect(chrome.local.data[CAPTURE_STORAGE_KEY]).toMatchObject({
      url: 'https://x/',
    });
    expect(chrome.tabs.create).toHaveBeenCalledTimes(1);
  });

  it('does NOT open an empty table when the write fails', async () => {
    setState({ snapshots: [fakeSnapshot('a')] });
    chrome.local.failNextSet = 'QUOTA_BYTES quota exceeded';
    await openFullTable();
    expect(chrome.tabs.create).not.toHaveBeenCalled();
    expect(getState().status).toMatch(/couldn't open table/i);
  });
});

describe('restoreSession', () => {
  it('restores a previously persisted capture', async () => {
    chrome.session.data[PANEL_STORAGE_KEY] = {
      snapshots: [fakeSnapshot('a'), fakeSnapshot('b')],
      url: 'https://restored/',
    };
    chrome.local.data[THEME_KEY] = 'dark';
    await restoreSession();
    expect(getState().snapshots).toHaveLength(2);
    expect(getState().url).toBe('https://restored/');
    expect(getState().theme).toBe('dark');
    expect(getState().status).toMatch(/restored/i);
  });

  it('opens with defaults when storage throws', async () => {
    chrome.session.get = (async () => {
      throw new Error('session unavailable');
    }) as FakeChrome['session']['get'];
    await restoreSession();
    expect(getState().theme).toBe('light');
    expect(getState().snapshots).toEqual([]);
  });
});

describe('clearCapture', () => {
  it('clears state and removes both stashed copies', async () => {
    setState({ snapshots: [fakeSnapshot('a')], ghosts: [], status: 'x' });
    chrome.session.data[PANEL_STORAGE_KEY] = { snapshots: [], url: '' };
    chrome.local.data[CAPTURE_STORAGE_KEY] = { snapshots: [], url: '' };
    await clearCapture();
    expect(getState().snapshots).toEqual([]);
    expect(getState().status).toBe('Cleared');
    expect(chrome.session.data[PANEL_STORAGE_KEY]).toBeUndefined();
    expect(chrome.local.data[CAPTURE_STORAGE_KEY]).toBeUndefined();
  });
});

describe('toggleTheme', () => {
  it('flips and persists the theme', async () => {
    setState({ theme: 'light' });
    await toggleTheme();
    expect(getState().theme).toBe('dark');
    expect(chrome.local.data[THEME_KEY]).toBe('dark');
    await toggleTheme();
    expect(getState().theme).toBe('light');
  });
});
