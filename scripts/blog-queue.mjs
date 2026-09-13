#!/usr/bin/env node
/**
 * Blog posting queue.
 *
 *   node scripts/blog-queue.mjs            list every post, next one first
 *   node scripts/blog-queue.mjs --publish  flip the next due post to draft:false
 *
 * A post goes live when `draft: false` AND its publishedAt has arrived.
 * Everything else stays invisible: no page built, no sitemap entry, no RSS.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BLOG_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'blog');
const SKIP = new Set(['example-post.md']);

const field = (text, name) => text.match(new RegExp(`^${name}: (.+)$`, 'm'))?.[1].trim() ?? '';
const today = new Date().toISOString().slice(0, 10);

const posts = readdirSync(BLOG_DIR)
  .filter((f) => f.endsWith('.md') && !SKIP.has(f))
  .map((file) => {
    const text = readFileSync(join(BLOG_DIR, file), 'utf8');
    return {
      file,
      date: field(text, 'publishedAt'),
      draft: field(text, 'draft') !== 'false',
      title: field(text, 'title').replace(/^'|'$/g, ''),
    };
  })
  .sort((a, b) => a.date.localeCompare(b.date));

const pending = posts.filter((p) => p.draft);
const next = pending[0];

if (process.argv.includes('--publish')) {
  if (!next) {
    console.log('Nothing left to publish — every post is live.');
    process.exit(0);
  }
  const path = join(BLOG_DIR, next.file);
  const text = readFileSync(path, 'utf8').replace(/^draft: true$/m, 'draft: false');
  writeFileSync(path, text);
  console.log(`Published  ${next.date}  ${next.title}`);
  console.log(`           ${next.file}`);

  /* Draft cards are not generated ahead of time, so the post needs one now —
     doing it here means there is no separate step to forget. */
  console.log('\nGenerating share card…');
  const og = spawnSync(process.execPath, [join(import.meta.dirname, 'og-images.mjs')], {
    stdio: 'inherit',
  });
  if (og.status !== 0) {
    console.error('\nCard generation failed — run: node scripts/og-images.mjs');
  }

  console.log('\nNext: npm run build, then commit and push.');
  process.exit(0);
}

const live = posts.filter((p) => !p.draft);
console.log(`${posts.length} posts — ${live.length} live, ${pending.length} queued.  Today: ${today}\n`);

for (const p of posts) {
  const due = p.draft && p.date <= today ? ' <- DUE' : '';
  console.log(`${p.date}  ${p.draft ? 'draft' : 'LIVE '}  ${p.title}${due}`);
}

if (next) {
  console.log(`\nNext up: ${next.date} — ${next.title}`);
  console.log(`  file:  src/content/blog/${next.file}`);
  console.log('  live:  set draft: false  (or run this script with --publish)');
}
