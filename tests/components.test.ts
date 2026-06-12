import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  swatch,
  colorValue,
  propRow,
  chip,
  locatorRow,
  copyButton,
} from '../src/ui/components';

describe('swatch', () => {
  it('marks transparent colours with a modifier class', () => {
    const t = swatch('rgba(0,0,0,0)');
    expect(t.classList.contains('swatch--transparent')).toBe(true);
    expect(t.style.background).toBe('');
  });

  it('paints an opaque colour as the background', () => {
    const s = swatch('rgb(10, 20, 30)');
    expect(s.classList.contains('swatch--transparent')).toBe(false);
    expect(s.style.background).toContain('rgb(10, 20, 30)');
  });
});

describe('colorValue', () => {
  it('renders a swatch + hex code', () => {
    const el = colorValue('rgb(255, 0, 0)');
    expect(el.querySelector('.swatch')).not.toBeNull();
    expect(el.querySelector('code')?.textContent).toBe('#FF0000');
  });
});

describe('propRow', () => {
  it('renders a string value', () => {
    const el = propRow('Font', '16px');
    expect(el.querySelector('.prop__label')?.textContent).toBe('Font');
    expect(el.querySelector('.prop__value')?.textContent).toBe('16px');
  });

  it('renders a node value', () => {
    const node = swatch('rgb(1,2,3)');
    const el = propRow('Color', node);
    expect(el.querySelector('.prop__value .swatch')).not.toBeNull();
  });
});

describe('chip', () => {
  it('reflects active state and fires onClick', () => {
    const fn = vi.fn();
    const c = chip('All', true, fn);
    expect(c.className).toContain('chip--active');
    c.dispatchEvent(new Event('click'));
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe('locatorRow', () => {
  it('shows kind, value, and a copy button', () => {
    const el = locatorRow('CSS', '.btn');
    expect(el.querySelector('.locator__kind')?.textContent).toBe('CSS');
    expect(el.querySelector('.locator__value')?.textContent).toBe('.btn');
    expect(el.querySelector('.copy-btn')).not.toBeNull();
  });
});

describe('copyButton', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn(async () => undefined) },
      configurable: true,
    });
  });
  afterEach(() => vi.useRealTimers());

  it('flashes "copied" then reverts', async () => {
    const btn = copyButton(() => 'payload', 'copy');
    btn.dispatchEvent(new Event('click'));
    await vi.advanceTimersByTimeAsync(0); // let the async click handler settle
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('payload');
    expect(btn.textContent).toBe('copied');
    expect(btn.classList.contains('copy-btn--ok')).toBe(true);
    await vi.advanceTimersByTimeAsync(1100);
    expect(btn.textContent).toBe('copy');
    expect(btn.classList.contains('copy-btn--ok')).toBe(false);
  });

  it('shows "failed" when the clipboard rejects', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn(async () => {
          throw new Error('denied');
        }),
      },
      configurable: true,
    });
    const btn = copyButton(() => 'x');
    btn.dispatchEvent(new Event('click'));
    await vi.advanceTimersByTimeAsync(0);
    expect(btn.textContent).toBe('failed');
  });
});
