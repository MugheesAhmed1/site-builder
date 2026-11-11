// Writes the built-in design systems to library/design-systems.json.
// Run: node scripts/export-library.mjs (bundled with esbuild, see README in library/).
import { writeFileSync } from "node:fs";
import { LIBRARY } from "../lib/designs";
writeFileSync("library/design-systems.json", JSON.stringify(LIBRARY, null, 1) + "\n");
console.log("Wrote", LIBRARY.length, "design systems");
