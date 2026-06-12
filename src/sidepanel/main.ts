/** Side-panel shell: header, global toolbar, tab bar, and view router. */
import './sidepanel.css';
import type { ElementSnapshot } from '../types';
import { h, clear } from '../ui/dom';
import { onEvent } from '../ui/messaging';
import { getState, setState, subscribe, type TabKey } from './state';
import {
  toggleFreeze,
  countdownFreeze,
  togglePicker,
  exportCsv,
  exportJson,
  copyAll,
  clearCapture,
  openExtensionPage,
  syncUrl,
  toggleTheme,
  persistCapture,
  restoreSession,
} from './actions';
import { renderCapture } from './views/capture';
import { renderInspect } from './views/inspect';
import { renderForce } from './views/force';
import { renderGhost } from './views/ghost';
import { renderMutations } from './views/mutations';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'capture', label: 'Capture' },
  { key: 'inspect', label: 'Inspect' },
  { key: 'force', label: 'Force' },
  { key: 'ghost', label: 'Ghost' },
  { key: 'mutations', label: 'Mutations' },
];

const root = document.getElementById('app')!;

function header(): HTMLElement {
  const { frozen, status, theme } = getState();
  return h(
    'header',
    { class: 'app-header' },
    h('img', { class: 'logo', attrs: { src: '/icons/icon48.png', alt: '' } }),
    h('span', { class: 'app-title', text: 'StyleSpy' }),
    h('span', { class: `live-dot${frozen ? ' live-dot--frozen' : ''}` }),
    h('span', { class: 'live-label', text: frozen ? 'frozen' : status }),
    h('button', {
      class: 'theme-btn',
      text: theme === 'dark' ? '☀' : '☾',
      title: theme === 'dark' ? 'Switch to light' : 'Switch to dark',
      on: { click: () => void toggleTheme() },
    }),
  );
}

function toolbar(): HTMLElement {
  const { frozen, pickerOn } = getState();
  return h(
    'div',
    { class: 'toolbar' },
    h('button', {
      class: `btn ${frozen ? 'btn--primary' : ''}`,
      text: frozen ? '❄ Unfreeze' : '❄ Freeze',
      on: { click: () => void toggleFreeze() },
    }),
    h('button', {
      class: `btn ${pickerOn ? 'btn--primary' : ''}`,
      text: '⌖ Pick',
      on: { click: () => void togglePicker() },
    }),
    h('button', {
      class: 'btn',
      text: '3s capture',
      on: { click: () => void countdownFreeze(3) },
    }),
  );
}

function tabBar(): HTMLElement {
  const { active } = getState();
  return h(
    'nav',
    { class: 'tab-bar' },
    ...TABS.map((t) =>
      h('button', {
        class: `tab${active === t.key ? ' tab--active' : ''}`,
        text: t.label,
        on: { click: () => setState({ active: t.key }) },
      }),
    ),
  );
}

function viewFor(active: TabKey): HTMLElement {
  switch (active) {
    case 'capture':
      return renderCapture();
    case 'inspect':
      return renderInspect();
    case 'force':
      return renderForce();
    case 'ghost':
      return renderGhost();
    case 'mutations':
      return renderMutations();
  }
}

function footer(): HTMLElement {
  const { active, snapshots } = getState();
  const showExports =
    (active === 'capture' || active === 'inspect') && snapshots.length > 0;

  const exportRow = showExports
    ? h(
        'div',
        { class: 'footer-row' },
        h('button', {
          class: 'btn btn--sm',
          text: 'Export CSV',
          on: { click: exportCsv },
        }),
        h('button', {
          class: 'btn btn--sm',
          text: 'Export JSON',
          on: { click: exportJson },
        }),
        h('button', {
          class: 'btn btn--sm',
          text: 'Copy',
          on: { click: () => void copyAll() },
        }),
        h('button', {
          class: 'btn btn--sm btn--danger',
          text: 'Clear',
          on: { click: () => void clearCapture() },
        }),
      )
    : null;

  const links = h(
    'div',
    { class: 'footer-links' },
    h('a', {
      class: 'flink',
      text: 'Help',
      on: { click: () => void openExtensionPage('src/help/index.html') },
    }),
    h('span', { class: 'fsep', text: '·' }),
    h('a', {
      class: 'flink',
      text: 'Privacy',
      on: { click: () => void openExtensionPage('src/privacy/index.html') },
    }),
  );

  return h('footer', { class: 'app-footer' }, exportRow, links);
}

/** Re-render, preserving focus + caret of the search box across renders. */
function render(): void {
  const activeEl = document.activeElement as HTMLInputElement | null;
  const keepSearch = activeEl?.classList.contains('search') ?? false;
  const caret = keepSearch ? activeEl!.selectionStart : null;

  clear(root);
  root.append(
    header(),
    toolbar(),
    tabBar(),
    viewFor(getState().active),
    footer(),
  );

  if (keepSearch) {
    const next = root.querySelector<HTMLInputElement>('input.search');
    if (next) {
      next.focus();
      if (caret !== null) next.setSelectionRange(caret, caret);
    }
  }
}

function mergeSnapshot(snap: ElementSnapshot): ElementSnapshot[] {
  const rest = getState().snapshots.filter(
    (s) => s.snapshotId !== snap.snapshotId,
  );
  return [snap, ...rest];
}

function wireEvents(): void {
  onEvent((msg) => {
    switch (msg.type) {
      case 'capture-progress':
        setState({ status: `Capturing… ${msg.done}/${msg.total}` });
        break;
      case 'capture-result':
        setState({
          snapshots: msg.snapshots,
          url: msg.url,
          status: `${msg.snapshots.length} elements`,
        });
        void persistCapture();
        break;
      case 'element-inspected':
        setState({
          snapshots: mergeSnapshot(msg.snapshot),
          selected: msg.snapshot,
          active: 'inspect',
          status: 'Element inspected',
        });
        break;
      case 'ghost-list':
        setState({ ghosts: msg.nodes, status: `${msg.nodes.length} hidden` });
        break;
      case 'mutation-batch':
        setState({
          mutations: [...getState().mutations, ...msg.entries].slice(-400),
        });
        break;
      case 'freeze-changed':
        setState({
          frozen: msg.frozen,
          status: msg.frozen ? 'Frozen' : 'Ready',
        });
        break;
      case 'picker-changed':
        setState({ pickerOn: msg.enabled });
        break;
      case 'pong':
        break;
    }
  });
}

subscribe(render);
wireEvents();
void syncUrl();
// Restore theme + last capture, then render once ready.
void restoreSession().finally(render);
render();
