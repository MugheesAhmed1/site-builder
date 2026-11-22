# The PRD journey

> Replaced at `/create` on 2026-11-22 by the character journey ([CHARACTER-JOURNEY.md](CHARACTER-JOURNEY.md)). The PRD code stays for the document flow.

Every site now starts from a PRD (product requirements document). The person owns the PRD and
everything built from it.

1. **One line** at `/create` (the home prompt box sends people here with `?q=`). For a
   **portfolio** (`/create?kind=portfolio`) the person uploads or pastes a resume instead; it is read
   in the browser and only its text goes to `POST /api/prd {step:"resume"}`. Without Gemini,
   `prdFromProfile(parseResume(text))` drafts it from the resume's facts.
2. **Gemini drafts the PRD** through `POST /api/prd {step:"draft"}`. The key is read only from the
   server-side `GEMINI_API_KEY` env var. Without it, or when the free quota is busy, `localDraft`
   in `lib/prd.ts` writes the PRD by rules, so a person always gets one. A PRD/BRD document can be
   uploaded instead (`prdFromText`).
3. **The person edits and confirms the PRD** (`components/prd/PrdEditor.tsx`): sections, words,
   items and requirements. The draft is kept in localStorage.
4. **Set up the site** (`components/prd/SiteSetup.tsx`): the confirmed PRD is laid out as a draft
   project (`buildFromPrd`) with a live preview. *Whole site*: Director for every section, brand
   colour, theme, typefaces, alignment, corners, spacing, motion and effects. *Each section*: text
   (alignment, typeface, size, weight, line width, case), items (cards, grid, list, timeline,
   carousel, columns, a picture on each), layout, hero asset (GLB upload, link or library, image,
   video, illustration, particles), background and animation, and its Director. Going back to the
   PRD and confirming again keeps these choices. The setup is kept in localStorage too.
5. **Generate the first version**: coverage is checked, the project is saved and opens in the
   studio, where every element stays editable and the site is downloaded from Publish.

Each PRD section becomes one dynamic section (a `Block` in `content.blocks`, section id `b-<id>`),
in the same order. Each requirement is rendered with `data-req="R<n>"`; functional ones get a
working widget (`widgetFor`). A content requirement written as an instruction ("State the main
promise", "List every role") is met by the words it asks for, so it is marked on them with
`data-reqs` instead of being printed as a bullet.

## The coverage rule

The AI may change how a requirement looks, never whether it is there. `lib/prd-coverage.ts` checks:

- `checkCoverage(prd, content, experience)`: every section has a block and every requirement a
  rendered entry (run on submit and in the studio PRD panel),
- `domCoverage(prd, root)`: the live preview really shows every `data-prd` / `data-req`,
- `markupCoverage(prd, html)`: the exported, prerendered page does too. `buildZip` throws when it
  fails, and the Publish panel's first gate is "PRD coverage".

PRD sections cannot be removed or hidden in the Page panel; change the PRD instead, then rebuild.

## Dynamic sections

`template/src/content/blocks.ts` defines a section's spec: `layout` (fullscreen, split, centered,
asymmetric, editorial), `hero` (glb, image, video, illustration, particles, none), `background`
(solid, gradient, image, video, environment, particles), `animation` (float, reveal, orbit, scroll,
parallax, morph, particles) and `director` (+ optional `secondary`).

`template/src/director.ts` turns a Director (cinematic, luxury, editorial, documentary, futuristic,
minimal, scientific, playful, immersive, product) into tokens: spacing, measure, type, transitions,
entrance, camera, intensity, asset lighting/material/motion/environment and hierarchy. `direct(a, b)`
blends two: the second brings movement (transition, entrance, camera, intensity).

`template/src/components/Block.tsx` renders it. 3D heroes use `scenes/webgl/model.ts` (three.js
GLTFLoader with Meshopt and Draco), loaded on demand through `site-3d.js` (`window.__xp3dModel`), so
`site.js` stays free of three. Library models come from the asset library resolver
(`libraryModel`), and uploaded GLB files are packed into the export.

## Everything is editable

- Studio panels for a PRD site: PRD, Sections, Design, Motion, Page, Publish (`lib/flow.ts`).
- **PRD panel**: edit the PRD and rebuild; the person's section choices and uploads are kept,
  the words follow the PRD. Editing words on the page writes back to the PRD (`syncPrd`).
- **Sections panel** and the on-page Inspector's Section group: every spec option, GLB upload or
  link, pick from the asset library, scale, position, rotation, camera, lighting, motion.
- **Inspector** for any element: text, font, size, weight, line height, alignment, position,
  image replace/upload, crop and zoom, radius, and an animation (none, fade, slide, reveal,
  parallax, scroll, 3D rotation, or a custom timeline of duration, delay and easing).

The older template animator still lives at `/create/template`.
