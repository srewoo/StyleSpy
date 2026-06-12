/**
 * Mutation feed tests. Focus on the hot-path target descriptor: it must be the
 * cheap `tag#id.class` form (no O(page) querySelectorAll probing inside the
 * observer callback).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { EventMessage } from '../src/lib/messages';
import type { MutationEntry } from '../src/types';
import { setEmitter } from '../src/content/emitter';
import {
  startMutationLog,
  stopMutationLog,
} from '../src/content/mutation-logger';

let emitted: MutationEntry[];

beforeEach(() => {
  vi.useFakeTimers();
  emitted = [];
  setEmitter((msg: EventMessage) => {
    if (msg.type === 'mutation-batch') emitted.push(...msg.entries);
  });
  document.body.innerHTML = '';
});

afterEach(() => {
  stopMutationLog();
  setEmitter(() => {});
  vi.useRealTimers();
});

/** MutationObserver callbacks are microtask-scheduled; let them run. */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('mutation-logger target descriptor', () => {
  it('describes an added node as tag#id.class', async () => {
    startMutationLog();
    const el = document.createElement('div');
    el.id = 'panel';
    el.className = 'card highlighted';
    document.body.appendChild(el);

    await settle();
    stopMutationLog(); // flushes synchronously

    const added = emitted.find((e) => e.kind === 'added');
    expect(added?.target).toBe('div#panel.card');
  });

  it('falls back to the bare tag when there is no id/class', async () => {
    startMutationLog();
    document.body.appendChild(document.createElement('section'));

    await settle();
    stopMutationLog();

    const added = emitted.find((e) => e.kind === 'added');
    expect(added?.target).toBe('section');
  });
});
