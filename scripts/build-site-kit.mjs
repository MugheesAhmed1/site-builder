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

rmSync(tmp, { recursive: true, force: true });
await build({
  root,
  configFile: false,
  logLevel: "warn",
  base: "./",
  plugins: [siteData, react()],
  build: {
    outDir: tmp,
    emptyOutDir: true,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: join(root, "src/main.jsx"),
      output: { format: "iife", inlineDynamicImports: true, entryFileNames: "site.js", assetFileNames: "site[extname]" },
    },
  },
});

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const files = readdirSync(tmp).filter((f) => f === "site.js" || f === "site.css");
if (files.length !== 2) throw new Error("Site kit build did not produce site.js and site.css: " + readdirSync(tmp).join(", "));
for (const f of files) copyFileSync(join(tmp, f), join(out, f));
const size = files.reduce((n, f) => n + readFileSync(join(out, f)).length, 0);
writeFileSync(join(out, "manifest.json"), JSON.stringify({ files, built: new Date().toISOString() }) + "\n");
rmSync(tmp, { recursive: true, force: true });
console.log("Built site kit:", files.join(", "), Math.round(size / 1024) + " KB");
