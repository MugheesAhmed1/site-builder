# Shared library

Every template is also a source of parts. The **library** holds blocks taken from all of them (sections, 3D scenes and effects) and every picture, film, font and palette they use, sorted by kind, business type, tag and the template they came from. Anyone can add any block to any template in the studio, change every setting in it, and download the result. Browse it at `/library` (`?kind=scene&business=dentist&from=milo`).

## What is in it

| Kind | Blocks |
| --- | --- |
| Sections | before and after (Distill), contact form (Jack), counting numbers, picture hotspots, scroll-scrubbed film (Mossline), gradient headline, magnetic button (Milo), picture marquee, numbered list, word-by-word reveal, stacking cards (Jack), pricing plans (Distill), product cards (Stride), spotlight reveal (Lithos) |
| 3D scenes | Milo's orbitable world, Fernhollow's night valley |
| Effects | custom cursor, scroll progress (Milo) |

Assets: the pictures and films of every template plus the library's own pictures in `library/media/` (free Pollinations generations, cropped to WebP), every font family the templates use, and each template's palette.

## Using it

- **Studio.** Each template has a *Library blocks* group: pick a block (★ marks ones made for the template's business types), add it, and every setting appears as a field. Up, Down, Copy and Remove reorder the list. Beside every picture or video field, *Library* opens the pictures and films of every template, the ones for this business first.
- **Content.** Blocks are stored in the template's content as `extras: [{ "block": "<id>", "props": { … } }]`. Settings left out take the block's defaults. Library pictures are written `lib:<name>.webp`.
- **Downloads.** When a page has blocks, its zip carries the library under `xp-lib/` (`public/xp-lib/` in a Vite source), and `xp-content.js` loads `xp-lib/xp-library.js`. Pages without blocks load nothing.

## Adding a block

1. Write `library/blocks/<id>.tsx`, a default export taking `{ props }`, using `library/kit.ts` (`text`, `num`, `color`, `lines`, `pairs`, `items`, `safeHref`, `safeSrc`, `useInView`, `useReducedMotion`, `useScrollProgress`, `useStickyProgress`). Take it from a template's own code; it may import that template's files directly (Milo's world and Fernhollow's valley do). It must look right on any background, honour reduced motion, and never read anything outside its props.
2. Write `library/blocks/<id>.json`: `name`, `kind` (`section`, `scene` or `effect`), `from` (the template id), `description`, `tags`, `business` (ids from `lib/categories.ts`), `heavy` (real WebGL), `fields` (the same field types as a template schema, with paths into its props) and `defaults`. Every default needs a field.
3. Run `npm run library`. It checks every block, builds `public/lib/` (the runtime `xp-library.js`, one chunk per block, `media/`, `files.json`, `preview.html` and `source/`) and writes the registry `lib/library.gen.json`, adding the assets of every template. Commit the block files and the registry; `public/lib` is built on every deploy.

| Piece | File |
| --- | --- |
| Runtime: mounts `extras` into `[data-xp-extras]`, one error guard per block, redraws on `xp-data` | `library/runtime.tsx` |
| Helpers for blocks | `library/kit.ts` |
| Build, checks and registry | `scripts/build-library.mjs` → `public/lib/`, `lib/library.gen.json` |
| Registry in the app | `lib/library-blocks.ts` |
| Library page | `app/library/page.tsx`, `components/library/LibraryIndex.tsx` |
| Studio editor | `BlocksField` and `MediaPicker` in `components/templates/TemplateStudio.tsx` |

`/lib/*` is served with the same frame headers as `/tpl/*`, because blocks load inside the sandboxed template preview.
