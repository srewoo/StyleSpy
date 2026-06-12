/**
 * Translate a live element + its computed style into the plain data shapes the
 * UI consumes (StyleMap, ElementIdentity, VisibilityState). The visibility
 * logic is split into a pure helper so it can be unit-tested without a layout
 * engine (jsdom has no real box model).
 */
import type { StyleMap, ElementIdentity, VisibilityState } from '../types';
import { buildCssSelector } from './selector';
import { buildXPath } from './xpath';

/** The minimal box/style facts needed to classify visibility. */
export interface VisibilityInput {
  readonly display: string;
  readonly visibility: string;
  readonly opacity: string;
  readonly width: number;
  readonly height: number;
  readonly inViewport: boolean;
}

/** Pure visibility classifier — see {@link VisibilityState}. */
export function classifyVisibility(input: VisibilityInput): VisibilityState {
  if (input.display === 'none') return 'display-none';
  if (input.visibility === 'hidden' || input.visibility === 'collapse')
    return 'visibility-hidden';
  if (Number(input.opacity) === 0) return 'opacity-zero';
  if (input.width === 0 || input.height === 0) return 'zero-size';
  if (!input.inViewport) return 'offscreen';
  return 'visible';
}

/** Read the StyleMap fields off a computed-style declaration. */
export function extractStyleMap(style: CSSStyleDeclaration): StyleMap {
  return {
    color: style.color,
    backgroundColor: style.backgroundColor,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    textAlign: style.textAlign,
    textDecoration: style.textDecorationLine || style.textDecoration,
    textTransform: style.textTransform,
    padding: style.padding,
    margin: style.margin,
    border: style.border || style.borderWidth,
    borderRadius: style.borderRadius,
    boxShadow: style.boxShadow,
    opacity: style.opacity,
    display: style.display,
  };
}

/** Direct (non-descendant) text of an element, trimmed and collapsed. */
export function directText(el: Element, maxLen = 120): string {
  let text = '';
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) text += node.textContent ?? '';
  }
  text = text.replace(/\s+/g, ' ').trim();
  // Fall back to a label/alt/value for control-like elements with no text node.
  if (!text) {
    const el2 = el as HTMLElement & { value?: string; alt?: string };
    text = (
      el.getAttribute('aria-label') ||
      el.getAttribute('alt') ||
      el.getAttribute('placeholder') ||
      el2.value ||
      ''
    )
      .replace(/\s+/g, ' ')
      .trim();
  }
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}

/** Build the stable identity record (selectors + metadata) for an element. */
export function buildIdentity(el: Element): ElementIdentity {
  return {
    tag: el.tagName.toLowerCase(),
    id: el.id || null,
    classNames: Array.from(el.classList),
    cssSelector: buildCssSelector(el),
    xpath: buildXPath(el),
    testId:
      el.getAttribute('data-testid') ||
      el.getAttribute('data-test') ||
      el.getAttribute('data-qa') ||
      el.getAttribute('data-mt-id'),
    ariaLabel: el.getAttribute('aria-label'),
    role: el.getAttribute('role'),
  };
}
