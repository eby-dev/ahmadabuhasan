import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

/**
 * True while no *publishable* blog entry exists — the collection is empty, or
 * every entry is a draft. `/blog/` is a static route, so Astro builds it either
 * way, and it self-noindexes while it has nothing to list (see
 * src/pages/blog/index.astro). Listing a noindexed URL in the sitemap sends
 * Google contradictory signals, so the filter below drops it in that state.
 *
 * Drafts must be counted, not just files: two draft entries still leave `/blog/`
 * noindexed. `draft` defaults to true in the schema, so a missing key counts as
 * a draft here too.
 */
const blogDir = fileURLToPath(new URL('./src/content/blog', import.meta.url));
const noPublishableBlogEntry = !readdirSync(blogDir)
  .filter((f) => /\.mdx?$/.test(f))
  .some((f) => /^\s*draft:\s*false\s*$/m.test(readFileSync(`${blogDir}/${f}`, 'utf8')));

export default defineConfig({
  site: 'https://ahmadabuhasan.com',
  output: 'static',
  compressHTML: true,
  build: {
    format: 'directory',
    inlineStylesheets: 'always',
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) =>
        !page.includes('/404') &&
        !page.endsWith('/rss.xml') &&
        !(noPublishableBlogEntry && page.includes('/blog/')),
    }),
  ],
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  image: {
    responsiveStyles: true,
  },
});
