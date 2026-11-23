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

## The choreography: every section built around the one character

The shot-per-section film above works on any page. On top of it sits a *choreography*
(`library/character/scenes.ts`): a tall track of scroll, one sticky screen, where a script moves the
camera and brings every word, chip, card, swatch and quote in and out on the **same scroll clock**
as the model, so the whole page is the story of one object. It was written by measuring a cinematic
car page frame by frame (positions, fade windows, camera yaw and height, timing), technique only.

- **Where it plays.** A template with an empty `[data-xp-film-track]` opens with it (Turntable). On
  any other template with a character, the runtime injects the track right after the hero's section
  (the story begins at the specs). It needs `content.film` (defaults come from `withCharacter`) and
  `film.on !== false`.
- **Scenes** (`LEN` = lengths in hundredths of a screen): *hero* (the model low and big, an outlined
  wordmark behind it, words to the side; it lifts off with a spreading ring, light pools under its
  wheels and dust, then floats while the wordmark fades), *specs* (three-quarter view, title, up to
  six chips floating below), *ring* (camera climbs and swings to straight above, a lit halo opens,
  six cards slide in around it and out again), *paint* (rear three-quarter, colour swatches repaint
  the model), *voices* (reviews), *finale* (a closing call to action). Scenes switch off with
  `film.specs.on`, `ring.on`, `paint.on`, `voices.on`, `finale.on`.
- **The script is data.** `buildScript(content, {narrow, flat}, opening)` returns camera keys (a
  box on the screen, turn, camera height, set levels) and element specs with fade windows
  (`fade: [in0, in1, out0, out1]`). `sampler` interpolates the keys (monotone, no overshoot);
  `visibility` gives each element's opacity. Variants: wide and flat (cars, boats), wide and tall
  (people, animals: they stay upright and turn slowly), narrow (phones: one column, one card at a
  time).
- **The camera fits the real outline.** The engine keeps about 1,500 points on the model's surface
  and each frame projects them through the actual lens, so the model's silhouette (not its
  bounding box) fills the script's box exactly, whatever turn or height. A box in the script is
  therefore the model's own space on screen.
- **The room.** A sticky viewport layer behind the model carries a spotlight from above and a lit
  band of floor (the character's own colours), eased by the script's `floor` and `halo` values.
- **Content** (`content.film`, all text editable in the studio): hero, specs, chips
  (`icon`, `label`, `value`), ring, cards (`icon`, `title`, `text`), paint and swatches, voices and
  quotes, finale. In the journey the rules (`filmWords` in `lib/animator.ts`) or the AI writer write
  it from the business's own services, steps and answers; colour choices are off for people and
  animals (repainting them whole makes no sense).

## Sites saved before the story

A site kept in the browser before the story existed has `character.scroll: "turn"` (then the only
default) and no `content.film`. `loadContent` (lib/templates.ts) gives it the story: `film` comes
from the template's defaults and `scroll` becomes `"film"` when a model is in place. Once a site
has `content.film`, its scroll motion is the owner's choice and is never changed.

## Checking it

The script is tested without a browser (`tests/scenes.test.ts`). The look is checked frame by frame
against the reference in a real browser: `window.__XP_SCENES__()` returns the track's length, scenes
and elements; `window.__XP_FILM_SNAP__ = true` lands every move at once so a screenshot at a given
scroll is exact. Render a built template with `preview.html#xp=<content json>` (Playwright with
swiftshader and a local static server).

## The film's own checks

`window.__XP_FILM__()` in a page returns the shots and the camera's current values. Screenshots of
six templates scrolled top to bottom with the black hypercar are the check used when it was built
(Playwright with swiftshader, as in docs/CHARACTER-JOURNEY.md). `tests/film.test.ts` covers the
room finder and the defaults.

## Next

- Callout chips pinned to points on the model, written from the interview (specs, features).
- More scenes (a close-up on a detail, a before/after) chosen by the AI from the business.
- Smoke and soft light shafts in the room, as in the reference.
