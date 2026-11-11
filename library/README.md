# Site Builder library

This folder is the shared library. The builder ships with a copy and, when online, reads the latest version straight from this repository on GitHub. Anything added here shows up in every copy of the builder with no redeploy.

- `design-systems.json` holds every design system in the Library tab: colours, fonts, corners, layout and animation choices. To add one, copy an entry, give it a new `id` (for example `DS-241`) and a `preset` name, change what you like, and commit. The builder checks each entry and skips any that are missing `id`, `fonts` or `accent`.
- To regenerate the built-in 500 from the code, bundle and run `scripts/export-library.ts`, for example with esbuild:
  `npx esbuild scripts/export-library.ts --bundle --platform=node --format=esm --outfile=/tmp/export.mjs --alias:@=. && node /tmp/export.mjs`

- `characters.json` holds the 520 characters in the Characters step. Each entry is plain settings: `family` (person, blob, robot, cat, bear, bird, ghost, alien, plant, cup, rocket, orb, dog, tooth, heart, camera, laptop, book, house, car), `palette` (brand, mint, peach, lilac, sky, lemon, coral, slate, ink), `accessory` (none, glasses, hat, headphones, scarf, crown, chef, cap, bow), `expression` (smile, grin, wink, wow), `idle` (bob, sway, bounce, float, wiggle) and a `variant` number that changes skin tone and hair. Add one with a new `id` such as `C-521`.
- `widgets.json` holds the 512 widgets: a `kind` (32 of them, such as stat, chat, rating, calendar, appointment, menu, followers, uptime, growth) and a `skin` (16 of them, such as glass, neon, paper, clay, terminal, blueprint). Add one with a new `id` such as `W-513`.

The drawings and animations themselves live in the site template (`template/src/Cast.jsx`, `template/src/cast.css`, `template/src/motion.js`), because a downloaded site needs their code as well as their settings. A chosen character and its widgets are saved inside the site's `site-data.json`, so a published site keeps working even if the library changes. All characters are original artwork drawn in code; none are copied from the reference sites.
