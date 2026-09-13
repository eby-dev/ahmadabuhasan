# Working on this repo

Personal website of Ahmad Abu Hasan — Astro 7, static output, deployed to
Cloudflare Pages on push to `main`.

Read [README.md](README.md) first for the stack and the deliberate
constraints. This file covers what is not obvious from the code.

## Before you push

CI runs four gates in order, and the first one catches most mistakes:

```
npm run format:check   # prettier --check . — the WHOLE repo, not just src/
npm run check          # astro check
npm run build
npm run a11y           # axe against the built output
```

Run `npm run format:check` before pushing to `main`. A push that fails it
turns CI red for everyone, and Cloudflare will still have deployed.

**On Windows, `format:check` lies.** `core.autocrlf=true` writes CRLF while
Prettier expects LF, so every file reports as unformatted. Verify with
`npx prettier --check --end-of-line crlf .` — if that passes, CI will pass.

## Publishing a blog post

Posts are written ahead and dated; `src/content/blog/` holds a queue running
into 2027, two a month on scattered dates.

```
npm run blog             # the queue, next one first; anything past its date is DUE
npm run blog:publish     # flips the earliest remaining draft to draft: false
npm run build
```

`blog:publish` also generates that post's share card, because cards are not
built ahead of time — see below. Flipping `draft: false` by hand skips that
step, and the post silently falls back to the site's default card.

A post needs **both** `draft: false` and a `publishedAt` that has arrived
before it builds, so publishing a few days early is safe.

After the first post of a new section goes live, request indexing for its URL
in Search Console. Later posts are found through the sitemap on their own.

## Content rules

These come from Ahmad's own decisions. Do not undo them without asking.

- **No download counts.** Several apps kept growing after his engagement
  ended; that growth is not his to claim. The schema has a `downloads`
  field — it is deliberately unused.
- **Brighton Real Estate is contributed work**, not authorship. The app was
  live and mature before he joined in Nov 2024. Describe the migration work,
  never the app as his.
- **Client artwork is off limits.** Brighton's Play Store screenshots belong
  to the employer. Its cover is a generated stand-in flagged
  `placeholderCover: true`, drawn from theme tokens so it follows both
  themes.
- **No invented metrics, companies, or achievements.** If a fact is missing,
  leave a TODO rather than filling it in.
- Everything user-facing is **English**, including blog posts —
  `lang="en"` and `inLanguage: en` are declared site-wide.

## Things that will bite you

- **Proof-bar figures are derived**, not typed. `Hero.astro` counts the
  content collections. Adding a project updates the numbers on next build.
- **`Card.astro` sets `display: block`.** A consumer cannot override that
  from its own scoped styles — the rendered element only carries Card's
  scope id. Use the `stack` prop for a full-height flex column.
- **Section padding collapses at the page edges.** `PageLayout` zeroes the
  first and last section's block padding; without it `#main` and the
  section both pad and headings sit twice as far down.
- **Light is not dark inverted.** In dark, cards sit lighter than the page.
  In light, the page is tinted and cards are white. Mirroring dark gives
  1.04 contrast and the cards vanish.
- **Check contrast on the surface an element actually sits on**, not just
  the page. Subtle text passed on the page ground but failed AA on chips.
- **`draft` defaults to true** in the blog schema. A post without an
  explicit `draft: false` builds no page, enters no sitemap, and leaves
  `/blog` noindexed.
- **Share cards are generated on publish, not up front.** `scripts/og-images.mjs`
  skips drafts: two dozen cards for unpublished posts would otherwise ship in
  every deploy for months. `npm run og -- --all` renders them anyway to preview
  one; delete `public/og/blog/` and re-run bare afterwards, or the drafts' cards
  get committed.
- **Analytics is enabled from the Cloudflare Pages dashboard.** `SITE.analytics
.cloudflareToken` is empty on purpose — filling it in as well loads the beacon
  twice and counts every visit twice.

## Versioning

`package.json` is private and never published, so the version is only a
marker in this repo's history. Tag when you would want to come back to a
point, not on every change.

- **patch** — bug fixes, spacing tweaks, dependency updates
- **minor** — a new page, section, or feature
- **major** — reserved for when the site is considered finished

Content alone (a blog post, a new project, a bio edit) does not move the
version.

Releases are cut with `gh release create vX.Y.Z --verify-tag`, after the
tag is pushed and CI on `main` is green.

## Commits

Conventional commits with a scope: `feat(hero):`, `fix(layout):`,
`content(blog):`, `docs:`, `chore:`. Lowercase subject, no trailing period.

Bodies explain _why_, with the measurement or failure that prompted the
change where there is one. Prefer several small commits over one large
squash — the reasoning is the point.
