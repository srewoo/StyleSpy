/**
 * Locator quality audit — grade how automatable each element's locator is, so
 * QA can see at a glance how much of a page is safely targetable.
 *
 *  - strong:   data-testid/test/qa/mt-id, or a unique id → stable across changes
 *  - moderate: a meaningful, human-authored class or short structural selector
 *  - weak:     deep positional XPath (…/div[1]/div[1]/a[1]) or framework/hashed
 *              utility classes only (e.g. div.MuiContainer-root) → brittle
 */
import type { ElementIdentity, ElementSnapshot, VisibilityState } from '../types';

export type LocatorQuality = 'strong' | 'moderate' | 'weak';

/** Visibility states that count as "rendered" (not hidden by CSS). */
const HIDDEN: ReadonlySet<VisibilityState> = new Set([
  'display-none',
  'visibility-hidden',
  'opacity-zero',
  'zero-size',
]);

/** Tags a user actually interacts with / automates against. */
const INTERACTIVE_TAGS: ReadonlySet<string> = new Set([
  'a', 'button', 'input', 'select', 'textarea', 'summary', 'details', 'option', 'label',
]);

/** ARIA roles that denote an interactive control. */
const INTERACTIVE_ROLES: ReadonlySet<string> = new Set([
  'button', 'link', 'checkbox', 'radio', 'tab', 'menuitem', 'menuitemcheckbox',
  'menuitemradio', 'switch', 'textbox', 'combobox', 'option', 'slider', 'spinbutton',
  'searchbox', 'listbox',
]);

/** True for elements a QA script would target (by tag or ARIA role). */
export function isInteractive(identity: ElementIdentity): boolean {
  if (INTERACTIVE_TAGS.has(identity.tag)) return true;
  return identity.role !== null && INTERACTIVE_ROLES.has(identity.role);
}

/**
 * The audit universe for locator health: elements that are rendered (not
 * hidden) AND interactive — i.e. the things a test would click or type into.
 */
export function isAutomatable(s: ElementSnapshot): boolean {
  return !HIDDEN.has(s.visibility) && isInteractive(s.identity);
}

/** Class names that don't make durable locators (framework / hashed / utility). */
const FRAGILE_CLASS =
  /^(Mui|MuiBox|css-|sc-|jsx-|chakra-|ant-|tw-|_|emotion-)/;

function isFragileClass(cls: string): boolean {
  if (FRAGILE_CLASS.test(cls)) return true;
  if (/[a-f0-9]{6,}/.test(cls)) return true; // hashed fragment
  return cls.length > 24; // overlong generated name
}

/** Count positional `[n]` segments in an XPath. */
function positionalDepth(xpath: string): number {
  return (xpath.match(/\[\d+\]/g) ?? []).length;
}

/** Grade a single element's locator. */
export function classifyLocator(identity: ElementIdentity): LocatorQuality {
  if (identity.testId || identity.id) return 'strong';

  const cssPositional = /:nth-of-type\(/.test(identity.cssSelector);
  const deepXPath = positionalDepth(identity.xpath) >= 3;
  if (cssPositional || deepXPath) return 'weak';

  const classes = identity.classNames;
  const hasMeaningfulClass = classes.some((c) => !isFragileClass(c));
  if (hasMeaningfulClass) return 'moderate';

  // Only fragile/utility classes, or nothing stable to hang a selector on.
  if (classes.length > 0) return 'weak';

  // No classes, no positional indices → a short unique selector (e.g. `nav`).
  return identity.cssSelector.includes('>') ? 'weak' : 'moderate';
}

export interface LocatorSummary {
  readonly total: number;
  readonly strong: number;
  readonly moderate: number;
  readonly weak: number;
  /** Percent (0–100, rounded) of elements with a strong locator. */
  readonly strongPct: number;
}

/** Aggregate locator grades across a capture. */
export function summarizeLocators(
  snapshots: readonly ElementSnapshot[],
): LocatorSummary {
  let strong = 0;
  let moderate = 0;
  let weak = 0;
  for (const s of snapshots) {
    const q = classifyLocator(s.identity);
    if (q === 'strong') strong += 1;
    else if (q === 'moderate') moderate += 1;
    else weak += 1;
  }
  const total = snapshots.length;
  return {
    total,
    strong,
    moderate,
    weak,
    strongPct: total === 0 ? 0 : Math.round((strong / total) * 100),
  };
}
