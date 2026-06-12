/**
 * Content-script entry. Wires the event emitter to chrome messaging, starts
 * hover-memory tracking, and dispatches incoming commands to the feature
 * engines. Injected into every frame at document_idle.
 */
import { isMessage, isCommand, type CommandMessage } from '../lib/messages';
import { setEmitter } from './emitter';
import { capturePage } from './inspect';
import { togglePicker, setLockTarget, initHoverMemory } from './picker';
import { freeze, unfreeze, countdownFreeze } from './freeze';
import { setForcedState } from './force-state';
import { listGhosts, revealGhost } from './ghost-dom';
import {
  startMutationLog,
  stopMutationLog,
  setBreakOnMutation,
} from './mutation-logger';

// Guard against double-injection (e.g. SPA re-navigations re-running the script).
declare global {
  interface Window {
    __stylespyLoaded?: boolean;
  }
}
if (!window.__stylespyLoaded) {
  window.__stylespyLoaded = true;
  setEmitter((msg) => {
    void chrome.runtime.sendMessage(msg).catch(() => {
      /* panel closed — events are best-effort */
    });
  });
  initHoverMemory();
  // Cross-world readiness marker (the page's main world can't see our isolated
  // `window` flag, but it can see this shared-DOM attribute).
  document.documentElement.setAttribute('data-stylespy-ready', '1');

  chrome.runtime.onMessage.addListener((raw: unknown) => {
    if (!isMessage(raw) || !isCommand(raw)) return undefined;
    dispatch(raw);
    return undefined;
  });
}

function dispatch(cmd: CommandMessage): void {
  switch (cmd.type) {
    case 'capture-page':
      void capturePage(cmd.scope, (done, total) => {
        void chrome.runtime.sendMessage({ type: 'capture-progress', done, total });
      }).then((snapshots) => {
        void chrome.runtime.sendMessage({
          type: 'capture-result',
          snapshots,
          url: location.href,
        });
      });
      break;
    case 'toggle-picker':
      togglePicker(cmd.enabled);
      setLockTarget(cmd.enabled);
      break;
    case 'freeze':
      freeze();
      break;
    case 'unfreeze':
      unfreeze();
      break;
    case 'countdown-freeze':
      countdownFreeze(cmd.seconds);
      break;
    case 'force-state':
      setForcedState(cmd.selector, cmd.state, cmd.enabled);
      break;
    case 'list-ghosts':
      void chrome.runtime.sendMessage({ type: 'ghost-list', nodes: listGhosts() });
      break;
    case 'reveal-ghost':
      revealGhost(cmd.nodeId, cmd.revealed);
      break;
    case 'toggle-mutation-log':
      if (cmd.enabled) startMutationLog();
      else stopMutationLog();
      break;
    case 'break-on-mutation':
      setBreakOnMutation(cmd.enabled);
      break;
    case 'ping':
      void chrome.runtime.sendMessage({ type: 'pong' });
      break;
  }
}
