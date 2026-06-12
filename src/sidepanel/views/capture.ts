/** Capture tab: one-click page scan rendered as an expandable element list. */
import type { ElementSnapshot } from '../../types';
import { h } from '../../ui/dom';
import { swatch, colorValue, chip, locatorRow } from '../../ui/components';
import { filterSnapshots, type CaptureFilter } from '../../lib/filter';
import { classifyLocator, summarizeLocators, isAutomatable } from '../../lib/locator-quality';
import { getState, setState } from '../state';
import { capturePage, openFullTable } from '../actions';

const FILTERS: CaptureFilter[] = ['all', 'visible', 'hidden', 'dynamic'];

/**
 * Clickable locator-health bar. Scored over *visible interactive* elements
 * only — the things a QA script actually targets — not layout/hidden noise.
 */
function locatorHealth(auditable: Parameters<typeof summarizeLocators>[0]): HTMLElement {
  const s = summarizeLocators(auditable);
  const { locatorFilter } = getState();

  if (s.total === 0) {
    return h(
      'div',
      { class: 'loc-health' },
      h('div', { class: 'loc-health__head' },
        h('span', { class: 'loc-health__title', text: 'Locator health' }),
      ),
      h('div', { class: 'loc-caption', text: 'No visible interactive elements found.' }),
    );
  }
  const seg = (
    kind: 'strong' | 'moderate' | 'weak',
    count: number,
  ): HTMLElement => {
    const active = locatorFilter === kind;
    return h('button', {
      class: `loc-seg loc-seg--${kind}${active ? ' loc-seg--active' : ''}`,
      style: { flexGrow: String(Math.max(count, 0.4)) },
      title: `${count} ${kind} locators — click to filter`,
      text: count > 0 ? String(count) : '',
      on: {
        click: () => setState({ locatorFilter: active ? 'any' : kind }),
      },
    });
  };
  return h(
    'div',
    { class: 'loc-health' },
    h(
      'div',
      { class: 'loc-health__head' },
      h('span', { class: 'loc-health__title', text: 'Locator health' }),
      h('span', { class: 'loc-health__pct', text: `${s.strongPct}% automatable` }),
    ),
    h('div', { class: 'loc-bar' }, seg('strong', s.strong), seg('moderate', s.moderate), seg('weak', s.weak)),
    h(
      'div',
      { class: 'loc-legend' },
      h('span', { class: 'loc-dot loc-dot--strong' }),
      h('span', { text: `id / testid (${s.strong})` }),
      h('span', { class: 'loc-dot loc-dot--moderate' }),
      h('span', { text: `class (${s.moderate})` }),
      h('span', { class: 'loc-dot loc-dot--weak' }),
      h('span', { text: `fragile (${s.weak})` }),
    ),
    h('div', { class: 'loc-caption', text: `Based on ${s.total} visible interactive elements` }),
  );
}

function expandedDetail(s: ElementSnapshot): HTMLElement {
  const st = s.styles;
  const grid = h(
    'div',
    { class: 'cap-detail__grid' },
    miniProp('color', colorValue(st.color)),
    miniProp('bg', colorValue(st.backgroundColor)),
    miniProp('font', st.fontFamily.split(',')[0] ?? st.fontFamily),
    miniProp('size / weight', `${st.fontSize} / ${st.fontWeight}`),
    miniProp('line / spacing', `${st.lineHeight} / ${st.letterSpacing}`),
    miniProp('align', st.textAlign),
  );
  const locators = h(
    'div',
    { class: 'cap-detail__locators' },
    locatorRow('CSS', s.identity.cssSelector),
    locatorRow('XPath', s.identity.xpath),
  );
  return h('div', { class: 'cap-detail' }, grid, locators);
}

function miniProp(label: string, value: Node | string): HTMLElement {
  return h(
    'div',
    { class: 'mini-prop' },
    h('span', { class: 'mini-prop__label', text: label }),
    typeof value === 'string'
      ? h('span', { class: 'mini-prop__value', text: value })
      : h('span', { class: 'mini-prop__value' }, value),
  );
}

function row(s: ElementSnapshot, expanded: boolean): HTMLElement {
  const hidden = s.visibility !== 'visible' && s.visibility !== 'offscreen';
  const head = h(
    'button',
    {
      class: 'cap-row__head',
      on: {
        click: () => {
          const next = new Set(getState().expanded);
          if (next.has(s.snapshotId)) next.delete(s.snapshotId);
          else next.add(s.snapshotId);
          setState({ expanded: next });
        },
      },
    },
    swatch(s.styles.color),
    h('span', { class: 'tag-pill', text: s.identity.tag }),
    h('span', { class: 'cap-row__text', text: s.text || '(no text)', title: s.text }),
    hidden
      ? h('span', { class: 'badge badge--hidden', text: s.visibility })
      : h('span', {
          class: 'cap-row__meta',
          text: `${s.styles.fontSize}·${s.styles.fontWeight}`,
        }),
    h('span', { class: 'cap-row__chev', text: expanded ? '▾' : '›' }),
  );
  const node = h('div', { class: `cap-row${hidden ? ' cap-row--hidden' : ''}` }, head);
  if (expanded) node.append(expandedDetail(s));
  return node;
}

export function renderCapture(): HTMLElement {
  const { snapshots, filter, locatorFilter, query, expanded } = getState();
  // Locator health is scored over visible interactive elements only.
  const auditable = snapshots.filter(isAutomatable);
  // When a locator segment is selected, show exactly those audited elements so
  // the list matches the health-bar counts; otherwise use the normal filters.
  const visible =
    locatorFilter === 'any'
      ? filterSnapshots(snapshots, filter, query)
      : filterSnapshots(
          auditable.filter((s) => classifyLocator(s.identity) === locatorFilter),
          'all',
          query,
        );

  const actions = h(
    'div',
    { class: 'cap-actions' },
    h('button', {
      class: 'btn btn--primary',
      text: '＋ Capture Page',
      on: { click: () => void capturePage() },
    }),
    h('button', {
      class: 'btn',
      text: 'Full table ↗',
      attrs: snapshots.length ? {} : { disabled: 'true' },
      on: { click: () => void openFullTable() },
    }),
  );

  const search = h('input', {
    class: 'search',
    attrs: { type: 'search', placeholder: 'Search text, selector, colour…', value: query },
    on: {
      input: (e) => setState({ query: (e.target as HTMLInputElement).value }),
    },
  });

  const filterRow = h(
    'div',
    { class: 'filter-row' },
    ...FILTERS.map((f) =>
      chip(f, filter === f, () => setState({ filter: f })),
    ),
    h('span', { class: 'count', text: `${visible.length} / ${snapshots.length}` }),
  );

  const list = h('div', { class: 'cap-list' });
  if (snapshots.length === 0) {
    list.append(
      h('div', { class: 'empty' },
        h('p', { text: 'Click “Capture Page” to scan every element and its CSS.' }),
        h('ul', { class: 'onboard' },
          h('li', { text: '❄ Freeze (⌘/Ctrl+Shift+F) locks hover/tooltip states' }),
          h('li', { text: '⌖ Pick clicks any element to inspect it' }),
          h('li', { text: '👻 Ghost DOM reveals hidden modals & dropdowns' }),
          h('li', { text: '↗ Full table opens a sortable, exportable grid' }),
        ),
      ),
    );
  } else if (visible.length === 0) {
    list.append(h('div', { class: 'empty', text: 'No elements match this filter / search.' }));
  } else {
    for (const s of visible.slice(0, 800)) list.append(row(s, expanded.has(s.snapshotId)));
    if (visible.length > 800)
      list.append(h('div', { class: 'empty', text: `+${visible.length - 800} more — narrow the filter or open the full table.` }));
  }

  return h(
    'div',
    { class: 'view' },
    actions,
    snapshots.length > 0 ? locatorHealth(auditable) : null,
    search,
    filterRow,
    list,
  );
}
