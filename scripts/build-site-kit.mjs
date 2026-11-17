// Builds the site template once into a ready-to-host bundle (public/site-kit) so the builder
// can hand people a site that needs no build step: unzip, upload the folder to any host.
// The bundle reads its words and settings from window.__SITE_DATA__, which the download
// writes into site-data.js. It is a plain script (not a module), so the page also opens
// straight from the unzipped folder. Runs automatically before dev and build.
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../template/", import.meta.url));
const out = fileURLToPath(new URL("../public/site-kit/", import.meta.url));
const tmp = fileURLToPath(new URL("../.site-kit-tmp/", import.meta.url));

const siteData = {
  name: "site-data-from-window",
  enforce: "pre",
  resolveId(id) {
    if (id.endsWith("site-data.json")) return "\0site-data";
  },
  load(id) {
    if (id === "\0site-data") return "export default window.__SITE_DATA__;";
  },
};

// site.js never carries three.js: the stage asks for site-3d.js (built below) only when a
// site uses 3D, after the page is usable.
const no3d = {
  name: "webgl-on-demand",
  enforce: "pre",
  resolveId(id, importer) {
    if (id === "./webgl" && importer && /scenes[\\/]Stage\.tsx$/.test(importer)) return "\0xp-webgl";
  },
  load(id) {
    if (id === "\0xp-webgl") return "export default null;";
  },
};

rmSync(tmp, { recursive: true, force: true });
await build({
  root,
  configFile: false,
  logLevel: "warn",
  base: "./",
  plugins: [siteData, no3d, react()],
  build: {
    outDir: tmp,
    emptyOutDir: true,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: join(root, "src/main.tsx"),
      output: { format: "iife", inlineDynamicImports: true, entryFileNames: "site.js", assetFileNames: "site[extname]" },
    },
  },
});

// The 3D layer as its own plain script (three.js and React Three Fiber): it registers window.__xp3d when it loads.
await build({
  root,
  configFile: false,
  logLevel: "warn",
  base: "./",
  build: {
    outDir: join(tmp, "3d"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: join(root, "src/scenes/webgl/kit.ts"),
      // React comes from site.js (main.tsx shares it), so React Three Fiber runs on the page's own copy.
      external: ["react", "react/jsx-runtime"],
      output: { format: "iife", inlineDynamicImports: true, entryFileNames: "site-3d.js", globals: { react: "__xpReact", "react/jsx-runtime": "__xpJsx" } },
    },
  },
});

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const files = readdirSync(tmp).filter((f) => f === "site.js" || f === "site.css");
if (files.length !== 2) throw new Error("Site kit build did not produce site.js and site.css: " + readdirSync(tmp).join(", "));
for (const f of files) copyFileSync(join(tmp, f), join(out, f));
copyFileSync(join(tmp, "3d", "site-3d.js"), join(out, "site-3d.js"));
files.push("site-3d.js");
const size = files.reduce((n, f) => n + readFileSync(join(out, f)).length, 0);
writeFileSync(join(out, "manifest.json"), JSON.stringify({ files, built: new Date().toISOString() }) + "\n");
rmSync(tmp, { recursive: true, force: true });
console.log("Built site kit:", files.join(", "), Math.round(size / 1024) + " KB");
