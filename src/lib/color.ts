/**
 * Colour utilities — pure functions, no DOM. Convert the `rgb()/rgba()`
 * strings that `getComputedStyle` returns into hex, detect transparency, and
 * compute WCAG contrast so the UI can flag low-contrast text.
 */

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

const RGB_RE =
  /rgba?\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*(?:,\s*(-?[\d.]+))?\s*\)/i;

const clamp = (n: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, n));

/** Parse a CSS `rgb()`/`rgba()` string into channels, or null if unparseable. */
export function parseRgb(input: string): Rgb | null {
  const match = RGB_RE.exec(input.trim());
  if (!match) return null;
  const [, r, g, b, a] = match;
  return {
    r: clamp(Math.round(Number(r)), 0, 255),
    g: clamp(Math.round(Number(g)), 0, 255),
    b: clamp(Math.round(Number(b)), 0, 255),
    a: a === undefined ? 1 : clamp(Number(a), 0, 1),
  };
}

/** True when a colour is fully (or all-but) transparent. */
export function isTransparent(input: string): boolean {
  const trimmed = input.trim().toLowerCase();
  if (trimmed === 'transparent') return true;
  const rgb = parseRgb(trimmed);
  return rgb !== null && rgb.a < 0.02;
}

const toHexByte = (n: number): string => n.toString(16).padStart(2, '0');

/**
 * Convert a CSS colour to an uppercase hex string. Opaque colours become
 * `#RRGGBB`; semi-transparent ones become `#RRGGBBAA`; fully transparent
 * returns `transparent`. Non-rgb inputs (e.g. named colours) pass through.
 */
export function toHex(input: string): string {
  if (isTransparent(input)) return 'transparent';
  const rgb = parseRgb(input);
  if (!rgb) return input.trim();
  const base = `#${toHexByte(rgb.r)}${toHexByte(rgb.g)}${toHexByte(rgb.b)}`;
  if (rgb.a >= 1) return base.toUpperCase();
  return `${base}${toHexByte(Math.round(rgb.a * 255))}`.toUpperCase();
}

/** Relative luminance per WCAG 2.x (ignores alpha). */
export function relativeLuminance(rgb: Rgb): number {
  const channel = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/**
 * WCAG contrast ratio between two CSS colours (1–21), or null if either is
 * unparseable. Alpha is ignored — callers usually compare resolved colours.
 */
export function contrastRatio(fg: string, bg: string): number | null {
  const a = parseRgb(fg);
  const b = parseRgb(bg);
  if (!a || !b) return null;
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}
