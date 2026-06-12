/**
 * Full-table view (opens in its own tab). Reads the capture the side panel
 * stashed in storage and renders a wide, sortable, exportable spreadsheet.
 */
import './table.css';
import type { ElementSnapshot } from '../types';
import { h, clear } from '../ui/dom';
import { swatch } from '../ui/components';
import { downloadText, copyText, CAPTURE_STORAGE_KEY } from '../ui/io';
import { toHex } from '../lib/color';
import { filterSnapshots } from '../lib/filter';
import { classifyLocator } from '../lib/locator-quality';
import { toCsv, toJson } from '../lib/format';
import { sortByKey, type SortDir } from '../lib/sort';

interface Column {
  key: string;
  label: string;
  width: number;
  get: (s: ElementSnapshot) => string;
  cell?: (s: ElementSnapshot) => Node;
}

const COLUMNS: Column[] = [
  {
    key: 'tag',
    label: 'Tag',
    width: 70,
    get: (s) => s.identity.tag,
    cell: (s) => h('span', { class: 'tag-pill', text: s.identity.tag }),
  },
  { key: 'text', label: 'Text', width: 220, get: (s) => s.text },
  {
    key: 'color',
    label: 'Color',
    width: 120,
    get: (s) => toHex(s.styles.color),
    cell: (s) => colorCell(s.styles.color),
  },
  {
    key: 'bg',
    label: 'BG',
    width: 120,
    get: (s) => toHex(s.styles.backgroundColor),
    cell: (s) => colorCell(s.styles.backgroundColor),
  },
  {
    key: 'fontFamily',
    label: 'Font Family',
    width: 130,
    get: (s) => s.styles.fontFamily.split(',')[0] ?? '',
  },
  { key: 'fontSize', label: 'Size', width: 64, get: (s) => s.styles.fontSize },
  {
    key: 'fontWeight',
    label: 'Weight',
    width: 70,
    get: (s) => s.styles.fontWeight,
  },
  {
    key: 'lineHeight',
    label: 'Line H',
    width: 70,
    get: (s) => s.styles.lineHeight,
  },
  {
    key: 'letterSpacing',
    label: 'Letter',
    width: 72,
    get: (s) => s.styles.letterSpacing,
  },
  {
    key: 'textAlign',
    label: 'Align',
    width: 70,
    get: (s) => s.styles.textAlign,
  },
  {
    key: 'visibility',
    label: 'Visibility',
    width: 110,
    get: (s) => s.visibility,
    cell: (s) => visCell(s),
  },
  {
    key: 'locator',
    label: 'Locator',
    width: 96,
    get: (s) => classifyLocator(s.identity),
    cell: (s) => locatorCell(s),
  },
  {
    key: 'cssSelector',
    label: 'CSS Selector',
    width: 240,
    get: (s) => s.identity.cssSelector,
    cell: (s) => h('code', { text: s.identity.cssSelector }),
  },
  {
    key: 'xpath',
    label: 'XPath',
    width: 200,
    get: (s) => s.identity.xpath,
    cell: (s) => h('code', { class: 'faint', text: s.identity.xpath }),
  },
  { key: 'id', label: 'ID', width: 110, get: (s) => s.identity.id ?? '' },
  {
    key: 'classes',
    label: 'Classes',
    width: 180,
    get: (s) => s.identity.classNames.join(' '),
  },
];

const state = {
  snapshots: [] as ElementSnapshot[],
  url: '',
  query: '',
  sortKey: 'tag',
  sortDir: 1,
  hidden: new Set<string>(),
};

const root = document.getElementById('app')!;

function colorCell(color: string): Node {
  return h(
    'span',
    { class: 'cc' },
    swatch(color),
    h('code', { text: toHex(color) }),
  );
}
function visCell(s: ElementSnapshot): Node {
  const cls =
    s.visibility === 'visible'
      ? 'vis-ok'
      : s.state !== 'base'
        ? 'vis-dyn'
        : 'vis-hidden';
  return h('span', {
    class: cls,
    text: s.state !== 'base' ? `${s.visibility}·${s.state}` : s.visibility,
  });
}
function locatorCell(s: ElementSnapshot): Node {
  const q = classifyLocator(s.identity);
  return h('span', { class: `loc-tag loc-tag--${q}`, text: q });
}

function rows(): ElementSnapshot[] {
  const filtered = filterSnapshots(state.snapshots, 'all', state.query);
  const col = COLUMNS.find((c) => c.key === state.sortKey) ?? COLUMNS[0]!;
  return sortByKey(filtered, col.get, state.sortDir as SortDir);
}

function toolbar(): HTMLElement {
  return h(
    'header',
    { class: 'tbar' },
    h('img', { class: 'logo', attrs: { src: '/icons/icon48.png', alt: '' } }),
    h('span', { class: 'title', text: 'StyleSpy' }),
    h('span', {
      class: 'sub',
      text: `· ${state.snapshots.length} elements · ${state.url}`,
      title: state.url,
    }),
    h('input', {
      class: 'search',
      attrs: { type: 'search', placeholder: 'Search…', value: state.query },
      on: {
        input: (e) => {
          state.query = (e.target as HTMLInputElement).value;
          render();
        },
      },
    }),
    h('button', {
      class: 'btn',
      text: 'CSV',
      on: {
        click: () => downloadText('stylespy.csv', toCsv(rows()), 'text/csv'),
      },
    }),
    h('button', {
      class: 'btn',
      text: 'JSON',
      on: {
        click: () =>
          downloadText('stylespy.json', toJson(rows()), 'application/json'),
      },
    }),
    h('button', {
      class: 'btn btn--primary',
      text: 'Copy',
      on: { click: () => void copyText(toCsv(rows())) },
    }),
  );
}

function columnToggles(): HTMLElement {
  return h(
    'div',
    { class: 'col-toggles' },
    ...COLUMNS.map((c) => {
      const label = h('label', { class: 'col-toggle' });
      const box = h('input', {
        attrs: { type: 'checkbox' },
      }) as HTMLInputElement;
      box.checked = !state.hidden.has(c.key);
      box.addEventListener('change', () => {
        if (box.checked) state.hidden.delete(c.key);
        else state.hidden.add(c.key);
        render();
      });
      label.append(box, h('span', { text: c.label }));
      return label;
    }),
  );
}

/** Fixed row height (must match `.grid td` height in CSS) for virtualization. */
const ROW_H = 33;
const BUFFER = 10;

// Live references reused by the scroll-driven body renderer.
let gridWrap: HTMLElement | null = null;
let tbody: HTMLTableSectionElement | null = null;
let visibleCols: Column[] = [];
let currentRows: ElementSnapshot[] = [];

function headerRow(): HTMLElement {
  return h(
    'tr',
    {},
    ...visibleCols.map((c) =>
      h('th', {
        class: state.sortKey === c.key ? 'sorted' : '',
        text:
          c.label +
          (state.sortKey === c.key ? (state.sortDir === 1 ? ' ▲' : ' ▼') : ''),
        style: { width: `${c.width}px` },
        on: {
          click: () => {
            if (state.sortKey === c.key) state.sortDir *= -1;
            else {
              state.sortKey = c.key;
              state.sortDir = 1;
            }
            render();
          },
        },
      }),
    ),
  );
}

function spacer(height: number): HTMLElement {
  const td = h('td', {
    attrs: { colspan: String(visibleCols.length) },
    style: { height: `${height}px`, padding: '0', border: 'none' },
  });
  return h('tr', { class: 'spacer' }, td);
}

function dataRow(s: ElementSnapshot): HTMLElement {
  const hidden = s.visibility !== 'visible' && s.visibility !== 'offscreen';
  const tr = h('tr', { class: hidden ? 'row-hidden' : '' });
  for (const c of visibleCols)
    tr.append(h('td', {}, c.cell ? c.cell(s) : h('span', { text: c.get(s) })));
  return tr;
}

/** Render only the rows currently in (or near) the viewport. */
function renderBody(): void {
  if (!gridWrap || !tbody) return;
  const total = currentRows.length;
  const scrollTop = gridWrap.scrollTop;
  const viewport = gridWrap.clientHeight || 600;
  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - BUFFER);
  const count = Math.ceil(viewport / ROW_H) + BUFFER * 2;
  const end = Math.min(total, start + count);

  clear(tbody);
  if (start > 0) tbody.append(spacer(start * ROW_H));
  for (let i = start; i < end; i += 1) tbody.append(dataRow(currentRows[i]!));
  if (end < total) tbody.append(spacer((total - end) * ROW_H));
}

function render(): void {
  clear(root);
  if (state.snapshots.length === 0) {
    root.append(
      toolbar(),
      h('div', {
        class: 'empty',
        text: 'No capture found. Open the side panel, click “Capture Page”, then “Full table”.',
      }),
    );
    return;
  }

  visibleCols = COLUMNS.filter((c) => !state.hidden.has(c.key));
  currentRows = rows();
  tbody = h('tbody', {});
  const tbl = h('table', { class: 'grid' }, h('thead', {}, headerRow()), tbody);
  gridWrap = h('div', { class: 'grid-wrap', on: { scroll: renderBody } }, tbl);

  root.append(toolbar(), columnToggles(), gridWrap);
  renderBody();
}

async function load(): Promise<void> {
  const data = await chrome.storage.local.get(CAPTURE_STORAGE_KEY);
  const cap = data[CAPTURE_STORAGE_KEY] as
    | { snapshots: ElementSnapshot[]; url: string }
    | undefined;
  if (cap) {
    state.snapshots = cap.snapshots;
    state.url = cap.url;
  }
  render();
}

// Live-update if the panel recaptures while this tab is open.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[CAPTURE_STORAGE_KEY]) void load();
});

void load();
