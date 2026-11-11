# Site Builder library

This folder is the shared library. The builder ships with a copy and, when online, reads the latest version straight from this repository on GitHub. Anything added here shows up in every copy of the builder with no redeploy.

- `design-systems.json` holds every design system in the Library tab: colours, fonts, corners, layout and animation choices. To add one, copy an entry, give it a new `id` (for example `DS-241`) and a `preset` name, change what you like, and commit. The builder checks each entry and skips any that are missing `id`, `fonts` or `accent`.
- To regenerate the built-in 240 from the code, bundle and run `scripts/export-library.ts`, for example with esbuild:
  `npx esbuild scripts/export-library.ts --bundle --platform=node --format=esm --outfile=/tmp/export.mjs --alias:@=. && node /tmp/export.mjs`

Animation styles, characters, widgets and backgrounds are part of the site template (`template/src/motion.js` and `template/src/rich.jsx`), because the downloaded site needs their code as well as their settings.
