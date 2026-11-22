// Builds the block library (library/, docs/LIBRARY.md) into public/lib and registers it in
// lib/library.gen.json. Runs before dev and build, after the templates.
//
//   public/lib/xp-library.js    the runtime a template loads when its content lists blocks (extras)
//   public/lib/*.js, *.css      one chunk per block, fetched only when a page uses it
//   public/lib/media/           the library's own pictures (lib:name.webp in a block's settings)
//   public/lib/preview.html     one block on its own, for the library page and the studio
//   public/lib/source/          each block's source and what it imports, for "Download source"
//   public/lib/files.json       the runtime's files, which go into a downloaded site as xp-lib/
//   public/lib/xp-character.js  the 3D character runtime, added to a download that has a character
//
// Every block's settings must match its schema, as for templates, so every part stays editable.
// The registry also gathers every picture, film, font and palette the templates use into one
// shared asset list, so any of them can be picked in any template's studio.
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { schemaProblems } from "../lib/template-schema.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const LIB = join(ROOT, "library");
const OUT = join(ROOT, "public", "lib");
const REGISTRY = join(ROOT, "lib", "library.gen.json");
const KINDS = ["section", "scene", "effect"];
const BUSINESS = new Set([...readFileSync(join(ROOT, "lib", "categories.ts"), "utf8").matchAll(/^\s{4}id: "([a-z-]+)",$/gm)].map((m) => m[1]));
const TEMPLATE_IDS = new Set(readdirSync(join(ROOT, "templates")).filter((d) => !d.startsWith("_")));

function listFiles(dir, base = dir) {
  const out = [];
  for (const f of readdirSync(dir).sort()) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...listFiles(p, base));
    else out.push(p.slice(base.length + 1).replace(/\\/g, "/"));
  }
  return out;
}

// A block's own files and every local file it imports, for its source download.
function localImports(file, seen = new Set()) {
  if (seen.has(file)) return seen;
  seen.add(file);
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
    const base = resolve(dirname(file), m[1]);
    const hit = [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")].find((p) => existsSync(p) && statSync(p).isFile());
    if (hit) localImports(hit, seen);
  }
  return seen;
}

const problems = [];
const blocks = [];
for (const f of readdirSync(join(LIB, "blocks")).filter((f) => f.endsWith(".json")).sort()) {
  const id = f.slice(0, -5);
  const meta = JSON.parse(readFileSync(join(LIB, "blocks", f), "utf8"));
  const errs = [];
  if (!existsSync(join(LIB, "blocks", `${id}.tsx`))) errs.push(`blocks/${id}.tsx is missing`);
  if (!meta.name) errs.push("name is missing");
  if (!KINDS.includes(meta.kind)) errs.push(`kind must be one of ${KINDS.join(", ")}`);
  if (!meta.description) errs.push("description is missing");
  if (meta.from && !TEMPLATE_IDS.has(meta.from)) errs.push(`from "${meta.from}" is not a template`);
  for (const b of meta.business || []) if (!BUSINESS.has(b)) errs.push(`business type "${b}" is not one of lib/categories.ts`);
  errs.push(...schemaProblems([{ group: meta.name || id, fields: meta.fields || [] }], meta.defaults || {}).map((e) => e.replace("content.json", "defaults")));
  if (errs.length) problems.push(`library/blocks/${id}: ${errs.join("; ")}`);
  const files = existsSync(join(LIB, "blocks", `${id}.tsx`)) ? [...localImports(join(LIB, "blocks", `${id}.tsx`))].map((p) => relative(ROOT, p).replace(/\\/g, "/")) : [];
  blocks.push({ id, name: meta.name, kind: meta.kind, from: meta.from || "", description: meta.description, tags: meta.tags || [], business: meta.business || [], heavy: !!meta.heavy, fields: meta.fields, defaults: meta.defaults, files: [...files, `library/blocks/${id}.json`].sort() });
}
if (problems.length) {
  console.error(`The block library has problems:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
await build({
  root: LIB,
  configFile: false,
  logLevel: "warn",
  plugins: [react()],
  define: { "process.env.NODE_ENV": '"production"' },
  build: {
    outDir: OUT,
    emptyOutDir: false,
    copyPublicDir: false,
    chunkSizeWarningLimit: 2000,
    lib: { entry: join(LIB, "runtime.tsx"), formats: ["es"], fileName: () => "xp-library.js", cssFileName: "xp-library" },
    rollupOptions: { output: { chunkFileNames: "[name]-[hash].js", assetFileNames: "[name]-[hash][extname]" } },
  },
});
if (existsSync(join(LIB, "media"))) cpSync(join(LIB, "media"), join(OUT, "media"), { recursive: true });
const runtimeFiles = listFiles(OUT);
writeFileSync(join(OUT, "files.json"), JSON.stringify(runtimeFiles) + "\n");

// The character runtime (library/character, docs/CHARACTER-JOURNEY.md): one file with three.js
// inside, loaded only by pages that have a 3D character. Downloads add it on its own. esbuild
// bundles it (tree-shaken three.js, about 670 KB, 170 KB over the wire).
await (await import("esbuild")).build({
  entryPoints: [join(LIB, "character", "runtime.ts")],
  bundle: true,
  format: "esm",
  target: "es2020",
  minify: true,
  legalComments: "none",
  charset: "utf8",
  define: { "process.env.NODE_ENV": '"production"' },
  outfile: join(OUT, "xp-character.js"),
  logLevel: "warning",
});
writeFileSync(join(OUT, "character-files.json"), JSON.stringify(["xp-character.js"]) + "\n");

// Vite leaves library builds unminified (to keep them tree-shakable); these are finished files
// that pages load as they are, so every script is minified here. About half the bytes.
{
  const { transform } = await import("esbuild");
  for (const f of listFiles(OUT).filter((p) => p.endsWith(".js") && !p.startsWith("source/") && p !== "xp-character.js")) {
    const file = join(OUT, f);
    const out = await transform(readFileSync(file, "utf8"), { minify: true, format: "esm", target: "es2020", legalComments: "none", charset: "utf8" });
    writeFileSync(file, out.code);
  }
}

// One block on its own: #b=<id> shows its defaults, #xp=<content> any settings.
writeFileSync(
  join(OUT, "preview.html"),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Block preview</title>
<style>html,body{margin:0;background:#fff;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}</style>
<script>window.__XP_PREVIEW__=true;try{var b=/[#&]b=([\\w-]+)/.exec(location.hash),m=/[#&]xp=([^&]*)/.exec(location.hash);window.__XP__=m?JSON.parse(decodeURIComponent(m[1])):{extras:b?[{block:b[1]}]:[]}}catch(e){window.__XP__={extras:[]}}</script>
</head><body><div data-xp-extras></div><script type="module" src="./xp-library.js"></script><script>addEventListener("load",function(){parent!==window&&parent.postMessage({type:"xp-ready"},"*")})</script></body></html>
`
);

// Sources for download.
for (const b of blocks) for (const p of b.files) {
  const to = join(OUT, "source", p);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(join(ROOT, p), to);
}
for (const p of ["library/kit.ts", "library/runtime.tsx", "library/tsconfig.json"]) {
  mkdirSync(dirname(join(OUT, "source", p)), { recursive: true });
  copyFileSync(join(ROOT, p), join(OUT, "source", p));
}

// Shared assets: every picture and film the templates use, the library's own pictures, fonts and palettes.
const templates = existsSync(join(ROOT, "lib", "templates.gen.json")) ? JSON.parse(readFileSync(join(ROOT, "lib", "templates.gen.json"), "utf8")) : [];
const get = (o, path) => path.split(".").reduce((v, k) => (v == null ? undefined : v[k]), o);
const media = new Map();
const addMedia = (url, type, label, t) => {
  if (!url || typeof url !== "string" || url.startsWith("data:")) return;
  const src = url.startsWith("./") ? `/tpl/${t.id}/site/${url.slice(2)}` : url;
  if (!/^(https:\/\/|\/)/.test(src)) return;
  const prev = media.get(src);
  if (prev) return void (prev.from.includes(t.id) || prev.from.push(t.id));
  media.set(src, { src, type, label, from: [t.id], business: t.business || [] });
};
const fonts = new Map();
const palettes = [];
for (const t of templates) {
  for (const g of t.schema || [])
    for (const f of g.fields || []) {
      const v = get(t.content, f.path);
      if (f.type === "image" || f.type === "video") addMedia(v, f.type, f.label, t);
      if (f.type === "font" && v) fonts.set(v, [...(fonts.get(v) || []), t.id]);
      if (f.type === "list" && Array.isArray(v))
        for (const s of f.fields || []) if (s.type === "image" || s.type === "video") v.forEach((it, i) => addMedia(it?.[s.path], s.type, `${f.label} ${i + 1}: ${s.label}`, t));
    }
  const colors = t.content?.theme?.colors;
  if (colors && typeof colors === "object") palettes.push({ from: t.id, name: t.name, colors: Object.fromEntries(Object.entries(colors).filter(([, c]) => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c))) });
}
for (const b of blocks) for (const f of b.fields) if ((f.type === "image" || f.type === "video") && String(b.defaults[f.path] || "").startsWith("lib:")) addMedia(`/lib/media/${b.defaults[f.path].slice(4)}`, f.type, f.label, { id: "library", business: b.business });
if (existsSync(join(LIB, "media"))) for (const f of readdirSync(join(LIB, "media"))) addMedia(`/lib/media/${f}`, "image", f.replace(/\.\w+$/, "").replace(/-/g, " "), { id: "library", business: [] });

writeFileSync(REGISTRY, JSON.stringify({ blocks, assets: { media: [...media.values()], fonts: [...fonts].map(([family, from]) => ({ family, from: [...new Set(from)] })), palettes } }, null, 2) + "\n");
console.log(`Library: ${blocks.length} blocks, ${media.size} pictures and films, ${fonts.size} fonts, ${palettes.length} palettes`);
