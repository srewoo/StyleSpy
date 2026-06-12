/**
 * Ghost DOM engine: surface elements hidden via CSS (display:none,
 * visibility:hidden, opacity:0, zero-size) so testers can inspect closed
 * modals, un-triggered dropdowns, tracking pixels and SR-only text — and
 * temporarily force-reveal any of them.
 */
import type { GhostNode, VisibilityState } from '../types';
import { classifyVisibility, directText } from '../lib/computed-styles';
import { buildCssSelector } from '../lib/selector';

const HIDDEN_REASONS: ReadonlySet<VisibilityState> = new Set([
  'display-none',
  'visibility-hidden',
  'opacity-zero',
  'zero-size',
]);

const REVEAL_STYLE_ID = 'stylespy-reveal-style';
let counter = 0;

/** Map ghost ids → live elements, plus their reveal state. */
const ghostElements = new Map<string, Element>();
const revealed = new Set<string>();

function visibilityOf(el: Element): VisibilityState {
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return classifyVisibility({
    display: style.display,
    visibility: style.visibility,
    opacity: style.opacity,
    width: rect.width,
    height: rect.height,
    inViewport: true, // off-screen ≠ hidden for the ghost list
  });
}

/** Scan the page for hidden elements. Caps output to keep the UI responsive. */
export function listGhosts(limit = 500): GhostNode[] {
  ghostElements.clear();
  const out: GhostNode[] = [];
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
    if (el.id === 'stylespy-overlay') continue;
    const reason = visibilityOf(el);
    if (!HIDDEN_REASONS.has(reason)) continue;
    const nodeId = `ghost-${(counter += 1)}`;
    ghostElements.set(nodeId, el);
    out.push({
      nodeId,
      tag: el.tagName.toLowerCase(),
      cssSelector: buildCssSelector(el),
      reason,
      text: directText(el, 60),
      revealed: revealed.has(nodeId),
    });
    if (out.length >= limit) break;
  }
  return out;
}

function ensureRevealSheet(): CSSStyleSheet {
  let style = document.getElementById(REVEAL_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = REVEAL_STYLE_ID;
    document.documentElement.appendChild(style);
  }
  return style.sheet as CSSStyleSheet;
}

const REVEAL_ATTR = 'data-stylespy-reveal';

/** Force-reveal (or re-hide) a single ghost node. Returns success. */
export function revealGhost(nodeId: string, show: boolean): boolean {
  const el = ghostElements.get(nodeId);
  if (!el) return false;

  if (show) {
    el.setAttribute(REVEAL_ATTR, '1');
    revealed.add(nodeId);
    const sheet = ensureRevealSheet();
    // Insert the override rule once.
    if (sheet.cssRules.length === 0) {
      sheet.insertRule(
        `[${REVEAL_ATTR}] {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          outline: 2px dashed #c2603f !important;
          outline-offset: 2px;
        }`,
        0,
      );
    }
  } else {
    el.removeAttribute(REVEAL_ATTR);
    revealed.delete(nodeId);
  }
  return true;
}

/** Re-hide everything revealed this session. */
export function clearReveals(): void {
  for (const id of revealed) ghostElements.get(id)?.removeAttribute(REVEAL_ATTR);
  revealed.clear();
}
