import { describe, it, expect, beforeEach } from 'vitest';
import {
  classifyVisibility,
  directText,
  buildIdentity,
  type VisibilityInput,
} from '../src/lib/computed-styles';

const base: VisibilityInput = {
  display: 'block',
  visibility: 'visible',
  opacity: '1',
  width: 100,
  height: 20,
  inViewport: true,
};

describe('classifyVisibility', () => {
  it('flags display:none first', () => {
    expect(classifyVisibility({ ...base, display: 'none' })).toBe('display-none');
  });
  it('flags visibility:hidden', () => {
    expect(classifyVisibility({ ...base, visibility: 'hidden' })).toBe(
      'visibility-hidden',
    );
  });
  it('flags opacity zero', () => {
    expect(classifyVisibility({ ...base, opacity: '0' })).toBe('opacity-zero');
  });
  it('flags zero-size boxes', () => {
    expect(classifyVisibility({ ...base, height: 0 })).toBe('zero-size');
  });
  it('flags offscreen elements', () => {
    expect(classifyVisibility({ ...base, inViewport: false })).toBe('offscreen');
  });
  it('returns visible for a normal element', () => {
    expect(classifyVisibility(base)).toBe('visible');
  });
});

describe('directText', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('reads direct text and collapses whitespace', () => {
    document.body.innerHTML = '<p>  hello   world  </p>';
    expect(directText(document.querySelector('p')!)).toBe('hello world');
  });

  it('ignores descendant element text', () => {
    document.body.innerHTML = '<p>outer <span>inner</span></p>';
    expect(directText(document.querySelector('p')!)).toBe('outer');
  });

  it('falls back to aria-label when there is no text node', () => {
    document.body.innerHTML = '<button aria-label="Close dialog"></button>';
    expect(directText(document.querySelector('button')!)).toBe('Close dialog');
  });

  it('truncates very long text', () => {
    document.body.innerHTML = `<p>${'x'.repeat(200)}</p>`;
    const out = directText(document.querySelector('p')!, 50);
    expect(out).toHaveLength(50);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('buildIdentity', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('captures tag, classes, testid and role', () => {
    document.body.innerHTML =
      '<button class="btn primary" data-testid="go" role="link" aria-label="Go now">Go</button>';
    const id = buildIdentity(document.querySelector('button')!);
    expect(id.tag).toBe('button');
    expect(id.classNames).toEqual(['btn', 'primary']);
    expect(id.testId).toBe('go');
    expect(id.role).toBe('link');
    expect(id.ariaLabel).toBe('Go now');
    expect(id.cssSelector).toContain('data-testid="go"');
  });
});
