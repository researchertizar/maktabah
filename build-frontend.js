/**
 * scripts/build-frontend.js
 *
 * Copies the static frontend into ./dist/ so Wrangler only uploads
 * the site files — not node_modules, api/, or any other backend artefacts.
 *
 * Run via:  npm run build:frontend
 *           npm run deploy:frontend   (build + wrangler deploy)
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

/* Files and directories to copy into dist/ */
const INCLUDE = [
  'index.html',
  'sw.js',
  'manifest.json',
  'css',
  'js',
  'assets',
];

/* Clean dist/ */
if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
fs.mkdirSync(DIST, { recursive: true });

function copyItem(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyItem(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

let total = 0;
for (const item of INCLUDE) {
  const src  = path.join(ROOT, item);
  const dest = path.join(DIST, item);
  if (!fs.existsSync(src)) { console.warn(`SKIP (not found): ${item}`); continue; }
  copyItem(src, dest);
  const count = fs.statSync(src).isDirectory()
    ? fs.readdirSync(src, { recursive: true }).length
    : 1;
  total += count;
  console.log(`  ✓  ${item}`);
}

console.log(`\nBuild complete → dist/   (${total} files)\n`);
console.log('Next: npx wrangler deploy');
