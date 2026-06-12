/**
 * Element picker + "last hovered" memory.
 *
 * The picker draws a highlight box over whatever is under the cursor and
 * inspects it on click. Independently, we always remember the last element the
 * mouse touched, so when the pointer leaves the viewport heading for the side
 * panel we can emit that element — solving the "hover state vanishes when I
 * reach for the panel" problem.
 */
import { emit } from './emitter';
import { snapshotElement } from './inspect';

const OVERLAY_ID = 'stylespy-overlay';
let pickerOn = false;
let lockTarget = false;
let lastHovered: Element | null = null;
let overlay: HTMLElement | null = null;

function ensureOverlay(): HTMLElement {
  if (overlay) return overlay;
  const el = document.createElement('div');
  el.id = OVERLAY_ID;
  Object.assign(el.style, {
    position: 'fixed',
    zIndex: '2147483647',
    pointerEvents: 'none',
    border: '2px solid #2f7d72',
    background: 'rgba(47,125,114,0.10)',
    borderRadius: '2px',
    transition: 'none',
    display: 'none',
  } satisfies Partial<CSSStyleDeclaration>);
  document.documentElement.appendChild(el);
  overlay = el;
  return el;
}

function positionOverlay(el: Element): void {
  const box = ensureOverlay();
  const r = el.getBoundingClientRect();
  Object.assign(box.style, {
    display: 'block',
    top: `${r.top}px`,
    left: `${r.left}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
  });
}

function elementUnder(e: MouseEvent): Element | null {
  const el = e.target;
  return el instanceof Element && el.id !== OVERLAY_ID ? el : null;
}

function onMove(e: MouseEvent): void {
  const el = elementUnder(e);
  if (!el) return;
  lastHovered = el;
  if (pickerOn) positionOverlay(el);
  if (lockTarget) inspect(el);
}

function onClick(e: MouseEvent): void {
  if (!pickerOn) return;
  const el = elementUnder(e);
  if (!el) return;
  e.preventDefault();
  e.stopPropagation();
  inspect(el);
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape' && pickerOn) togglePicker(false);
}

function onLeaveViewport(): void {
  // Only surface the last-hovered element when the user has opted into
  // pick / lock-target mode — otherwise moving the mouse toward the panel
  // would hijack the active tab on every exit.
  if (!pickerOn && !lockTarget) return;
  if (lastHovered) inspect(lastHovered);
}

function inspect(el: Element): void {
  const snap = snapshotElement(el);
  if (snap) emit({ type: 'element-inspected', snapshot: snap });
}

/** Begin tracking the last-hovered element. Called once at startup. */
export function initHoverMemory(): void {
  document.addEventListener('mousemove', onMove, { passive: true, capture: true });
  document.addEventListener('mouseout', (e) => {
    // relatedTarget null = pointer left the document entirely.
    if (!(e as MouseEvent).relatedTarget) onLeaveViewport();
  });
  document.addEventListener('keydown', onKey, true);
}

/** Toggle the click-to-inspect picker overlay. */
export function togglePicker(enabled: boolean): void {
  pickerOn = enabled;
  if (enabled) {
    ensureOverlay();
    document.addEventListener('click', onClick, true);
  } else {
    document.removeEventListener('click', onClick, true);
    if (overlay) overlay.style.display = 'none';
  }
  emit({ type: 'picker-changed', enabled });
}

/** Lock-target mode: continuously inspect whatever the mouse is over. */
export function setLockTarget(enabled: boolean): void {
  lockTarget = enabled;
}

export function getLastHovered(): Element | null {
  return lastHovered;
}
