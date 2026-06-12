/**
 * Inspection core: turn a live element into an {@link ElementSnapshot}, and
 * scan the page into a list of them. Everything here reads the real DOM /
 * layout; the pure transforms it leans on live in `src/lib`.
 */
import type { ElementSnapshot, ElementState } from '../types';
import type { CaptureScope } from '../lib/messages';
import {
  extractStyleMap,
  classifyVisibility,
  buildIdentity,
  directText,
} from '../lib/computed-styles';

/** Tags that never carry user-facing style worth capturing. */
const EXCLUDED = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEMPLATE',
  'META',
  'LINK',
  'HEAD',
  'TITLE',
  'BASE',
]);

const INTERACTIVE =
  'a, button, input, select, textarea, label, summary, [role], [tabindex], [onclick], img, svg';

let counter = 0;
const nextId = (): string => `ss-${(counter += 1)}`;

/**
 * Maps the most-recently-captured snapshots back to their live elements.
 * Populated ONLY by {@link capturePage} (and reset at the start of each
 * capture). Single-element snapshots from the picker/freeze deliberately do
 * NOT register here — lock-target mode snapshots on every `mousemove`, and
 * registering each would grow this map without bound and pin detached nodes.
 */
export const snapshotElements = new Map<string, Element>();

function isInViewport(rect: DOMRect): boolean {
  return (
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  );
}

/**
 * Capture one element's full snapshot in a given interaction state. Returns
 * null for excluded tags (script/style/etc.).
 */
export function snapshotElement(
  el: Element,
  state: ElementState = 'base',
): ElementSnapshot | null {
  if (EXCLUDED.has(el.tagName)) return null;

  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const id = nextId();

  return {
    snapshotId: id,
    text: directText(el),
    identity: buildIdentity(el),
    styles: extractStyleMap(style),
    visibility: classifyVisibility({
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      width: rect.width,
      height: rect.height,
      inViewport: isInViewport(rect),
    }),
    state,
    capturedAt: Date.now(),
  };
}

function candidatesFor(scope: CaptureScope): Element[] {
  if (scope === 'interactive') {
    return Array.from(document.querySelectorAll(INTERACTIVE));
  }
  const all = Array.from(document.querySelectorAll<HTMLElement>('body *'));
  if (scope === 'text') {
    return all.filter((el) => directText(el).length > 0);
  }
  return all; // 'all'
}

/** Elements processed per animation frame, to keep the page responsive. */
const BATCH_SIZE = 150;

/**
 * Scan the page and return a snapshot per matching element. Processes elements
 * in rAF-spaced batches so a large page doesn't lock the main thread, and
 * reports progress through the optional callback. Resets the element map so
 * stale entries don't accumulate across captures.
 */
export function capturePage(
  scope: CaptureScope,
  onProgress?: (done: number, total: number) => void,
): Promise<ElementSnapshot[]> {
  snapshotElements.clear();
  const candidates = candidatesFor(scope);
  const total = candidates.length;
  const out: ElementSnapshot[] = [];

  return new Promise((resolve) => {
    let index = 0;
    const step = (): void => {
      const end = Math.min(index + BATCH_SIZE, total);
      for (; index < end; index += 1) {
        const el = candidates[index]!;
        const snap = snapshotElement(el);
        if (snap) {
          snapshotElements.set(snap.snapshotId, el);
          out.push(snap);
        }
      }
      onProgress?.(index, total);
      if (index < total) requestAnimationFrame(step);
      else resolve(out);
    };
    if (total === 0) resolve(out);
    else requestAnimationFrame(step);
  });
}
