# 3D asset intelligence

This document explains how the builder puts real 3D models and HDR lights on a generated site.

The system is free-first. There are no paid generators and no paid asset providers. It extends the existing experience architecture rather than replacing it: the same Experience JSON, the same Stage, the same R3F host pattern and the same downloads.

```
prompt -> ART DIRECTION -> experience plan -> ASSET PLAN -> ASSET RESOLUTION -> SCENE PLAN -> Experience JSON -> renderer
```

The AI (Gemini on /create, or the rules when it is not available) describes what the site should show in words, for example "premium black sunglasses" or "studio softbox". It never names a file or a URL. Only the resolver turns a description into a library file, so nothing a model writes can reach a page.

## Library

The manifest is `library/assets/manifest.json`, and the files are in `public/assets/`:
- `3d/<category>/<id>.glb`
- `hdr/<id>.hdr`
- `previews/<id>.webp`

Each record carries:
- **What it is:** id, name, type, category, subcategory, tags (the first three are the subject), style, materials and colours.
- **Licence:** type, URL, commercial use, redistribution, attribution requirement and evidence.
- **Source:** URL, creator, publisher and how it was fetched, plus the changes made to it.
- **What it can do:** animation capabilities, clips, colourway variants and pivot.
- **Performance:** bytes, triangles, texture resolution, material count and a tier of low, medium or high.
- **Bounds and preview path.**

The library holds 112 assets in 9 categories, about 68 MB in total (2026-11-22):

| Category | Count |
| --- | --- |
| Products | 17 |
| Vehicles | 12 |
| Characters | 16 |
| Nature | 10 |
| Architecture | 8 |
| Environments | 7 |
| Props | 27 |
| Abstract | 8 |
| HDR lights | 7 |

By licence:
- **CC0 1.0:** 65 assets (Khronos glTF Sample Assets, KayKit, Kenney, Poly Haven).
- **CC BY 4.0:** 14 assets (13 from Khronos glTF Sample Assets, plus the Black Hypercar by LC Design, from the owner's upload with its Sketchfab licence file). These are credited in every site that uses them.
- **Original:** 8 assets, the abstract models made in code by `scripts/assets/abstract.mjs`.
- **Owner-made:** 2 assets, uploaded in the project (Mars Rover and Macaw). The owner made them with ChatGPT and confirmed on 2026-11-19 that they are their own work, so they are recorded as `original` and ship like the other originals. The macaw has no animation clips.
- **Owner uploads, cleared (`owner-cleared`):** on 2026-11-22 the owner confirmed that every GLB they supplied is licence free and cleared for commercial use. That switched on the six held from 2026-11-19 (Red Deer Stag, Black Leather Loafers, Armoured Blade Warrior, Bee Robot, Little Astronaut, Baby Dragon) and covers the third batch of 17 added on 2026-11-22: Myna Bird, Pink Winged Dragon, Animated Kid (idle, walk, run and sit clips merged from separate files), Pink Backpack, Gift Box, Hardcover Book, Blueprints, Drink Cans, Superyacht, Pulsing Xenia Coral, Swivel Lounge Chair, Foldable Phone (open and close clip), White Track Coupe, Formula Racer, Cozy Bedroom Diorama, Planet Earth and Amber Planet. Trademarks are not the owner's to clear, so maker logos, sponsor liveries, tyre lettering and a streaming brand's screen were painted out or removed, and every model has a generic name. Files whose own licence forbids commercial use (cirque_de_gavarnie) or that show a copyrighted character (Frieren) stay out.
- **Recolourable materials:** a few models name the material a site may recolour: `paint` (Formula Racer), `clay` (Animated Kid) and `screen` (Foldable Phone, bedroom TV). The manifest records them as `display.tint` and `display.screen`, and the character engine tints them with the site's accent or shows the site's gradient on the screen.

### Owner uploads: picking one copy

The second batch came with the same models in several formats. Each was converted with Blender (the `bpy` Python package), compared by triangle count and texture, and only the best copy was added: the deer FBX (the OBJ copy is the same mesh), `glb.glb` for the warrior (`model.obj` and `fbx.fbx` are the same 2-million-triangle mesh), and only the shoe mesh from the `.blend` (its studio floor, cameras and lights were dropped). The German Shepherd was skipped because neither copy came with its textures, and `halden.zip` is a website project, not a model. The McLaren upload carried its own CC BY 4.0 `license.txt`: it ships under the generic name Black Hypercar, with the tyre maker's logo painted out of the tyre texture, and its credit names the original work.

### Licence rules

Each licence was verified one by one at the source (the `metadata.json` or `LICENSE` file). Only CC0 1.0, CC BY 4.0 and original work ship.

An asset is refused when:
- its licence is unclear,
- it is non-commercial (NC) or personal-use only,
- it has a logo or trademark that cannot be painted out, or
- it is too heavy.

Logos on otherwise open models were replaced with a plain colour, and each change is recorded in the asset's `modifications`. Trademarks are not covered by the copyright licence. Each material that gets painted over also loses its roughness, normal and occlusion maps, because a logo can be engraved in them too.

Every textured model was checked from four angles, the underside included, for logos and brand marks. That audit found the Khronos mark still on the sunglasses' ear hooks and on the watch's back plate, and both were fixed. It also found a made-up brand on the water bottle, which was removed.

The rejected assets and the reasons are listed in `REJECTED` in `scripts/assets/sources.mjs`.

### Pipeline

The tools are kept outside the app's dependencies. To rebuild:

```
# ASSET_SRC: the downloaded originals. ASSET_TOOLS: a folder with @gltf-transform/*, meshoptimizer and sharp installed.
ASSET_SRC=... ASSET_TOOLS=... node scripts/assets/ingest.mjs [id ...]   # normalize + manifest
ASSET_TOOLS=... node scripts/assets/abstract.mjs                         # the original abstract models
ASSET_TOOLS=... node scripts/assets/previews.mjs [id ...]                # 384px WebP stills (headless three.js)
```

`ingest.mjs` processes each model in this order:
1. Paint out logos.
2. Keep the useful animation clips and rename them to plain names (idle, walk, run, wave).
3. Stand Z-up files upright.
4. Optionally simplify with meshoptimizer.
5. Dedup and prune.
6. Centre, either on the centre or with the bottom on the ground.
7. Quantize the meshes (`KHR_mesh_quantization`).
8. Convert textures to WebP at 1024 or less (`EXT_texture_webp`).
9. Prune again, then measure.

Both extensions are read natively by three.js, so a site ships no decoder.

### Adding an asset

1. Add a record to `SOURCES` in `scripts/assets/sources.mjs`, with its licence evidence.
2. Run `ingest.mjs <id>` and then `previews.mjs <id>`.
3. Look at the preview and check the model from every side for logos.
4. Run `npm test`. `tests/assets.test.ts` checks every file against the manifest.

To clear an owner upload, give it a confirmed licence and a source URL. Anything else stays held back.

## Resolver

The resolver is `resolveAsset` in `packages/asset-library/resolver.ts`. It works in these steps:
1. **Parse the query** into subject words (with synonyms and singular forms), style words and colour words. The head noun is the last subject word the library knows. In "concept sports CAR" that is "car", and a brand or a city after it is skipped.
2. **Filter by type:** a model, or an HDR for lighting.
3. **Licence gate.** This runs before any scoring, so a refused asset is never a candidate.
4. **Filter by category,** if one was asked. The filter is relaxed when the category has no matches.
5. **Score** each candidate:

   ```
   0.6·subject + 0.2·style + 0.08·colour + 0.04·material + 0.08·performance fit
   ```

   Subject scores:
   - An exact hit on a lead tag scores 1.
   - Other tag hits score 0.75, 0.6 or 0.45.
   - A hit that is not the head noun counts 0.8 as much.
   - "Loose" synonyms (headphones → speaker, perfume → bottle) can find a stand-in but never count as an exact match.

6. **Budget.** If the best match is over the tier's budget, the resolver picks a lighter model of the same thing that scores at least 80% as well ("optimized-3d"). If there is none, it shows the best match's still ("2d").
7. **Below 0.32, nothing is used.** The procedural stage draws the scene instead.

It returns:
- id
- score
- a plain-language reason
- preview
- representation (3d, optimized-3d, 2d or procedural)
- cost
- licence status
- the next three alternatives

The fallback order runs:
1. A local 3D model.
2. A lighter local 3D model.
3. A 2D still of the model, drawn by the `showcase` engine.
4. The procedural stage, which is the concept's own 2D or WebGL engine.

## Art direction, asset plan and scene plan

The art direction, asset plan and scene plan live in `packages/asset-library/plan.ts`.

`artDirectionFor` sets the look from the brief's personality, the style chip and the intensity:
- visual style, mood and density
- depth, motion and interaction intensity
- preferred visuals and things to avoid
- style tags
- lighting: studio, cinematic, natural, night, interior or urban
- typography and composition

For example, luxury gives "luxury editorial, cinematic, minimal, studio light, soft particles, avoid generic SaaS cards".

`assetPlanFor` makes the requests:
- a hero product, or a hero character when the brief asks for a mascot, robot or character
- an HDR lighting mood that matches the light
- a supporting abstract object, for rich density only

`resolvePlan` resolves each request against the tier's budget and returns `ExperienceAsset`s for the renderer. Notes for every request, including ones that fell back, go in `assetPlan.resolved`.

`assetDirectionFor` sets the fixed parts of the scene plan:
- camera
- lighting type and HDR
- entrance: scale-reveal, rise or fade
- idle: slow-float, turntable, clip or still
- scroll: rotate-360, orbit, travel or drift
- particles

`choreograph` writes the per-scene beats, using only what the model can actually do:
- Characters get their own clips per scene: idle, then walk, run or dance, then wave at the call to action.
- Products with colourways show them in the middle scenes.
- Models made of separate parts come apart once in the middle and close again.

### In the generator

`generateExperience` in `packages/experience-core/index.ts` always adds `artDirection` and `assetPlan`.

It switches to the `asset-showcase` concept only when all of these hold:
- the brief is a website,
- no concept, preset or pack was forced,
- the hero match is exact on a lead tag,
- the hero scores at least 0.55, and
- the hero is a product or a vehicle, or a character when one was asked for.

Every other business keeps its concept and gets no assets: the dentist, the bakery, the coffee shop and every portfolio. `optionsOf` keeps the choice, so rebuilding the scenes keeps the model.

The `asset-showcase` concept uses:
- `engine: "showcase"`, a 2D still of the model that responds to the same beats,
- `webgl: "asset3d"`, the R3F stage, and
- the world `asset-studio`.

### On /create

`lib/animator-art.ts` has the rules' art plan. `PLAN_SYSTEM` asks Gemini for `artDirection` and `assets` in the same JSON as the master prompt. `normalizeArtPlan` keeps only valid values and drops any request that looks like a file, a path or a URL. The route resolves the requests on the server.

The panel shows the art direction and each request:
- its still and name
- whether it is real 3D, lighter 3D, a still or procedural
- its cost and licence

When the hero resolves, "Build it as a 3D experience instead" makes a studio project with the 3D stage.

## Renderer

The renderer is `template/src/scenes/webgl/asset.ts`. It is one more 3D engine (`asset3d`), mounted by the existing Stage through `load3d()`, and it uses R3F `createRoot` with `frameloop: "never"`, advanced by the stage loop.

`<Asset>` renders any library GLB:
- GLTFLoader with a cache.
- Fit: the longest side becomes one unit.
- Pivot: centre, or bottom on the ground.
- Variant switcher: `KHR_materials_variants`, which three.js parses but has no switch for.
- AnimationMixer with cross-faded clips.
- Scroll: spin, tilt, lift, shift, zoom and explode from the beat.
- Idle: slow float or turntable.
- Hover: lift.
- Pointer: lean.
- Tap: spin, or a one-off wave or jump for characters.
- Entrance: scale-reveal, rise or fade.

`AssetStage` adds:
- the HDR environment on desktop, or `RoomEnvironment` on phones and when the HDR fails
- hemisphere, key and rim lights per lighting type
- a contact shadow
- a camera orbit and drift from the beat
- exposure and key light from the "light" beat
- particles when the direction asks for them

Beat keys (blended by scroll, like every other engine):

| Key | Meaning |
| --- | --- |
| `spin` | degrees |
| `tilt` | radians |
| `lift` | world units |
| `shift` | -1..1 of the stage width |
| `zoom` | scale |
| `orbit` | degrees, the camera |
| `explode` | 0..1, for models made of parts |
| `light` | 0..1 |
| `particles` | 0..1 |
| `clip` | animation name |
| `variant` | colourway name |

### Stage fallbacks

These all live in `template/src/scenes/Stage.tsx`:
- The 2D `showcase` still draws until the model is ready (`view.ready()`).
- A failed load (`view.failed()`), such as a missing file, drops back to 2D for good.
- Slow frames step down to 2D, then to a still. The first 30 3D frames do not count, because they compile shaders.
- **Phones** run 3D only when the hero is in the light tier (`phoneMay3d`). They get one model, `RoomEnvironment` instead of the HDR download and no particles. Otherwise they get the still.
- **Reduced motion** gets no 3D and downloads no model. The still is drawn in one pose per scene.

## Export

`packAssets` in `lib/export.ts` copies the files the experience uses, and nothing else from the library, into the download:
- `assets/` in the ready-to-host zip
- `public/assets/` in the source zip

It writes `CREDITS.txt` with the CC BY credit lines, which the licence requires, and the CC0 thanks. If a file cannot be copied, it is dropped from the experience, and the page falls back to the still or the procedural stage. three.js and React Three Fiber ship only when `wants3d` is true.

## Quality gates

These are in `packages/quality-engine/assets.ts`.
- **licensing:** every asset is in the library, matches its library file, passes the licence gate, carries its credit line and is served from the site itself.
- **asset-performance:** the total bytes fit the tier (light 1 MB, medium 3 MB, heavy 6.5 MB, extreme 9 MB), there are at most 2 models and 300k triangles, and the gate says whether phones get the model or the still.

The licence register (`licences.ts`) covers the CC0 and CC BY library and the asset engines.

## Tests

- **`tests/assets.test.ts`:**
  - every GLB is parsed: header, chunks, triangles, clips, size and no external files
  - the licence gate (NC, personal-use, unknown and missing source are all refused, and unconfirmed owner uploads are held)
  - the resolver: semantic queries, missing assets, the low budget and lighter models
  - the eyewear demo's Experience JSON and quality gates
  - other businesses keep their concepts
  - rebuilds keep the model
  - character clips per scene
  - phone and reduced-motion rules
  - the export contains exactly the assets used, with credits and no outside asset URL
  - a missing file is dropped
  - unlicensed assets fail the gate
  - the animator drops file names and URLs
- **`scripts/assets/e2e.mjs`:** runs on a built download, `ONLY=eyewear npx vitest run -c vitest.examples.config.ts`. It checks in Chromium:
  - **desktop:** the stage mounts, the GLB and HDR load from the site's own folder, and scrolling turns the model
  - **phone:** 3D, no HDR download and no sideways scroll
  - **reduced motion:** no 3D, no model download and the still is shown
  - **missing model:** the page falls back to 2D with no other errors
  - no outside requests and no console errors anywhere

## Known limits

- Most hosts (Poly Haven, Sketchfab, Quaternius, ambientCG) were not reachable from the build environment, so the library comes from GitHub sources (Khronos, KayKit, Kenney) and the drei-assets HDRI mirror.
- The macaw upload has no animation clips, despite its file name. It can float, turn and lean, but it cannot fly.
- There is no AI 3D generation. The procedural stage is the last fallback.
