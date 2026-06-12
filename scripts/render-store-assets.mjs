/**
 * Renders the Chrome Web Store listing imagery into `store-assets/`:
 *
 *   screenshot-1-capture.png    1280×800   (store screenshot)
 *   screenshot-2-table.png      1280×800   (store screenshot)
 *   screenshot-3-locators.png   1280×800   (store screenshot)
 *   tile-small-440x280.png      440×280    (small promo tile)
 *   tile-marquee-1400x560.png   1400×560   (marquee promo tile)
 *
 * Built from the brand palette + the existing UI mockups in designs/, composited
 * as rounded panels over a baked-in soft shadow. Output is generated
 * (git-ignored); run with `npm run build:store`. The 128px store icon is the
 * existing public/icons/icon128.png.
 */
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';

const OUT = 'store-assets';
mkdirSync(OUT, { recursive: true });

// ── Brand palette (matches designs/icon-source.svg + the app CSS) ────────────
const C = {
  ink: '#20232a',
  teal: '#2f7d72',
  gold: '#cfae5e',
  terra: '#c2603f',
  blue: '#3a4a7a',
  paper: '#f7f6f3',
  white: '#ffffff',
  muted: '#6b6f76',
  line: '#e3e1da',
};
const FONT = "-apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const buf = (svg) => Buffer.from(svg);

/** The StyleSpy lens mark (128-unit artwork from icon-source.svg) at any size. */
function lensMark(size) {
  const s = size / 128;
  return `<g transform="scale(${s})">
    <rect x="86" y="86" width="22" height="34" rx="11" transform="rotate(45 86 86)" fill="${C.ink}"/>
    <circle cx="54" cy="52" r="42" fill="${C.white}" stroke="${C.ink}" stroke-width="10"/>
    <rect x="30" y="28" width="22" height="22" rx="3.5" fill="${C.teal}"/>
    <rect x="56" y="28" width="22" height="22" rx="3.5" fill="${C.gold}"/>
    <rect x="30" y="54" width="22" height="22" rx="3.5" fill="${C.terra}"/>
    <rect x="56" y="54" width="22" height="22" rx="3.5" fill="${C.blue}"/>
  </g>`;
}

/** Soft drop-shadow markup baked into a (canvas-sized) background SVG. */
let shadowSeq = 0;
function shadowRect(x, y, w, h, r = 14) {
  const id = `sh${(shadowSeq += 1)}`;
  return `<defs><filter id="${id}" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="22"/>
    </filter></defs>
    <rect x="${x}" y="${y + 10}" width="${w}" height="${h}" rx="${r}"
      fill="rgba(32,35,42,0.30)" filter="url(#${id})"/>`;
}

/** Rasterize a mockup SVG file crisply, resize to w×h, and round its corners. */
async function panel(file, w, h, radius = 14) {
  const png = await sharp(readFileSync(file), { density: 220 })
    .resize(w, h, { fit: 'fill' })
    .png()
    .toBuffer();
  const mask = buf(
    `<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`,
  );
  return sharp(png).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

/** Render a canvas-sized background SVG and composite positioned panel PNGs. */
async function compose(out, bgSvg, items) {
  const layers = items.map((it) => ({ input: it.png, left: it.left, top: it.top }));
  await sharp(buf(bgSvg)).composite(layers).png().toFile(`${OUT}/${out}`);
  console.log('wrote', `${OUT}/${out}`);
}

/** A heading block (eyebrow + multi-line title + subtitle + bullets) as SVG. */
function copyBlock(x, y, { eyebrow, titleLines, subtitle, bullets = [] }) {
  const dot = [C.teal, C.gold, C.terra, C.blue];
  let ty = y;
  let svg = '';
  if (eyebrow) {
    svg += `<text x="${x}" y="${ty}" font-family="${FONT}" font-size="17" font-weight="700"
      letter-spacing="0.14em" fill="${C.teal}">${eyebrow}</text>`;
    ty += 46;
  }
  for (const line of titleLines) {
    svg += `<text x="${x}" y="${ty}" font-family="${FONT}" font-size="52" font-weight="800"
      fill="${C.ink}">${line}</text>`;
    ty += 62;
  }
  if (subtitle) {
    ty += 10;
    svg += `<text x="${x}" y="${ty}" font-family="${FONT}" font-size="23" font-weight="400"
      fill="${C.muted}">${subtitle}</text>`;
    ty += 30;
  }
  ty += 28;
  bullets.forEach((b, i) => {
    svg += `<circle cx="${x + 8}" cy="${ty - 7}" r="8" fill="${dot[i % dot.length]}"/>`;
    svg += `<text x="${x + 30}" y="${ty}" font-family="${FONT}" font-size="22" font-weight="600"
      fill="${C.ink}">${b}</text>`;
    ty += 42;
  });
  return svg;
}

// ── Screenshot 1 — Capture (panel on the right, copy on the left) ────────────
{
  const w = 1280, h = 800;
  const pw = 408, ph = 700;
  const px = w - pw - 90, py = (h - ph) / 2;
  const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="${C.paper}"/>
    <circle cx="80" cy="${h - 70}" r="150" fill="${C.teal}" opacity="0.05"/>
    <g transform="translate(80,80)">${lensMark(56)}</g>
    ${copyBlock(80, 220, {
      eyebrow: 'CSS &amp; STATE INSPECTOR',
      titleLines: ['See the CSS behind', 'every element.'],
      subtitle: 'Static, hidden, and dynamic — captured in one click.',
      bullets: [
        'Computed colour, type &amp; box model',
        'Hover / focus / active states, frozen',
        'Locator-health score for QA',
      ],
    })}
    ${shadowRect(px, py, pw, ph)}
  </svg>`;
  const png = await panel('designs/capture-list-mockup.svg', pw, ph);
  await compose('screenshot-1-capture.png', bgSvg, [{ png, left: px, top: py }]);
}

// ── Screenshot 2 — Full table (caption on top, wide table below) ─────────────
{
  const w = 1280, h = 800;
  const pw = 1130, ph = Math.round((1130 * 620) / 1380); // keep table aspect
  const px = Math.round((w - pw) / 2), py = 210;
  const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="${C.paper}"/>
    <g transform="translate(${(w - 44) / 2 - 360},66)">${lensMark(44)}</g>
    <text x="${w / 2}" y="92" text-anchor="middle" font-family="${FONT}" font-size="44"
      font-weight="800" fill="${C.ink}">Sortable, exportable full table</text>
    <text x="${w / 2}" y="138" text-anchor="middle" font-family="${FONT}" font-size="23"
      font-weight="400" fill="${C.muted}">Every element &amp; its styles — toggle columns, sort, filter, export CSV / JSON.</text>
    ${shadowRect(px, py, pw, ph, 12)}
  </svg>`;
  const png = await panel('designs/full-table-mockup.svg', pw, ph, 12);
  await compose('screenshot-2-table.png', bgSvg, [{ png, left: px, top: py }]);
}

// ── Screenshot 3 — Locators (panel on the left, copy on the right) ───────────
{
  const w = 1280, h = 800;
  const pw = 420, ph = 660;
  const px = 110, py = (h - ph) / 2;
  const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="${C.paper}"/>
    <circle cx="${w - 80}" cy="80" r="160" fill="${C.blue}" opacity="0.05"/>
    <g transform="translate(${w - 136},80)">${lensMark(56)}</g>
    ${copyBlock(560, 240, {
      eyebrow: 'BUILT FOR AUTOMATION',
      titleLines: ['Copy-ready CSS', '&amp; XPath locators.'],
      subtitle: 'For Selenium, Playwright &amp; Cypress.',
      bullets: [
        'Prefers data-testid / id',
        'WCAG contrast check, AA flag',
        'Ghost DOM + live mutation feed',
      ],
    })}
    ${shadowRect(px, py, pw, ph)}
  </svg>`;
  const png = await panel('designs/sidepanel-mockup.svg', pw, ph);
  await compose('screenshot-3-locators.png', bgSvg, [{ png, left: px, top: py }]);
}

// ── Small promo tile 440×280 ─────────────────────────────────────────────────
{
  const w = 440, h = 280;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="${C.paper}"/>
    <rect x="0" y="${h - 6}" width="${w}" height="6" fill="${C.teal}"/>
    <g transform="translate(${(w - 92) / 2},44)">${lensMark(92)}</g>
    <text x="${w / 2}" y="200" text-anchor="middle" font-family="${FONT}" font-size="40"
      font-weight="800" fill="${C.ink}">StyleSpy</text>
    <text x="${w / 2}" y="232" text-anchor="middle" font-family="${FONT}" font-size="17"
      font-weight="600" letter-spacing="0.04em" fill="${C.muted}">CSS &amp; State Inspector</text>
  </svg>`;
  await sharp(buf(svg)).png().toFile(`${OUT}/tile-small-440x280.png`);
  console.log('wrote', `${OUT}/tile-small-440x280.png`);
}

// ── Marquee promo tile 1400×560 ──────────────────────────────────────────────
{
  const w = 1400, h = 560;
  const pw = 360, ph = 520;
  const px = w - pw - 120, py = (h - ph) / 2;
  const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="${C.paper}"/>
    <rect width="14" height="${h}" fill="${C.teal}"/>
    <circle cx="${w - 250}" cy="${h + 80}" r="280" fill="${C.gold}" opacity="0.06"/>
    <g transform="translate(96,84)">${lensMark(72)}</g>
    <text x="186" y="150" font-family="${FONT}" font-size="64" font-weight="800" fill="${C.ink}">StyleSpy</text>
    ${copyBlock(96, 250, {
      titleLines: ['Inspect the CSS of', 'every element.'],
      subtitle: 'Hidden, dynamic, frozen hover states — with copy-ready locators.',
      bullets: [
        'Capture the whole page at once',
        'Freeze hover / focus, reveal ghost DOM',
        'CSS + XPath locators for QA',
      ],
    })}
    ${shadowRect(px, py, pw, ph)}
  </svg>`;
  const png = await panel('designs/capture-list-mockup.svg', pw, ph);
  await compose('tile-marquee-1400x560.png', bgSvg, [{ png, left: px, top: py }]);
}

console.log('\n✔ Store assets in', `${OUT}/`, '— upload at the Web Store developer console.');
console.log('  Screenshots: 1280×800 · Small tile: 440×280 · Marquee: 1400×560 · Icon: public/icons/icon128.png');
