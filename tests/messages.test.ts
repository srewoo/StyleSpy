import { describe, it, expect } from 'vitest';
import { isMessage, isCommand, type Message } from '../src/lib/messages';

describe('isMessage', () => {
  it('accepts objects with a string type', () => {
    expect(isMessage({ type: 'freeze' })).toBe(true);
  });
  it('rejects non-objects and typeless objects', () => {
    expect(isMessage(null)).toBe(false);
    expect(isMessage('freeze')).toBe(false);
    expect(isMessage({})).toBe(false);
    expect(isMessage({ type: 1 })).toBe(false);
  });
});

describe('isCommand', () => {
  it('classifies command messages', () => {
    expect(isCommand({ type: 'capture-page', scope: 'all' })).toBe(true);
    expect(isCommand({ type: 'freeze' })).toBe(true);
  });
  it('rejects event messages', () => {
    const evt: Message = { type: 'pong' };
    expect(isCommand(evt)).toBe(false);
  });
});
