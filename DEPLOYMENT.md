# Deployment — Cloudflare Pages

End-to-end guide to publishing this site to `ahmadabuhasan.com` on Cloudflare Pages.

The site is a pure static build. **No Pages Functions, no server code, no environment secrets are required.**

---

## Prerequisites

- Cloudflare account, `ahmadabuhasan.com` already added to your Cloudflare zone.
- GitHub repo `eby-dev/ahmadabuhasan` up to date on `main`.
- Node.js `>= 20` locally (for verification builds).

---

## 1. Create the Pages project (one-time, dashboard)

1. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
2. Authorize Cloudflare on GitHub (if not already), then pick `eby-dev/ahmadabuhasan`.
3. **Setup builds and deployments:**
   - Project name: `ahmadabuhasan`
   - Production branch: `main`
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/`
4. **Environment variables** (Settings → Environment variables → Production):
   - `NODE_VERSION` = `20`
5. Click **Save and Deploy.** The first build should complete in ~2 minutes.

---

## 2. Attach the custom domain

1. Pages project → **Custom domains → Set up a custom domain**.
2. Add `ahmadabuhasan.com` (apex). Cloudflare will auto-create a CNAME → your Pages project.
3. Add `www.ahmadabuhasan.com` too.
4. **DNS records** (Websites → ahmadabuhasan.com → DNS):
   - Verify `A` or `CNAME` for apex points to Pages (`@ CNAME ahmadabuhasan.pages.dev` — proxied ON).
   - Verify `CNAME www ahmadabuhasan.pages.dev` (proxied ON).

## 3. Force `www` → apex

Two options; pick one (both work — Rule is faster and more explicit).

**Option A (recommended) — Rules → Redirect Rules** (Websites → ahmadabuhasan.com → Rules → Redirect Rules → Create rule):
- When: Hostname equals `www.ahmadabuhasan.com`
- Then: Static redirect → `https://ahmadabuhasan.com/${1}`
- Status: `301`

**Option B — rely on `public/_redirects`** in the repo. The last line of that file already covers this case as a safety net.

## 4. SSL / TLS

Websites → ahmadabuhasan.com → **SSL/TLS**:

- **Overview:** encryption mode = **Full (strict)**.
- **Edge Certificates:**
  - Enable **Always Use HTTPS**.
  - Enable **HTTP Strict Transport Security (HSTS)**:
    - Max Age: **6 months** (start conservative — bump to 12 months once stable).
    - Apply HSTS to subdomains: **On**.
    - Preload: **Off** for now (turn on only when you're ready to commit — HSTS Preload cannot be undone quickly).
  - Enable **Automatic HTTPS Rewrites**.
  - **Minimum TLS Version:** 1.2 (recommended: 1.3).

## 5. Cloudflare Web Analytics

Only takes effect after you paste the token into the repo.

1. Dashboard → **Analytics & Logs → Web Analytics → Add a site**.
2. Choose "By adding a JavaScript snippet" and enter `ahmadabuhasan.com`.
3. Copy the **token** value (a hex string).
4. In the repo, edit [`src/config/site.ts`](src/config/site.ts):

   ```ts
   analytics: {
     cloudflareToken: 'PASTE_TOKEN_HERE',
   },
   ```

5. Commit + push. Cloudflare Pages auto-rebuilds. The beacon script now emits on every page.

---

## 6. Repo file references (already in place)

None of these need edits for a first deploy — they're wired up correctly:

| File | Purpose |
|---|---|
| `astro.config.mjs` | `site: 'https://ahmadabuhasan.com'`, `output: 'static'`, sitemap integration |
| `public/_headers` | CSP, HSTS, `Referrer-Policy`, `Permissions-Policy`, cache-control per asset type |
| `public/_redirects` | 301s for legacy PHP entrypoints and old single-page anchor URLs |
| `public/robots.txt` | Allow all + sitemap link |
| `public/site.webmanifest` | PWA manifest |
| `.nvmrc` | Node 20 pin (used by CI; Cloudflare uses the env var above) |
| `scripts/prune-dist.mjs` | Post-build cleanup, ~3.5 MB of unreferenced originals removed |
| `.github/workflows/ci.yml` | Runs format check, type check, build, and axe-core a11y test on every PR |

---

## 7. First-deploy verification checklist

After the first deployment completes, walk this list:

- [ ] `https://ahmadabuhasan.com/` returns the home page with correct hero.
- [ ] `https://www.ahmadabuhasan.com/` 301s to apex.
- [ ] `https://ahmadabuhasan.com/robots.txt` returns the allow-all manifest.
- [ ] `https://ahmadabuhasan.com/sitemap-index.xml` and `/sitemap-0.xml` return valid XML listing 11 URLs.
- [ ] `https://ahmadabuhasan.com/rss.xml` returns a valid (empty) RSS 2.0 channel.
- [ ] `https://ahmadabuhasan.com/404` renders the 404 page (test by visiting an intentionally bad URL, e.g. `/asdf`).
- [ ] SSL padlock is green.
- [ ] Response headers include the CSP, HSTS, `Referrer-Policy`, `Permissions-Policy` values from `public/_headers`.
- [ ] `Cache-Control: public, max-age=31536000, immutable` on any `/_astro/*` asset.
- [ ] Lighthouse (mobile) — Performance ≥ 95, Accessibility 100, Best Practices 100, SEO 100.
- [ ] View source of `/` and `/about` — `<script type="application/ld+json">` blocks are present and valid.
- [ ] `/projects/sg-sehat` shows the WebP cover image (not a broken image icon).
- [ ] Contact form submits successfully to Formspree (test with your own email).
- [ ] Theme toggle cycles system → light → dark → system and persists across reload.
- [ ] Mobile drawer opens, closes with Escape and outside click.
- [ ] Skip link (Tab from address bar) appears and jumps to `#main`.

Failing any of these? See [Troubleshooting](#troubleshooting) below.

---

## Ongoing operations

### Deploying changes

Push to `main` → Cloudflare Pages auto-builds and swaps the production alias in one atomic step. Preview URLs are created for every non-`main` branch and every PR.

### Rolling back

Dashboard → Pages project → **Deployments** → find a healthy previous build → **Rollback to this deployment**. Instant, no rebuild.

### Redirects update

Edit `public/_redirects`, commit, push. Cloudflare Pages picks it up on the next deploy. Prefer Dashboard **Rules → Redirect Rules** for hostname-level redirects (they run at edge before Pages routing).

### Rotating the Cloudflare Analytics token

1. Generate a new token in Web Analytics.
2. Edit `src/config/site.ts` → `SITE.analytics.cloudflareToken`.
3. Commit, push, auto-redeploy.

### Adding a blog post

1. Create `src/content/blog/<slug>.mdx` with the frontmatter schema (see [`src/content.config.ts`](src/content.config.ts)).
2. Set `draft: false`, `publishedAt: YYYY-MM-DD`.
3. Push. The `/blog` route auto-becomes visible in Navbar and sitemap once at least one non-draft entry exists.

---

## Troubleshooting

**"Missing pages directory" build warning locally.**
Harmless. Only fires when Astro syncs before pages exist (e.g. during scaffolding).

**Build fails with "LegacyContentConfigError".**
Content config must be at `src/content.config.ts` (not `src/content/config.ts`). Astro 6+ moved the location.

**Fonts don't load, browser shows fallback stack.**
Check the `Content-Security-Policy` in `public/_headers` includes `font-src 'self' data:`. If you introduce a font CDN, add it.

**Contact form POST fails with CORS.**
CSP `form-action` and `connect-src` must include `https://formspree.io`. Both are present.

**Lighthouse Performance is below 95.**
- Check that `public/_headers` reached Cloudflare — response headers on any `/_astro/*` URL should show `Cache-Control: immutable`.
- Confirm no third-party analytics script is loading before the token is set (`SITE.analytics.cloudflareToken` empty = no beacon emitted).
- Rerun after your Cloudflare Web Analytics token is set — the beacon adds ~5 KB but with `defer` should not affect LCP.

**Preview URLs work but production shows 404.**
Custom domain isn't attached to the production deployment. Custom domains → **Set up a custom domain** and confirm status = Active.

**HSTS is stuck.**
HSTS is client-side. If you enable Preload and later want to disable HTTPS, browsers that saw the preload will still refuse HTTP for `max-age` seconds. Don't enable Preload until the site is battle-tested.

**Original PNG screenshots reappear in `dist/_astro/`.**
`scripts/prune-dist.mjs` runs after `astro build` via the `build` npm script. If you invoke `astro build` directly, the prune won't run — always use `npm run build`.

---

## What is NOT deployed

- `node_modules/`
- `src/` (not needed for runtime)
- `.astro/` (build cache)
- Anything covered by `.gitignore`

Cloudflare Pages only serves the contents of `dist/`.

---

## Cost & limits

- Cloudflare Pages Free tier: **500 builds/month**, **20,000 files** per deployment, **25 MB per file**, unmetered bandwidth.
- This site: ~53 files, largest file ~72 KB, `dist/` ~1.2 MB total. Well within limits.
