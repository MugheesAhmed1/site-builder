# Imported templates

Whole projects someone hands over (a `.zip` of a site or app) become **templates**, not copies. A template keeps its code, look and motion, but reads everything it shows from one content object, and the builder gives a person a field for every part of it: words, lists, pictures, video, links, colours, fonts, which sections show, and motion. They see each change live, then download the finished site or its source with their content in place.

Every template is also filed under the **business types** it suits (the builder's own categories in `lib/categories.ts`), so people can browse by business at `/templates` and in the Experience Gallery.

Mossline and Fernhollow were the first two (2026-11-18); Lithos, Jack, Milo, Distill and Stride followed the same day, then five originals made for the builder for business types nobody had covered yet: Brightline (dentists), Tidewater (hotels), Ironhouse (gyms), Ashgrove (restaurants) and Cornerstone (estate agents). Every template also takes **library blocks**: sections, 3D scenes and effects taken from all the templates, which anyone can add to any template and change (see [LIBRARY.md](LIBRARY.md)).

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
   - Give it **roles** for the character journey ([CHARACTER-JOURNEY.md](CHARACTER-JOURNEY.md)): in `template.json`, `"roles": { "mode": "dark", "modes": ["light", "dark"], "stage": "dark", "colors": { "<colour key>": "page|surface|surface2|ink|muted|line|accent|accent2|onAccent|..." }, "fonts": { "<font key>": "display|body|keep" }, "radius": "<number key>" }`. One design system then pours into the template by role, and the build adds the 3D character group (`withCharacter`): render the model into `[data-xp-character="hero"]` (and `echo` or `badge` where it fits) on the stage gradient from `content.design`. `modes` lists the looks the template can show; with both, the stage follows the chosen mode.
   - Give it a spot for library blocks: `"extras": []` in `content.json`, a "Library blocks" group with `{ "path": "extras", "type": "blocks" }` in the schema, and an empty `<div data-xp-extras>` where added blocks should appear (without one they go at the end of the page). Nothing more is needed: `xp-content.js` loads the library only when the list is not empty.
   - Vite + React templates can use the shared helper kit in `templates/_kit/` (`xp.ts`: `useXP`, `fill`, `lines`, `pairs`, `applyTheme`, `applySeo`, `safeHref`, `safeSrc`, `on`; `icons.tsx`). The build copies it into `src/` of any template that has a file of the same name.

   `lib/template-schema.mjs` has the contract. Fernhollow (`src/xp.ts`, `src/App.tsx`) and Mossline (`index.html`, `render()` and `start()`/`stop()`) are worked examples of each kind; Stride shows an engine with its own state that rebuilds (`key`) only when its structure changes, and Milo a three.js scene whose colours come from the theme.

4. **Build and check.**

   ```
   npm run templates
   ```

   This builds every template into `public/tpl/<id>` and registers it in `lib/templates.gen.json`. It fails if any value in `content.json` has no field (so nothing is left uneditable), if a field points at nothing or holds the wrong type, if a business type is unknown, if `index.html` does not load `xp-content.js`, or if a dependency is not installed in the builder or not under an open licence. Then open `/templates/<id>`, change one field in every group and watch the preview follow.

   Default pictures and film ship with the template (`public/media/` for Vite, `media/` for one page), never hot-linked from another site: a host that blocks other sites or goes away leaves empty sections. Check every section at desktop and phone width, and that every menu link and button does something.

5. **Poster.** `templates/<id>/poster.webp` (960 × 600): heavy templates show it in the gallery until someone hovers or taps the card, and the journey's template library shows it on every card.

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

- **Mossline**, filed under *App, SaaS or startup* (also consultants and nonprofits): a climate-tech and environmental data company that measures carbon and biodiversity. One HTML page with its own scroll engine: a scroll-scrubbed video, layered parallax, fog, hotspots, a proof card with a chart, solution cards, counting numbers and a contact section. Everything (including the menu, hotspot positions, chart, cards, colours, fonts, story length and each effect) is in its schema. On phones the menu folds into a menu button. Its default pictures and its push-in film ship with the template (`source/media/`), so it never opens on empty sections; people replace them by uploading their own.
- **Fernhollow**, filed under *Marketing or design agency* (also photographers and creatives, consultants): a regenerative design studio's portfolio. A Vite + React + three.js app: a procedural night valley with bloom, grain, ambient Web Audio and a drawer for work, about, journal and contact. Projects, facts and journal entries are lists; the valley's sky, fog, flower and leaf colours, counts, bloom, grain and motion, the sound's mood and volume, and where the contact form sends are all fields.
- **Lithos**, filed under *School or academy* (also apps and startups, and nonprofits): a geology course with a cursor spotlight that reveals the rock under the surface, then a course outline, field guides, a strata column you can point at, plans and a live-tour band. Every menu link lands on its section; each section can be switched off, and every word, picture, layer, plan, colour and font is a field.
- **Jack**, filed under *Creators* (also agencies and photographers): a 3D creator's portfolio with a marquee, numbered services, a word-by-word statement and stacking project cards.
- **Milo**, filed under *Creators* (also agencies and photographers): a deep-ocean portfolio with a three.js ocean, chapters, projects you can orbit in 3D, a commission form and a custom cursor. The ocean's particles, manta, parallax and fog, and every colour, are fields.
- **Distill**, filed under *App, SaaS or startup* (also consultants and agencies): a product site with a belt of cards orbiting in a canvas, pricing tiers, menus and demo, trial and sign-in forms. Each card's layout (home, price, case, vision, alloy, journal) and words are fields. Its default pictures ship with the template.
- **Stride**, filed under *Online shop* (also food and product): a plant-protein-bar shop with an intro film, a 3D pack, flavours with their own colours and ingredients, a four-step "what's inside", a cart and a waitlist form. Its sprite sheet and film are on the owner's CDN; if the sheet is missing or fails to load, the packs are drawn from the brand name, flavour names and colours instead, so they are never blank. On a full pack, tapping a flavour swaps out the oldest bar.

- **Brightline**, filed under *Dentist* (also health and clinics): a calm, light clinic. An arch-framed smile that opens as you scroll, floating trust badges, a treatment explorer with prices, a drag-to-compare result, first-visit steps that light up as you scroll, membership plans, reviews, questions, hours and a booking window with treatment, day and time slots.
- **Tidewater**, filed under *Hotel* (also events and food): a cliffside boutique hotel. The arrival picture slips from day to night (or by a switch) and settles into a frame as you scroll; a booking bar with dates, guests and room prices the stay; rooms slide sideways; experience panels open on hover; a guest book drifts past; offers sign-up.
- **Ironhouse**, filed under *Gym* (also health and events): a loud, dark gym. Headline lines that split apart, a tilted ticker, program cards that stack, a timetable you filter by day and class (Book fills the free-week form), monthly or yearly prices, a calorie slider, tilting coach cards and a free-week sign-up.
- **Ashgrove**, filed under *Restaurant* (also events and hotels): a wood-fire kitchen. Embers drift over a flickering hero, the story changes picture as you read, a wheel of signature plates turns as you scroll (or with arrows), a tabbed menu (`Name | Price | Note` lines), private dining and a table booking with guests, dates and times.
- **Cornerstone**, filed under *Property* (also consultants and law): an estate agent. A hero that widens as you scroll with a property search on it, listings you filter, sort and save (saved homes stay in the browser), a home window with a viewing booking assigned to an agent, a live mortgage calculator, areas with a picture that follows the pointer (a tap filters the listings), selling steps, agents and a valuation form.

- **Orbit**, made for the character journey (any business or person; it is the journey's *Create a new template*): the 3D character centre stage on a gradient from its own colours, with rings and up to four words orbiting it, a band of words, a statement that lights up word by word as you scroll, three cards, an about section with the character again on a disc, the library sections the person picks, and a closing contact box (a contact form from the library takes its place). Light or dark. One HTML page, no build step.

All five read everything from `window.__XP__`, post forms to an optional https form address (or just thank the visitor), and have their default pictures in `source/public/media` (free Pollinations generations, watermark cropped). Every button, tab, filter and form was clicked through on desktop and phone before release.

Refused files: anything under a non-commercial or unknown licence, and any picture or film the owner had not cleared, stays out of the repo (see the licence register).
