/**
 * Search + category filtering over captured snapshots. Pure so both the panel
 * list and the full-table view share identical behaviour (and it's unit-tested).
 */
import type { ElementSnapshot, VisibilityState } from '../types';
import { toHex } from './color';

export type CaptureFilter = 'all' | 'visible' | 'hidden' | 'dynamic';

const HIDDEN: ReadonlySet<VisibilityState> = new Set([
  'display-none',
  'visibility-hidden',
  'opacity-zero',
  'zero-size',
]);

/** True when a snapshot belongs to the given category. */
export function matchesFilter(s: ElementSnapshot, filter: CaptureFilter): boolean {
  switch (filter) {
    case 'visible':
      return s.visibility === 'visible';
    case 'hidden':
      return HIDDEN.has(s.visibility);
    case 'dynamic':
      return s.state !== 'base';
    case 'all':
    default:
      return true;
  }
}

/** Case-insensitive search across text, selector, tag, classes and colours. */
export function matchesQuery(s: ElementSnapshot, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    s.text,
    s.identity.tag,
    s.identity.cssSelector,
    s.identity.xpath,
    s.identity.id ?? '',
    s.identity.classNames.join(' '),
    toHex(s.styles.color),
    toHex(s.styles.backgroundColor),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

/** Apply both a category filter and a search query. */
export function filterSnapshots(
  snapshots: readonly ElementSnapshot[],
  filter: CaptureFilter,
  query: string,
): ElementSnapshot[] {
  return snapshots.filter(
    (s) => matchesFilter(s, filter) && matchesQuery(s, query),
  );
}
