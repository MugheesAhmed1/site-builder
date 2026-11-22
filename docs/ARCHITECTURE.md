# Architecture (PRD v2.0)

The Master PRD v2.0 ("Generate an experience, not a template") is the source of truth. This file maps it onto the code, records the calls made where the PRD is silent, and lists what is still open.

## The model

The old model was *website + animated background + animated sections*. The new one follows PRD section 2:

```
brand / idea → experience concept → visual story / world → interaction architecture → scene choreography → React implementation
```

Every project now carries two separate pieces of data (PRD section 45):

- `content`: the words, pictures and contact details (unchanged shape, `lib/types.ts`).
- `experience`: the **Experience JSON** (`template/src/experiences/types.ts`, PRD sections 13 and 44): mode, concept, world, intensity, motion language, tier, dependency profile, the stage, and the **scene graph**. Each scene names the content section it presents, its storyboard beat, objects, camera, scroll mappings, interactions, transitions and motion primitives.

The studio preview and both downloads render the same Experience JSON through the same renderer (PRD section 43).

## The character journey (2026-11-22)

`/create` now runs the character journey: one line, a short AI interview, a 3D character (from the library, a GLB, or a photo) with five design systems drawn from its colours, the template library shown as the person's own site (or a new Orbit template built from library sections), then the studio. Every template takes the character, its colours and its type through the `roles` in its `template.json`. See [CHARACTER-JOURNEY.md](CHARACTER-JOURNEY.md).

## The PRD journey (2026-11-19, replaced at /create on 2026-11-22)

Sites used to start from a PRD the person edits: one line, a Gemini draft, edits, then submit. Each PRD section becomes a dynamic section (`content.blocks`, section id `b-<id>`) shaped by layout, hero asset, background, animation and a Director; every requirement is rendered with `data-req` and a coverage check blocks the build, the publish and the export if one is missing. See [PRD-JOURNEY.md](PRD-JOURNEY.md).

## Where things live

PRD section 67 recommends `/apps` and `/packages`. The builder stays at the repository root because Vercel deploys it from there; the engines are split as follows.

| PRD package | Here | Ships in downloads |
| --- | --- | --- |
| experience-core (generation) | `packages/experience-core/` | no |
| experience-core (runtime types) | `template/src/experiences/` | yes |
| motion-engine | `template/src/motion/` (primitive registry, scroll orchestration, runtime) | yes |
| scene-engine | `template/src/scenes/` (stage engines, objects, characters) | yes |
| webgl-engine | `template/src/scenes/webgl/` (three.js, React Three Fiber) | only when the profile is `webgl` |
| design-system | `lib/designs.ts`, `template/src/theme.js` | theme only |
| content-engine | `lib/compose.ts`, `lib/requirements.ts`, `template/src/content/` | content helpers only |
| export-engine | `lib/export.ts`, `lib/prerender.ts`, `scripts/build-site-kit.mjs` | no |
| quality-engine | `packages/quality-engine/` | no |
| asset-manager | `lib/media.ts` | no |

Runtime code lives under `template/src` in the folder layout PRD section 50 asks of the React download (`components/`, `experiences/`, `scenes/`, `motion/`, `content/`, `styles/`, `site-data.json`), so the download is the source itself.

## The pipeline (PRD section 7)

`generateExperience()` in `packages/experience-core/index.ts` runs every stage:

1. **Understand** (`understand.ts`): business, audience, location, offering, personality, tone, CTA, keywords and feeling, by rules. What the person wrote counts more than suggested defaults.
2. **Creative direction** (`direction.ts`): every concept is scored for the brief; three directions are drawn up, A editorial, B cinematic, C interactive (PRD section 57), and the strongest leads. A per-project seed keeps equal requests from landing on the same site (PRD section 56).
3. **Storyboard** (`storyboard.ts`): the concept's beats are laid over the visible content sections. The hero opens the story, the middle scenes carry it, and the final beat always lands on the call to action.
4. **Select motion systems** (`systems.ts`): the smallest technology set and the dependency profile (basic, cinematic, webgl, physics; PRD section 42).
5. **Build**: the renderer in `template/src`.
6. **Performance pass** (`systems.ts`): budgets for particles, DPR, timelines and textures by tier and intensity.

## Libraries

- **Concepts** (`concepts.ts`): 27 original concepts on 15 stage engines, each with the registry metadata of PRD section 34 plus its metaphor, world, beats, anchor object, character and interactions. All 27 are scroll-driven stories, 26 have an interactive object, 5 have a 3D version and 3 have characters (PRD section 77 asks for 20, 10, 5, 5 and 3).
- **Environments** (`environments.ts`): the worlds of PRD section 11, each with the states of section 12.
- **Presets and packs** (`presets.ts`): the 12 presets of section 33 and the 4 packs of section 64.
- **Motion primitives** (`template/src/motion/primitives.ts`): sections 8 and 9, with cost, minimum intensity, phone and reduced-motion alternatives.
- **Licence register** (`packages/quality-engine/licences.ts`): section 35.

## Quality (PRD sections 53, 54, 72)

`experienceQA()` answers the ten Experience QA questions from the Experience JSON; `qualityGates()` adds performance budget, accessibility, SEO, mobile, reduced motion and licensing before export. Console errors, real motion and Lighthouse are checked in a browser on the example sites.

## The renderer (PRD sections 4, 12, 13, 22, 39 and 45)

`template/src/Site.tsx` draws a site from three things: the content, the design system and the Experience JSON. The same code runs in the builder's preview, in the downloaded site (`template/src/main.tsx`, built once into `public/site-kit`) and at download time to write finished HTML (`lib/prerender.ts`).

- **Scenes, not sections.** Each shown content section takes its storyboard scene in order (`sceneList` in `Site.tsx`). A scene is a `<section id="pf-…">` with a composition (`left`, `right`, `center`, `wide`) that leaves room for the stage, and an entrance and a headline primitive from the motion registry.
- **One stage per page.** `template/src/scenes/Stage.tsx` is a sticky, full-height layer behind the scenes that runs one animation loop. It blends the scenes' beats by the scroll position, so the anchor object transforms continuously from the hero to the call to action. Fifteen engines live in `template/src/scenes/engines/`: twelve draw on a canvas (landscape, depths, cosmos, brew, morph, grow, assemble, liquid, playground, character, progress, orbit) and three move real elements (interface, ledger, kinetic), so words in them stay crisp.
- **Scroll is an input.** `template/src/motion/scroll.ts` (the conductor) turns the scroll position into a fractional scene index. The stage, each scene's `--p` progress and the page's `--page` progress all read it. The hero and the call to action pin while the stage plays on.
- **Content shows without JavaScript.** Entrances only hide what a script will reveal: `data-anim="on"` is set by the boot script or the runtime, never in the HTML.
- **Performance pass at run time.** The stage starts after the page has painted and gone quiet. If drawing takes too long it first drops resolution, then frame rate, then holds a still frame. Phones start at 30 frames a second with a 1.5 pixel ratio cap. Reduced motion draws each scene's finished state with time frozen.
- **Layout follows the page, not the window.** `.xp-page` is a size container, so the builder's phone preview and a real phone get the same layout (`cqi` units and `@container` rules in `styles/site.css`).
- **Night stages open dark.** Stages that paint their own night sky, deep water or holographic panels use the dark theme whatever the setting, so the words always read (`needsDark` in `Site.tsx`).
- **The download ships only what runs.** `scripts/bundle-template.mjs` follows the imports from `src/main.tsx`, so the source download holds the renderer and nothing from the old template.

## Calls made where the PRD is silent or conflicts with the old code

- **GSAP and ScrollTrigger are not used.** PRD section 41 lists them, but section 35 is mandatory and prefers MIT, Apache or BSD. GSAP's licence is not an open licence and restricts use in website-building tools. Scroll orchestration is our own code with Lenis (MIT).
- **Tailwind is not used in generated sites yet.** The studio renders the site inside the builder's own page, where Tailwind's reset would restyle the builder. Generated sites use scoped CSS with design tokens. Revisit once the preview runs in its own document.
- **The builder stays at the repository root** instead of `/apps/builder`, so the Vercel project keeps deploying without a settings change.
- **Rapier stays optional.** The playground concepts use a small physics step of our own, which keeps the physics profile out of every site that does not need it.
- **Default intensity** is the concept's own level (for example 7 for a mountain journey, 4 for a law firm), lowered for the Minimal and Luxury styles and raised for Bold and Experimental.
- **The studio has the five controls of PRD section 30, then Publish.** Content (details plus wording tools), Experience (concept, world, interaction, intensity, Remix, Surprise me, Make it better, presets, the three directions, versions with compare and restore), Design (colour, type, spacing, shape, materials, light and dark), Motion (eight channel dials, Smart, Creative or Custom control, 3D and sound), Page (reorder, add, remove, hide and show) and Publish (quality gates, then the downloads). The preview plays the site on desktop, tablet or phone, and normally, with reduced motion or as a low-power device (PRD section 48).
- **Make it better fixes are stored by id on the experience** (`better`) and applied after every storyboard run, so a later content change or intensity change keeps them (`packages/experience-core/better.ts`).
- **Materials** are the world for liquid concepts (liquid, silk, glass, chrome, smoke), so they survive every rebuild without a separate setting.
- **Duplicating a section is not supported yet.** Sections are typed content blocks with one set of words each; a copy needs its own content, which the content model does not have. Hide and show cover the main use.
- **The old template is gone.** `Website.jsx`, `Portfolio.jsx`, the cinema, showpiece and flow layers, the old scene library (`atmos/`) and the old spring and motion helpers were removed. Every site, preview and download is drawn by `Site.tsx` from the Experience JSON. Older saved projects still open: their old design fields are ignored.
- **The home page is a live experience (PRD section 61).** `components/home/HomeHero.tsx` runs the same stage a generated site runs behind the words and changes concept every seven seconds (it stops when the visitor picks one, and never rotates with reduced motion). The prompt box carries the style, intensity and mode choices.
- **The Experience Gallery (PRD section 62)** shows every concept as a live card (`components/home/ExperienceGallery.tsx`): the stage mounts only near the screen, scrolling walks its story, hovering or tapping plays it, and "Use this experience" starts a project on that concept. Categories: Cinematic, 3D, Interactive, Scroll, Characters, WebGL, Editorial, Playful, Product, Experimental.
- **The Experience Lab (PRD section 63)** replaces the Scene Lab at `/lab` (`components/lab/ExperienceLab.tsx`): pick a sample site, an object or character, a background from the same engine, intensity, channel dials, 3D, transitions, heading and entrance primitives, and see a real site. `/lab/scene` redirects there.
- **Scene transitions (PRD section 14)** are drawn in CSS from each scene's own progress: every section carries `data-tr` (crossfade, morph, wipe, depth, warp or continue) and leaves by that effect over the last part of its scroll.
- **3D loads only at intensity 7 and up**, only for concepts with a 3D version, and only after the page is usable (PRD sections 17, 18 and 37).
- **The 3D layer runs on React Three Fiber (PRD section 78, P0).** R3F owns the renderer, the canvas size, the pixel ratio and the camera. The stage keeps one loop for the whole page and advances R3F from it (`frameloop: "never"`), so 2D and 3D share pacing and the slow-frame fallback. Each engine builds its scene once and renders from a `useFrame` callback. Drei is not used: nothing in the four engines needs it, and leaving it out keeps `site-3d.js` to about 190 KB gzipped. `site-3d.js` uses the page's own React (`window.__xpReact`) rather than shipping a second copy. Four engines exist: `product3d` (tooth or bottle), `blob3d` (liquid, silk, glass, chrome), `space3d` (stars and planets) and `gallery3d` (a corridor of framed work).
- **When 3D runs.** Intensity 7 or more, a concept with `stage.webgl`, a fine pointer, not a low-power device, a viewport 760 px or wider and WebGL2. If a 3D frame keeps costing more than 14 ms the view is dropped and the 2D engine takes over. Downloaded source only lists `three@0.185.0` and `@react-three/fiber@9.8.2` in `package.json` when the site uses 3D.
- **Imported whole-project templates sit beside the Experience JSON, not inside it** (docs/TEMPLATES.md). A project someone hands over (Mossline, Fernhollow) keeps its own code and engine; turning it into scenes for `Site.tsx` would lose what makes it worth handing over. It joins the same Experience Gallery (a Templates category and the categories it declares), the licence register (`owner-supplied`, with its libraries checked for open licences at build) and the same download promise (a ready-to-host site or the source). Its words and pictures are slots replaced with the escaping each file needs, live in a sandboxed preview at `/templates/<id>`.


## 3D assets (docs/ASSETS.md)

- `library/assets/manifest.json` and `public/assets/` hold the licence-checked library: 3D models, HDR lights and their stills.
- `packages/asset-library` holds the registry, the licence gate, the resolver, art direction, the asset plan and the scene choreography.
- `asset-showcase` is the concept that carries a real model. It uses the `showcase` 2D engine (the still) and the `asset3d` R3F engine in `template/src/scenes/webgl/asset.ts`, both inside the existing Stage.
- The Experience JSON gains `style`, `artDirection`, `assetPlan`, `assets` and `assetDirection`.
- Downloads copy only the files the experience uses (`packAssets` in `lib/export.ts`), plus `CREDITS.txt`.
- The quality engine checks asset licences and asset weight before export.
