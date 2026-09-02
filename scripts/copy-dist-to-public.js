#!/usr/bin/env node
/**
 * Copy Vite build output (dist/) into Capacitor webDir (public/).
 *
 * Pipeline:
 *   src/ → (tsc + vite build) → dist/ → (this script) → public/ → (cap sync) → android/
 *
 * Why:
 *   capacitor.config.ts uses `webDir: 'public'` (legacy).
 *   Vite outputs to `dist/` by default.
 *   Without this script, `cap sync` would copy stale assets from public/
 *   to the Android project, and the APK would ship outdated code.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const publicDir = path.join(root, 'public');

if (!fs.existsSync(dist)) {
  console.error(`[copy-dist-to-public] ERROR: ${dist} does not exist. Run "npm run build" first.`);
  process.exit(1);
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

// 1) Copy index.html → public/index.html
const distHtml = path.join(dist, 'index.html');
const publicHtml = path.join(publicDir, 'index.html');
if (fs.existsSync(distHtml)) {
  fs.copyFileSync(distHtml, publicHtml);
  console.log(`[copy-dist-to-public] ✓ index.html → public/`);
}

// 2) Copy dist/assets/* → public/assets/*
const distAssets = path.join(dist, 'assets');
const publicAssets = path.join(publicDir, 'assets');
if (fs.existsSync(distAssets)) {
  if (!fs.existsSync(publicAssets)) fs.mkdirSync(publicAssets, { recursive: true });
  let count = 0;
  for (const entry of fs.readdirSync(distAssets)) {
    fs.copyFileSync(path.join(distAssets, entry), path.join(publicAssets, entry));
    count++;
  }
  console.log(`[copy-dist-to-public] ✓ ${count} file(s) from assets/ → public/assets/`);
}

console.log(`[copy-dist-to-public] ✅ Done. Ready for "npx cap sync android".`);