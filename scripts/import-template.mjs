// Brings a whole project (a .zip) into the builder as a template (docs/TEMPLATES.md).
//
//   node scripts/import-template.mjs path/to/project.zip [--id slug] [--owner "Name"] [--force]
//
// The archive is treated as untrusted data: nothing in it is run here. Entries that leave the
// folder, links, oversized archives, secrets (.env), dependencies and build output are refused
// or dropped. The project lands in templates/<id>/source with a drafted template.json and
// content.json. It stays a draft (left out of the site) until it reads everything it shows from
// its content; `npm run templates` then builds it and checks every value has a field.
import JSZip from "jszip";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const MAX_BYTES = 80 * 1024 * 1024;
const MAX_FILES = 3000;

// Dropped on import: dependencies, build output, version control, editor and OS litter,
// lockfiles (the builder installs from its own) and anything that might hold a secret.
const DROP = [
  /(^|\/)node_modules\//,
  /(^|\/)\.git\//,
  /(^|\/)(dist|build|\.next|\.vercel|\.cache)\//,
  /(^|\/)__MACOSX\//,
  /(^|\/)\.DS_Store$/,
  /(^|\/)Thumbs\.db$/,
  /(^|\/)\.env(\..*)?$/,
  /(^|\/)(package-lock\.json|bun\.lockb?|yarn\.lock|pnpm-lock\.yaml)$/,
  /(^|\/)\.(idea|vscode)\//,
];

// Build tooling a template may keep even though no source file imports it.
const TOOLING = /^(vite|@vitejs\/plugin-react|@tailwindcss\/vite|tailwindcss|typescript|@types\/.*)$/;

export function cleanEntryName(name) {
  const n = name.replace(/\\/g, "/");
  if (n.startsWith("/") || /^[A-Za-z]:/.test(n)) throw new Error(`absolute path in archive: ${name}`);
  const norm = posix.normalize(n);
  if (norm === ".." || norm.startsWith("../") || norm.includes("/../")) throw new Error(`path leaves the folder: ${name}`);
  return norm;
}

export function dropped(path) {
  return DROP.some((r) => r.test(path));
}

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

/** Read an archive into { path: Buffer }, refusing anything unsafe. */
export async function readArchive(buf) {
  const zip = await JSZip.loadAsync(buf);
  const entries = Object.values(zip.files).filter((f) => !f.dir);
  if (entries.length > MAX_FILES) throw new Error(`archive has ${entries.length} files (limit ${MAX_FILES})`);
  const out = {};
  let total = 0;
  for (const f of entries) {
    const path = cleanEntryName(f.name);
    // A unix symlink keeps S_IFLNK (0o120000) in the high bits of its permissions.
    if (f.unixPermissions && (Number(f.unixPermissions) & 0o170000) === 0o120000) throw new Error(`link in archive: ${f.name}`);
    if (dropped(path)) continue;
    const data = await f.async("nodebuffer");
    total += data.length;
    if (total > MAX_BYTES) throw new Error("archive is larger than 80 MB unpacked");
    out[path] = data;
  }
  // A single top folder ("mossline/…") is unwrapped.
  const tops = new Set(Object.keys(out).map((p) => p.split("/")[0]));
  if (tops.size === 1) {
    const [top] = tops;
    if (Object.keys(out).every((p) => p.startsWith(top + "/"))) {
      const un = {};
      for (const [p, d] of Object.entries(out)) un[p.slice(top.length + 1)] = d;
      return un;
    }
  }
  return out;
}

const text = (files, p) => (files[p] ? files[p].toString("utf8") : "");
const stripTags = (s) => s.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

/** Which kind of project this is: a Vite + React app, or a page that runs as it is. */
export function detectKind(files) {
  const html = text(files, "index.html");
  if (!html) throw new Error("no index.html at the top of the project");
  if (/<script[^>]+type=["']module["'][^>]+src=["'][^"']+\.(t|j)sx?["']/.test(html)) return "vite";
  return "static";
}

/** Dependencies nothing imports are dropped (for example an AI SDK the page never calls). */
export function pruneDependencies(files) {
  const raw = text(files, "package.json");
  if (!raw) return { removed: [] };
  const pkg = JSON.parse(raw);
  const code = Object.entries(files)
    .filter(([p]) => /\.(m?[jt]sx?|html|css)$/.test(p))
    .map(([, d]) => d.toString("utf8"))
    .join("\n");
  const used = (name) => code.includes(`'${name}'`) || code.includes(`"${name}"`) || code.includes(`'${name}/`) || code.includes(`"${name}/`) || code.includes(`@import "${name}`);
  const removed = [];
  for (const field of ["dependencies", "devDependencies"]) {
    for (const name of Object.keys(pkg[field] || {})) {
      if (TOOLING.test(name) && name !== "@types/express") continue;
      if (name.startsWith("@types/") ? used(name.slice(7)) : used(name)) continue;
      removed.push(name);
      delete pkg[field][name];
    }
  }
  if (pkg.name === "react-example" || !pkg.name) pkg.name = "site";
  files["package.json"] = Buffer.from(JSON.stringify(pkg, null, 2) + "\n");
  return { removed };
}

/** Addresses on other hosts the page loads (fonts aside), so the template records them. */
export function remoteAssets(files) {
  const seen = new Set();
  for (const [p, d] of Object.entries(files)) {
    if (!/\.(html|css|[jt]sx?)$/.test(p)) continue;
    for (const m of d.toString("utf8").matchAll(/https:\/\/[^\s"'`)<>]+/g)) {
      const u = m[0];
      if (/fonts\.(googleapis|gstatic)\.com/.test(u)) continue;
      if (/^https:\/\/(www\.)?w3\.org\//.test(u)) continue;
      seen.add(u);
    }
  }
  return [...seen];
}

/**
 * A first draft of the content model: the name, page title, description and main headings, with
 * a field for each. It is a starting point only. The project still has to be rebuilt to read
 * everything it shows from window.__XP__ (docs/TEMPLATES.md, "Making it a template").
 */
export function draftContent(files, name) {
  const html = text(files, "index.html");
  const content = {
    seo: { title: "{name}", description: html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1]?.trim() || "" },
    brand: { name },
    words: {},
  };
  const schema = [
    { group: "Business", fields: [
      { path: "brand.name", label: "Business name", type: "text" },
      { path: "seo.title", label: "Page title (search and browser tab)", type: "text" },
      { path: "seo.description", label: "Short description (search and sharing)", type: "textarea" },
    ] },
    { group: "Words", fields: [] },
  ];
  const sources = [html, ...Object.entries(files).filter(([p]) => /^src\/.*\.(t|j)sx$/.test(p)).map(([, d]) => d.toString("utf8"))];
  const seen = new Set([name]);
  let n = 0;
  for (const s of sources) {
    for (const m of s.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/g)) {
      const t = stripTags(m[2]).trim();
      if (!t || t.includes("{") || seen.has(t) || n >= 8) continue;
      seen.add(t);
      content.words[`heading${++n}`] = t;
      schema[1].fields.push({ path: `words.heading${n}`, label: `Heading ${n}`, type: "text" });
    }
  }
  return { content, schema };
}

function listFiles(dir, base = dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...listFiles(p, base));
    else out.push(p.slice(base.length + 1).replace(/\\/g, "/"));
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const zipPath = args.find((a) => !a.startsWith("--"));
  const opt = (k) => {
    const i = args.indexOf(`--${k}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  if (!zipPath) {
    console.error("usage: node scripts/import-template.mjs project.zip [--id slug] [--owner Name] [--force]");
    process.exit(1);
  }
  const files = await readArchive(readFileSync(zipPath));
  const meta = (() => {
    try {
      return JSON.parse(text(files, "metadata.json") || "{}");
    } catch {
      return {};
    }
  })();
  const title = text(files, "index.html").match(/<title>([^<]*)<\/title>/i)?.[1] || "";
  const name = meta.name || title.split(/[—|-]/)[0].trim() || "Template";
  const id = slugify(opt("id") || name);
  if (!id) throw new Error("could not make an id; pass --id");
  const dir = join(ROOT, "templates", id);
  if (existsSync(dir) && !args.includes("--force")) throw new Error(`templates/${id} exists (pass --force to replace its source)`);

  const kind = detectKind(files);
  if (kind === "static") {
    // A page that runs as it is needs none of the app scaffolding the export tool wrapped round it.
    for (const p of Object.keys(files)) if (/^(src\/|vite\.config\.|tsconfig|package\.json$|\.gitignore$)/.test(p)) delete files[p];
  }
  const { removed } = pruneDependencies(files);
  // AI Studio's start-up README is replaced by the one the download writes.
  if (/AI Studio/.test(text(files, "README.md"))) delete files["README.md"];
  delete files["metadata.json"];

  const src = join(dir, "source");
  rmSync(src, { recursive: true, force: true });
  for (const [p, d] of Object.entries(files)) {
    const to = join(src, p);
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, d);
  }

  const manifestPath = join(dir, "template.json");
  const remote = remoteAssets(files);
  if (!existsSync(manifestPath)) {
    const draft = draftContent(files, name);
    const manifest = {
      id,
      name,
      pitch: meta.description || "",
      kind,
      categories: [],
      intensity: 6,
      heavy: /three|webgl/i.test(text(files, "package.json")),
      licence: {
        kind: "owner",
        holder: opt("owner") || "Template owner",
        note: "Supplied by its owner as a whole project for use as a builder template.",
        added: new Date().toISOString().slice(0, 10),
      },
      remoteAssets: remote,
      business: [],
      sector: "",
      features: [],
      schema: draft.schema,
      draft: true,
    };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    writeFileSync(join(dir, "content.json"), JSON.stringify(draft.content, null, 2) + "\n");
  }
  console.log(`Imported ${listFiles(src).length} files into templates/${id}/source (${kind}).`);
  if (removed.length) console.log(`Dropped unused dependencies: ${removed.join(", ")}`);
  if (remote.length) console.log(`${remote.length} pictures or videos load from other hosts; see remoteAssets in template.json.`);
  console.log(`Next: make templates/${id} a template (docs/TEMPLATES.md): content.json, the schema, business types, then remove "draft".`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
