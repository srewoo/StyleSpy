/**
 * Unit tests for the Freeze engine (jsdom). Covers the deterministic bits:
 * the pause stylesheet, frozen state reporting, snapshot emission, and the
 * countdown timer (with fake timers). Real hover capture is covered by the
 * Playwright E2E (jsdom has no pointer/layout engine).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setEmitter } from '../src/content/emitter';
import { freeze, unfreeze, countdownFreeze, isFrozen } from '../src/content/freeze';
import type { EventMessage } from '../src/lib/messages';

const FREEZE_STYLE = 'stylespy-freeze-style';
let events: EventMessage[] = [];

function find<T extends EventMessage['type']>(
  type: T,
): Extract<EventMessage, { type: T }> | undefined {
  return events.find((e): e is Extract<EventMessage, { type: T }> => e.type === type);
}

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  document.getElementById(FREEZE_STYLE)?.remove();
  setEmitter((m) => events.push(m));
  unfreeze(); // reset any state from a previous test
  events = [];
});

describe('freeze / unfreeze', () => {
  it('injects a pause stylesheet and reports frozen', () => {
    freeze();
    expect(isFrozen()).toBe(true);
    const style = document.getElementById(FREEZE_STYLE);
    expect(style).not.toBeNull();
    expect(style!.textContent).toContain('animation-play-state: paused');
    expect(find('freeze-changed')?.frozen).toBe(true);
  });

  it('captures the active element as a hover-state snapshot', () => {
    document.body.innerHTML = '<button>Save</button>';
    (document.querySelector('button') as HTMLButtonElement).focus();
    freeze();
    const inspected = find('element-inspected');
    expect(inspected).toBeDefined();
    expect(inspected!.snapshot.state).toBe('hover');
    expect(inspected!.snapshot.identity.tag).toBe('button');
  });

  it('unfreeze removes the stylesheet and reports not frozen', () => {
    freeze();
    events = [];
    unfreeze();
    expect(isFrozen()).toBe(false);
    expect(document.getElementById(FREEZE_STYLE)).toBeNull();
    expect(find('freeze-changed')?.frozen).toBe(false);
  });

  it('does not stack multiple pause stylesheets', () => {
    freeze();
    freeze();
    expect(document.querySelectorAll(`#${FREEZE_STYLE}`)).toHaveLength(1);
  });
});

describe('countdownFreeze', () => {
  it('freezes only after the delay elapses', () => {
    vi.useFakeTimers();
    try {
      countdownFreeze(3);
      expect(isFrozen()).toBe(false);
      vi.advanceTimersByTime(2999);
      expect(isFrozen()).toBe(false);
      vi.advanceTimersByTime(1);
      expect(isFrozen()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('can be cancelled by unfreeze before it fires', () => {
    vi.useFakeTimers();
    try {
      countdownFreeze(3);
      unfreeze();
      vi.advanceTimersByTime(5000);
      expect(isFrozen()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
