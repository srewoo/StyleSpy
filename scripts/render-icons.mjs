// Renders the StyleSpy lens mark (designs/icon-source.svg) into the PNG icon
// sizes Chrome needs. Run with `npm run build:icons`.
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';

const SRC = 'designs/icon-source.svg';
const OUT_DIR = 'public/icons';
const SIZES = [16, 48, 128];

mkdirSync(OUT_DIR, { recursive: true });
const svg = readFileSync(SRC);

for (const size of SIZES) {
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(`${OUT_DIR}/icon${size}.png`);
  console.log(`wrote ${OUT_DIR}/icon${size}.png`);
}
