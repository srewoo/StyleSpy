/**
 * Pure, locale-aware sort used by the full-table view. Kept out of `table/`
 * (which is DOM- and storage-coupled) so the comparator can be unit-tested.
 */

export type SortDir = 1 | -1;

/**
 * Return a new array sorted by a string key derived from each item, in `dir`
 * order (1 = ascending, -1 = descending). Stable for equal keys; never mutates
 * the input. Comparison is `localeCompare`, matching the on-screen ordering.
 */
export function sortByKey<T>(
  items: readonly T[],
  get: (item: T) => string,
  dir: SortDir = 1,
): T[] {
  return [...items].sort((a, b) => get(a).localeCompare(get(b)) * dir);
}
