import { describe, it, expect } from 'vitest';
import { filterSnapshots, matchesFilter, matchesQuery } from '../src/lib/filter';
import type { ElementSnapshot } from '../src/types';

function snap(p: Partial<ElementSnapshot> = {}): ElementSnapshot {
  return {
    snapshotId: 'x',
    text: 'Hello',
    state: 'base',
    visibility: 'visible',
    capturedAt: 0,
    identity: {
      tag: 'div',
      id: null,
      classNames: ['box'],
      cssSelector: 'div.box',
      xpath: '//div[1]',
      testId: null,
      ariaLabel: null,
      role: null,
    },
    styles: {
      color: 'rgb(47,125,114)',
      backgroundColor: 'rgb(255,255,255)',
      fontFamily: 'Inter',
      fontSize: '14px',
      fontWeight: '400',
      fontStyle: 'normal',
      lineHeight: '20px',
      letterSpacing: 'normal',
      textAlign: 'left',
      textDecoration: 'none',
      textTransform: 'none',
      padding: '0',
      margin: '0',
      border: '0',
      borderRadius: '0',
      boxShadow: 'none',
      opacity: '1',
      display: 'block',
    },
    ...p,
  };
}

describe('matchesFilter', () => {
  it('matches visible only', () => {
    expect(matchesFilter(snap(), 'visible')).toBe(true);
    expect(matchesFilter(snap({ visibility: 'display-none' }), 'visible')).toBe(false);
  });
  it('matches hidden categories', () => {
    expect(matchesFilter(snap({ visibility: 'display-none' }), 'hidden')).toBe(true);
    expect(matchesFilter(snap({ visibility: 'offscreen' }), 'hidden')).toBe(false);
  });
  it('matches dynamic (non-base) state', () => {
    expect(matchesFilter(snap({ state: 'hover' }), 'dynamic')).toBe(true);
    expect(matchesFilter(snap(), 'dynamic')).toBe(false);
  });
  it('all matches everything', () => {
    expect(matchesFilter(snap({ visibility: 'zero-size' }), 'all')).toBe(true);
  });
});

describe('matchesQuery', () => {
  it('matches on text', () => {
    expect(matchesQuery(snap({ text: 'Sign up' }), 'sign')).toBe(true);
  });
  it('matches on hex colour', () => {
    expect(matchesQuery(snap(), '#2f7d72')).toBe(true);
  });
  it('matches on selector', () => {
    expect(matchesQuery(snap(), 'div.box')).toBe(true);
  });
  it('empty query matches all', () => {
    expect(matchesQuery(snap(), '   ')).toBe(true);
  });
  it('non-match returns false', () => {
    expect(matchesQuery(snap({ text: 'abc' }), 'zzz')).toBe(false);
  });
});

describe('filterSnapshots', () => {
  it('combines category and query', () => {
    const data = [
      snap({ snapshotId: 'a', text: 'Visible button', visibility: 'visible' }),
      snap({ snapshotId: 'b', text: 'Hidden modal', visibility: 'display-none' }),
    ];
    const out = filterSnapshots(data, 'hidden', 'modal');
    expect(out).toHaveLength(1);
    expect(out[0]!.snapshotId).toBe('b');
  });
});
