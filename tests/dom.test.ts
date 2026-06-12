import { describe, it, expect, vi } from 'vitest';
import { h, clear } from '../src/ui/dom';

describe('h (hyperscript helper)', () => {
  it('sets class, text, title', () => {
    const el = h('div', { class: 'a b', text: 'hi', title: 'tip' });
    expect(el.className).toBe('a b');
    expect(el.textContent).toBe('hi');
    expect(el.title).toBe('tip');
  });

  it('treats text as text, never markup (XSS-safe)', () => {
    const el = h('span', { text: '<img src=x onerror=alert(1)>' });
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('<img');
  });

  it('applies attrs, dataset, and style', () => {
    const el = h('a', {
      attrs: { href: '#x' },
      dataset: { role: 'tab' },
      style: { color: 'red' },
    });
    expect(el.getAttribute('href')).toBe('#x');
    expect(el.dataset.role).toBe('tab');
    expect(el.style.color).toBe('red');
  });

  it('wires event listeners', () => {
    const onClick = vi.fn();
    const el = h('button', { on: { click: onClick } });
    el.dispatchEvent(new Event('click'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('appends node and string children, skipping null/false/undefined', () => {
    const el = h(
      'div',
      {},
      h('span', { text: 'x' }),
      'text',
      null,
      false,
      undefined,
    );
    expect(el.childNodes).toHaveLength(2);
    expect(el.textContent).toBe('xtext');
  });
});

describe('clear', () => {
  it('removes all children', () => {
    const el = h('div', {}, h('span'), h('span'), 'txt');
    clear(el);
    expect(el.childNodes).toHaveLength(0);
  });
});
