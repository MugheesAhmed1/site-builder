# Imported templates

Whole projects someone hands over (a `.zip` of a site or app) become **templates**, not copies. A template keeps its code, look and motion, but reads everything it shows from one content object, and the builder gives a person a field for every part of it: words, lists, pictures, video, links, colours, fonts, which sections show, and motion. They see each change live, then download the finished site or its source with their content in place.

Every template is also filed under the **business types** it suits (the builder's own categories in `lib/categories.ts`), so people can browse by business at `/templates` and in the Experience Gallery.

Mossline and Fernhollow were the first two (2026-11-18); Lithos, Jack, Milo, Distill and Stride followed the same day, then five originals made for the builder for business types nobody had covered yet: Brightline (dentists), Tidewater (hotels), Ironhouse (gyms), Ashgrove (restaurants) and Cornerstone (estate agents). Every template also takes **library blocks**: sections, 3D scenes and effects taken from all the templates, which anyone can add to any template and change (see [LIBRARY.md](LIBRARY.md)).

## Adding a template

New templates are made as **plan templates** (a `content.film` plan of scenes around one 3D figure, plus a thin `index.html` on the shared shell): see [FILM-TEMPLATES.md](FILM-TEMPLATES.md), which replaces steps 3's hand-built page for them. The steps below still hold for an imported project that brings its own page.

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

Every template is told around one central 3D figure, with the whole page revolving around it (2026-11-23; [FILM-TEMPLATES.md](FILM-TEMPLATES.md)). Each keeps its own figure, scenes, camera logic, look and words. Their stories are plans of scenes in `content.film`; the page around them is the shared shell.

- **Turntable**, made for a 3D character (a vehicle, product, mascot or person): the reference. A fixed scroll film written around a hypercar: the page opens on it low and big with an outlined name behind it, it lifts off, turns through its angles, repaints in a colour of your choice and closes on a call to action.
- **Orbit**, the builder's blank, character-first canvas (the journey's *Create a new template*): an astronaut drifting through what the studio does, who it is, a kind word and the contact.
- **Mossline** (climate data; filed under *App, SaaS or startup*, also consultants and nonprofits): a stand of pines lifting out of a misty valley, with live plot readings, network numbers that count up, the field station's five proofs and three solutions.
- **Fernhollow** (design studio; *Marketing or design agency*, also photographers and creatives): a night studio around one growing sprout in a swarm of fireflies.
- **Lithos** (geology course; *School or academy*, also apps and nonprofits): a heap of rocks that rushes in and sinks, layer by layer, through the course, the field guides, the six layers of the crust (tap one to repaint the rocks), the plans and a live tour.
- **Jack** (3D creator; *Creators*, also agencies and photographers): a chrome knot under the stars, with a showcase reel, services and projects.
- **Milo** (deep-ocean 3D artist; *Creators*): a glowing coral that sinks as you scroll through the creator's numbers, what is built and four named worlds; tap a depth to relight the reef. The owner's four live WebGL worlds (and the commission form) follow as library sections (`world-3d`, `contact-form`).
- **Distill** (SaaS; *App, SaaS or startup*, also consultants and agencies): a robot reading, with what it saves, how it works, a belt of pages going in and out, product cards, pricing and how to start.
- **Stride** (snack brand; *Online shop*, also food and product): an avocado that drops in, five flavour cards and a tap-to-repaint flavour picker, what is inside every bar, the nutrition and three packs. The old cart and intro film are gone; orders go to an email address.
- **Brightline** (*Dentist*, also health and clinics): a calm, light clinic told around a friendly clay figure, with numbers, six treatments, four calm steps, the team, membership plans, patients' words, questions and the way in.
- **Tidewater** (*Hotel*, also events and food): a cliffside boutique hotel told around a boat, with its four rooms, the house, three days that drift, the guest book and how to get there.
- **Ironhouse** (*Gym*, also health and events): a loud, dark gym around an armoured figure that drops in and holds still, with numbers, programs, a timetable, membership, coaches and members.
- **Ashgrove** (*Restaurant*, also events and hotels): a wood-fire kitchen around a plate of food, with embers in the air, how they cook, plates, tonight's menu, ten years in numbers, a private table, guests' words and the way in.
- **Cornerstone** (*Property*, also consultants and law): an estate agent around a house, with numbers, fresh listings, what a mortgage costs a month, the areas, how selling works, the agents and the office.

All of them read everything from `window.__XP__` (default pictures in `source/media`, free Pollinations generations or the owner's own, watermark-free), and the journey can put any figure in their place. Old copies of the owners' original apps are in the git history before 2026-11-23.

Refused files: anything under a non-commercial or unknown licence, and any picture or film the owner had not cleared, stays out of the repo (see the licence register).
