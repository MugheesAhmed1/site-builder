# The film: the character travels with the page (2026-11-23)

Studied from a cinematic car landing page (technique only: no code, brand or assets copied). The
gap analysis is in the project's "Roadster 3D study" doc. Before this, the character was drawn into
one box in the hero at a fixed zoom and scrolled away like a picture. Now, with
`content.character.scroll = "film"` (the default for new sites), it becomes the camera's subject
for the whole page.

## How it works

`library/character/film.ts` (the director) and `library/character/engine.ts` (the camera and set):

1. **One fixed stage.** `runtime.ts` sees a hero spot in film mode and mounts one view into a
   fixed full-screen layer (`.xp-film`, z-index 4, no pointer events) instead of one per spot. The
   echo spot becomes a shot; badges keep their own small view.
2. **A shot for every section.** Top-level `section`, `footer` and `[data-xp-shot]` elements are
   read in order. The hero spot is the opening shot, the echo spot (if any) another; every other
   section gets the next shot from a list: three-quarter, from above, side, close, low (wide, low
   models such as cars) or three-quarter, low, side, close, from above (everything else). Tall
   sections get up to four shots that drift a little.
3. **Composition around the words.** For each shot the director lays a 24 x 16 grid over the
   screen as it will be when that shot is in place, marks every heading, paragraph, link, button,
   picture and card, and picks the biggest free box the model's shape fills (`freeBox`). A section
   with no room lets the model shrink and fade away. Shots near the current scroll are measured
   again from where things really are (pinned and sticky sections), and if words still end up
   under the model it gives way (`dodge`).
4. **Scroll is the timeline.** Between two shots the scroll position blends box, turn, camera
   height and set (held for the first and last fifth of the way, then eased), and springs smooth
   every value, so it moves like a crane shot and plays backwards when scrolling up. Turns always
   go forward the shortest way round.
5. **The camera.** The engine backs the camera off until the model, seen from that height and
   turn, fills its box, then shifts the lens (`setViewOffset`) so the box sits where the director
   wants it. The view from above turns the model's long side to run up the screen.
6. **The studio set** (`character.studio`, on by default): a wet floor that mirrors the model
   (three's `Reflector` with a fading shader; skipped on phones and low quality), a glowing ring,
   dust in the light, and a darker, glossier light. A soft halo behind the model grows for the view
   from above. Colours come from the design system's gradient.
7. **Words in step.** Each section gets `--xp-shot` (0 to 1); its headings ease in as its shot
   lands (`filter: opacity()` and `translate`, so templates' own animations are untouched).
   `character.wordmark` puts a huge outlined word behind the model in the opening shot (the journey
   fills in the site's name).

Reduced motion: shots still change per section, but without springs, dust or heading moves.

## Checking it

`window.__XP_FILM__()` in a page returns the shots and the camera's current values. Screenshots of
six templates scrolled top to bottom with the black hypercar are the check used when it was built
(Playwright with swiftshader, as in docs/CHARACTER-JOURNEY.md). `tests/film.test.ts` covers the
room finder and the defaults.

## Next

- Callout chips pinned to points on the model, written from the interview (specs, features).
- A template built around the model's silhouette (flanking cards, a feature section from above).
- The AI picks the shot list per site.
