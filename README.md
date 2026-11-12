# Site Builder

Type one line, such as "website for my bakery in Lahore" or "portfolio for me, I'm a product manager", and get a finished site you can download, unzip and put online for free. No build step, no Node needed on the other side.

**No AI anywhere.** Everything runs in the browser:

- **Reading the request.** Keyword rules in `lib/categories.ts` decide portfolio or website, and which of 12 business types it is. You can change the guess.
- **Questions.** These are fixed lists in `lib/questions.ts`. There is one list for portfolios and one for websites, tailored to the business type: it asks for hours and an address only where people visit, and for prices only where it fits. Most questions come with a suggested answer.
- **Résumé.** PDFs are read on the device with pdf.js (`lib/resume.ts`), and the text is split by common headings and date ranges. Nothing is uploaded.
- **Words.** Rules and templates in `lib/compose.ts` write every section. Numbers in results become counters, skills are grouped and steps are set per role or business. There are no em or en dashes.
- **Design systems.** `lib/designs.ts` has 240 systems: 4 hand-made and 236 generated from curated type pairings, accents, neutral tints, shapes and layouts. You can work with them in these ways:
  - Every person gets their own system, seeded from their name, request and chosen tone.
  - **Shuffle** makes a brand-new system.
  - **Remix** re-rolls one part: colour, type, shape or layout.
  - **Lock** keeps a part fixed while you shuffle.
  - **Save** keeps your own systems for later.
- **Film-scene openings.** New sites open like a film: a scene photo fills the first screen, the headline sits in the open sky with one word in italic serif (or glowing), a pill with faces sits above it and the numbers run along the foot. The scene pushes in and blurs away as you scroll and follows the pointer. There is also a "Scattered words" opening, a floating glass pill menu, a full-screen curtain menu, a glass call to action, a footer with the name set huge, and a Silk light backdrop. All of it is switchable under Design system, Layout, or in one go with the Cinematic animation pack. The 26 scene photos in `public/real/cinema` were made free with Pollinations.
- **Colour optimizer.** There are seven harmony options: matched, analogous, complementary, split, triadic, calm and vivid. You can also build around a brand colour. Contrast ratios are shown for light and dark, and accents are adjusted automatically to pass WCAG AA (4.5 to 1).

## What you download

The last step offers two downloads:

- **Download site (.zip)**, the default. A finished site: `index.html`, `site.js`, `site.css`, `site-data.js` (all your words, colours and settings, editable in any text editor), a favicon, a share picture, `robots.txt` and the pictures the site uses. It works from any static host (Netlify Drop, GitHub Pages, Cloudflare Pages, any web server) and opens straight from the unzipped folder. It carries search and sharing tags (Open Graph, Twitter, business data for search engines).
- **React project (.zip)**, under "For developers". The Vite and React source of the same site. All words and settings live in `src/site-data.json`.

The ready site is the template (`template/`) built once by `scripts/build-site-kit.mjs` into `public/site-kit/`. That runs automatically before `dev` and `build`; the output is not committed.

Design follows the Taste Skill, Impeccable and Emil Kowalski rules: OKLCH tinted neutrals, one accent, ease-out motion under 300ms, press states, hover only on real pointers, and reduced motion respected.

## Run the builder

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

To deploy the builder itself on Vercel, import the repository. It needs no environment variables and no API keys.

## Checks

```bash
npm run typecheck   # TypeScript
npm test            # unit tests (vitest): reading the request, storage, link safety, downloads, library data
npm run build       # also bundles the template and builds the site kit
npm audit           # known vulnerabilities (the build should report none)
```

GitHub Actions (`.github/workflows/ci.yml`) runs all four on every pull request.

Things the builder does on purpose:

- Projects live in this browser's storage. If saving fails (storage full or blocked) a notice shows and the page keeps working; backups skip anything that is not a project.
- Link fields are cleaned before they reach a page (`javascript:` and similar are dropped), both in the preview and in downloaded sites.
- Fonts never block the first paint, in the builder or in downloaded sites.
- Responses carry basic security headers (`next.config.mjs`). There is no Content-Security-Policy yet; it needs nonces for the inline bootstrap scripts first.

## Files

- `app/page.tsx` and `components/HomeBelow.tsx`: the home page, where you type your request.
- `app/build/[id]/page.tsx` and `app/portfolio/[id]/page.tsx`: the steps for a business website and for a portfolio.
- `components/DesignEditor.tsx`, `CastPicker.tsx`, `ScenePicker.tsx`, `MotionPicker.tsx`: design, characters, live scenes and animation.
- `components/Steps.tsx`: the review and download steps. `lib/export.ts` builds both zips.
- `lib/store.ts`: saving in the browser. `lib/fit.ts`: which characters, widgets, scenes and animations suit each kind of site.
- `template/src/Portfolio.jsx` and `Website.jsx`: the two site templates, also used for the live preview.
- `template/src/cinema.jsx` and `cinema.css`: film-scene and scattered-word openings, Silk light, glass call to action, curtain menu, wordmark footer. `template/src/plates.js` picks the scene for each kind of site.
- `template/src/theme.js`: OKLCH palettes for light and dark, with contrast fitting.
- `library/`: the shared library, see `library/README.md`.
- `tests/`: unit tests.
