// Builds every imported template (templates/<id>) into public/tpl/<id> and registers it
// (lib/templates.gen.json). Runs before dev and build; see docs/TEMPLATES.md.
//
//   public/tpl/<id>/site/         the built, ready-to-host site (what "Download site" zips)
//   public/tpl/<id>/site/xp-content.js  its words, pictures, colours, sections and motion
//   public/tpl/<id>/site/preview.html   the same page in preview mode, for the studio only
//   public/tpl/<id>/source/       the project's source (what "Download source" zips)
//   public/tpl/<id>/files.json    the lists of both
//
// A template reads everything it shows from its content (templates/<id>/content.json). The build
// fails when the schema in template.json and the content do not match, or when any value in the
// content has no field, so every part of a template stays editable. Drafts are left out.
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { contentScript, schemaProblems, withCharacter } from "../lib/template-schema.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const TEMPLATES = join(ROOT, "templates");
const OUT = join(ROOT, "public", "tpl");
const REGISTRY = join(ROOT, "lib", "templates.gen.json");
const KIT = join(TEMPLATES, "_kit");

// Shared template files (templates/_kit) are kept identical in every template that uses them.
// The character kit (character.tsx, character.css) goes into every template that has a src folder.
const ALWAYS = new Set(["character.tsx", "character.css"]);
function syncKit(src) {
  if (!existsSync(KIT)) return;
  for (const f of readdirSync(KIT)) {
    const to = join(src, "src", f);
    if (!existsSync(to) && !(ALWAYS.has(f) && existsSync(join(src, "src")))) continue;
    if (!existsSync(to)) {
      writeFileSync(to, readFileSync(join(KIT, f), "utf8"));
      continue;
    }
    const want = readFileSync(join(KIT, f), "utf8");
    if (readFileSync(to, "utf8") !== want) writeFileSync(to, want);
  }
}
// The business types a template can be filed under: the builder's own categories (lib/categories.ts).
const BUSINESS = new Set([...readFileSync(join(ROOT, "lib", "categories.ts"), "utf8").matchAll(/^\s{4}id: "([a-z-]+)",$/gm)].map((m) => m[1]));
// Preview mode: the studio sends new content by message, and the address can carry the first copy.
// "lite=1" (the journey's template library) shows a character's picture instead of drawing it.
const PREVIEW = `<script>window.__XP_PREVIEW__=true;window.__XP_LIB__="/lib/xp-library.js";window.__XP_CHAR__="/lib/xp-character.js";try{var m=/[#&]xp=([^&]*)/.exec(location.hash);if(m)window.__XP_HASH__=JSON.parse(decodeURIComponent(m[1]));if(/[#&]lite=1/.test(location.hash))window.__XP_LITE__=true}catch(e){}</script>`;

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
  if (!Array.isArray(m.business) || !m.business.length) errs.push("business (the business types it suits, best first) is missing");
  for (const b of m.business || []) if (!BUSINESS.has(b)) errs.push(`business type "${b}" is not one of lib/categories.ts (${[...BUSINESS].join(", ")})`);
  if (!m.sector) errs.push("sector (one line on the kind of business it was made for) is missing");
  if ("slots" in m) errs.push("slots are no longer used: describe the content with a schema (docs/TEMPLATES.md)");
  return errs;
}

// A design system reaches a template through its roles (docs/CHARACTER-JOURNEY.md): the part each
// theme colour plays (page, text, accent…), which font slot takes the display or body typeface,
// and whether the character's stage is dark or light. Every colour and font needs one.
const ROLES = new Set(["page", "surface", "surface2", "ink", "ink2", "muted", "line", "accent", "accentDeep", "accent2", "soft", "onAccent", "dark", "onDark", "light", "onLight", "fill", "fill2", "tint", "deep", "faint", "g1", "g2", "g3", "keep"]);
function roleProblems(r, content) {
  if (!r) return ["roles are missing: give every theme colour and font a part (docs/CHARACTER-JOURNEY.md)"];
  const errs = [];
  const modes = ["light", "dark"];
  if (!modes.includes(r.mode)) errs.push(`mode must be light or dark`);
  if (!modes.includes(r.stage)) errs.push(`stage must be light or dark`);
  for (const m of r.modes || []) if (!modes.includes(m)) errs.push(`modes may only hold light and dark`);
  const colors = content?.theme?.colors || {};
  for (const k of Object.keys(colors)) if (!r.colors || !(k in r.colors)) errs.push(`colour "${k}" has no role`);
  for (const [k, v] of Object.entries(r.colors || {})) {
    if (!(k in colors)) errs.push(`role for "${k}", which is not a theme colour`);
    if (!ROLES.has(v)) errs.push(`"${k}" has an unknown role "${v}"`);
  }
  for (const k of Object.keys(content?.theme?.fonts || {})) if (!r.fonts || !["display", "body", "keep"].includes(r.fonts[k])) errs.push(`font "${k}" needs display, body or keep`);
  if (r.radius && typeof content?.theme?.[r.radius] !== "number") errs.push(`radius names "${r.radius}", which is not a theme number`);
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
  if (m.draft) {
    console.warn(`templates/${id} is still a draft and is left out: make it read its content first (docs/TEMPLATES.md).`);
    return null;
  }
  const errs = validManifest(m, id);
  if (errs.length) throw new Error(`templates/${id}/template.json:\n  ${errs.join("\n  ")}`);
  const src = join(dir, "source");
  syncKit(src);
  const depErrs = checkDependencies(src);
  if (depErrs.length) throw new Error(`templates/${id} dependencies:\n  ${depErrs.join("\n  ")}`);
  // Every template can carry a 3D character on its gradient (docs/CHARACTER-JOURNEY.md): the
  // character's settings join its schema and content here, so content.json stays the template's own.
  const own = JSON.parse(readFileSync(join(dir, "content.json"), "utf8"));
  const roleErrs = roleProblems(m.roles, own);
  if (roleErrs.length) throw new Error(`templates/${id}/template.json roles:\n  ${roleErrs.join("\n  ")}`);
  const merged = m.character === false ? { schema: m.schema, content: own } : withCharacter(m.schema, own, m.roles);
  m.schema = merged.schema;
  const content = merged.content;
  const schemaErrs = schemaProblems(m.schema, content);
  if (schemaErrs.length) throw new Error(`templates/${id} schema and content.json:\n  ${schemaErrs.join("\n  ")}`);
  const index0 = readFileSync(join(src, "index.html"), "utf8");
  if (!/<script src="\.\/xp-content\.js"><\/script>/.test(index0)) throw new Error(`templates/${id}/source/index.html must load <script src="./xp-content.js"></script> in <head>`);
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
      plugins: [react(), ...(css.includes('@import "tailwindcss"') ? [(await import("@tailwindcss/vite")).default()] : [])],
      // Keep text as written (’ stays ’).
      esbuild: { charset: "utf8", legalComments: "none" },
      build: { outDir: site, emptyOutDir: true, chunkSizeWarningLimit: 4000, reportCompressedSize: false },
    });
  }

  const script = contentScript(content);
  writeFileSync(join(site, "xp-content.js"), script);

  // The preview copy: preview mode switched on before the content loads.
  const index = readFileSync(join(site, "index.html"), "utf8");
  writeFileSync(join(site, "preview.html"), index.replace(/<head([^>]*)>/i, (_m, attrs) => `<head${attrs}>\n${PREVIEW}`));

  // Hidden files are not served from public/, so they stay out; the download writes its own .gitignore.
  cpSync(src, join(out, "source"), { recursive: true, filter: (p) => !/[\\/]\.[^\\/]+$/.test(p) });
  const sourceContent = join(out, "source", m.kind === "vite" ? "public" : "", "xp-content.js");
  mkdirSync(join(sourceContent, ".."), { recursive: true });
  writeFileSync(sourceContent, script);
  const poster = existsSync(join(dir, "poster.webp"));
  if (poster) cpSync(join(dir, "poster.webp"), join(out, "poster.webp"));
  const files = {
    site: listFiles(site).filter((p) => p !== "preview.html"),
    source: listFiles(join(out, "source")),
  };
  writeFileSync(join(out, "files.json"), JSON.stringify(files));
  return { ...m, content, poster, siteFiles: files.site.length, sourceFiles: files.source.length };
}

const ids = existsSync(TEMPLATES) ? readdirSync(TEMPLATES).filter((f) => existsSync(join(TEMPLATES, f, "template.json"))).sort() : [];
mkdirSync(OUT, { recursive: true });
// XP_ONLY=id,id rebuilds just those while working on them; the others keep their last build.
const only = (process.env.XP_ONLY || "").split(",").map((x) => x.trim()).filter(Boolean);
const previous = only.length && existsSync(REGISTRY) ? JSON.parse(readFileSync(REGISTRY, "utf8")) : [];
const registry = [];
for (const id of ids) {
  const kept = only.length && !only.includes(id) ? previous.find((t) => t.id === id) : null;
  const entry = kept || (await buildOne(id));
  if (entry) registry.push(entry);
}
const json = JSON.stringify(registry, null, 2) + "\n";
if (!existsSync(REGISTRY) || readFileSync(REGISTRY, "utf8") !== json) writeFileSync(REGISTRY, json);
console.log(`Templates: ${registry.map((t) => t.id).join(", ") || "none"}`);
