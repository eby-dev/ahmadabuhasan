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

## Constraints

Deliberate limits, kept so the site still reads well in ten years. Adding any
of these should be a conscious decision, not a default.

- No UI framework — no React, Vue, Svelte, Solid, or Preact islands.
- No CSS framework — no Tailwind, Bootstrap, DaisyUI, shadcn. Design tokens
  in [`src/styles/tokens.css`](src/styles/tokens.css) are the single source of
  truth for colour, type, spacing, and motion.
- No animation libraries — no Framer Motion, GSAP, Lottie. Motion is limited to
  short CSS transitions on hover and focus, and honours
  `prefers-reduced-motion`.
- No parallax, scroll-jacking, glassmorphism, decorative gradients, particle
  backgrounds, or cursor effects.
- No client-side routing — Astro's default MPA is the target.
- No ads, cookies, auth, comments, or chat widgets.

Any client-side script must justify itself. Today every page ships three small
inline scripts — the pre-paint theme initialiser, the theme toggle, and the
mobile menu — plus Astro's ~2.5 KB link-prefetch runtime. `/contact` adds one
more for its form submission. Nothing else, and no third-party JavaScript at
all.

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

| Command                | Purpose                                       |
| ---------------------- | --------------------------------------------- |
| `npm run dev`          | Start dev server                              |
| `npm run build`        | Type-check and build static output to `dist/` |
| `npm run preview`      | Preview the production build locally          |
| `npm run check`        | Astro type & diagnostic check                 |
| `npm run typecheck`    | TypeScript compiler check                     |
| `npm run lint`         | ESLint                                        |
| `npm run format`       | Prettier write                                |
| `npm run format:check` | Prettier check                                |

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
