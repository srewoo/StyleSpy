/** Side-panel actions: send commands to the page and update local state. */
import type { ElementState } from '../types';
import { sendCommand, getInspectedTab } from '../ui/messaging';
import {
  downloadText,
  copyText,
  CAPTURE_STORAGE_KEY,
  PANEL_STORAGE_KEY,
  saveTheme,
  loadTheme,
} from '../ui/io';
import type { ElementSnapshot } from '../types';
import { toCsv, toJson } from '../lib/format';
import { filterSnapshots } from '../lib/filter';
import { getState, setState } from './state';

export async function capturePage(): Promise<void> {
  setState({ status: 'Capturing page…' });
  await sendCommand({ type: 'capture-page', scope: 'all' });
}

export async function toggleFreeze(): Promise<void> {
  const { frozen } = getState();
  await sendCommand(frozen ? { type: 'unfreeze' } : { type: 'freeze' });
}

export async function countdownFreeze(seconds = 3): Promise<void> {
  setState({ status: `Freezing in ${seconds}s — hover your target…` });
  await sendCommand({ type: 'countdown-freeze', seconds });
}

export async function togglePicker(): Promise<void> {
  const next = !getState().pickerOn;
  setState({ pickerOn: next });
  await sendCommand({ type: 'toggle-picker', enabled: next });
}

export async function applyForce(
  selector: string,
  state: ElementState,
  enabled: boolean,
): Promise<void> {
  await sendCommand({ type: 'force-state', selector, state, enabled });
}

export async function refreshGhosts(): Promise<void> {
  setState({ status: 'Scanning for hidden elements…' });
  await sendCommand({ type: 'list-ghosts' });
}

export async function revealGhost(nodeId: string, revealed: boolean): Promise<void> {
  await sendCommand({ type: 'reveal-ghost', nodeId, revealed });
}

export async function toggleMutationLog(): Promise<void> {
  const next = !getState().mutationLogOn;
  setState({ mutationLogOn: next, mutations: next ? getState().mutations : [] });
  await sendCommand({ type: 'toggle-mutation-log', enabled: next });
}

export async function toggleBreakOnMutation(): Promise<void> {
  const next = !getState().breakOn;
  setState({ breakOn: next });
  await sendCommand({ type: 'break-on-mutation', enabled: next });
}

function visibleSnapshots(): ReturnType<typeof filterSnapshots> {
  const { snapshots, filter, query } = getState();
  return filterSnapshots(snapshots, filter, query);
}

export function exportCsv(): void {
  downloadText('stylespy.csv', toCsv(visibleSnapshots()), 'text/csv');
}

export function exportJson(): void {
  downloadText('stylespy.json', toJson(visibleSnapshots()), 'application/json');
}

export async function copyAll(): Promise<void> {
  const ok = await copyText(toJson(visibleSnapshots()));
  setState({ status: ok ? 'Copied JSON to clipboard' : 'Copy failed' });
}

/** Open one of the extension's own pages (help / privacy) in a new tab. */
export async function openExtensionPage(path: string): Promise<void> {
  await chrome.tabs.create({ url: chrome.runtime.getURL(path) });
}

/** Stash the current capture and open the full-table view in a new tab. */
export async function openFullTable(): Promise<void> {
  const { snapshots, url } = getState();
  await chrome.storage.local.set({
    [CAPTURE_STORAGE_KEY]: { snapshots, url, capturedAt: Date.now() },
  });
  await chrome.tabs.create({
    url: chrome.runtime.getURL('src/table/index.html'),
  });
}

/** Read the inspected tab's URL into state (shown in the header). */
export async function syncUrl(): Promise<void> {
  const tab = await getInspectedTab();
  if (tab?.url) setState({ url: tab.url });
}

/** Persist the latest capture so it survives the panel being closed. */
export async function persistCapture(): Promise<void> {
  const { snapshots, url } = getState();
  await chrome.storage.session.set({
    [PANEL_STORAGE_KEY]: { snapshots, url },
  });
}

/** Restore a persisted capture + theme on panel open. */
export async function restoreSession(): Promise<void> {
  const theme = await loadTheme();
  document.documentElement.dataset.theme = theme;
  const data = await chrome.storage.session.get(PANEL_STORAGE_KEY);
  const saved = data[PANEL_STORAGE_KEY] as
    | { snapshots: ElementSnapshot[]; url: string }
    | undefined;
  setState({
    theme,
    ...(saved && saved.snapshots.length
      ? { snapshots: saved.snapshots, url: saved.url, status: `${saved.snapshots.length} elements (restored)` }
      : {}),
  });
}

/** Clear the current capture and any persisted/stashed copies. */
export async function clearCapture(): Promise<void> {
  setState({
    snapshots: [],
    selected: null,
    ghosts: [],
    mutations: [],
    expanded: new Set(),
    locatorFilter: 'any',
    status: 'Cleared',
  });
  await chrome.storage.session.remove(PANEL_STORAGE_KEY);
  await chrome.storage.local.remove(CAPTURE_STORAGE_KEY);
}

/** Toggle light/dark and persist the choice. */
export async function toggleTheme(): Promise<void> {
  const theme = getState().theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  setState({ theme });
  await saveTheme(theme);
}
