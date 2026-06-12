/**
 * Build a stable, reasonably-short CSS selector for an element — preferring
 * the kinds of hooks QA automation relies on (data-testid, id) before falling
 * back to a structural `:nth-of-type` path.
 */

/** Attributes that make great automation locators, in priority order. */
const STABLE_ATTRS = ['data-testid', 'data-test', 'data-qa', 'data-mt-id', 'name'];

/** Class fragments that look auto-generated and shouldn't anchor a selector. */
const VOLATILE_CLASS_RE = /^(css-[a-z0-9]+|[a-z0-9]{6,}|.*\d{4,}.*|sc-[a-zA-Z0-9]+)$/;

function escapeIdent(value: string): string {
  // CSS.escape exists in the browser; tests run in jsdom which also provides it.
  return typeof CSS !== 'undefined' && CSS.escape
    ? CSS.escape(value)
    : value.replace(/([^\w-])/g, '\\$1');
}

function isUniqueId(root: Document, id: string): boolean {
  return root.querySelectorAll(`#${escapeIdent(id)}`).length === 1;
}

/** Pick stable, human-authored class names (skips hashed CSS-module noise). */
function stableClasses(el: Element): string[] {
  return Array.from(el.classList).filter((c) => c && !VOLATILE_CLASS_RE.test(c));
}

function attrSelector(el: Element): string | null {
  for (const attr of STABLE_ATTRS) {
    const val = el.getAttribute(attr);
    if (val) return `[${attr}="${val.replace(/"/g, '\\"')}"]`;
  }
  return null;
}

/** Selector segment for one element, ignoring its ancestors. */
function segment(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const attr = attrSelector(el);
  if (attr) return `${tag}${attr}`;

  const classes = stableClasses(el).slice(0, 2);
  let sel = tag + classes.map((c) => `.${escapeIdent(c)}`).join('');

  const parent = el.parentElement;
  if (parent) {
    const sameTag = Array.from(parent.children).filter(
      (c) => c.tagName === el.tagName,
    );
    if (sameTag.length > 1) {
      sel += `:nth-of-type(${sameTag.indexOf(el) + 1})`;
    }
  }
  return sel;
}

/**
 * Build a CSS selector for `el`. Short-circuits on a unique id or a stable
 * data attribute; otherwise walks up to `maxDepth` ancestors building a
 * `>`-joined path. The result is verified to resolve (in the element's own
 * document) when possible.
 */
export function buildCssSelector(el: Element, maxDepth = 6): string {
  const doc = el.ownerDocument;

  const attr = attrSelector(el);
  if (attr) {
    const candidate = `${el.tagName.toLowerCase()}${attr}`;
    if (doc.querySelectorAll(candidate).length === 1) return candidate;
  }

  if (el.id && isUniqueId(doc, el.id)) {
    return `#${escapeIdent(el.id)}`;
  }

  const parts: string[] = [];
  let current: Element | null = el;
  let depth = 0;

  while (current && current !== doc.documentElement && depth < maxDepth) {
    parts.unshift(segment(current));
    // Stop early if the partial path is already unique.
    const joined = parts.join(' > ');
    if (doc.querySelectorAll(joined).length === 1) return joined;

    if (current.id && isUniqueId(doc, current.id)) {
      parts[0] = `#${escapeIdent(current.id)}`;
      return parts.join(' > ');
    }
    current = current.parentElement;
    depth += 1;
  }

  return parts.join(' > ');
}
