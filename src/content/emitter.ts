/**
 * Thin indirection so feature engines can emit events back to the panel
 * without each importing the chrome messaging layer. `index.ts` wires the real
 * sender once at startup.
 */
import type { EventMessage } from '../lib/messages';

let sender: (msg: EventMessage) => void = () => {};

export function setEmitter(fn: (msg: EventMessage) => void): void {
  sender = fn;
}

export function emit(msg: EventMessage): void {
  sender(msg);
}
