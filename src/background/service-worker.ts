/**
 * Service worker. Two jobs:
 *  1. Make the toolbar icon open the side panel.
 *  2. Translate the global keyboard shortcuts (Freeze / Toggle picker) into
 *     commands sent to the active tab's content script.
 *
 * Panel↔content messaging otherwise flows directly: the panel uses
 * tabs.sendMessage to command the page, and the content script uses
 * runtime.sendMessage to emit events the panel listens for.
 */
import type { CommandMessage } from '../lib/messages';

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((e) => console.error('sidePanel behavior failed', e));
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
