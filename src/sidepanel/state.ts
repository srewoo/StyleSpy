/** Side-panel state container with a minimal subscribe/notify store. */
import type { ElementSnapshot, GhostNode, MutationEntry } from '../types';

export type TabKey = 'capture' | 'inspect' | 'force' | 'ghost' | 'mutations';
export type CaptureFilter = 'all' | 'visible' | 'hidden' | 'dynamic';

export interface PanelState {
  active: TabKey;
  snapshots: ElementSnapshot[];
  filter: CaptureFilter;
  locatorFilter: 'any' | 'strong' | 'moderate' | 'weak';
  query: string;
  expanded: Set<string>;
  selected: ElementSnapshot | null;
  ghosts: GhostNode[];
  mutations: MutationEntry[];
  frozen: boolean;
  pickerOn: boolean;
  mutationLogOn: boolean;
  breakOn: boolean;
  url: string;
  status: string;
  theme: 'light' | 'dark';
}

const state: PanelState = {
  active: 'capture',
  snapshots: [],
  filter: 'all',
  locatorFilter: 'any',
  query: '',
  expanded: new Set(),
  selected: null,
  ghosts: [],
  mutations: [],
  frozen: false,
  pickerOn: false,
  mutationLogOn: false,
  breakOn: false,
  url: '',
  status: 'Ready',
  theme: 'light',
};

type Listener = (s: PanelState) => void;
const listeners = new Set<Listener>();

export function getState(): Readonly<PanelState> {
  return state;
}

/** Shallow-merge a patch and notify subscribers. */
export function setState(patch: Partial<PanelState>): void {
  Object.assign(state, patch);
  for (const fn of listeners) fn(state);
}

export function subscribe(fn: Listener): void {
  listeners.add(fn);
}
