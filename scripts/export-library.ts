// Writes the built-in design systems, characters and widgets to library/*.json.
// Run: node scripts/export-library.mjs (bundled with esbuild, see README in library/).
import { writeFileSync } from "node:fs";
import { LIBRARY } from "../lib/designs";
import { CHARACTERS, WIDGETS } from "../template/src/cast.js";
writeFileSync("library/design-systems.json", JSON.stringify(LIBRARY, null, 1) + "\n");
writeFileSync("library/characters.json", JSON.stringify(CHARACTERS, null, 1) + "\n");
writeFileSync("library/widgets.json", JSON.stringify(WIDGETS, null, 1) + "\n");
console.log("Wrote", LIBRARY.length, "design systems,", CHARACTERS.length, "characters,", WIDGETS.length, "widgets");
