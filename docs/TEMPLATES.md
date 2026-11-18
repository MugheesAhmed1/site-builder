# Imported templates

Whole projects someone hands over (a `.zip` of a site or app) become **templates**, not copies. A template keeps its code, look and motion, but reads everything it shows from one content object, and the builder gives a person a field for every part of it: words, lists, pictures, video, links, colours, fonts, which sections show, and motion. They see each change live, then download the finished site or its source with their content in place.

Every template is also filed under the **business types** it suits (the builder's own categories in `lib/categories.ts`), so people can browse by business at `/templates` and in the Experience Gallery.

Mossline and Fernhollow were the first two (2026-11-18); Lithos, Jack, Milo, Distill and Stride followed the same day. Every template also takes **library blocks**: sections, 3D scenes and effects taken from all the templates, which anyone can add to any template and change (see [LIBRARY.md](LIBRARY.md)).

## Adding a template

1. **Import the zip.**

   ```
   npm run import-template -- path/to/project.zip --owner "Owner name"
   ```

   The archive is treated as untrusted data and nothing in it is run. The importer refuses paths that leave the folder, links and archives over 80 MB unpacked; it drops `node_modules`, build output, `.git`, lockfiles and every `.env` file; it unwraps a single top folder; it removes dependencies no file imports (for example an AI SDK the page never calls); and for a page that runs as it is (no `<script type="module" src=…>`), it drops the app scaffolding around it. The project lands in `templates/<id>/source`, with a drafted `template.json` and `content.json`. A draft is left out of the site until step 3 is done.

2. **Understand the project and file it.** Read it through: what does the business do, who is it for, what does each section say? Then set in `template.json`:

   - `business`: the business types it suits, best fit first, as ids from `lib/categories.ts` (`food`, `beauty`, `fitness`, `health`, `agency`, `consulting`, `photo`, `property`, `product`, `shop`, `nonprofit`, `events`, `dentist`, `hospital`, `creator`, `law`, `school`, `hotel`, `trades`, `auto`, `pets`). The first one is shown on its card. The build refuses unknown ids.
   - `sector`: one line on the kind of business it was made for (for example "Climate tech and environmental data").
   - `categories`: gallery styles (Cinematic, 3D, Interactive, Scroll, Characters, WebGL, Editorial, Playful, Product, Experimental), `features`, `intensity`, and `heavy: true` for real WebGL.

3. **Make it a template.** This is the real work, and it is what makes it a template rather than a copy.

   - Write `content.json`: every word, list (projects, cards, stats, links), picture, video, link, colour, font, section switch and motion setting the page uses, with the project's own values as the defaults. Use `{name}` for the business name inside text and `{year}` for the current year.
   - Change the project so it reads all of it from `window.__XP__` and nothing is hard-coded. `index.html` must load `<script src="./xp-content.js"></script>` in `<head>` (for a Vite app it lives in `public/`). Colours become CSS variables `--c-<name>`, fonts `--f-<role>` (load Google Fonts on demand), numbers `--n-<name>`. Sections switched off are not rendered. Lists render however many items there are. Links pass a safe-address check (http(s), mailto, tel, `#`, `/`, `./`), and text is escaped.
   - In preview mode (`window.__XP_PREVIEW__`), prefer `window.__XP_HASH__` when set, post `{type: "xp-ready"}` to the parent once listening, and redraw on `{type: "xp-data", data}` from the parent. Keep expensive work (a WebGL scene, decoded video frames) and rebuild it only when its own settings change.
   - Add a `schema` to `template.json`: groups of fields, each with a `path` into the content, a `label`, a `type` and optional `hint`. Types: `text`, `textarea`, `url`, `image`, `video` (both accept an address or an upload), `color`, `colors` (a list of colours), `font` (any Google Fonts family), `number` (`min`, `max`, `step`), `toggle`, `select` (`options`), `list` (`fields` for one item, `min`, `max`, `itemLabel`; a list cannot hold a list, so use a `textarea` of lines such as `name | price` instead), and `blocks` (library blocks). Remove `"draft": true`.
   - Give it a spot for library blocks: `"extras": []` in `content.json`, a "Library blocks" group with `{ "path": "extras", "type": "blocks" }` in the schema, and an empty `<div data-xp-extras>` where added blocks should appear (without one they go at the end of the page). Nothing more is needed: `xp-content.js` loads the library only when the list is not empty.
   - Vite + React templates can use the shared helper kit in `templates/_kit/` (`xp.ts`: `useXP`, `fill`, `lines`, `pairs`, `applyTheme`, `applySeo`, `safeHref`, `safeSrc`, `on`; `icons.tsx`). The build copies it into `src/` of any template that has a file of the same name.

   `lib/template-schema.mjs` has the contract. Fernhollow (`src/xp.ts`, `src/App.tsx`) and Mossline (`index.html`, `render()` and `start()`/`stop()`) are worked examples of each kind; Stride shows an engine with its own state that rebuilds (`key`) only when its structure changes, and Milo a three.js scene whose colours come from the theme.

4. **Build and check.**

   ```
   npm run templates
   ```

   This builds every template into `public/tpl/<id>` and registers it in `lib/templates.gen.json`. It fails if any value in `content.json` has no field (so nothing is left uneditable), if a field points at nothing or holds the wrong type, if a business type is unknown, if `index.html` does not load `xp-content.js`, or if a dependency is not installed in the builder or not under an open licence. Then open `/templates/<id>`, change one field in every group and watch the preview follow.

5. **Optional poster.** Heavy templates show `templates/<id>/poster.webp` (960 × 600) in the gallery until someone hovers or taps the card. Light ones play live.

6. Commit `templates/<id>` and `lib/templates.gen.json`. `public/tpl` is built on every deploy.

## How it works

| Piece | File |
| --- | --- |
| Importer | `scripts/import-template.mjs` |
| Content contract: schema checks, `xp-content.js`, uploads to `media/` | `lib/template-schema.mjs` (shared by the build and the builder) |
| Build, checks and registry | `scripts/build-templates.mjs` → `public/tpl/<id>/{site,source,files.json}`, `lib/templates.gen.json` |
| Registry, preview address, saved content, downloads | `lib/templates.ts` |
| Template studio at `/templates/<id>` (a field for every schema entry) | `components/templates/TemplateStudio.tsx` |
| Templates by business type at `/templates` (`?business=agency`) | `components/templates/TemplateIndex.tsx` |
| Gallery cards, style and business-type filters | `components/home/ExperienceGallery.tsx` |
| Shared helper kit for React templates | `templates/_kit/` |
| Library blocks and assets | [LIBRARY.md](LIBRARY.md) |

- **Preview.** The studio frames `public/tpl/<id>/site/preview.html` (the built page with preview mode switched on), sandboxed without same-origin access, so a template's code cannot read the builder's saved projects. The content travels in the address when the frame loads (uploads excepted) and by message as the person edits.
- **Downloads.** "Download site" zips the built files and "Download source" the project, each with the person's `xp-content.js`, their uploads under `media/`, the library (`xp-lib/`) when they added blocks, and a README that says where to change things. Content is kept in the browser per template; big uploads may be too large to keep, and the studio says so.
- **Headers.** Only `/tpl/*` may be framed, and only by the builder itself (`X-Frame-Options: SAMEORIGIN`, `frame-ancestors 'self'`); it allows cross-origin reads because the sandboxed frame's module scripts are cross-origin requests.

## Licences

Templates are recorded in the licence register as `owner-supplied`: the holder in `template.json` supplied the project to be used as a builder template. Their libraries must still be open licences (checked at build). Pictures and video the default content loads from other hosts are listed in `remoteAssets`; the downloaded README lists any still in use so they can be copied in before launch, and people can upload their own in the studio.

## The templates

- **Mossline**, filed under *App, SaaS or startup* (also consultants and nonprofits): a climate-tech and environmental data company that measures carbon and biodiversity. One HTML page with its own scroll engine: a scroll-scrubbed video, layered parallax, fog, hotspots, a proof card with a chart, solution cards, counting numbers and a contact section. Everything (including the menu, hotspot positions, chart, cards, colours, fonts, story length and each effect) is in its schema. Its pictures and video are the owner's Higgsfield generations on Higgsfield's CDN, which the cloud build machines cannot reach; people replace them by uploading their own.
- **Fernhollow**, filed under *Marketing or design agency* (also photographers and creatives, consultants): a regenerative design studio's portfolio. A Vite + React + three.js app: a procedural night valley with bloom, grain, ambient Web Audio and a drawer for work, about, journal and contact. Projects, facts and journal entries are lists; the valley's sky, fog, flower and leaf colours, counts, bloom, grain and motion, the sound's mood and volume, and where the contact form sends are all fields.
- **Lithos**, filed under *Photographers and creatives* (also agencies and product makers): a stone and material studio. Every word, picture, link, colour and font is a field.
- **Jack**, filed under *Creators* (also agencies and photographers): a 3D creator's portfolio with a marquee, numbered services, a word-by-word statement and stacking project cards.
- **Milo**, filed under *Creators* (also agencies and photographers): a deep-ocean portfolio with a three.js ocean, chapters, projects you can orbit in 3D, a commission form and a custom cursor. The ocean's particles, manta, parallax and fog, and every colour, are fields.
- **Distill**, filed under *App, SaaS or startup* (also consultants and agencies): a product site with a belt of cards orbiting in a canvas, pricing tiers, menus and demo, trial and sign-in forms. Each card's layout (home, price, case, vision, alloy, journal) and words are fields. Its default pictures are on the owner's CDN.
- **Stride**, filed under *Online shop* (also food and product): a plant-protein-bar shop with an intro film, a 3D pack, flavours with their own colours and ingredients, a four-step "what's inside", a cart and a waitlist form. Its sprite sheet and film are on the owner's CDN.

Refused files: anything under a non-commercial or unknown licence, and any picture or film the owner had not cleared, stays out of the repo (see the licence register).
