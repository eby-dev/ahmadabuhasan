# ahmadabuhasan.com

Personal website of Ahmad Abu Hasan — Mobile Developer (Android + Flutter).

Built with [Astro](https://astro.build), TypeScript, and CSS Modules. Fully static, deployed to Cloudflare Pages.

## Stack

- **Framework:** Astro 7 (static output)
- **Language:** TypeScript (strict)
- **Styling:** CSS Modules + design tokens (no CSS framework)
- **Content:** Astro Content Collections (Markdown + MDX)
- **Hosting:** Cloudflare Pages
- **Analytics:** Cloudflare Web Analytics
- **Contact form:** Formspree (no backend)

Zero client-side JavaScript on the golden path.

## Requirements

- Node.js `>= 22.12` (see [`.nvmrc`](.nvmrc))
- npm

## Development

```
npm install
npm run dev
```

Local server: <http://localhost:4321>.

## Available scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check and build static output to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run check` | Astro type & diagnostic check |
| `npm run typecheck` | TypeScript compiler check |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check |

## Deployment

Cloudflare Pages auto-deploys on push to `main`. Pull requests get preview deployments.

Configuration lives in [`astro.config.mjs`](./astro.config.mjs), security headers in [`public/_headers`](./public/_headers), redirects in [`public/_redirects`](./public/_redirects).

## Project structure

```
src/
  assets/     # optimized images (Astro Image)
  components/ # UI primitives, layout, sections, SEO
  config/     # site + navigation config
  content/    # experience, projects, skills, blog collections
  layouts/    # base and page layouts
  pages/      # route files
  styles/     # global tokens, reset, global rules
  types/      # inferred content types
  utils/      # date, url, seo helpers
public/       # static assets served as-is
```

## License

All rights reserved — see [LICENSE](./LICENSE).

## Blueprint

Design and architecture decisions are documented in:

- [BLUEPRINT.md](./BLUEPRINT.md) — original brief
- [BLUEPRINT_REPORT.md](./BLUEPRINT_REPORT.md) — STEP 1: analysis
- [BLUEPRINT_STEP2.md](./BLUEPRINT_STEP2.md) — STEP 2: detailed architecture
