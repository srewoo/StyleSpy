/**
 * Package dist/ into a Chrome Web Store upload zip.
 *
 * The archive contains the *contents* of dist/ (so manifest.json sits at the
 * zip root, as the Web Store requires) and excludes source maps and OS cruft.
 * Run via `npm run zip` (which builds first). Output: web-store/stylespy-v<ver>.zip
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, rmSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = pkg.version;

if (!existsSync('dist/manifest.json')) {
  console.error('dist/manifest.json not found — run `npm run build` first.');
  process.exit(1);
}

const outDir = 'web-store';
mkdirSync(outDir, { recursive: true });
const outFile = path.resolve(outDir, `stylespy-v${version}.zip`);
if (existsSync(outFile)) rmSync(outFile);

// Zip the contents of dist/ (cwd: dist) so the manifest is at the archive root.
// -r recurse, -X strip extra file attributes, -x exclude patterns.
execFileSync(
  'zip',
  ['-r', '-X', outFile, '.', '-x', '*.map', '-x', '*.DS_Store', '-x', '__MACOSX/*'],
  { cwd: 'dist', stdio: 'inherit' },
);

const sizeKb = (statSync(outFile).size / 1024).toFixed(1);
console.log(`\n✔ Web Store package: ${path.relative(process.cwd(), outFile)} (${sizeKb} KB)`);
console.log('  Upload at https://chrome.google.com/webstore/devconsole');
