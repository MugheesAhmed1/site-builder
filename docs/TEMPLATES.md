# Imported templates

Whole projects someone hands over (a `.zip` of a site or app) become templates in the builder. Each one keeps its own code, look and motion; a person using it changes its words and pictures (its *slots*), watches the change live, then downloads the finished site or its source.

Mossline and Fernhollow were the first two (2026-11-18).

## Adding a template

1. **Import the zip.**

   ```
   npm run import-template -- path/to/project.zip --owner "Owner name"
   ```

   The archive is treated as untrusted data and nothing in it is run. The importer refuses paths that leave the folder, links and archives over 80 MB unpacked; it drops `node_modules`, build output, `.git`, lockfiles and every `.env` file; it unwraps a single top folder; it removes dependencies no file imports (for example an AI SDK the page never calls); and for a page that runs as it is (no `<script type="module" src=…>`), it drops the app scaffolding around it. The project lands in `templates/<id>/source`, with a drafted `templates/<id>/template.json`.

2. **Edit `template.json`.** The draft names the business, the description and the headings it found. Add the rest of the words people will want to change, pick categories (the Experience Gallery's: Cinematic, 3D, Interactive, Scroll, Characters, WebGL, Editorial, Playful, Product, Experimental), features, and `heavy: true` for real WebGL. Remove `"draft": true`.

   A slot's `default` is the exact text as it appears in the files. Words wrapped over several lines in JSX still match. Avoid defaults that contain HTML entities (`&amp;`): use a neighbouring piece of text instead. A picture slot (`"type": "image"`) holds the picture's address and accepts only `https://` or site-relative addresses.

3. **Build and check.**

   ```
   npm run templates
   ```

   This builds every template into `public/tpl/<id>` and registers it in `lib/templates.gen.json`. It fails if a slot is missing from the source or the built site, if a one-word slot could hit a name in the code, or if a dependency is not installed in the builder or not under an open licence. Templates written with Tailwind build with the builder's pinned Tailwind.

4. **Optional poster.** Heavy templates show `templates/<id>/poster.webp` (960 × 600) in the gallery until someone hovers or taps the card. Light ones play live.

5. Commit `templates/<id>` and `lib/templates.gen.json`. `public/tpl` is built on every deploy.

## How it works

| Piece | File |
| --- | --- |
| Importer | `scripts/import-template.mjs` |
| Build, checks and registry | `scripts/build-templates.mjs` → `public/tpl/<id>/{site,source,files.json}`, `lib/templates.gen.json` |
| Replacing slots with the right escaping (HTML, JS string, JSX text, JSX attribute, JSON) | `lib/template-apply.mjs` (shared by the build and the builder) |
| Preview bridge (only in `preview.html`, never in a download) | `scripts/template-bridge.js` |
| Registry, preview address, downloads | `lib/templates.ts` |
| Template studio at `/templates/<id>` | `components/templates/TemplateStudio.tsx` |
| Gallery cards ("Templates" category) | `components/home/ExperienceGallery.tsx` |

- **Preview.** The studio frames `public/tpl/<id>/site/preview.html`, sandboxed without same-origin access, so a template's code cannot read the builder's saved projects. The replacements travel in the address when the frame loads (the bridge applies them before the page's own inline scripts run, so scripts that split words see the new ones) and by message as the person types.
- **Downloads.** "Download site" zips the built files, "Download source" the project, both with the replacements written in and a README. Values are kept in the browser per template.
- **Headers.** Only `/tpl/*` may be framed, and only by the builder itself (`X-Frame-Options: SAMEORIGIN`, `frame-ancestors 'self'`); it allows cross-origin reads because the sandboxed frame's module scripts are cross-origin requests.

## Licences

Templates are recorded in the licence register as `owner-supplied`: the holder in `template.json` supplied the project to be used as a builder template. Their libraries must still be open licences (checked at build). Pictures and video a template loads from other hosts are listed in `remoteAssets`; the studio warns about them and the downloaded README lists them so they can be copied in before launch.

## Notes on the first two

- **Mossline** is one HTML page with its own scroll engine: a scroll-scrubbed video, layered parallax, fog, hotspots and a counting card. Its six pictures and the video are the owner's Higgsfield generations, loaded from Higgsfield's CDN. The cloud build machines cannot reach that CDN, so they are not copied into the repository yet; including them in the zip (for example under `public/media/`) makes them part of the template.
- **Fernhollow** is a Vite + React + three.js app: a procedural night valley with bloom, grain, ambient Web Audio and a drawer for work, about, journal and contact. Its unused AI SDK, server and animation dependencies were dropped on import.
