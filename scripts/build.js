#!/usr/bin/env node
/**
 * scripts/build.js
 * Copies the static frontend into dist/ for Cloudflare Pages deployment.
 * The api/ folder is intentionally excluded — it runs on a separate server.
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

/* Files and folders that belong in the static frontend */
const STATIC = [
  'index.html',
  'manifest.json',
  'sw.js',
  'css',
  'js',
  'assets',
];

/* Always exclude from dist */
const EXCLUDE = new Set([
  'node_modules', 'api', 'dist', 'scripts',
  '.git', '.env', '.env.local', '.env.production',
  'package.json', 'package-lock.json', 'wrangler.jsonc',
  '.gitignore', '.DS_Store',
]);

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      if (!EXCLUDE.has(child)) {
        copyRecursive(path.join(src, child), path.join(dest, child));
      }
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

/* Clean dist */
if (fs.existsSync(DIST)) {
  fs.rmSync(DIST, { recursive: true, force: true });
}
fs.mkdirSync(DIST, { recursive: true });

let copied = 0;
for (const item of STATIC) {
  const src = path.join(ROOT, item);
  if (!fs.existsSync(src)) {
    console.warn(`⚠  Skipping missing: ${item}`);
    continue;
  }
  copyRecursive(src, path.join(DIST, item));
  copied++;
  console.log(`  ✓ ${item}`);
}

console.log(`\n✅ Build complete — ${copied} items copied to dist/`);
console.log(`   Size: ${getDirSize(DIST)} KB`);

function getDirSize(dir) {
  let total = 0;
  for (const f of walkFiles(dir)) total += fs.statSync(f).size;
  return Math.round(total / 1024);
}
function* walkFiles(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walkFiles(full);
    else yield full;
  }
}
