// Builds the site template once into a ready-to-host bundle (public/site-kit) so the builder
// can hand people a site that needs no build step: unzip, upload the folder to any host.
// The bundle reads its words and settings from window.__SITE_DATA__, which the download
// writes into site-data.js. It is a plain script (not a module), so the page also opens
// straight from the unzipped folder. Runs automatically before dev and build.
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

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

// The 3D scenes (three.js + react-three-fiber) are big, so they go in their own file,
// site-3d.js, which the page fetches only when a 3D scene is shown. It is a plain script
// too and borrows the page's React (two Reacts would break hooks).
const THREE_ENTRY = join(root, "src/three/index.jsx");
const threeLoader = {
  name: "three-on-demand",
  enforce: "pre",
  resolveId(id, importer) {
    if (importer && id.startsWith(".") && join(dirname(importer), id) === THREE_ENTRY) return "\0three-loader";
  },
  load(id) {
    if (id !== "\0three-loader") return;
    return `
import * as React from "react";
import * as JSX from "react/jsx-runtime";
const here = (document.currentScript && document.currentScript.src) || "";
let wait = null;
function load() {
  if (window.__SITE_3D__) return Promise.resolve(window.__SITE_3D__);
  if (!wait) wait = new Promise((ok, fail) => {
    window.__SITE_REACT__ = React;
    window.__SITE_JSX__ = JSX;
    const s = document.createElement("script");
    s.src = here ? new URL("site-3d.js", here).href : "./site-3d.js";
    s.async = true;
    s.onload = () => (window.__SITE_3D__ ? ok(window.__SITE_3D__) : fail(new Error("3D scenes missing")));
    s.onerror = () => { wait = null; fail(new Error("site-3d.js could not be loaded")); };
    document.head.appendChild(s);
  });
  return wait;
}
export default function ThreeOnDemand(props) {
  const [mod, setMod] = React.useState(() => window.__SITE_3D__ || null);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    if (!mod) load().then(setMod, () => setFailed(true));
  }, [mod]);
  if (mod && !failed) return React.createElement(mod.default, props);
  return React.createElement("div", { className: "sc3-still", "aria-hidden": "true" });
}
`;
  },
};

rmSync(tmp, { recursive: true, force: true });
await build({
  root,
  configFile: false,
  logLevel: "warn",
  base: "./",
  plugins: [siteData, threeLoader, react()],
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

await build({
  root,
  configFile: false,
  logLevel: "warn",
  base: "./",
  plugins: [react()],
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: join(tmp, "3d"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 4000,
    lib: { entry: THREE_ENTRY, formats: ["iife"], name: "__SITE_3D__", fileName: () => "site-3d.js" },
    rollupOptions: {
      external: ["react", "react/jsx-runtime"],
      output: { globals: { react: "__SITE_REACT__", "react/jsx-runtime": "__SITE_JSX__" }, inlineDynamicImports: true, exports: "named" },
    },
  },
});
copyFileSync(join(tmp, "3d", "site-3d.js"), join(tmp, "site-3d.js"));

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const files = readdirSync(tmp).filter((f) => f === "site.js" || f === "site.css" || f === "site-3d.js");
if (files.length !== 3) throw new Error("Site kit build did not produce site.js, site.css and site-3d.js: " + readdirSync(tmp).join(", "));
for (const f of files) copyFileSync(join(tmp, f), join(out, f));
const size = files.reduce((n, f) => n + readFileSync(join(out, f)).length, 0);
writeFileSync(join(out, "manifest.json"), JSON.stringify({ files, built: new Date().toISOString() }) + "\n");
rmSync(tmp, { recursive: true, force: true });
console.log("Built site kit:", files.join(", "), Math.round(size / 1024) + " KB");
