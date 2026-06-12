/**
 * Picker + last-hovered-memory tests. Drives real DOM events in jsdom and
 * asserts on emitted events. initHoverMemory is wired once (module scope) to
 * avoid stacking duplicate document listeners across tests.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { EventMessage } from '../src/lib/messages';
import { setEmitter } from '../src/content/emitter';
import {
  initHoverMemory,
  togglePicker,
  setLockTarget,
  getLastHovered,
} from '../src/content/picker';

let events: EventMessage[] = [];

initHoverMemory(); // once

function moveOver(el: Element): void {
  el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
}

function leaveViewport(): void {
  // relatedTarget null => pointer left the document entirely.
  document.dispatchEvent(
    new MouseEvent('mouseout', { bubbles: true, relatedTarget: null }),
  );
}

beforeEach(() => {
  events = [];
  setEmitter((m) => events.push(m));
  document.body.innerHTML = '<button id="b">Go</button><a id="a">x</a>';
});

afterEach(() => {
  togglePicker(false);
  setLockTarget(false);
  setEmitter(() => {});
});

describe('hover memory', () => {
  it('remembers the last element the pointer touched', () => {
    const btn = document.getElementById('b')!;
    moveOver(btn);
    expect(getLastHovered()).toBe(btn);
  });

  it('does NOT inspect on viewport-leave when picker/lock are off', () => {
    moveOver(document.getElementById('b')!);
    leaveViewport();
    expect(events.some((e) => e.type === 'element-inspected')).toBe(false);
  });

  it('surfaces the last-hovered element on viewport-leave when picker is on', () => {
    togglePicker(true);
    moveOver(document.getElementById('b')!);
    leaveViewport();
    const inspected = events.find((e) => e.type === 'element-inspected');
    expect(inspected).toBeDefined();
  });
});

describe('picker overlay', () => {
  it('emits picker-changed on toggle', () => {
    togglePicker(true);
    expect(events.at(-1)).toMatchObject({ type: 'picker-changed', enabled: true });
    togglePicker(false);
    expect(events.at(-1)).toMatchObject({ type: 'picker-changed', enabled: false });
  });

  it('inspects the clicked element while the picker is on', () => {
    togglePicker(true);
    const btn = document.getElementById('b')!;
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const inspected = events.find(
      (e): e is Extract<EventMessage, { type: 'element-inspected' }> =>
        e.type === 'element-inspected',
    );
    expect(inspected?.snapshot.identity.tag).toBe('button');
  });

  it('ignores clicks while the picker is off', () => {
    document
      .getElementById('b')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(events.some((e) => e.type === 'element-inspected')).toBe(false);
  });
});

describe('lock-target mode', () => {
  it('inspects continuously on mousemove', () => {
    setLockTarget(true);
    moveOver(document.getElementById('a')!);
    const inspected = events.find(
      (e): e is Extract<EventMessage, { type: 'element-inspected' }> =>
        e.type === 'element-inspected',
    );
    expect(inspected?.snapshot.identity.tag).toBe('a');
  });
});
