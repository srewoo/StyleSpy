/** Mutations tab: live DOM-change feed + break-on-mutation. */
import type { MutationEntry } from '../../types';
import { h } from '../../ui/dom';
import { getState } from '../state';
import { toggleMutationLog, toggleBreakOnMutation } from '../actions';

const KIND_CLASS: Record<MutationEntry['kind'], string> = {
  added: 'mut--added',
  removed: 'mut--removed',
  attributes: 'mut--attr',
  text: 'mut--text',
};

function entryRow(e: MutationEntry): HTMLElement {
  return h(
    'div',
    { class: `mut ${KIND_CLASS[e.kind]}` },
    h('span', { class: 'mut__kind', text: e.kind }),
    h('code', { class: 'mut__target', text: e.target, title: e.target }),
    h('span', { class: 'mut__detail', text: e.detail }),
  );
}

export function renderMutations(): HTMLElement {
  const { mutations, mutationLogOn, breakOn } = getState();

  const controls = h(
    'div',
    { class: 'mut-controls' },
    h('button', {
      class: `btn${mutationLogOn ? ' btn--primary' : ''}`,
      text: mutationLogOn ? '◼ Stop logging' : '▶ Start logging',
      on: { click: () => void toggleMutationLog() },
    }),
    h(
      'label',
      { class: 'force-toggle' },
      (() => {
        const box = h('input', {
          attrs: { type: 'checkbox' },
        }) as HTMLInputElement;
        box.checked = breakOn;
        box.addEventListener('change', () => void toggleBreakOnMutation());
        return box;
      })(),
      h('span', { text: 'Break on next mutation' }),
    ),
  );

  const feed = h('div', { class: 'mut-feed' });
  if (mutations.length === 0) {
    feed.append(
      h('div', {
        class: 'empty',
        text: mutationLogOn
          ? 'Listening… interact with the page to see changes.'
          : 'Start logging to watch elements get added, removed or restyled in real time.',
      }),
    );
  } else {
    for (const e of mutations.slice(-200).reverse()) feed.append(entryRow(e));
  }

  return h(
    'div',
    { class: 'view' },
    controls,
    h('p', {
      class: 'hint',
      text: '“Break on next mutation” freezes the page the instant a node is added — perfect for catching a dropdown’s markup as it opens.',
    }),
    feed,
  );
}
