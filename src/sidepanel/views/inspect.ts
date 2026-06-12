/** Inspect tab: deep view of the currently picked / frozen element. */
import type { ElementSnapshot } from '../../types';
import { h } from '../../ui/dom';
import { swatch, propRow, locatorRow, copyButton } from '../../ui/components';
import { toHex, contrastRatio } from '../../lib/color';
import { toCssRule } from '../../lib/format';
import { getState } from '../state';
import { togglePicker } from '../actions';

function colorCard(label: string, color: string): HTMLElement {
  return h(
    'div',
    { class: 'color-card' },
    swatch(color),
    h(
      'div',
      {},
      h('div', { class: 'color-card__label', text: label }),
      h('code', { class: 'color-card__hex', text: toHex(color) }),
    ),
  );
}

function header(s: ElementSnapshot): HTMLElement {
  const sub = [s.identity.cssSelector, s.visibility].join(' · ');
  return h(
    'div',
    { class: 'el-header' },
    h('span', { class: 'tag-pill tag-pill--lg', text: s.identity.tag }),
    h(
      'div',
      { class: 'el-header__text' },
      h('div', { class: 'el-header__title', text: s.text || '(no text)' }),
      h('div', { class: 'el-header__sub', text: sub, title: sub }),
    ),
  );
}

function contrastNote(s: ElementSnapshot): HTMLElement | null {
  const ratio = contrastRatio(s.styles.color, s.styles.backgroundColor);
  if (ratio === null) return null;
  const pass = ratio >= 4.5;
  return h('div', { class: `contrast ${pass ? 'contrast--ok' : 'contrast--warn'}` },
    h('span', { text: `Contrast ${ratio}:1` }),
    h('span', { class: 'contrast__tag', text: pass ? 'AA' : 'below AA' }),
  );
}

export function renderInspect(): HTMLElement {
  const { selected } = getState();
  if (!selected) {
    return h(
      'div',
      { class: 'view' },
      h('div', { class: 'empty' },
        h('p', { text: 'Pick an element to inspect it in detail.' }),
        h('button', { class: 'btn btn--primary', text: '⌖ Start picking', on: { click: () => void togglePicker() } }),
        h('p', { class: 'hint', text: 'Tip: press ⌘/Ctrl+Shift+F while hovering a tooltip to freeze and capture it.' }),
      ),
    );
  }

  const s = selected;
  const st = s.styles;
  const matrix = h('div', { class: 'color-matrix' },
    colorCard('text', st.color),
    colorCard('background', st.backgroundColor),
  );

  const typo = h('div', { class: 'prop-group' },
    propRow('font-family', st.fontFamily),
    propRow('font-size', st.fontSize),
    propRow('font-weight', st.fontWeight),
    propRow('line-height', st.lineHeight),
    propRow('letter-spacing', st.letterSpacing),
    propRow('text-align', st.textAlign),
    propRow('text-transform', st.textTransform),
    propRow('text-decoration', st.textDecoration),
  );

  const box = h('div', { class: 'prop-group' },
    propRow('padding', st.padding),
    propRow('margin', st.margin),
    propRow('border', st.border),
    propRow('border-radius', st.borderRadius),
    propRow('box-shadow', st.boxShadow),
    propRow('opacity', st.opacity),
    propRow('display', st.display),
  );

  const locators = h('div', { class: 'prop-group' },
    locatorRow('CSS', s.identity.cssSelector),
    locatorRow('XPath', s.identity.xpath),
    s.identity.testId ? locatorRow('testid', s.identity.testId) : null,
  );

  const ruleBar = h('div', { class: 'rule-bar' },
    h('span', { class: 'state-badge', text: s.state }),
    copyButton(() => toCssRule(s), 'Copy CSS rule'),
  );

  return h('div', { class: 'view' },
    header(s),
    sectionLabel('Colour'),
    matrix,
    contrastNote(s),
    sectionLabel('Locators'),
    locators,
    sectionLabel('Typography'),
    typo,
    sectionLabel('Box'),
    box,
    ruleBar,
  );
}

function sectionLabel(text: string): HTMLElement {
  return h('div', { class: 'section-label', text });
}
