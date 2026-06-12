/**
 * Shared domain types for StyleSpy.
 *
 * These describe the data that flows between the content script (inspection
 * engine) and the side panel (UI). Keep this file free of DOM/Chrome calls so
 * it can be imported by both runtime contexts and by unit tests.
 */

/** The four interaction states StyleSpy can capture or force. */
export type ElementState = 'base' | 'hover' | 'focus' | 'active';

/** Why an element is (or is not) visible on the page. */
export type VisibilityState =
  | 'visible'
  | 'display-none'
  | 'visibility-hidden'
  | 'opacity-zero'
  | 'zero-size'
  | 'offscreen';

/** Typography + colour + box properties captured for a single element. */
export interface StyleMap {
  readonly color: string;
  readonly backgroundColor: string;
  readonly fontFamily: string;
  readonly fontSize: string;
  readonly fontWeight: string;
  readonly fontStyle: string;
  readonly lineHeight: string;
  readonly letterSpacing: string;
  readonly textAlign: string;
  readonly textDecoration: string;
  readonly textTransform: string;
  readonly padding: string;
  readonly margin: string;
  readonly border: string;
  readonly borderRadius: string;
  readonly boxShadow: string;
  readonly opacity: string;
  readonly display: string;
}

/** Stable identifiers + metadata for locating an element again. */
export interface ElementIdentity {
  readonly tag: string;
  readonly id: string | null;
  readonly classNames: readonly string[];
  readonly cssSelector: string;
  readonly xpath: string;
  readonly testId: string | null;
  readonly ariaLabel: string | null;
  readonly role: string | null;
}

/** A full inspection result for one element. */
export interface ElementSnapshot {
  readonly snapshotId: string;
  readonly text: string;
  readonly identity: ElementIdentity;
  readonly styles: StyleMap;
  readonly visibility: VisibilityState;
  readonly state: ElementState;
  readonly capturedAt: number;
}

/** A single entry in the live mutation feed. */
export interface MutationEntry {
  readonly id: string;
  readonly kind: 'added' | 'removed' | 'attributes' | 'text';
  readonly target: string;
  readonly detail: string;
  readonly at: number;
}

/** A hidden ("ghost") DOM node surfaced in the Ghost DOM tab. */
export interface GhostNode {
  readonly nodeId: string;
  readonly tag: string;
  readonly cssSelector: string;
  readonly reason: VisibilityState;
  readonly text: string;
  readonly revealed: boolean;
}
