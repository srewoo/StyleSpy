import sharp from 'sharp';
import { readFileSync } from 'node:fs';

async function render(src, out, scale) {
  const svg = readFileSync(src);
  await sharp(svg, { density: 72 * scale }).png().toFile(out);
  console.log('wrote', out);
}
await render('designs/capture-list-mockup.svg', 'designs/capture-list-mockup.png', 2);
await render('designs/full-table-mockup.svg', 'designs/full-table-mockup.png', 1.6);
