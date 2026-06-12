/**
 * Tiny hyperscript helper so the UI can build DOM without a framework or
 * innerHTML (which would invite injection from page-derived text). Everything
 * is created as real nodes with textContent, so captured page strings are
 * never interpreted as markup.
 */
type Child = Node | string | null | undefined | false;

interface Props {
  class?: string;
  text?: string;
  title?: string;
  html?: never; // intentionally unsupported — use text/children
  dataset?: Record<string, string>;
  attrs?: Record<string, string>;
  style?: Partial<CSSStyleDeclaration>;
  on?: Partial<Record<keyof HTMLElementEventMap, EventListener>>;
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props.class) el.className = props.class;
  if (props.text !== undefined) el.textContent = props.text;
  if (props.title) el.title = props.title;
  if (props.dataset)
    for (const [k, v] of Object.entries(props.dataset)) el.dataset[k] = v;
  if (props.attrs)
    for (const [k, v] of Object.entries(props.attrs)) el.setAttribute(k, v);
  if (props.style) Object.assign(el.style, props.style);
  if (props.on)
    for (const [evt, fn] of Object.entries(props.on))
      el.addEventListener(evt, fn as EventListener);
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child);
  }
  return el;
}

/** Remove all children of a node. */
export function clear(node: Node): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}
