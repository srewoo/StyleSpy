import { describe, it, expect, beforeEach } from 'vitest';
import { buildCssSelector } from '../src/lib/selector';

function setBody(html: string): void {
  document.body.innerHTML = html;
}

describe('buildCssSelector', () => {
  beforeEach(() => setBody(''));

  it('prefers a unique data-testid', () => {
    setBody('<button data-testid="cta-start">Go</button>');
    const el = document.querySelector('button')!;
    expect(buildCssSelector(el)).toBe('button[data-testid="cta-start"]');
  });

  it('uses a unique id', () => {
    setBody('<div id="hero">x</div>');
    const el = document.getElementById('hero')!;
    expect(buildCssSelector(el)).toBe('#hero');
  });

  it('builds a structural path with nth-of-type for siblings', () => {
    setBody('<ul><li>a</li><li class="target">b</li><li>c</li></ul>');
    const el = document.querySelector('.target')!;
    const sel = buildCssSelector(el);
    expect(document.querySelectorAll(sel)).toHaveLength(1);
    expect(document.querySelector(sel)).toBe(el);
  });

  it('ignores hashed css-module class names', () => {
    setBody('<span class="css-1a2b3c title">Hi</span>');
    const el = document.querySelector('span')!;
    expect(buildCssSelector(el)).toContain('.title');
    expect(buildCssSelector(el)).not.toContain('css-1a2b3c');
  });

  it('always resolves back to the original element', () => {
    setBody(`
      <section><div><p>one</p><p>two</p></div></section>
      <section><div><p>three</p></div></section>
    `);
    const target = document.querySelectorAll('p')[1]!;
    const sel = buildCssSelector(target);
    expect(document.querySelector(sel)).toBe(target);
  });
});
