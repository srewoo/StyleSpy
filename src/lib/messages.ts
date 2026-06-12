/**
 * Typed message protocol between the side panel / table page (senders) and the
 * content script (engine), relayed through the service worker. A single
 * discriminated union keeps both ends honest at compile time.
 */
import type {
  ElementSnapshot,
  ElementState,
  GhostNode,
  MutationEntry,
} from '../types';

/** What `Capture Page` should collect. */
export type CaptureScope = 'all' | 'text' | 'interactive';

/** Commands sent TO the content script. */
export type CommandMessage =
  | { type: 'capture-page'; scope: CaptureScope }
  | { type: 'toggle-picker'; enabled: boolean }
  | { type: 'freeze' }
  | { type: 'unfreeze' }
  | { type: 'countdown-freeze'; seconds: number }
  | {
      type: 'force-state';
      selector: string;
      state: ElementState;
      enabled: boolean;
    }
  | { type: 'list-ghosts' }
  | { type: 'reveal-ghost'; nodeId: string; revealed: boolean }
  | { type: 'toggle-mutation-log'; enabled: boolean }
  | { type: 'break-on-mutation'; enabled: boolean }
  | { type: 'ping' };

/** Events emitted FROM the content script. */
export type EventMessage =
  | { type: 'capture-result'; snapshots: ElementSnapshot[]; url: string }
  | { type: 'capture-progress'; done: number; total: number }
  | { type: 'element-inspected'; snapshot: ElementSnapshot }
  | { type: 'ghost-list'; nodes: GhostNode[] }
  | { type: 'mutation-batch'; entries: MutationEntry[] }
  | { type: 'freeze-changed'; frozen: boolean }
  | { type: 'picker-changed'; enabled: boolean }
  | { type: 'pong' };

export type Message = CommandMessage | EventMessage;

/** Type guard: is this a known StyleSpy message? */
export function isMessage(value: unknown): value is Message {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as { type: unknown }).type === 'string'
  );
}

/** Narrowing helper used by switch statements at both ends. */
export function isCommand(msg: Message): msg is CommandMessage {
  const commands: ReadonlySet<string> = new Set<Message['type']>([
    'capture-page',
    'toggle-picker',
    'freeze',
    'unfreeze',
    'countdown-freeze',
    'force-state',
    'list-ghosts',
    'reveal-ghost',
    'toggle-mutation-log',
    'break-on-mutation',
    'ping',
  ]);
  return commands.has(msg.type);
}
