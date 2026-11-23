# Film templates: every template told around one 3D figure

Every template in the builder opens on one central 3D figure and the whole page revolves around it: the figure lifts, turns and moves as you scroll, and each section arrives round it (beside it, flanking it, beneath it). This is the logic of the Turntable (the first template made this way, from a frame-by-frame study of a reference site; see [FILM.md](FILM.md)), now shared. Each template keeps what makes it its own: its **figure**, its **scenes** (what the sections are), its **logic** (how the camera moves), its **look** (what fills the air), its **opening**, its fonts and colours.

The Turntable keeps its own fixed story (hero, specs, ring, colours, reviews, finale; `library/character/scenes.ts`). Every other template tells its story as a **plan of scenes** (`library/character/plan.ts`).

## How a template tells its story

`content.film` is the plan:

```json
"film": {
  "on": true,
  "order": "hero stats-gym gallery-programs facts-timetable plans-membership finale",
  "logic": "still", "look": "sparks", "opening": "drop", "motion": "pop",
  "hero":  { "title": "Built\nnot born", "text": "…", "cta": "…", "ctaHref": "#start", "comp": "word", "plate": "./media/hero.webp" },
  "stats-gym": { "on": true, "eyebrow": "…", "title": "…", "text": "…", "comp": "flank", "plate": "", "items": [{ "value": "40+", "label": "Classes a week" }] }
}
```

- `order` lists the scenes, left to right in the scroll. A scene's id is `<type>` or `<type>-<anything>`; the **type** is the word before the first `-`, `_` or digit. A scene that is switched off (`"on": false`), unknown, or has nothing to show is left out. The first scene is the `hero`, the last the `finale`.
- A scene's `comp` is where the words go in relation to the figure; `plate` is a picture that fades in behind the room while the scene plays.
- Text may hold `{name}` and `{year}`; `\n` is a line break in a title.
- A template with an `order` is a **plan template** (`hasPlan` in `lib/template-schema.mjs`). The editor's fields for it are made from the plan (`filmSchema`), so every scene, line and item can be changed, added or removed (up to the caps below).

### Scene types

| Type | What it is | Comps | Items (up to) | Item fields |
| --- | --- | --- | --- | --- |
| `hero` | The opening: the figure big and low, an outlined word behind it | `word`, `center` | none | (title, text, cta) |
| `facts` | Short facts as chips in a column | `side`, `flip` | 6 | `icon`, `label`, `value` |
| `cards` | Cards round the figure, or in a row beneath it (one at a time on a phone) | `flank`, `stage` | 6 | `icon`, `title`, `text` |
| `steps` | Numbered steps, one at a time | `side`, `flip` | 5 | `title`, `text` |
| `stats` | Big numbers that count up | `flank`, `stage` | 4 | `value`, `label` |
| `gallery` | Pictures with captions | `stage` | 5 | `image`, `title`, `text` |
| `plans` | Prices, one marked as the one to take (`featured`, `hint`) | `stage` | 3 | `name`, `price`, `per`, `features` (one per line), `cta`, `ctaHref` |
| `people` | Photos and roles | `flank`, `stage` | 4 | `image`, `name`, `role`, `text` |
| `voices` | Quotes | `side`, `flip` | 3 | `text`, `name`, `role` |
| `faq` | Questions and answers | `side`, `flip` | 5 | `q`, `a` |
| `visit` | Contact lines and a button | `side`, `flip` | 5 | `icon`, `label`, `value` |
| `paint` | Colour swatches that repaint the figure (the first is "as made") | `side`, `flip` | 6 | `title`, `color` |
| `finale` | The closing words and button, centred under the figure | `center`, `side` | none | (title, text, cta) |

Icons: any name in `ICON_NAMES` (`library/character/scene-kit.ts`); an unknown name draws a spark.

### The four choices that make a template its own

- **Logic** (how the camera moves scene to scene): `turntable` (a steady turn), `orbit` (a wide circuit), `drift` (a slow sway), `flip` (the view flips side to side), `rise` (the figure climbs scene by scene), `descend` (it sinks), `still` (it holds still and the light moves).
- **Look** (what fills the air): `studio`, `embers`, `snow`, `bubbles`, `petals`, `fireflies`, `confetti`, `sparks`, `stars`, `leaves`, `none`.
- **Opening** (how the figure arrives): `lift` (takes its place, then a ring spreads from under it), `drop` (falls and lands with a ripple), `spin`, `zoom` (rushes in from far), `reveal` (out of the dark). The opening plays by itself when the page opens at the top, in about a second and a half (`INTRO` in `plan.ts`: the story's clock runs from below 0 up to 0, and the words come in as the figure arrives); the page then rests in the hero pose until the first scroll lifts the figure into the light. It does not play for a visitor who asked for calm, or for a page opened part-way down.
- **Motion** (how words and cards arrive): `rise`, `slide`, `pop`, `zoom`, `drift`.

`library/character/plan.ts` and `lib/template-schema.mjs` hold the same lists; `tests/plan.test.ts` fails if they drift.

## The figure

`content.character` is the figure: `src` (a licensed model from the asset library, [ASSETS.md](ASSETS.md)), `poster`, `name`, `wordmark` (the outlined word in the opening), `turn` (its first angle) and the finish. A figure that is not the template's own can be put in its place in the journey; a colour scene is switched off when a person or an animal takes the figure's place (`composeContent`), and kept when the template's own figure stays.

Use models that need no credit for a template's default (CC0, original or owner-cleared). The credit line for any other is added to the page.

## The page around the story: the shared shell

A plan template's `source/index.html` is a thin page. It loads `./xp-content.js`, `./film-shell.css` and `./film-shell.js` (copied from `templates/_kit/` by the build) and gives the shell its look:

- colours: `--c-<themeKey>` are set from `theme.colors`, fonts `--f-<key>` from `theme.fonts` (Google Fonts load for any family named), `--r` from `theme.radius`. The page maps them to the shell's names: `--bg --surface --ink --mut --line --acc --onacc`, plus `--stage` (the room's colour), `--xp-ink --xp-ink2` (words over the figure), `--brand-case`, `--mark` (a `clip-path` for the little brand mark);
- `data-nav="split | bar | mini"` (links either side of the name; the name at the left with the links centred and the button at the right; or the name and the button only) and `data-foot="line | cols"`;
- the story's skin on `.xp-track`: `--xp-tt` (title case), `--xp-tw` (weight), `--xp-tls` (letter spacing), `--xp-tlh` (line height), `--xp-ts` (title size multiplier, which also widens the line), `--xp-els` (eyebrow spacing), `--xp-r` (corner roundness), `--xp-card` (glass colour). Extra CSS may restyle small parts (a monospace font for the labels).

The shell draws the menu, the story (`xp-lib/xp-character.js` reads `content.film`), the library sections (`extras`) and the footer. Nothing in the page is hard-coded: every colour, font and word comes from `xp-content.js`.

## Making or changing a template

1. Choose the figure from the asset library (a tall figure suits `side`/`flip`, a wide one `flank`/`stage`; the engine fits either) and the four choices above. Aim for a combination no other template has.
2. Write `content.json` with a `film` plan and the theme; write the thin `source/index.html`; keep the pictures in `source/media/`.
3. Run `node scripts/build-templates.mjs` (`XP_ONLY=<id>` builds one). The build fails if any value in `content.json` has no field, or if a colour or font has no role in `template.json`. Rebuild **every** template after changing the schema or the engine.
4. Check it frame by frame (below). Make the poster from the same frames: `templates/<id>/poster.webp` (960 × 600).
5. `npx vitest run` and `npx tsc --noEmit -p tsconfig.json`.

### Checking a template frame by frame

Software WebGL is enough: open `public/tpl/<id>/site/preview.html#xp=<encoded content>` in Chromium with `--use-angle=swiftshader`, scroll to each scene's middle (`window.__XP_SCENES__()` lists `{id, at, len}` in units of the viewport's height; scroll to `at + len / 2`), and look at the frame. To see a moment of the opening, set `window.__XP_INTRO_T__` to a number from `-INTRO[opening]` to 0 (before the page starts, with an init script, so the opening does not play by itself) and send a `scroll` event. Do it on three shapes: a wide screen (1440 × 900), the opposite model shape (a wide flat figure such as a hypercar against a tall one), and a phone (390 × 844). Look for: words on top of the figure or of each other, anything past the screen's edge, a button below the fold, a scene whose figure is hidden by cards.

## In the journey

A person in the journey ([CHARACTER-JOURNEY.md](CHARACTER-JOURNEY.md)) may put any business into any template, so the engine (`lib/animator.ts`) treats the plan with care:

- the owner's email addresses (in lines and in `mailto:` links) become the new business's;
- on a template made for another kind of business, the scenes that state facts only the original business knows (`stats`, `people`, `plans`, `voices`, `gallery`) are switched off instead of inventing any, and the `visit` lines are rewritten (email, place, reply time);
- the words of `facts`, `cards`, `steps`, `faq` and `visit` scenes come from the business's own services, steps and answers by rules (`filmWords`), or from the model's writing where there is one. A template made for the same kind of business keeps its own words;
- a saved site made before its template told its story is given the story and the figure (`upgradeSaved` in `lib/templates.ts`); its colours, name and any change a person made stay.

## The templates

| Template | Figure | Logic, look, opening, motion | Scenes |
| --- | --- | --- | --- |
| Turntable | a hypercar (fixed story) | its own | hero, specs, ring, colours, reviews, finale |
| Ashgrove (restaurant) | a plate of food | drift, embers, drop, rise | hero, steps, gallery, cards, stats, visit, voices, visit |
| Brightline (dentist) | a clay figure | rise, bubbles, lift, drift | hero, stats, cards, steps, people, plans, voices, faq, visit |
| Cornerstone (property) | a house | orbit, none, zoom, slide | hero, stats, gallery, facts, cards, steps, people, visit |
| Distill (SaaS) | a robot | flip, sparks, spin, zoom | hero, stats, steps, gallery, cards, plans, visit |
| Fernhollow (agency) | a sprout | rise, fireflies, reveal, drift | hero, facts, cards, steps, visit |
| Ironhouse (gym) | an armoured figure | still, sparks, drop, pop | hero, stats, gallery, facts, plans, people, voices, visit |
| Jack (3D creator) | a chrome knot | orbit, stars, spin, pop | hero, gallery, facts, steps, gallery, visit |
| Lithos (geology) | a heap of rocks | descend, studio, zoom, rise | hero, steps, gallery, cards, paint, plans, visit |
| Milo (3D artist) | a coral | descend, bubbles, reveal, drift | hero, stats, cards, cards, paint, visit; four live worlds as library sections |
| Mossline (climate data) | a stand of pines | turntable, leaves, lift, slide | hero, facts, stats, cards, gallery, visit |
| Orbit (blank canvas) | an astronaut | drift, stars, zoom, drift | hero, cards, facts, voices, visit |
| Stride (snack brand) | an avocado | rise, confetti, drop, pop | hero, cards, paint, steps, stats, plans, visit |
| Tidewater (hotel) | a boat | drift, studio, lift, slide | hero, gallery, facts, gallery, voices, visit |

(Each template's own `content.json` is the source of truth; the table is a map.)

## Files

| Piece | File |
| --- | --- |
| The plan: parsing, caps, the figure's path, every element and the opening's run-up (`INTRO`) | `library/character/plan.ts` |
| The room: layout, the scene styles, elements and plates, and the clock that plays the opening | `library/character/scenes.ts` |
| Icons, shared helpers, the camera's keys | `library/character/scene-kit.ts` |
| The air (look) | `library/character/air.ts` |
| The shell | `templates/_kit/film-shell.{js,css}` |
| The plan's schema, vocabulary and upgrade | `lib/template-schema.mjs` |
| Journey rules for another business | `lib/animator.ts` (`planFilm`, `filmWords`), `lib/character/apply.ts` |
| Tests | `tests/plan.test.ts` |
