/**
 * Service worker. Two jobs:
 *  1. Open the side panel ONLY on the tab whose toolbar icon was clicked
 *     (per-tab), instead of a window-wide panel shown on every tab.
 *  2. Translate the global keyboard shortcuts (Freeze / Toggle picker) into
 *     commands sent to the active tab's content script.
 *
 * Panel↔content messaging otherwise flows directly: the panel uses
 * tabs.sendMessage to command the page, and the content script uses
 * runtime.sendMessage to emit events the panel listens for.
 */
import type { CommandMessage } from '../lib/messages';

const PANEL_PATH = 'src/sidepanel/index.html';

// There is no global `side_panel.default_path`, so the panel is disabled
// everywhere until we explicitly enable it for a clicked tab. Clicking the
// icon therefore fires action.onClicked (not an auto-open).
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: false })
    .catch((e) => console.error('sidePanel behavior failed', e));
});

// Open StyleSpy for the clicked tab only. Enabling with a tabId scopes the
// panel to that tab, so switching to other tabs hides it (they have no panel
// enabled), rather than showing it window-wide.
//
// IMPORTANT: do NOT `await` before `open()`. `sidePanel.open()` must run in the
// same synchronous turn as the user gesture; awaiting `setOptions()` first
// throws "may only be called in response to a user gesture". So we fire
// `setOptions` without awaiting and call `open()` immediately after.
chrome.action.onClicked.addListener((tab) => {
  if (tab.id === undefined) return;
  void chrome.sidePanel.setOptions({
    tabId: tab.id,
    path: PANEL_PATH,
    enabled: true,
  });
  void chrome.sidePanel.open({ tabId: tab.id });
});


/** Per-tab picker on/off so the hotkey can toggle it. */
const pickerState = new Map<number, boolean>();

async function activeTabId(): Promise<number | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

function sendToTab(tabId: number, msg: CommandMessage): void {
  chrome.tabs.sendMessage(tabId, msg).catch(() => {
    /* no content script on this page (e.g. chrome:// or the web store) */
  });
}

chrome.commands.onCommand.addListener(async (command) => {
  const tabId = await activeTabId();
  if (tabId === undefined) return;

  if (command === 'freeze-states') {
    sendToTab(tabId, { type: 'freeze' });
  } else if (command === 'toggle-picker') {
    const next = !(pickerState.get(tabId) ?? false);
    pickerState.set(tabId, next);
    sendToTab(tabId, { type: 'toggle-picker', enabled: next });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => pickerState.delete(tabId));
