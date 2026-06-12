import { describe, it, expect } from 'vitest';
import { getState, setState, subscribe } from '../src/sidepanel/state';

describe('panel state store', () => {
  it('shallow-merges patches', () => {
    setState({ status: 'one', query: 'abc' });
    expect(getState().status).toBe('one');
    setState({ status: 'two' });
    expect(getState().status).toBe('two');
    expect(getState().query).toBe('abc'); // untouched
  });

  it('notifies subscribers on change', () => {
    let calls = 0;
    let lastStatus = '';
    subscribe((s) => {
      calls += 1;
      lastStatus = s.status;
    });
    const before = calls;
    setState({ status: 'notified' });
    expect(calls).toBe(before + 1);
    expect(lastStatus).toBe('notified');
  });

  it('exposes the current state by reference (read-only typing)', () => {
    setState({ active: 'ghost' });
    expect(getState().active).toBe('ghost');
  });
});
