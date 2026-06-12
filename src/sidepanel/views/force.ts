/** Force-state tab: force :hover / :focus / :active on a selector. */
import type { ElementState } from '../../types';
import { h } from '../../ui/dom';
import { getState } from '../state';
import { applyForce } from '../actions';

const STATES: Exclude<ElementState, 'base'>[] = ['hover', 'focus', 'active'];

/** Toggles, keyed by `${selector}|${state}`, persisted only for this render cycle. */
const active = new Map<string, boolean>();

export function renderForce(): HTMLElement {
  const { selected } = getState();
  const prefill = selected?.identity.cssSelector ?? '';

  const input = h('input', {
    class: 'search',
    attrs: { type: 'text', placeholder: 'CSS selector (e.g. .btn-primary)', value: prefill },
  }) as HTMLInputElement;

  const toggles = h('div', { class: 'force-toggles' },
    ...STATES.map((state) => {
      const label = h('label', { class: 'force-toggle' });
      const box = h('input', { attrs: { type: 'checkbox' } }) as HTMLInputElement;
      box.addEventListener('change', () => {
        const sel = input.value.trim();
        if (!sel) return;
        active.set(`${sel}|${state}`, box.checked);
        void applyForce(sel, state, box.checked);
      });
      label.append(box, h('span', { text: `:${state}` }));
      return label;
    }),
  );

  return h('div', { class: 'view' },
    h('div', { class: 'section-label', text: 'Force state on selector' }),
    input,
    toggles,
    h('p', { class: 'hint', text: 'Re-applies the page’s own :hover/:focus/:active CSS so the styled state stays put without a real pointer. Pick an element first to prefill its selector.' }),
  );
}
