/**
 * Integration tests for the content-script engines, exercised against jsdom.
 * These complement the pure-lib unit tests by driving the real DOM-reading
 * code paths (snapshotting, ghost discovery, forced-state harvesting).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { snapshotElement, capturePage } from '../src/content/inspect';
import { listGhosts, revealGhost, clearReveals } from '../src/content/ghost-dom';
import {
  collectStateDeclarations,
  setForcedState,
  clearAllForcedStates,
} from '../src/content/force-state';

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  clearReveals();
  clearAllForcedStates();
});

describe('inspect.snapshotElement', () => {
  it('captures identity and computed styles', () => {
    document.body.innerHTML =
      '<button class="btn" data-testid="go" style="color: rgb(47,125,114)">Go</button>';
    const snap = snapshotElement(document.querySelector('button')!);
    expect(snap).not.toBeNull();
    expect(snap!.identity.tag).toBe('button');
    expect(snap!.identity.testId).toBe('go');
    expect(snap!.text).toBe('Go');
    expect(snap!.styles.color).toBe('rgb(47, 125, 114)');
    expect(snap!.state).toBe('base');
  });

  it('returns null for excluded tags', () => {
    document.body.innerHTML = '<script>var x = 1;</script>';
    expect(snapshotElement(document.querySelector('script')!)).toBeNull();
  });

  it('records the captured state', () => {
    document.body.innerHTML = '<a href="#">link</a>';
    const snap = snapshotElement(document.querySelector('a')!, 'hover');
    expect(snap!.state).toBe('hover');
  });
});

describe('inspect.capturePage', () => {
  it('captures only text-bearing elements in text scope', async () => {
    document.body.innerHTML = '<div><p>hello</p><span></span></div>';
    const snaps = await capturePage('text');
    const tags = snaps.map((s) => s.identity.tag);
    expect(tags).toContain('p');
    expect(tags).not.toContain('span');
  });

  it('captures interactive elements in interactive scope', async () => {
    document.body.innerHTML = '<p>text</p><button>x</button><a href="#">y</a>';
    const snaps = await capturePage('interactive');
    const tags = snaps.map((s) => s.identity.tag);
    expect(tags).toContain('button');
    expect(tags).toContain('a');
    expect(tags).not.toContain('p');
  });

  it('reports progress and reaches the total', async () => {
    document.body.innerHTML = '<p>a</p><p>b</p><p>c</p>';
    let lastDone = 0;
    let reportedTotal = 0;
    await capturePage('text', (done, total) => {
      lastDone = done;
      reportedTotal = total;
    });
    expect(lastDone).toBe(reportedTotal);
    expect(reportedTotal).toBeGreaterThan(0);
  });
});

describe('ghost-dom', () => {
  it('finds elements hidden via inline display:none', () => {
    document.body.innerHTML =
      '<div id="modal" style="display:none">Hidden modal</div><p>Visible</p>';
    const ghosts = listGhosts();
    const modal = ghosts.find((g) => g.text === 'Hidden modal');
    expect(modal).toBeDefined();
    expect(modal!.reason).toBe('display-none');
  });

  it('force-reveals and re-hides a ghost node', () => {
    document.body.innerHTML = '<div style="visibility:hidden">Tip</div>';
    const ghosts = listGhosts();
    const id = ghosts[0]!.nodeId;
    expect(revealGhost(id, true)).toBe(true);
    expect(document.querySelector('[data-stylespy-reveal]')).not.toBeNull();
    revealGhost(id, false);
    expect(document.querySelector('[data-stylespy-reveal]')).toBeNull();
  });
});

describe('force-state', () => {
  it('harvests :hover declarations from a stylesheet', () => {
    document.head.innerHTML =
      '<style>.btn:hover { color: rgb(1, 2, 3); font-weight: 700; }</style>';
    document.body.innerHTML = '<button class="btn">x</button>';
    const decls = collectStateDeclarations(document.querySelector('button')!, 'hover');
    expect(decls.get('color')).toBe('rgb(1, 2, 3)');
    expect(decls.get('font-weight')).toBe('700');
  });

  it('applies and restores forced inline styles', () => {
    document.head.innerHTML = '<style>.btn:hover { color: rgb(9, 9, 9); }</style>';
    document.body.innerHTML = '<button class="btn" style="color: rgb(0,0,0)">x</button>';
    const btn = document.querySelector('button') as HTMLButtonElement;

    const count = setForcedState('.btn', 'hover', true);
    expect(count).toBe(1);
    expect(btn.style.getPropertyValue('color')).toBe('rgb(9, 9, 9)');

    setForcedState('.btn', 'hover', false);
    expect(btn.style.getPropertyValue('color')).toBe('rgb(0, 0, 0)');
  });

  it('ignores invalid selectors gracefully', () => {
    expect(setForcedState(':::bad', 'hover', true)).toBe(0);
  });
});
