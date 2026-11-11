# Site Builder library

This folder is the shared library. The builder ships with a copy and, when online, reads the latest version straight from this repository on GitHub. Anything added here shows up in every copy of the builder with no redeploy.

- `design-systems.json` holds every design system in the Library tab: colours, fonts, corners, layout and animation choices. To add one, copy an entry, give it a new `id` (for example `DS-241`) and a `preset` name, change what you like, and commit. The builder checks each entry and skips any that are missing `id`, `fonts` or `accent`.
- To regenerate the built-in 500 from the code, bundle and run `scripts/export-library.ts`, for example with esbuild:
  `npx esbuild scripts/export-library.ts --bundle --platform=node --format=esm --outfile=/tmp/export.mjs --alias:@=. && node /tmp/export.mjs`

- `characters.json` holds the characters in the Characters step: 520 drawn ones and the real-life pack below. Each drawn entry is plain settings: `family` (person, blob, robot, cat, bear, bird, ghost, alien, plant, cup, rocket, orb, dog, tooth, heart, camera, laptop, book, house, car), `palette` (brand, mint, peach, lilac, sky, lemon, coral, slate, ink), `accessory` (none, glasses, hat, headphones, scarf, crown, chef, cap, bow), `expression` (smile, grin, wink, wow), `idle` (bob, sway, bounce, float, wiggle) and a `variant` number that changes skin tone and hair. Add one with a new `id` such as `C-521`.
- `widgets.json` holds the 512 widgets: a `kind` (32 of them, such as stat, chat, rating, calendar, appointment, menu, followers, uptime, growth) and a `skin` (16 of them, such as glass, neon, paper, clay, terminal, blueprint). Add one with a new `id` such as `W-513`.
- `scenes.json` holds the 164 live scenes: a `type` (34 of them in five groups: particles such as name in particles, constellation, vortex, flow field, dot globe and magnetic dots; nature such as fireflies, ocean waves, petals, snow, meadow, night sky, rain, a living tree, an aquarium and sky; your photo with tilt, colour spotlight, photo particles, water ripple and slices; and 3D or physics with glossy orbs, word bubbles, liquid metal, glass shapes and hanging charms on real rope physics; and real life, made from photoreal pictures) and a `palette` (your colours, forest, ocean, sunset, night, mono; real-life scenes come in one version). Every scene reacts to the pointer and to taps; many can be dragged.

## The real-life pack

Besides the drawn cast there is a pack of photoreal pictures, so characters and scenes are not only cartoons:

- **Real people, real animals and real mascots** (characters `C-521` on, families `real-person`, `real-animal`, `real-mascot`). Each one has a `src` picture and a `fits` list of the categories it suits, such as a chef for food or a dentist for dentists. They idle, lean toward the pointer and sit on a soft shadow like the drawn ones.
- **Real-life live scenes** (group `real`): a real aquarium with real fish, autumn leaves, blossom petals, butterflies, snowflakes, floating seeds, coffee beans and gold flakes. They react to the pointer and to taps.

The pictures are transparent WebP files in `public/real/` (people, animals, mascots, fish, sprites), listed in `template/src/real.js`. A downloaded site gets a copy of just the pictures it uses, in its own `public/real/`, so nothing is generated or fetched from an AI service while a site runs.

Every picture was generated for this library from an original written prompt with [Pollinations.ai](https://pollinations.ai) (free, no account), then cut out. None shows a real person, a brand or another site's character. To add one, put a transparent WebP in the right `public/real/` folder and add an entry to `template/src/real.js`; a character entry can also go in `characters.json` with a `src` that points at the file.

The drawings and animations themselves live in the site template (`template/src/Cast.jsx`, `template/src/Scenes.jsx`, `template/src/cast.css`, `template/src/motion.js`), because a downloaded site needs their code as well as their settings. A chosen character and its widgets are saved inside the site's `site-data.json`, so a published site keeps working even if the library changes. All characters are original artwork drawn in code; none are copied from the reference sites.
