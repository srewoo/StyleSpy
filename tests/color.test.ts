import { describe, it, expect } from 'vitest';
import {
  parseRgb,
  isTransparent,
  toHex,
  contrastRatio,
  relativeLuminance,
} from '../src/lib/color';

describe('parseRgb', () => {
  it('parses rgb() with no alpha as opaque', () => {
    expect(parseRgb('rgb(47, 125, 114)')).toEqual({ r: 47, g: 125, b: 114, a: 1 });
  });

  it('parses rgba() with alpha', () => {
    expect(parseRgb('rgba(0, 0, 0, 0.5)')).toEqual({ r: 0, g: 0, b: 0, a: 0.5 });
  });

  it('clamps out-of-range channels', () => {
    expect(parseRgb('rgb(300, -10, 0)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it('returns null for non-rgb input', () => {
    expect(parseRgb('rebeccapurple')).toBeNull();
  });
});

describe('isTransparent', () => {
  it('detects the transparent keyword', () => {
    expect(isTransparent('transparent')).toBe(true);
  });
  it('detects near-zero alpha', () => {
    expect(isTransparent('rgba(0,0,0,0)')).toBe(true);
    expect(isTransparent('rgba(0,0,0,0.01)')).toBe(true);
  });
  it('treats opaque colours as not transparent', () => {
    expect(isTransparent('rgb(0,0,0)')).toBe(false);
  });
});

describe('toHex', () => {
  it('converts opaque rgb to uppercase 6-digit hex', () => {
    expect(toHex('rgb(47, 125, 114)')).toBe('#2F7D72');
  });
  it('appends alpha for semi-transparent colours', () => {
    expect(toHex('rgba(255, 255, 255, 0.5)')).toBe('#FFFFFF80');
  });
  it('returns transparent for fully transparent input', () => {
    expect(toHex('rgba(0,0,0,0)')).toBe('transparent');
  });
  it('passes through named colours untouched', () => {
    expect(toHex('rebeccapurple')).toBe('rebeccapurple');
  });
});

describe('contrast', () => {
  it('computes 21:1 for black on white', () => {
    expect(contrastRatio('rgb(0,0,0)', 'rgb(255,255,255)')).toBe(21);
  });
  it('is symmetric', () => {
    const a = contrastRatio('rgb(47,125,114)', 'rgb(255,255,255)');
    const b = contrastRatio('rgb(255,255,255)', 'rgb(47,125,114)');
    expect(a).toBe(b);
  });
  it('returns null when a colour is unparseable', () => {
    expect(contrastRatio('teal', 'rgb(0,0,0)')).toBeNull();
  });
  it('white has luminance 1', () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255, a: 1 })).toBeCloseTo(1, 5);
  });
});
