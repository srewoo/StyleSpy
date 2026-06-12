/**
 * Panel/table-side messaging. Commands are sent to the active tab's content
 * script; events arrive back over runtime messaging. Commands are broadcast to
 * every frame (frameId omitted) so iframed content is reachable too.
 */
import type { CommandMessage, EventMessage } from '../lib/messages';
import { isMessage } from '../lib/messages';

const EVENT_TYPES: ReadonlySet<string> = new Set([
  'capture-result',
  'capture-progress',
  'element-inspected',
  'ghost-list',
  'mutation-batch',
  'freeze-changed',
  'picker-changed',
  'pong',
]);

/** Resolve the tab the user is actually inspecting. */
export async function getInspectedTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab;
}

/** Send a command to the inspected tab's content script(s). */
export async function sendCommand(msg: CommandMessage): Promise<void> {
  const tab = await getInspectedTab();
  if (tab?.id === undefined) return;
  try {
    await chrome.tabs.sendMessage(tab.id, msg);
  } catch {
    /* page has no content script (chrome://, web store, PDF viewer, …) */
  }
}

/** Subscribe to events emitted by the content script. Returns an unsubscribe. */
export function onEvent(handler: (msg: EventMessage) => void): () => void {
  const listener = (raw: unknown): void => {
    if (isMessage(raw) && EVENT_TYPES.has(raw.type)) handler(raw as EventMessage);
  };
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}
