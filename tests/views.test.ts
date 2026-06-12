/**
 * Side-panel view tests. Render each view against a known state and assert on
 * the produced DOM, then exercise the interactive handlers (which route through
 * actions → the chrome stub). State is a singleton, so each test resets it.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ElementSnapshot, GhostNode, MutationEntry } from '../src/types';
import { installChrome, uninstallChrome, type FakeChrome } from './helpers/chrome';
import { getState, setState } from '../src/sidepanel/state';
import { renderCapture } from '../src/sidepanel/views/capture';
import { renderInspect } from '../src/sidepanel/views/inspect';
import { renderForce } from '../src/sidepanel/views/force';
import { renderGhost } from '../src/sidepanel/views/ghost';
import { renderMutations } from '../src/sidepanel/views/mutations';

/** Let queued microtasks/macrotasks drain (commands await tabs.query first). */
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function snap(over: Partial<ElementSnapshot> = {}): ElementSnapshot {
  return {
    snapshotId: over.snapshotId ?? 's1',
    text: over.text ?? 'Click me',
    identity: {
      tag: 'button',
      id: null,
      classNames: [],
      cssSelector: 'button.btn',
      xpath: '//button',
      testId: 'go',
      ariaLabel: null,
      role: null,
      ...over.identity,
    },
    styles: {
      color: 'rgb(0, 0, 0)',
      backgroundColor: 'rgb(255, 255, 255)',
      fontFamily: 'Inter, sans-serif',
      fontSize: '14px',
      fontWeight: '400',
      fontStyle: 'normal',
      lineHeight: '20px',
      letterSpacing: 'normal',
      textAlign: 'left',
      textDecoration: 'none',
      textTransform: 'none',
      padding: '4px',
      margin: '0px',
      border: 'none',
      borderRadius: '0px',
      boxShadow: 'none',
      opacity: '1',
      display: 'inline-block',
      ...over.styles,
    },
    visibility: over.visibility ?? 'visible',
    state: over.state ?? 'base',
    capturedAt: 0,
  };
}

let chrome: FakeChrome;

beforeEach(() => {
  chrome = installChrome();
  document.body.innerHTML = '';
  setState({
    active: 'capture',
    snapshots: [],
    filter: 'all',
    locatorFilter: 'any',
    query: '',
    expanded: new Set(),
    selected: null,
    ghosts: [],
    mutations: [],
    mutationLogOn: false,
    breakOn: false,
    status: 'Ready',
  });
});

afterEach(() => uninstallChrome());

describe('renderCapture', () => {
  it('shows onboarding when there is no capture', () => {
    const el = renderCapture();
    expect(el.querySelector('.empty')).not.toBeNull();
    expect(el.querySelector('.onboard')).not.toBeNull();
    // Full-table button is disabled with no snapshots.
    const fullTable = [...el.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Full table'),
    );
    expect(fullTable?.getAttribute('disabled')).toBe('true');
  });

  it('renders rows and a locator-health bar when populated', () => {
    setState({ snapshots: [snap(), snap({ snapshotId: 's2' })] });
    const el = renderCapture();
    expect(el.querySelector('.loc-health')).not.toBeNull();
    expect(el.querySelectorAll('.cap-row').length).toBe(2);
    // Two strong (testid) interactive buttons → 100% automatable.
    expect(el.querySelector('.loc-health__pct')?.textContent).toBe(
      '100% automatable',
    );
  });

  it('clicking a filter chip updates state', () => {
    setState({ snapshots: [snap()] });
    const el = renderCapture();
    const hiddenChip = [...el.querySelectorAll('.chip')].find(
      (c) => c.textContent === 'hidden',
    ) as HTMLButtonElement;
    hiddenChip.click();
    expect(getState().filter).toBe('hidden');
  });

  it('clicking a locator segment filters by quality', () => {
    setState({ snapshots: [snap()] });
    const el = renderCapture();
    const strongSeg = el.querySelector('.loc-seg--strong') as HTMLButtonElement;
    strongSeg.click();
    expect(getState().locatorFilter).toBe('strong');
  });
});

describe('renderInspect', () => {
  it('prompts to pick when nothing is selected', () => {
    const el = renderInspect();
    expect(el.textContent).toMatch(/Pick an element/i);
  });

  it('renders colour, locators and a WCAG contrast note when selected', () => {
    setState({ selected: snap() });
    const el = renderInspect();
    expect(el.querySelector('.color-matrix')).not.toBeNull();
    // black on white → 21:1 → AA pass.
    const contrast = el.querySelector('.contrast');
    expect(contrast?.classList.contains('contrast--ok')).toBe(true);
    expect(el.textContent).toContain('21:1');
  });

  it('flags low contrast as below AA', () => {
    setState({
      selected: snap({
        styles: {
          ...snap().styles,
          color: 'rgb(200, 200, 200)',
          backgroundColor: 'rgb(255, 255, 255)',
        },
      }),
    });
    const el = renderInspect();
    expect(el.querySelector('.contrast--warn')).not.toBeNull();
  });
});

describe('renderForce', () => {
  it('prefills the selected element selector and wires toggles', async () => {
    setState({ selected: snap() });
    const el = renderForce();
    const input = el.querySelector('input.search') as HTMLInputElement;
    expect(input.value).toBe('button.btn');

    const hoverBox = el.querySelector(
      '.force-toggle input',
    ) as HTMLInputElement;
    hoverBox.checked = true;
    hoverBox.dispatchEvent(new Event('change'));
    await flush();
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ type: 'force-state', selector: 'button.btn', state: 'hover', enabled: true }),
    );
  });

  it('ignores a toggle with an empty selector', async () => {
    setState({ selected: null });
    const el = renderForce();
    const box = el.querySelector('.force-toggle input') as HTMLInputElement;
    box.checked = true;
    box.dispatchEvent(new Event('change'));
    await flush();
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
  });
});

describe('renderGhost', () => {
  const ghost: GhostNode = {
    nodeId: 'g1',
    tag: 'div',
    cssSelector: '#modal',
    reason: 'display-none',
    text: 'Hidden modal',
    revealed: false,
  };

  it('shows an empty prompt with no ghosts', () => {
    const el = renderGhost();
    expect(el.querySelector('.empty')).not.toBeNull();
  });

  it('lists ghosts and toggles reveal state + sends a command', async () => {
    setState({ ghosts: [ghost] });
    const el = renderGhost();
    expect(el.querySelectorAll('.ghost-row').length).toBe(1);
    expect(el.textContent).toContain('display:none');

    const eye = el.querySelector('.eye') as HTMLButtonElement;
    eye.click();
    expect(getState().ghosts[0]!.revealed).toBe(true);
    await flush();
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ type: 'reveal-ghost', nodeId: 'g1', revealed: true }),
    );
  });
});

describe('renderMutations', () => {
  it('shows the idle prompt when not logging', () => {
    const el = renderMutations();
    expect(el.textContent).toMatch(/Start logging/i);
  });

  it('renders entries newest-first when present', () => {
    const entries: MutationEntry[] = [
      { id: 'm1', kind: 'added', target: 'div#a', detail: '+div', at: 1 },
      { id: 'm2', kind: 'removed', target: 'span#b', detail: '-span', at: 2 },
    ];
    setState({ mutations: entries, mutationLogOn: true });
    const el = renderMutations();
    const rows = el.querySelectorAll('.mut');
    expect(rows.length).toBe(2);
    // newest (m2) first
    expect(rows[0]!.textContent).toContain('removed');
  });
});
