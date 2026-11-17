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

## Where things live

PRD section 67 recommends `/apps` and `/packages`. The builder stays at the repository root because Vercel deploys it from there; the engines are split as follows.

| PRD package | Here | Ships in downloads |
| --- | --- | --- |
| experience-core (generation) | `packages/experience-core/` | no |
| experience-core (runtime types) | `template/src/experiences/` | yes |
| motion-engine | `template/src/motion/` (primitive registry, scroll orchestration, runtime) | yes |
| scene-engine | `template/src/scenes/` (stage engines, objects, characters) | yes |
| webgl-engine | `template/src/scenes/webgl/` (three.js, React Three Fiber, Drei) | only when the profile is `webgl` |
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

## Calls made where the PRD is silent or conflicts with the old code

- **GSAP and ScrollTrigger are not used.** PRD section 41 lists them, but section 35 is mandatory and prefers MIT, Apache or BSD. GSAP's licence is not an open licence and restricts use in website-building tools. Scroll orchestration is our own code with Lenis (MIT).
- **Tailwind is not used in generated sites yet.** The studio renders the site inside the builder's own page, where Tailwind's reset would restyle the builder. Generated sites use scoped CSS with design tokens. Revisit once the preview runs in its own document.
- **The builder stays at the repository root** instead of `/apps/builder`, so the Vercel project keeps deploying without a settings change.
- **Rapier stays optional.** The playground concepts use a small physics step of our own, which keeps the physics profile out of every site that does not need it.
- **Default intensity** is the concept's own level (for example 7 for a mountain journey, 4 for a law firm), lowered for the Minimal and Luxury styles and raised for Bold and Experimental.
- **3D loads only at intensity 7 and up**, only for concepts with a 3D version, and only after the page is usable (PRD sections 17, 18 and 37).
