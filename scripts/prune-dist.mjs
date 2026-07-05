#!/usr/bin/env node
/**
 * Post-build: remove unreferenced files from `dist/_astro/`.
 *
 * Astro's asset pipeline emits the original of every image imported via
 * `image()` in content collections, even when only its transformed WebP
 * variants are referenced in the built HTML. This walks every text output
 * in dist and deletes _astro/* files whose basename never appears.
 *
 * Fonts, CSS, and JS in _astro/ are always kept (fonts are loaded lazily
 * from CSS `url()` and may be missed by a naive text scan for basenames).
 */

import { readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = 'dist';
const ASTRO_DIR = join(DIST, '_astro');

const KEEP_EXTS = new Set(['.woff2', '.woff', '.css', '.js', '.mjs']);
const SCAN_EXTS = new Set(['.html', '.xml', '.css', '.js', '.txt', '.webmanifest']);

function walk(dir, buf = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, buf);
    else if (SCAN_EXTS.has(extname(entry))) buf.push(full);
  }
  return buf;
}

const textFiles = walk(DIST);
const haystack = textFiles.map((f) => readFileSync(f, 'utf8')).join('\n');

let removed = 0;
let removedBytes = 0;

for (const entry of readdirSync(ASTRO_DIR)) {
  if (KEEP_EXTS.has(extname(entry))) continue;
  if (haystack.includes(entry)) continue;

  const full = join(ASTRO_DIR, entry);
  const size = statSync(full).size;
  unlinkSync(full);
  removed++;
  removedBytes += size;
  console.log(`  pruned ${entry} (${(size / 1024).toFixed(0)} KB)`);
}

if (removed > 0) {
  console.log(
    `Pruned ${removed} unreferenced asset(s), ${(removedBytes / 1024 / 1024).toFixed(2)} MB reclaimed.`,
  );
} else {
  console.log('No unreferenced assets found.');
}
