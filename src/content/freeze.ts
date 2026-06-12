/**
 * Freeze-frame engine. When invoked (via hotkey or the Countdown button) it
 * captures the elements currently under `:hover` / `:focus` / `:active`,
 * snapshots the deepest one, pauses all animations & transitions so fading
 * tooltips hold mid-state, and force-applies the hovered chain's CSS hover
 * rules so a CSS-driven tooltip stays on screen after the mouse leaves.
 */
import { emit } from './emitter';
import { snapshotElement } from './inspect';
import { forceStateOnElement, clearAllForcedStates } from './force-state';

const FREEZE_STYLE_ID = 'stylespy-freeze-style';
let frozen = false;
let countdownTimer: number | null = null;

function pauseAnimations(): void {
  if (document.getElementById(FREEZE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = FREEZE_STYLE_ID;
  style.textContent = `*, *::before, *::after {
    animation-play-state: paused !important;
    transition: none !important;
    caret-color: transparent !important;
  }`;
  document.documentElement.appendChild(style);
}

function resumeAnimations(): void {
  document.getElementById(FREEZE_STYLE_ID)?.remove();
}

/** The deepest element in document order matching a pseudo-class, or null. */
function deepestMatching(pseudo: string): Element | null {
  let list: NodeListOf<Element>;
  try {
    list = document.querySelectorAll(pseudo);
  } catch {
    return null;
  }
  return list.length ? (list[list.length - 1] ?? null) : null;
}

/** Freeze the current interaction state and report what was captured. */
export function freeze(): void {
  const hoverChain = Array.from(document.querySelectorAll(':hover'));
  const target =
    deepestMatching(':hover') ??
    deepestMatching(':focus') ??
    (document.activeElement && document.activeElement !== document.body
      ? document.activeElement
      : null);

  pauseAnimations();
  // Keep CSS-hover tooltips/menus on screen by forcing the hovered chain.
  for (const el of hoverChain) forceStateOnElement(el, 'hover');

  frozen = true;
  emit({ type: 'freeze-changed', frozen: true });

  if (target) {
    const snap = snapshotElement(target, 'hover');
    if (snap) emit({ type: 'element-inspected', snapshot: snap });
  }
}

/** Release a freeze: resume animations and drop all forced styles. */
export function unfreeze(): void {
  if (countdownTimer !== null) {
    window.clearTimeout(countdownTimer);
    countdownTimer = null;
  }
  resumeAnimations();
  clearAllForcedStates();
  frozen = false;
  emit({ type: 'freeze-changed', frozen: false });
}

/** Start a countdown, then freeze — giving the user time to hover a menu. */
export function countdownFreeze(seconds: number): void {
  if (countdownTimer !== null) window.clearTimeout(countdownTimer);
  countdownTimer = window.setTimeout(
    () => {
      countdownTimer = null;
      freeze();
    },
    Math.max(0, seconds) * 1000,
  );
}

export function isFrozen(): boolean {
  return frozen;
}
