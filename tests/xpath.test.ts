import { describe, it, expect, beforeEach } from 'vitest';
import { buildXPath } from '../src/lib/xpath';

/** Resolve an XPath in jsdom and return the matched node (or null). */
function evalXPath(xpath: string): Node | null {
  const result = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  );
  return result.singleNodeValue;
}

describe('buildXPath', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('uses a stable data attribute when present', () => {
    document.body.innerHTML = '<button data-testid="save">Save</button>';
    const el = document.querySelector('button')!;
    expect(buildXPath(el)).toBe("//button[@data-testid='save']");
  });

  it('anchors on id', () => {
    document.body.innerHTML = '<div id="main">x</div>';
    const el = document.getElementById('main')!;
    expect(buildXPath(el)).toBe("//*[@id='main']");
  });

  it('builds a positional path that resolves to the element', () => {
    document.body.innerHTML = '<ul><li>a</li><li>b</li><li>c</li></ul>';
    const el = document.querySelectorAll('li')[2]!;
    const xpath = buildXPath(el);
    expect(xpath).toContain('li[3]');
    expect(evalXPath(xpath)).toBe(el);
  });

  it('stops at the nearest ancestor with an id', () => {
    document.body.innerHTML = '<div id="card"><span><b>hi</b></span></div>';
    const el = document.querySelector('b')!;
    const xpath = buildXPath(el);
    expect(xpath.startsWith("//*[@id='card']")).toBe(true);
    expect(evalXPath(xpath)).toBe(el);
  });
});
