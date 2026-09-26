#!/usr/bin/env node
/**
 * Ping IndexNow with the URLs in the built sitemap.
 *
 * IndexNow is a push protocol: instead of waiting for a crawler to notice a
 * change, the site announces one. Bing, Yandex, Seznam and Naver consume it —
 * Google does not, and has said it has no plans to. So this reaches a minority
 * of the traffic, and is here because it costs almost nothing, not because it
 * moves the numbers.
 *
 * Ownership is proved by `public/<key>.txt` containing the key verbatim: the
 * receiving engine fetches it and compares. The key is public by design — it
 * is served from the site — so it lives in the repo rather than in a secret,
 * where it would look protected without being so.
 *
 * Run after a deploy, against the live site:
 *
 *   npm run indexnow             # every sitemap URL
 *   npm run indexnow -- --dry    # print the payload, send nothing
 *
 * Sending the full sitemap is deliberate. The spec asks for changed URLs only,
 * but at 16 pages the saving is theoretical, and working out which pages a
 * commit actually changed means diffing built output — more moving parts than
 * the thing is worth. Revisit if the site grows past a few hundred pages.
 */

import { readFileSync } from 'node:fs';

const KEY = '2dcc707626e9d204dc3122dbe8cb8b57';
const HOST = 'ahmadabuhasan.com';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const SITEMAP = 'dist/sitemap-0.xml';

const dryRun = process.argv.includes('--dry');

/** Every <loc> in the built sitemap. It already excludes /404 and drafts. */
function sitemapUrls() {
  const xml = readFileSync(SITEMAP, 'utf8');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (urls.length === 0) throw new Error(`No <loc> entries in ${SITEMAP}`);
  return urls;
}

const urlList = sitemapUrls();
const payload = { host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList };

console.log(`${urlList.length} URL(s) from ${SITEMAP}`);
for (const u of urlList) console.log(`  ${u}`);

if (dryRun) {
  console.log('\n--dry: nothing sent.');
  process.exit(0);
}

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload),
});

/*
 * 200 and 202 both mean accepted — 202 adds "key validation pending", which is
 * what a first submission returns. Anything else is reported but does not fail
 * the build: a rejected ping leaves the site exactly as it was, and failing a
 * deploy over a hint to a minority search engine would be the wrong trade.
 */
if (res.ok) {
  console.log(`\nIndexNow: ${res.status} ${res.statusText}`);
} else {
  const body = await res.text().catch(() => '');
  console.warn(`\nIndexNow declined: ${res.status} ${res.statusText}${body ? ` — ${body}` : ''}`);
}
