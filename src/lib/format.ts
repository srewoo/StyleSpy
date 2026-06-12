/**
 * Serialise captured snapshots for export (CSV / JSON) and produce a
 * copy-ready CSS rule block. Pure functions over {@link ElementSnapshot}.
 */
import type { ElementSnapshot } from '../types';
import { toHex } from './color';

/** Column order shared by the CSV export and the full-table view. */
export const EXPORT_COLUMNS = [
  'tag',
  'text',
  'color',
  'backgroundColor',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'textDecoration',
  'visibility',
  'state',
  'cssSelector',
  'xpath',
  'id',
  'classes',
] as const;

type Column = (typeof EXPORT_COLUMNS)[number];

/** Flatten a snapshot to a string keyed by export column. */
export function snapshotToRow(s: ElementSnapshot): Record<Column, string> {
  return {
    tag: s.identity.tag,
    text: s.text,
    color: toHex(s.styles.color),
    backgroundColor: toHex(s.styles.backgroundColor),
    fontFamily: s.styles.fontFamily,
    fontSize: s.styles.fontSize,
    fontWeight: s.styles.fontWeight,
    lineHeight: s.styles.lineHeight,
    letterSpacing: s.styles.letterSpacing,
    textAlign: s.styles.textAlign,
    textDecoration: s.styles.textDecoration,
    visibility: s.visibility,
    state: s.state,
    cssSelector: s.identity.cssSelector,
    xpath: s.identity.xpath,
    id: s.identity.id ?? '',
    classes: s.identity.classNames.join(' '),
  };
}

function csvCell(value: string): string {
  // RFC-4180: quote when the cell contains a comma, quote, or newline.
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Render snapshots as RFC-4180 CSV with a header row. */
export function toCsv(snapshots: readonly ElementSnapshot[]): string {
  const header = EXPORT_COLUMNS.join(',');
  const rows = snapshots.map((s) => {
    const row = snapshotToRow(s);
    return EXPORT_COLUMNS.map((col) => csvCell(row[col])).join(',');
  });
  return [header, ...rows].join('\r\n');
}

/** Pretty-printed JSON export. */
export function toJson(snapshots: readonly ElementSnapshot[]): string {
  return JSON.stringify(snapshots, null, 2);
}

/** A copy-ready CSS rule for one snapshot, using its selector. */
export function toCssRule(s: ElementSnapshot): string {
  const lines = [
    `color: ${toHex(s.styles.color)};`,
    `background-color: ${toHex(s.styles.backgroundColor)};`,
    `font-family: ${s.styles.fontFamily};`,
    `font-size: ${s.styles.fontSize};`,
    `font-weight: ${s.styles.fontWeight};`,
    `line-height: ${s.styles.lineHeight};`,
    `letter-spacing: ${s.styles.letterSpacing};`,
    `text-align: ${s.styles.textAlign};`,
  ];
  return `${s.identity.cssSelector} {\n  ${lines.join('\n  ')}\n}`;
}
