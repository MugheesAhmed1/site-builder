// Builds every imported template (templates/<id>) into public/tpl/<id> and registers it
// (lib/templates.gen.json). Runs before dev and build; see docs/TEMPLATES.md.
//
//   public/tpl/<id>/site/         the built, ready-to-host site (what "Download site" zips)
//   public/tpl/<id>/site/preview.html  the same page with the preview bridge, for the studio only
//   public/tpl/<id>/source/       the project's source (what "Download source" zips)
//   public/tpl/<id>/files.json    the lists of both
//
// A template whose slots cannot be found in both its source and its built site fails the build,
// so a slot can never silently stop working.
import { build } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { fileKind, occurrences, slotProblems } from "../lib/template-apply.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const TEMPLATES = join(ROOT, "templates");
const OUT = join(ROOT, "public", "tpl");
const REGISTRY = join(ROOT, "lib", "templates.gen.json");
const BRIDGE = readFileSync(join(ROOT, "scripts", "template-bridge.js"), "utf8");

function listFiles(dir, base = dir) {
  const out = [];
  for (const f of readdirSync(dir).sort()) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...listFiles(p, base));
    else out.push(p.slice(base.length + 1).replace(/\\/g, "/"));
  }
  return out;
}

function validManifest(m, id) {
  const errs = [];
  if (m.id !== id) errs.push(`id "${m.id}" does not match its folder "${id}"`);
  if (!m.name) errs.push("name is missing");
  if (!["vite", "static"].includes(m.kind)) errs.push(`kind must be vite or static`);
  if (!m.licence || !m.licence.kind || !m.licence.holder) errs.push("licence (kind and holder) is missing");
  if (!Array.isArray(m.slots) || !m.slots.length) errs.push("no slots");
  const keys = new Set();
  for (const s of m.slots || []) {
    if (!s.key || !s.label || !s.default) errs.push(`slot ${JSON.stringify(s)} needs key, label and default`);
    if (keys.has(s.key)) errs.push(`slot key ${s.key} is used twice`);
    keys.add(s.key);
    if (s.type !== "image" && s.default.length < 4) errs.push(`slot ${s.key}: "${s.default}" is too short to replace safely`);
  }
  return errs;
}

function checkSlots(m, dir, label) {
  const files = listFiles(dir).filter((p) => fileKind(p));
  const texts = files.map((p) => [p, readFileSync(join(dir, p), "utf8")]);
  const errs = [];
  for (const s of m.slots) {
    const found = texts.some(([, t]) => occurrences(t, s.default).length);
    if (!found) errs.push(`${label}: slot ${s.key} ("${s.default.slice(0, 50)}") is not in any file`);
    if (s.type !== "image") for (const [p, t] of texts) errs.push(...slotProblems(p, t, s).map((x) => `${label}: ${x}`));
  }
  return errs;
}

// Every library a template ships must be installed here (so it builds) and carry an open licence.
const OPEN = /^(MIT|Apache-2\.0|BSD-2-Clause|BSD-3-Clause|ISC|0BSD|Zlib)$/;
function checkDependencies(src) {
  const p = join(src, "package.json");
  if (!existsSync(p)) return [];
  const pkg = JSON.parse(readFileSync(p, "utf8"));
  const errs = [];
  for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
    const mp = join(ROOT, "node_modules", name, "package.json");
    if (!existsSync(mp)) {
      errs.push(`${name} is not installed in the builder (add it to package.json so the template builds)`);
      continue;
    }
    const lic = JSON.parse(readFileSync(mp, "utf8")).license;
    if (!OPEN.test(String(lic))) errs.push(`${name} is licensed ${lic}, which is not an open licence`);
  }
  return errs;
}

async function buildOne(id) {
  const dir = join(TEMPLATES, id);
  const m = JSON.parse(readFileSync(join(dir, "template.json"), "utf8"));
  const errs = validManifest(m, id);
  if (errs.length) throw new Error(`templates/${id}/template.json:\n  ${errs.join("\n  ")}`);
  const src = join(dir, "source");
  const depErrs = checkDependencies(src);
  if (depErrs.length) throw new Error(`templates/${id} dependencies:\n  ${depErrs.join("\n  ")}`);
  const out = join(OUT, id);
  rmSync(out, { recursive: true, force: true });
  const site = join(out, "site");

  if (m.kind === "static") {
    cpSync(src, site, { recursive: true });
  } else {
    const css = listFiles(src).filter((p) => p.endsWith(".css")).map((p) => readFileSync(join(src, p), "utf8")).join("\n");
    await build({
      root: src,
      configFile: false,
      logLevel: "warn",
      base: "./",
      publicDir: join(src, "public"),
      plugins: [react(), ...(css.includes('@import "tailwindcss"') ? [tailwind()] : [])],
      // Keep text as written (’ stays ’), so slots match the built files too.
      esbuild: { charset: "utf8", legalComments: "none" },
      build: { outDir: site, emptyOutDir: true, chunkSizeWarningLimit: 4000, reportCompressedSize: false },
    });
  }

  const slotErrs = [...checkSlots(m, src, "source"), ...checkSlots(m, site, "site")];
  if (slotErrs.length) throw new Error(`templates/${id}:\n  ${slotErrs.join("\n  ")}`);

  // The preview copy: the bridge first in <head>, and a call to it before every inline script in
  // <body>, so replaced words are in place before the page's own code reads them.
  const index = readFileSync(join(site, "index.html"), "utf8");
  const [head, body = ""] = index.split(/<body[^>]*>/i);
  const bodyTag = index.match(/<body[^>]*>/i)?.[0] || "<body>";
  const preview =
    head.replace(/<head([^>]*)>/i, (_m, attrs) => `<head${attrs}>\n<script>${BRIDGE}</script>`) +
    bodyTag +
    body.replace(/<script(?![^>]*\bsrc=)([^>]*)>/gi, `<script>window.__xpApply&&__xpApply()</script><script$1>`);
  writeFileSync(join(site, "preview.html"), preview);

  // Hidden files are not served from public/, so they stay out; the download writes its own .gitignore.
  cpSync(src, join(out, "source"), { recursive: true, filter: (p) => !/[\\/]\.[^\\/]+$/.test(p) });
  const poster = existsSync(join(dir, "poster.webp"));
  if (poster) cpSync(join(dir, "poster.webp"), join(out, "poster.webp"));
  const files = {
    site: listFiles(site).filter((p) => p !== "preview.html"),
    source: listFiles(join(out, "source")),
  };
  writeFileSync(join(out, "files.json"), JSON.stringify(files));
  const { draft, ...entry } = m;
  if (draft) console.warn(`templates/${id} is still a draft: review its slots and categories.`);
  return { ...entry, poster, siteFiles: files.site.length, sourceFiles: files.source.length };
}

const ids = existsSync(TEMPLATES) ? readdirSync(TEMPLATES).filter((f) => existsSync(join(TEMPLATES, f, "template.json"))).sort() : [];
mkdirSync(OUT, { recursive: true });
const registry = [];
for (const id of ids) registry.push(await buildOne(id));
const json = JSON.stringify(registry, null, 2) + "\n";
if (!existsSync(REGISTRY) || readFileSync(REGISTRY, "utf8") !== json) writeFileSync(REGISTRY, json);
console.log(`Templates: ${registry.map((t) => t.id).join(", ") || "none"}`);
