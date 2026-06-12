import { describe, it, expect } from 'vitest';
import {
  classifyLocator,
  summarizeLocators,
  isInteractive,
  isAutomatable,
} from '../src/lib/locator-quality';
import type { ElementIdentity, ElementSnapshot, VisibilityState } from '../src/types';

function id(p: Partial<ElementIdentity> = {}): ElementIdentity {
  return {
    tag: 'div',
    id: null,
    classNames: [],
    cssSelector: 'div',
    xpath: '//div[1]',
    testId: null,
    ariaLabel: null,
    role: null,
    ...p,
  };
}

describe('classifyLocator', () => {
  it('grades data-testid as strong', () => {
    expect(classifyLocator(id({ testId: 'go', cssSelector: '[data-testid="go"]' }))).toBe('strong');
  });

  it('grades a unique id as strong', () => {
    expect(classifyLocator(id({ id: 'root', cssSelector: '#root' }))).toBe('strong');
  });

  it('grades a deep positional XPath as weak', () => {
    expect(
      classifyLocator(
        id({ xpath: "//*[@id='root']/div[1]/div[1]/div[1]/div[1]/a[1]/img[1]" }),
      ),
    ).toBe('weak');
  });

  it('grades :nth-of-type structural selectors as weak', () => {
    expect(classifyLocator(id({ cssSelector: 'ul > li:nth-of-type(3)' }))).toBe('weak');
  });

  it('grades framework/utility-only classes as weak', () => {
    expect(
      classifyLocator(
        id({
          classNames: ['MuiContainer-root', 'MuiContainer-maxWidthXl'],
          cssSelector: 'div.MuiContainer-root.MuiContainer-maxWidthXl',
        }),
      ),
    ).toBe('weak');
  });

  it('grades a meaningful class as moderate', () => {
    expect(
      classifyLocator(id({ classNames: ['hero-cta'], cssSelector: 'a.hero-cta' })),
    ).toBe('moderate');
  });

  it('treats hashed css-module classes as weak', () => {
    expect(
      classifyLocator(id({ classNames: ['css-1a2b3c'], cssSelector: 'span.css-1a2b3c' })),
    ).toBe('weak');
  });
});

describe('isInteractive', () => {
  it('recognises interactive tags', () => {
    expect(isInteractive(id({ tag: 'button' }))).toBe(true);
    expect(isInteractive(id({ tag: 'a' }))).toBe(true);
    expect(isInteractive(id({ tag: 'input' }))).toBe(true);
  });
  it('recognises interactive ARIA roles', () => {
    expect(isInteractive(id({ tag: 'div', role: 'button' }))).toBe(true);
    expect(isInteractive(id({ tag: 'span', role: 'checkbox' }))).toBe(true);
  });
  it('rejects non-interactive elements', () => {
    expect(isInteractive(id({ tag: 'div' }))).toBe(false);
    expect(isInteractive(id({ tag: 'p', role: 'presentation' }))).toBe(false);
  });
});

describe('isAutomatable', () => {
  const mk = (tag: string, visibility: VisibilityState): ElementSnapshot =>
    ({ identity: id({ tag }), visibility }) as ElementSnapshot;

  it('is true for a rendered interactive element', () => {
    expect(isAutomatable(mk('button', 'visible'))).toBe(true);
    expect(isAutomatable(mk('button', 'offscreen'))).toBe(true);
  });
  it('is false for a hidden interactive element', () => {
    expect(isAutomatable(mk('button', 'display-none'))).toBe(false);
  });
  it('is false for a visible non-interactive element', () => {
    expect(isAutomatable(mk('div', 'visible'))).toBe(false);
  });
});

describe('summarizeLocators', () => {
  const mk = (identity: ElementIdentity): ElementSnapshot =>
    ({ identity }) as ElementSnapshot;

  it('counts each grade and computes strong percentage', () => {
    const snaps = [
      mk(id({ testId: 'a' })),
      mk(id({ id: 'b' })),
      mk(id({ classNames: ['nice-class'], cssSelector: '.nice-class' })),
      mk(id({ xpath: '/html/body/div[1]/div[1]/div[1]/span[1]' })),
    ];
    const s = summarizeLocators(snaps);
    expect(s.total).toBe(4);
    expect(s.strong).toBe(2);
    expect(s.moderate).toBe(1);
    expect(s.weak).toBe(1);
    expect(s.strongPct).toBe(50);
  });

  it('handles an empty capture', () => {
    expect(summarizeLocators([])).toEqual({ total: 0, strong: 0, moderate: 0, weak: 0, strongPct: 0 });
  });
});
