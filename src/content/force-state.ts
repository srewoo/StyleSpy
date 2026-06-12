/**
 * Force interaction states (:hover / :focus / :active) without a real pointer.
 *
 * The browser exposes no content-script API to toggle native pseudo-states, so
 * we do what works for CSS-driven states: scan the page's own stylesheets for
 * rules targeting `:state`, then re-apply those declarations as `!important`
 * inline styles on the matching elements. Restores cleanly on disable.
 */
import type { ElementState } from '../types';

/** Original inline cssText per element so a forced state can be undone. */
const originalInline = new WeakMap<Element, string>();
/** Elements currently forced, keyed by state, so we can clear by state. */
const forced: Record<ElementState, Set<Element>> = {
  base: new Set(),
  hover: new Set(),
  focus: new Set(),
  active: new Set(),
};

// Non-global on purpose: these are reused across many `.test()` calls, and a
// global regex would advance `lastIndex` between calls and intermittently
// false-negative. The strip step below builds its own global variant.
const PSEUDO: Record<Exclude<ElementState, 'base'>, RegExp> = {
  hover: /:hover\b/i,
  focus: /:focus(-visible|-within)?\b/i,
  active: /:active\b/i,
};

const FORCEABLE_STATES: ReadonlyArray<Exclude<ElementState, 'base'>> = [
  'hover',
  'focus',
  'active',
];

/**
 * Collect CSS declarations the page would apply to `el` in `state`, by reading
 * every same-origin stylesheet. Cross-origin sheets are skipped (their
 * `cssRules` access throws). Returns prop→value pairs, later rules winning.
 */
export function collectStateDeclarations(
  el: Element,
  state: Exclude<ElementState, 'base'>,
): Map<string, string> {
  const decls = new Map<string, string>();
  const pseudo = PSEUDO[state];

  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin — not readable
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSStyleRule)) continue;
      if (!pseudo.test(rule.selectorText)) continue;
      // Strip the pseudo so we can test whether this element is the subject.
      // A fresh global regex handles selectors that mention the pseudo more
      // than once (e.g. `.a:hover .b:hover`) without sharing `lastIndex`.
      const stripped = rule.selectorText
        .replace(new RegExp(pseudo.source, 'gi'), '')
        .trim();
      if (!stripped) continue;
      let matches = false;
      try {
        matches = el.matches(stripped);
      } catch {
        matches = false;
      }
      if (!matches) continue;
      for (let i = 0; i < rule.style.length; i += 1) {
        // Index access returns the property name in both browsers and jsdom
        // (jsdom's CSSStyleDeclaration has no `.item()`).
        const prop = rule.style[i];
        if (prop) decls.set(prop, rule.style.getPropertyValue(prop));
      }
    }
  }
  return decls;
}

function applyToElement(
  el: Element,
  state: Exclude<ElementState, 'base'>,
): void {
  const html = el as HTMLElement;
  if (!originalInline.has(el)) originalInline.set(el, html.style.cssText);
  const decls = collectStateDeclarations(el, state);
  for (const [prop, value] of decls) {
    html.style.setProperty(prop, value, 'important');
  }
  forced[state].add(el);
}

/**
 * Re-derive an element's inline style from its saved original plus whatever
 * forced states are *still* active on it. Called after a state is removed so
 * that clearing one state (e.g. hover) doesn't also wipe another that is still
 * forced (e.g. focus). When no states remain, the original is restored and the
 * bookkeeping entry dropped.
 */
function refreshElement(el: Element): void {
  const html = el as HTMLElement;
  const original = originalInline.get(el);
  if (original === undefined) return;

  html.style.cssText = original;

  let stillForced = false;
  for (const state of FORCEABLE_STATES) {
    if (!forced[state].has(el)) continue;
    stillForced = true;
    const decls = collectStateDeclarations(el, state);
    for (const [prop, value] of decls) {
      html.style.setProperty(prop, value, 'important');
    }
  }

  if (!stillForced) originalInline.delete(el);
}

/**
 * Enable or disable a forced state for every element matching `selector`.
 * Returns the count of elements affected.
 */
export function setForcedState(
  selector: string,
  state: ElementState,
  enabled: boolean,
): number {
  if (state === 'base') return 0;
  let targets: Element[];
  try {
    targets = Array.from(document.querySelectorAll(selector));
  } catch {
    return 0;
  }
  for (const el of targets) {
    if (enabled) applyToElement(el, state);
    else {
      forced[state].delete(el);
      refreshElement(el);
    }
  }
  return targets.length;
}

/** Force a state on a single known element (used by Freeze for the hover chain). */
export function forceStateOnElement(
  el: Element,
  state: Exclude<ElementState, 'base'>,
): void {
  applyToElement(el, state);
}

/** Clear every forced state across all elements. */
export function clearAllForcedStates(): void {
  // Gather every affected element, then clear all state sets, so the final
  // `refreshElement` sees no remaining states and restores each original once.
  const affected = new Set<Element>();
  for (const state of FORCEABLE_STATES) {
    for (const el of forced[state]) affected.add(el);
    forced[state].clear();
  }
  for (const el of affected) refreshElement(el);
}
