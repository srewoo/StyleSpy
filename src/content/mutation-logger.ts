/**
 * Mutation tracker. Streams a throttled feed of DOM changes to the panel and,
 * when "break on mutation" is armed, freezes the page the instant a node is
 * added (e.g. a dropdown/popup opening) so its raw structure can be inspected.
 */
import type { MutationEntry } from '../types';
import { emit } from './emitter';
import { freeze } from './freeze';

const FLUSH_MS = 400;
const MAX_BATCH = 50;

let observer: MutationObserver | null = null;
let breakArmed = false;
let counter = 0;
let pending: MutationEntry[] = [];
let flushTimer: number | null = null;

/**
 * A cheap, allocation-light descriptor for a mutated node: `tag#id.class`.
 * This runs inside the MutationObserver callback — potentially hundreds of
 * times per second on a chatty SPA — so it must stay O(1). It deliberately
 * does NOT call `buildCssSelector`, whose per-ancestor `querySelectorAll`
 * uniqueness probes are O(page) and would dominate the hot path. The feed is a
 * human-readable activity log, not a list of resolvable locators.
 */
function shortTarget(node: Node): string {
  if (node.nodeType !== Node.ELEMENT_NODE) return node.nodeName.toLowerCase();
  const el = node as Element;
  let label = el.tagName.toLowerCase();
  if (el.id) label += `#${el.id}`;
  const first = el.classList[0];
  if (first) label += `.${first}`;
  return label;
}

function push(
  kind: MutationEntry['kind'],
  target: string,
  detail: string,
): void {
  pending.push({
    id: `m-${(counter += 1)}`,
    kind,
    target,
    detail,
    at: Date.now(),
  });
  if (pending.length >= MAX_BATCH) flush();
}

function flush(): void {
  if (flushTimer !== null) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (pending.length === 0) return;
  emit({ type: 'mutation-batch', entries: pending });
  pending = [];
}

function scheduleFlush(): void {
  if (flushTimer === null) flushTimer = window.setTimeout(flush, FLUSH_MS);
}

function handle(records: MutationRecord[]): void {
  for (const rec of records) {
    if (rec.type === 'childList') {
      rec.addedNodes.forEach((n) => {
        if (n.nodeType === Node.ELEMENT_NODE) {
          push(
            'added',
            shortTarget(n),
            `+${(n as Element).tagName.toLowerCase()}`,
          );
          if (breakArmed) {
            breakArmed = false;
            push('added', shortTarget(n), 'BROKE on mutation → frozen');
            flush();
            freeze();
          }
        }
      });
      rec.removedNodes.forEach((n) => {
        if (n.nodeType === Node.ELEMENT_NODE)
          push(
            'removed',
            shortTarget(n),
            `-${(n as Element).tagName.toLowerCase()}`,
          );
      });
    } else if (rec.type === 'attributes') {
      push(
        'attributes',
        shortTarget(rec.target),
        `@${rec.attributeName ?? '?'}`,
      );
    } else if (rec.type === 'characterData') {
      push(
        'text',
        shortTarget(rec.target.parentNode ?? rec.target),
        'text changed',
      );
    }
  }
  scheduleFlush();
}

/** Start streaming mutations to the panel. */
export function startMutationLog(): void {
  if (observer) return;
  observer = new MutationObserver(handle);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });
}

/** Stop streaming and flush any buffered entries. */
export function stopMutationLog(): void {
  observer?.disconnect();
  observer = null;
  breakArmed = false;
  flush();
}

/** Arm/disarm break-on-mutation. Auto-starts the observer when arming. */
export function setBreakOnMutation(armed: boolean): void {
  breakArmed = armed;
  if (armed) startMutationLog();
}
