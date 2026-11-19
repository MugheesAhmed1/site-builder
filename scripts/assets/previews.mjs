// Renders a WebP thumbnail for every asset in library/assets/manifest.json into
// public/assets/previews/<id>.webp, with headless Chromium (Playwright) and three.js:
// models at a three-quarter angle under studio light, HDRIs as their panorama with a chrome and
// a matte ball lit by them. Each load also proves the GLB parses and its textures decode in
// three.js; a failure stops the run.
//
//   ASSET_TOOLS=/path/with/sharp node scripts/assets/previews.mjs [id ...]
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const TOOLS = process.env.ASSET_TOOLS;
if (!TOOLS) throw new Error("Set ASSET_TOOLS (a folder with sharp installed)");
const req = createRequire(join(TOOLS, "package.json"));
const sharp = (await import(pathToFileURL(req.resolve("sharp")).href)).default;
const { chromium } = createRequire(import.meta.url)("playwright");
const manifest = JSON.parse(readFileSync(join(ROOT, "library/assets/manifest.json"), "utf8"));
const only = process.argv.slice(2);
const OUT = join(ROOT, "public/assets/previews");
mkdirSync(OUT, { recursive: true });

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".glb": "model/gltf-binary", ".hdr": "application/octet-stream", ".json": "application/json" };
const server = createServer((rq, rs) => {
  const url = decodeURIComponent(rq.url.split("?")[0]);
  const file = url === "/preview.html" ? join(ROOT, "scripts/assets/preview.html") : url.startsWith("/node_modules/") ? join(ROOT, normalize(url)) : join(ROOT, "public", normalize(url));
  try {
    statSync(file);
    rs.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    rs.end(readFileSync(file));
  } catch {
    rs.writeHead(404);
    rs.end();
  }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
const failures = [];
for (const a of manifest.assets) {
  if (only.length && !only.includes(a.id)) continue;
  const ground = a.display?.pivot === "bottom" ? "1" : "0";
  const qs = a.type === "hdri" ? `hdr=${encodeURIComponent(a.asset)}` : `glb=${encodeURIComponent(a.asset)}&ground=${ground}&yaw=${a.display?.previewYaw ?? 0.65}`;
  await page.goto(`http://127.0.0.1:${port}/preview.html?${qs}`);
  await page.waitForFunction(() => window.__done === true, null, { timeout: 120_000 });
  const err = await page.evaluate(() => window.__error);
  if (err) {
    failures.push(a.id + ": " + err.split("\n")[0]);
    console.error("FAIL", a.id, err.split("\n")[0]);
    continue;
  }
  const png = await page.locator("canvas").screenshot({ omitBackground: true });
  writeFileSync(join(OUT, a.id + ".webp"), await sharp(png).resize(384, 384).webp({ quality: 80, alphaQuality: 90 }).toBuffer());
  console.log("preview", a.id);
}
await browser.close();
server.close();
if (failures.length) {
  console.error(failures.length + " failed");
  process.exit(1);
}
