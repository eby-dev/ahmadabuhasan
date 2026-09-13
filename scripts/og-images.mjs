#!/usr/bin/env node
/**
 * Per-post Open Graph images.
 *
 *   node scripts/og-images.mjs          generate cards for published posts
 *   node scripts/og-images.mjs --force  regenerate them
 *   node scripts/og-images.mjs --all    include drafts (to preview a card)
 *
 * Writes public/og/blog/<slug>.png (1200x630) for every published post, drawn
 * to match public/og/default.png: same dark ground, same accent, same layout.
 * The only per-post content is the post's own title and tags, so nothing has
 * to be designed or sourced for a new post — it inherits the template.
 *
 * Rendered as SVG, then rasterised with sharp (already present as an Astro
 * dependency) because several platforms — WhatsApp among them — will not
 * accept an SVG as og:image.
 *
 * Fonts are referenced by family name and resolved by the renderer against
 * what is installed. Geist is the site face; the fallbacks keep the output
 * sane on a machine that does not have it rather than failing the build.
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BLOG_DIR = join(ROOT, 'src', 'content', 'blog');
const OUT_DIR = join(ROOT, 'public', 'og', 'blog');
const SKIP = new Set(['example-post.md']);

const WIDTH = 1200;
const HEIGHT = 630;
const PAD = 90;

/* Pulled from src/styles/tokens.css (dark theme) so the card cannot drift
   away from the site's own palette without someone noticing. */
const BG = '#0d0d0f';
const ACCENT = '#3ddc97';
const TEXT = '#f5f5f5';
const MUTED = '#a3a3a3';

const FONT = "Geist Variable, Geist, Segoe UI, Helvetica Neue, Arial, sans-serif";

const force = process.argv.includes('--force');
const includeDrafts = process.argv.includes('--all');

const field = (text, name) => text.match(new RegExp(`^${name}: (.+)$`, 'm'))?.[1].trim() ?? '';

const escapeXml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Wrap on width rather than character count: "One Field, Twenty Screens" and
 * "MMMM MMMM" are the same length and nothing like the same width. The factor
 * is an average glyph-width ratio for this face at this weight — close enough
 * for a headline, and cheap.
 */
function wrap(text, fontSize, maxWidth, maxLines) {
  const perChar = fontSize * 0.54;
  const limit = Math.floor(maxWidth / perChar);
  const lines = [];
  let line = '';

  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= limit) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);

  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/[,;:]$/, '')}…`;
    return kept;
  }
  return lines;
}

/** Long titles step down a size so they still fit three lines. */
function titleSize(title) {
  if (title.length <= 34) return 78;
  if (title.length <= 56) return 66;
  return 56;
}

function buildSvg({ title, tags }) {
  const size = titleSize(title);
  const lines = wrap(title, size, WIDTH - PAD * 2, 3);
  const lineHeight = Math.round(size * 1.18);

  /* Anchor the block so one-, two- and three-line titles all sit optically
     centred instead of drifting toward the top. */
  const blockHeight = lines.length * lineHeight;
  const startY = Math.round((HEIGHT - blockHeight) / 2) + size * 0.78;

  const titleTspans = lines
    .map(
      (line, i) =>
        `<tspan x="${PAD}" y="${startY + i * lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join('');

  /* Tag pills, laid out left to right. Width is estimated from the label the
     same way the title wrap is — exact enough for short words. */
  let cursor = PAD;
  const pills = tags
    .slice(0, 4)
    .map((tag) => {
      const label = escapeXml(tag);
      const w = Math.round(tag.length * 11.5 + 46);
      const x = cursor;
      cursor += w + 14;
      return `
    <rect x="${x}" y="${HEIGHT - PAD - 46}" width="${w}" height="46" rx="23"
          fill="${ACCENT}" fill-opacity="0.12" stroke="${ACCENT}" stroke-opacity="0.35"/>
    <text x="${x + w / 2}" y="${HEIGHT - PAD - 16}" font-family="${FONT}" font-size="20"
          fill="${ACCENT}" text-anchor="middle">${label}</text>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>

  <!-- accent rule along the top, as on the site's default card -->
  <rect width="${WIDTH}" height="6" fill="${ACCENT}"/>

  <!-- faint grid, same idea as default.png: texture without drawing attention -->
  <g stroke="${ACCENT}" stroke-opacity="0.05">
    <line x1="300" y1="0" x2="300" y2="${HEIGHT}"/>
    <line x1="900" y1="0" x2="900" y2="${HEIGHT}"/>
    <line x1="0" y1="160" x2="${WIDTH}" y2="160"/>
    <line x1="0" y1="470" x2="${WIDTH}" y2="470"/>
  </g>

  <!-- eyebrow -->
  <rect x="${PAD}" y="68" width="38" height="38" rx="10" fill="${ACCENT}" fill-opacity="0.15"
        stroke="${ACCENT}" stroke-opacity="0.5"/>
  <text x="${PAD + 19}" y="94" font-family="${FONT}" font-size="22" font-weight="700"
        fill="${ACCENT}" text-anchor="middle">A</text>
  <text x="${PAD + 54}" y="94" font-family="${FONT}" font-size="19" font-weight="600"
        fill="${MUTED}" letter-spacing="3.5">MOBILE DEVELOPER</text>

  <!-- title -->
  <text font-family="${FONT}" font-size="${size}" font-weight="700" fill="${TEXT}"
        >${titleTspans}</text>

  ${pills}

  <text x="${WIDTH - PAD}" y="${HEIGHT - PAD - 16}" font-family="${FONT}" font-size="21"
        fill="${MUTED}" text-anchor="end">ahmadabuhasan.com</text>
</svg>`;
}

const posts = readdirSync(BLOG_DIR)
  .filter((f) => /\.mdx?$/.test(f) && !SKIP.has(f))
  .map((file) => {
    const text = readFileSync(join(BLOG_DIR, file), 'utf8');
    const rawTags = field(text, 'tags');
    return {
      slug: file.replace(/\.mdx?$/, ''),
      title: field(text, 'title').replace(/^'|'$/g, '').replace(/''/g, "'"),
      tags: [...rawTags.matchAll(/'([^']+)'/g)].map((m) => m[1]),
      draft: field(text, 'draft') !== 'false',
    };
  });

mkdirSync(OUT_DIR, { recursive: true });

/* Drafts are excluded by default: their cards would ship in every deploy for
   months before the post they belong to exists. Run with --all to preview one. */
const queue = includeDrafts ? posts : posts.filter((p) => !p.draft);

let written = 0;
let skipped = 0;

for (const post of queue) {
  const out = join(OUT_DIR, `${post.slug}.png`);
  if (!force && existsSync(out)) {
    skipped++;
    continue;
  }
  const svg = buildSvg(post);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
  console.log(`  ${post.slug}.png`);
  written++;
}

const draftCount = posts.length - posts.filter((p) => !p.draft).length;

console.log(`\n${written} written, ${skipped} already present (--force to redo).`);
if (!includeDrafts && draftCount > 0) {
  console.log(`${draftCount} drafts skipped — their cards are generated on publish.`);
}
console.log(`Output: public/og/blog/`);
