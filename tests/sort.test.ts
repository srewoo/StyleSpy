import { describe, it, expect } from 'vitest';
import { sortByKey } from '../src/lib/sort';

interface Row {
  readonly tag: string;
}

const rows: Row[] = [{ tag: 'div' }, { tag: 'a' }, { tag: 'span' }];

describe('sortByKey', () => {
  it('sorts ascending by the derived key', () => {
    const out = sortByKey(rows, (r) => r.tag, 1);
    expect(out.map((r) => r.tag)).toEqual(['a', 'div', 'span']);
  });

  it('sorts descending when dir is -1', () => {
    const out = sortByKey(rows, (r) => r.tag, -1);
    expect(out.map((r) => r.tag)).toEqual(['span', 'div', 'a']);
  });

  it('defaults to ascending', () => {
    const out = sortByKey(rows, (r) => r.tag);
    expect(out[0]!.tag).toBe('a');
  });

  it('does not mutate the input array', () => {
    const original = [...rows];
    sortByKey(rows, (r) => r.tag, -1);
    expect(rows).toEqual(original);
  });

  it('compares numerically-stringified keys lexicographically (locale)', () => {
    const sizes = [{ tag: '12px' }, { tag: '8px' }, { tag: '10px' }];
    // localeCompare puts '10px' < '12px' < '8px' lexically — documents the
    // current on-screen behaviour so a future numeric sort is a conscious change.
    expect(sortByKey(sizes, (r) => r.tag).map((r) => r.tag)).toEqual([
      '10px',
      '12px',
      '8px',
    ]);
  });
});
