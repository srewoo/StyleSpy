/** Reusable UI atoms shared across panel tabs and the table view. */
import { h } from './dom';
import { copyText } from './io';
import { toHex, isTransparent } from '../lib/color';

/** A small colour chip; checkered when transparent so it reads as "none". */
export function swatch(color: string): HTMLElement {
  const box = h('span', { class: 'swatch' });
  if (isTransparent(color)) box.classList.add('swatch--transparent');
  else box.style.background = color;
  return box;
}

/** Colour value shown as chip + hex label. */
export function colorValue(color: string): HTMLElement {
  return h(
    'span',
    { class: 'color-value' },
    swatch(color),
    h('code', { text: toHex(color) }),
  );
}

/** A label → value row used in property lists. */
export function propRow(label: string, value: Node | string): HTMLElement {
  return h(
    'div',
    { class: 'prop' },
    h('span', { class: 'prop__label', text: label }),
    typeof value === 'string'
      ? h('span', { class: 'prop__value', text: value })
      : h('span', { class: 'prop__value' }, value),
  );
}

/** A pill/chip, optionally toggled active. */
export function chip(
  label: string,
  active: boolean,
  onClick: () => void,
): HTMLElement {
  return h('button', {
    class: `chip${active ? ' chip--active' : ''}`,
    text: label,
    on: { click: onClick },
  });
}

/** A copy-to-clipboard button that flashes "copied" on success. */
export function copyButton(getText: () => string, label = 'copy'): HTMLElement {
  const btn = h('button', { class: 'copy-btn', text: label });
  btn.addEventListener('click', async () => {
    const ok = await copyText(getText());
    btn.textContent = ok ? 'copied' : 'failed';
    btn.classList.toggle('copy-btn--ok', ok);
    window.setTimeout(() => {
      btn.textContent = label;
      btn.classList.remove('copy-btn--ok');
    }, 1100);
  });
  return btn;
}

/** A monospace locator row: label + value + copy button. */
export function locatorRow(kind: string, value: string): HTMLElement {
  return h(
    'div',
    { class: 'locator' },
    h('span', { class: 'locator__kind', text: kind }),
    h('code', { class: 'locator__value', text: value, title: value }),
    copyButton(() => value),
  );
}
