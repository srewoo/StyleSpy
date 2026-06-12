import { describe, it, expect } from 'vitest';
import { toCsv, toJson, toCssRule, snapshotToRow } from '../src/lib/format';
import type { ElementSnapshot } from '../src/types';

function snapshot(overrides: Partial<ElementSnapshot> = {}): ElementSnapshot {
  return {
    snapshotId: 's1',
    text: 'Get started',
    state: 'base',
    visibility: 'visible',
    capturedAt: 0,
    identity: {
      tag: 'button',
      id: null,
      classNames: ['btn', 'primary'],
      cssSelector: 'button[data-testid="cta"]',
      xpath: "//button[@data-testid='cta']",
      testId: 'cta',
      ariaLabel: null,
      role: null,
    },
    styles: {
      color: 'rgb(47, 125, 114)',
      backgroundColor: 'rgb(255, 255, 255)',
      fontFamily: 'Inter, sans-serif',
      fontSize: '15px',
      fontWeight: '600',
      fontStyle: 'normal',
      lineHeight: '40px',
      letterSpacing: 'normal',
      textAlign: 'center',
      textDecoration: 'none',
      textTransform: 'none',
      padding: '8px',
      margin: '0px',
      border: '1px solid',
      borderRadius: '6px',
      boxShadow: 'none',
      opacity: '1',
      display: 'inline-flex',
    },
    ...overrides,
  };
}

describe('snapshotToRow', () => {
  it('converts colours to hex', () => {
    const row = snapshotToRow(snapshot());
    expect(row.color).toBe('#2F7D72');
    expect(row.backgroundColor).toBe('#FFFFFF');
  });
  it('joins class names with spaces', () => {
    expect(snapshotToRow(snapshot()).classes).toBe('btn primary');
  });
});

describe('toCsv', () => {
  it('emits a header plus one row per snapshot', () => {
    const csv = toCsv([snapshot(), snapshot({ snapshotId: 's2' })]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('tag,text,color');
  });

  it('quotes cells containing commas', () => {
    const csv = toCsv([snapshot({ text: 'Hello, world' })]);
    expect(csv).toContain('"Hello, world"');
  });

  it('escapes embedded quotes', () => {
    const csv = toCsv([snapshot({ text: 'say "hi"' })]);
    expect(csv).toContain('"say ""hi"""');
  });
});

describe('toJson', () => {
  it('round-trips through JSON.parse', () => {
    const parsed = JSON.parse(toJson([snapshot()]));
    expect(parsed[0].identity.testId).toBe('cta');
  });
});

describe('toCssRule', () => {
  it('produces a valid-looking rule with the selector', () => {
    const rule = toCssRule(snapshot());
    expect(rule).toContain('button[data-testid="cta"] {');
    expect(rule).toContain('color: #2F7D72;');
    expect(rule.trim().endsWith('}')).toBe(true);
  });
});
