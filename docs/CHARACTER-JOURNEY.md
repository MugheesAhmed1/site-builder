# The character journey (2026-11-22)

Every site now starts from one 3D character, and every part of the site follows it: the stage
gradient behind it, the colours, the type, the motion and the words. This journey replaces the PRD
journey ([PRD-JOURNEY.md](PRD-JOURNEY.md)) at `/create`, strictly in this order:

1. **One line**: what they want to build. The home page sends people here with `?q=`, and with
   `?star=<library model id>` when they picked a character there: it is put in place once per line
   (`Saved.star`), the interview skips the character question, and the design step opens with it.
2. **The AI interview** (`components/journey/Interview.tsx`, `POST /api/chat`): one short question
   at a time with answers to tap, at most six: the name, who it is for, the feel, the sections, the
   3D character (always) and colour wishes. A live brief sits beside the chat.
3. **Character and design system** (`components/journey/DesignStep.tsx`): pick the character from
   the asset library, upload a GLB, or make one from a photo (below). Its colours are read from its
   still, and five design systems are drawn from them: from the character, night stage, daylight,
   vivid and quiet (`lib/character/match.ts`, `lib/character/design.ts`), each with its own font
   pair (the best match for the words, then the best airy, loud and calm pairs). Each passes WCAG
   contrast checks. Accent, type pair, light or dark, background style, corners and motion can be tuned, with
   a live mock of the site beside the controls.
4. **The template library, shown as their own site** (`components/journey/TemplateStep.tsx`): every
   template (Turntable first, because the whole page is built around one character) with their words, their design system and their character, best matches first, with a
   live preview on desktop or phone.
5. **Pick a template, or create a new one**: *Create a new template* is the Orbit canvas
   (`templates/orbit`): the character centre stage on its own gradient with rings and orbiting
   words, then the library sections the person picks, in the order they pick them.
6. **The studio** (`/templates/<id>?from=journey`): every word, picture, colour, font, section and
   the model itself can change; the site downloads as a static site or as source.

Progress is kept on the device (`xp-journey:v1` in localStorage; big files such as models and
photos in IndexedDB through `lib/blobstore.ts`), so a reload picks up where it was.

## Models and keys

- The interview, the plan and the words run on **free Gemini models** through the server only
  (`lib/gemini.ts`; `gemini-flash-lite-latest` first, then the next free model). The key is read
  from the `GEMINI_API_KEY` env var on the server and never reaches the browser or the repository.
- Without a key, or when the free tier is busy, **rules finish every step**: `ruleStep` in
  `lib/journey/brief.ts` runs the interview, and `localTexts` in `lib/animator.ts` writes the key
  words. A portfolio speaks in the first person about the person's craft (`lib/voice.ts`: role,
  what they do, pronouns swapped in every other line); a business on a template made for another
  kind of business gets its own words in the shared slots (hero, menu, features, about, contact).

## The character in every template

Each template declares `roles` in its `template.json`: which of its colours are the page, ink,
accent, fills and stage, which fonts are display or body, and whether it can show both light and
dark. `composeContent` (`lib/character/apply.ts`) pours one design system into any template by
those roles, puts the character in the hero (and the echo and badge slots where a template has
them) on a gradient from its own colours, and colours the library sections by role too. Text on
the stage swaps to stay readable (contrast is tested for every template and every design system in
`tests/character.test.ts`).

**The film** ([FILM.md](FILM.md)): by default the character no longer sits in the hero's box. It
lives on one fixed stage over the page, and every section is a camera shot of it, blended by the
scroll position, with a studio set and an outlined wordmark.

## A 3D model from a photo

`components/character/PhotoTo3D.tsx`, `lib/character/photo.ts`:

1. **Cut-out on the device.** Google MediaPipe's MagicTouch interactive segmenter
   (`@mediapipe/tasks-vision`, Apache-2.0; `public/models/magic-touch.tflite`, credited in
   `public/models/NOTICE.md`) finds the subject; a tap picks another one. When the model cannot
   load, a colour-and-edge cut takes over (careful flood fill, then a seeded watershed with colour
   models). A PNG with no background is used as it is.
2. **Then one of three builds:**
   - *AI sculpt*, the [img2threejs](https://github.com/img2threejs/img2threejs) method (Apache-2.0):
     a vision model reads the photo into a tree of parts, the model is built, rendered, compared
     with the photo and corrected over a few rounds, then packed as a GLB (`POST /api/sculpt`).
   - *Soft 3D*: a puffy relief from the cut-out, with no AI at all.
   - *Standee*: the photo on a shaped stand, which keeps real faces exactly as they are (best for a
     portfolio made from one's own photo).

The finished model goes back into the journey like any library model, and its colours drive the
design systems.

## The home page

The marketing page (`app/page.tsx`, `components/home/`) is built the way the sites are: one 3D
character is the star and the whole page takes its colours from it. `HomeCharacter.tsx` reads each
showcase character's still with the journey's own code (`paletteFromPixels`, `designOptions`,
`tokens`), and writes the first design system into registered CSS colours on the page root
(`--hc-a`, `--hc-a2`, `--hc-bg`, `--hc-s1..3`), so accent, panels, lines, the stage gradient and
the closing card glide to the new character in 0.9 s. The opening turns to the next character every
6.5 s while it is on screen and nobody has chosen (never with reduced motion or Save-Data), loads
three.js only once the page is idle (on phones after the first touch), and shows the model's still
until then. Sections: the opening with a picker and the live design tokens, how it works (six
steps, a sticky screen on wide screens and a picture per step on phones, all drawn with the current
character), photo to 3D (a real run of the pipeline: `public/home/portrait.webp` is a free AI
picture made for the Cornerstone template, its cut-out and the standee GLB made from it), the 3D
library river (`ModelMarquee.tsx`; tapping any model makes it the page's star), the live template
gallery, what you keep, questions and the closing call. The requirements-document start of the PRD
journey is gone: `/document` redirects to `/create`.

## Where things live

| Part | Code |
| --- | --- |
| Journey shell, steps, saved progress | `components/journey/Journey.tsx`, `app/create/page.tsx` |
| Interview (rules and the AI) | `lib/journey/brief.ts`, `app/api/chat/route.ts`, `components/journey/Interview.tsx` |
| Character and design systems | `lib/character/{palette,design,match}.ts`, `components/journey/{DesignStep,DesignPreview}.tsx`, `components/journey/design-tweak.ts` |
| Templates as the person's site | `lib/journey/plan.ts`, `components/journey/TemplateStep.tsx` |
| Character in templates | `lib/character/apply.ts`, `lib/template-schema.mjs` (`withCharacter`), each template's `roles` |
| Words by rules | `lib/animator.ts` (`localTexts`), `lib/voice.ts` |
| Photo to 3D | `lib/character/{cutout,relief,photo,sculpt}.ts`, `components/character/PhotoTo3D.tsx`, `app/api/sculpt/route.ts` |
| The new template | `templates/orbit/` |
| The home page | `app/page.tsx`, `components/home/{HomeCharacter,HomeJourney,PhotoStory,ModelMarquee}.tsx`, `components/home/showcase.ts`, `components/home/home-character.css`, `public/home/` |

## Tests

`tests/journey.test.ts` (cut-out, relief, sculpt spec, interview rules, saved sites, the voice) and
`tests/character.test.ts` (palettes, design systems, every template with every design system).
