/**
 * Build an XPath for an element. Prefers an id-anchored absolute path, then a
 * stable-attribute predicate, otherwise a positional `/tag[n]` path — the form
 * Selenium/Playwright/Cypress consume directly.
 */

const STABLE_ATTRS = ['data-testid', 'data-test', 'data-qa', 'data-mt-id'];

function indexAmongSameTag(el: Element): number {
  let index = 1;
  let sib = el.previousElementSibling;
  while (sib) {
    if (sib.tagName === el.tagName) index += 1;
    sib = sib.previousElementSibling;
  }
  return index;
}

function attrPredicate(el: Element): string | null {
  for (const attr of STABLE_ATTRS) {
    const val = el.getAttribute(attr);
    if (val) return `//${el.tagName.toLowerCase()}[@${attr}='${val}']`;
  }
  return null;
}

/**
 * Build an XPath for `el`. If a stable attribute or unique id is present the
 * path is short and readable; otherwise it is a full positional path from the
 * document root.
 */
export function buildXPath(el: Element): string {
  const attr = attrPredicate(el);
  if (attr) return attr;

  if (el.id) {
    return `//*[@id='${el.id}']`;
  }

  const segments: string[] = [];
  let current: Element | null = el;

  while (current && current.nodeType === 1) {
    const tag = current.tagName.toLowerCase();
    if (current.id) {
      segments.unshift(`*[@id='${current.id}']`);
      return `//${segments.join('/')}`;
    }
    segments.unshift(`${tag}[${indexAmongSameTag(current)}]`);
    current = current.parentElement;
  }

  return `/${segments.join('/')}`;
}
