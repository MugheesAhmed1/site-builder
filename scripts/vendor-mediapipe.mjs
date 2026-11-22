// Copies MediaPipe's vision runtime (Apache-2.0, from node_modules) to public/vendor/mediapipe so
// the photo cut-out (lib/character/cutout.ts) loads it from this site. Not committed: it is 15 MB
// and comes with the package. Runs before dev and build.
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const to = join(root, "public", "vendor", "mediapipe");
const files = ["vision_wasm_internal.js", "vision_wasm_internal.wasm"];

if (!existsSync(from)) {
  console.warn("vendor-mediapipe: @mediapipe/tasks-vision is not installed; the photo cut-out will use colours only.");
} else {
  mkdirSync(to, { recursive: true });
  let copied = 0;
  for (const f of files) {
    const a = join(from, f), b = join(to, f);
    if (existsSync(b) && statSync(b).size === statSync(a).size && statSync(b).mtimeMs >= statSync(a).mtimeMs) continue;
    copyFileSync(a, b);
    copied++;
  }
  console.log(`vendor-mediapipe: ${copied ? `copied ${copied} file(s)` : "up to date"} in public/vendor/mediapipe`);
}
