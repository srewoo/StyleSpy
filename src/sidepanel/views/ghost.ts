/** Ghost DOM tab: list hidden elements and force-reveal them. */
import type { GhostNode } from '../../types';
import { h } from '../../ui/dom';
import { copyButton } from '../../ui/components';
import { getState, setState } from '../state';
import { refreshGhosts, revealGhost } from '../actions';

const REASON_LABEL: Record<GhostNode['reason'], string> = {
  'display-none': 'display:none',
  'visibility-hidden': 'visibility:hidden',
  'opacity-zero': 'opacity:0',
  'zero-size': 'zero-size',
  visible: 'visible',
  offscreen: 'offscreen',
};

function ghostRow(node: GhostNode): HTMLElement {
  const eye = h('button', {
    class: `eye${node.revealed ? ' eye--on' : ''}`,
    text: node.revealed ? '🙈' : '👁',
    title: node.revealed ? 'Re-hide' : 'Force reveal',
    on: {
      click: () => {
        const next = getState().ghosts.map((g) =>
          g.nodeId === node.nodeId ? { ...g, revealed: !g.revealed } : g,
        );
        setState({ ghosts: next });
        void revealGhost(node.nodeId, !node.revealed);
      },
    },
  });
  return h(
    'div',
    { class: 'ghost-row' },
    h('span', { class: 'tag-pill', text: node.tag }),
    h('span', {
      class: 'badge badge--hidden',
      text: REASON_LABEL[node.reason],
    }),
    h('span', {
      class: 'ghost-row__text',
      text: node.text || node.cssSelector,
      title: node.cssSelector,
    }),
    copyButton(() => node.cssSelector, 'css'),
    eye,
  );
}

export function renderGhost(): HTMLElement {
  const { ghosts } = getState();
  const list = h('div', { class: 'ghost-list' });
  if (ghosts.length === 0) {
    list.append(
      h('div', {
        class: 'empty',
        text: 'Scan to find elements hidden via CSS (closed modals, dropdowns, tracking pixels, SR-only text).',
      }),
    );
  } else {
    for (const g of ghosts) list.append(ghostRow(g));
  }
  return h(
    'div',
    { class: 'view' },
    h('button', {
      class: 'btn btn--primary',
      text: '👻 Scan for hidden elements',
      on: { click: () => void refreshGhosts() },
    }),
    ghosts.length
      ? h('div', {
          class: 'count count--block',
          text: `${ghosts.length} hidden elements`,
        })
      : null,
    list,
  );
}
