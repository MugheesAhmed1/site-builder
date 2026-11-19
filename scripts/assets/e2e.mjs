// Browser check of the 3D asset stage on a real downloaded site (docs/ASSETS.md):
//   ONLY=eyewear npx vitest run -c vitest.examples.config.ts      (builds .examples/eyewear)
//   ASSET_TOOLS=/path/with/sharp node scripts/assets/e2e.mjs [.examples/eyewear] [out-dir]
//
// Desktop: the GLB and the HDR load from the site's own assets/ folder, the R3F stage mounts,
// and the model moves as the page scrolls. Phone: the light model still runs in 3D. Reduced
// motion: no 3D, no model download, the still is drawn. Missing file: the page falls back to
// the still and stays usable. Every run fails on a console error or an outside request.
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { cpSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SITE = resolve(process.argv[2] || ".examples/eyewear");
const OUT = resolve(process.argv[3] || ".examples/e2e");
const TOOLS = process.env.ASSET_TOOLS;
if (!TOOLS) throw new Error("Set ASSET_TOOLS (a folder with sharp installed)");
const sharp = (await import(pathToFileURL(createRequire(join(TOOLS, "package.json")).resolve("sharp")).href)).default;
const { chromium, devices } = createRequire(import.meta.url)("playwright");
mkdirSync(OUT, { recursive: true });

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".glb": "model/gltf-binary", ".hdr": "application/octet-stream", ".webp": "image/webp", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".txt": "text/plain" };
function serve(root) {
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    let file = join(root, path);
    try {
      if (statSync(file).isDirectory()) file = join(file, "index.html");
      res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
      res.end(readFileSync(file));
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise((ok) => server.listen(0, () => ok({ server, url: `http://localhost:${server.address().port}/` })));
}

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
};

async function visit(url, opts, label) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const requests = [];
  const errors = [];
  page.on("request", (r) => requests.push(r.url()));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: "load" });
  return { ctx, page, requests, errors, label };
}

async function shot(page, name) {
  const buf = await page.screenshot({ path: join(OUT, name + ".png") });
  return buf;
}

async function diff(a, b) {
  const [x, y] = await Promise.all([sharp(a).greyscale().raw().toBuffer(), sharp(b).greyscale().raw().toBuffer()]);
  let d = 0;
  for (let i = 0; i < x.length; i++) d += Math.abs(x[i] - y[i]);
  return d / x.length;
}

const scrollTo = (page, f) => page.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), f);
const outside = (reqs, base) => reqs.filter((u) => !u.startsWith(base) && !u.startsWith("data:") && !u.startsWith("blob:"));

const { server, url } = await serve(SITE);
try {
  // 1. Desktop: load, render, move with scroll.
  {
    const v = await visit(url, { viewport: { width: 1440, height: 900 } }, "desktop");
    const gl = await v.page.waitForSelector(".xp-stage[data-gl]", { timeout: 30000 }).then(() => true, () => false);
    check("desktop: the R3F asset stage mounts", gl);
    // The model loads, then grows in and glides to its place beside the words.
    await v.page.waitForTimeout(6000);
    check("desktop: the GLB loads from the site's own folder", v.requests.some((u) => u === url + "assets/3d/product/eyewear-black-001.glb"));
    check("desktop: the studio HDR loads from the site's own folder", v.requests.some((u) => u === url + "assets/hdr/hdri-studio-small-03.hdr"));
    const a = await shot(v.page, "desktop-0-hero");
    await v.page.mouse.move(900, 400);
    await scrollTo(v.page, 0.3);
    await v.page.waitForTimeout(1800);
    const b = await shot(v.page, "desktop-1-scrolled");
    await scrollTo(v.page, 1);
    await v.page.waitForTimeout(1800);
    const c = await shot(v.page, "desktop-2-cta");
    // The words move too, so compare the stage layer only: hide the content and redraw.
    await v.page.evaluate(() => {
      const stage = document.querySelector(".xp-stage");
      for (const el of document.body.querySelectorAll("*")) if (!el.contains(stage) && !stage.contains(el)) el.style.visibility = "hidden";
    });
    await scrollTo(v.page, 0);
    await v.page.waitForTimeout(1500);
    const s0 = await v.page.screenshot();
    await scrollTo(v.page, 0.45);
    await v.page.waitForTimeout(1800);
    const s1 = await v.page.screenshot();
    writeFileSync(join(OUT, "stage-0.png"), s0);
    writeFileSync(join(OUT, "stage-1.png"), s1);
    const moved = await diff(s0, s1).catch(() => 0);
    check("desktop: scroll turns the model (stage pixels change)", moved > 1.5, `mean difference ${moved.toFixed(2)}`);
    check("desktop: the page itself changes from hero to call to action", (await diff(a, c)) > 2 && (await diff(a, b)) > 1);
    check("desktop: no outside requests", outside(v.requests, url).length === 0, outside(v.requests, url).join(", "));
    check("desktop: no console errors", v.errors.length === 0, v.errors.slice(0, 3).join(" | "));
    await v.ctx.close();
  }
  // 2. Phone: the light model runs in 3D too.
  {
    const v = await visit(url, { ...devices["iPhone 13"] }, "phone");
    const gl = await v.page.waitForSelector(".xp-stage[data-gl]", { timeout: 30000 }).then(() => true, () => false);
    await v.page.waitForTimeout(2500);
    await shot(v.page, "phone-0-hero");
    await scrollTo(v.page, 0.4);
    await v.page.waitForTimeout(1500);
    await shot(v.page, "phone-1-scrolled");
    check("phone: the light model runs in 3D", gl && v.requests.some((u) => u.endsWith("eyewear-black-001.glb")));
    check("phone: no HDR download (simpler lighting)", !v.requests.some((u) => u.endsWith(".hdr")));
    const overflow = await v.page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    check("phone: no sideways scroll", !overflow);
    check("phone: no console errors", v.errors.length === 0, v.errors.slice(0, 3).join(" | "));
    await v.ctx.close();
  }
  // 3. Reduced motion: no 3D, no model download, the still instead.
  {
    const v = await visit(url, { viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" }, "reduced");
    await v.page.waitForTimeout(3500);
    const gl = await v.page.$(".xp-stage[data-gl]");
    check("reduced motion: no 3D stage", !gl);
    check("reduced motion: the model is not downloaded", !v.requests.some((u) => u.endsWith(".glb")));
    check("reduced motion: the still is drawn", v.requests.some((u) => u.endsWith("previews/eyewear-black-001.webp")));
    await shot(v.page, "reduced-0-hero");
    check("reduced motion: no console errors", v.errors.length === 0, v.errors.slice(0, 3).join(" | "));
    await v.ctx.close();
  }
  // 4. A missing model: the page falls back to the still and keeps working.
  {
    const broken = join(OUT, "site-missing");
    rmSync(broken, { recursive: true, force: true });
    cpSync(SITE, broken, { recursive: true });
    rmSync(join(broken, "assets/3d/product/eyewear-black-001.glb"));
    const s = await serve(broken);
    const v = await visit(s.url, { viewport: { width: 1440, height: 900 } }, "missing");
    await v.page.waitForTimeout(6000);
    const gl = await v.page.$(".xp-stage[data-gl]");
    check("missing model: the stage drops back to 2D", !gl);
    await scrollTo(v.page, 0.5);
    await v.page.waitForTimeout(800);
    await shot(v.page, "missing-model");
    const pageErrors = v.errors.filter((e) => !/404|Failed to load resource|Could not load/.test(e));
    check("missing model: no errors other than the missing file", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
    await v.ctx.close();
    s.server.close();
  }
} finally {
  await browser.close();
  server.close();
}
writeFileSync(join(OUT, "results.json"), JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length} of ${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
