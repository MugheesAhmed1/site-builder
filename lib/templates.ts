// Imported whole-project templates (docs/TEMPLATES.md). The registry is written by
// scripts/build-templates.mjs from templates/<id>/template.json and content.json; the built files
// live in public/tpl/<id>. A template reads everything it shows from one content object, and its
// schema lists a field for every value, so a person can change any part of it for their project.
import registry from "./templates.gen.json";
import { categoryLabel } from "./fit";
import { clone, contentScript, countChanges, extractMedia, getPath, setPath, type Content, type SchemaField, type SchemaGroup } from "./template-schema.mjs";
import type { TemplateRoles } from "./character/apply";

export type { Content, SchemaField, SchemaGroup };

export interface TemplateInfo {
  id: string;
  name: string;
  pitch: string;
  kind: "vite" | "static";
  /** Gallery styles (Cinematic, 3D, Scroll…). */
  categories: string[];
  /** Business types it suits, best first: ids from lib/categories.ts. */
  business: string[];
  /** One line on the kind of business it was made for. */
  sector: string;
  features?: string[];
  /** The part each theme colour and font plays, its mode and its stage tone (docs/CHARACTER-JOURNEY.md). */
  roles: TemplateRoles;
  intensity: number;
  /** Real WebGL or similar: the gallery shows a still until someone asks for it to play. */
  heavy: boolean;
  licence: { kind: string; holder: string; note: string; added: string };
  /** Pictures or video the default content loads from other hosts. */
  remoteAssets: string[];
  schema: SchemaGroup[];
  /** The default content: what the template shows before anyone changes it. */
  content: Content;
  poster: boolean;
  siteFiles: number;
  sourceFiles: number;
}

export const TEMPLATES = registry as unknown as TemplateInfo[];

export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id);

export const templateBase = (id: string) => `/tpl/${id}`;

export const businessLabel = (id: string) => categoryLabel("website", id);

/** Content for the address: uploads are too big for it and follow by message once the page is up. */
function forAddress(v: unknown): unknown {
  if (typeof v === "string") return v.startsWith("data:") ? "" : v;
  if (Array.isArray(v)) return v.map(forAddress);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, forAddress(x)]));
  return v;
}

/** The preview page, with the content in its address so it is in place on first paint. */
export function previewSrc(t: TemplateInfo, content?: Content) {
  const hash = content && countChanges(content, t.content) ? "#xp=" + encodeURIComponent(JSON.stringify(forAddress(content))) : "";
  return `${templateBase(t.id)}/site/preview.html${hash}`;
}

const STORE = (id: string) => `xp-template:v2:${id}`;

/** The person's content, or the defaults. Values the template no longer has are dropped. */
export function loadContent(t: TemplateInfo): Content {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE(t.id)) || "null");
    if (saved && typeof saved === "object") return withTheStory(merge(t.content, saved) as Content, saved);
  } catch {
    /* private mode or a bad copy: start from the defaults */
  }
  return clone(t.content);
}

/**
 * A site saved before the page's story existed has the scroll motion that was then the only
 * default ("It turns") and none of the story's words. It takes the story now, as a new site would,
 * with the template's words for it. A site saved after that keeps whatever its owner chose.
 */
function withTheStory(c: Content, saved: Record<string, unknown>): Content {
  const ch = c.character;
  if ("film" in saved || !ch || typeof ch !== "object" || !ch.src || ch.scroll !== "turn") return c;
  return { ...c, character: { ...ch, scroll: "film" } };
}

function merge(base: unknown, saved: unknown): unknown {
  if (Array.isArray(base)) {
    if (!Array.isArray(saved)) return clone(base);
    // A list of colours keeps whatever the person saved; a list of items takes each item's shape from the first.
    const shape = base[0];
    // Library blocks differ from one to the next and every template starts with none: each is kept
    // as saved (the page fills in a block's own defaults). So is any list the template starts empty.
    if (shape === undefined || (shape && typeof shape === "object" && "block" in shape))
      return saved.filter((x) => x !== null && x !== undefined && (typeof x !== "object" || !("block" in (x as object)) || typeof (x as { block: unknown }).block === "string")).map((x) => clone(x));
    return saved.map((x) => (shape && typeof shape === "object" ? merge(shape, x) : typeof x === typeof shape ? x : shape));
  }
  if (base && typeof base === "object") {
    const s = saved && typeof saved === "object" && !Array.isArray(saved) ? (saved as Record<string, unknown>) : {};
    return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, k in s ? merge(v, s[k]) : clone(v)]));
  }
  return typeof saved === typeof base ? saved : base;
}

/**
 * Saves content with big uploads (3D models, photos) moved to IndexedDB, so they survive a reload
 * too. False when the browser could not keep it.
 */
export async function keepContent(id: string, c: Content): Promise<boolean> {
  if (saveContent(id, c)) return true;
  try {
    const { dehydrate } = await import("./blobstore");
    return saveContent(id, await dehydrate(c, `tpl:${id}`));
  } catch {
    return false;
  }
}

/** The person's content with their big uploads back from IndexedDB. */
export async function openContent(t: TemplateInfo): Promise<Content> {
  const c = loadContent(t);
  try {
    const { hydrate } = await import("./blobstore");
    return await hydrate(c);
  } catch {
    return c;
  }
}

/** False when the browser could not keep it (usually big uploads). */
export function saveContent(id: string, c: Content): boolean {
  try {
    localStorage.setItem(STORE(id), JSON.stringify(c));
    return true;
  } catch {
    try {
      localStorage.removeItem(STORE(id));
    } catch {
      /* nothing to do */
    }
    return false;
  }
}

export const changes = (t: TemplateInfo, c: Content) => countChanges(c, t.content);

const nameOf = (t: TemplateInfo, c: Content) => String(c?.brand?.name || "").trim() || t.name;

function remoteIn(c: Content): string[] {
  const out = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === "string" && /^https?:\/\/\S+\.(?:png|jpe?g|webp|gif|avif|svg|mp4|webm|mov)(?:[?#]|$)|^https:\/\/images\.higgs\.ai\//i.test(v)) out.add(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(c);
  return [...out];
}

function readme(t: TemplateInfo, c: Content, which: "site" | "source") {
  const name = nameOf(t, c);
  const where = which === "source" && t.kind === "vite" ? "public/xp-content.js" : "xp-content.js";
  const run =
    which === "site"
      ? "This folder is the finished site. Upload all of it to any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages) or open index.html."
      : t.kind === "vite"
        ? "Install and run:\n\n    npm install\n    npm run dev\n\nBuild the site with `npm run build`; the result is in dist/."
        : "The site is index.html and the files next to it. Open it, or upload the folder to any static host.";
  const remote = remoteIn(c);
  const remoteText = remote.length
    ? `\n\nSome pictures or video load from other hosts:\n\n${remote.map((u) => `- ${u}`).join("\n")}\n\nCopy them into media/ and change their addresses in ${where} before launch, so the site does not depend on those hosts.`
    : "";
  const char = typeof c?.character?.src === "string" && c.character.src.trim()
    ? `\n\n## The 3D character\n\n${c.character.name ? `${c.character.name} is` : "The character is"} a GLB model in media/, drawn by xp-lib/xp-character.js (three.js, MIT). Its pose, motion, finish and the gradient behind it are under \`character\` and \`design\` in ${where}. Swap the model by changing \`character.src\` to another .glb file.`
    : "";
  return `# ${name}\n\nMade with Site Builder from the ${t.name} template.\n\n${run}\n\n## Changing it\n\nEvery word, picture, video, link, colour, font, section and motion setting is in **${where}**. Change a value there and reload; no code change is needed. Your uploads are in media/.${char}${remoteText}\n\nTemplate: ${t.name}, supplied by ${t.licence.holder}. ${t.licence.note}\n`;
}

/** A zip of the built site or of the source, with the person's content in place. */
export async function templateZip(t: TemplateInfo, c: Content, which: "site" | "source"): Promise<Blob> {
  const base = templateBase(t.id);
  const list: { site: string[]; source: string[] } = await fetch(`${base}/files.json`).then((r) => r.json());
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const contentAt = which === "source" && t.kind === "vite" ? "public/xp-content.js" : "xp-content.js";
  const mediaAt = which === "source" && t.kind === "vite" ? "public/" : "";
  await Promise.all(
    list[which]
      .filter((p) => p !== contentAt)
      .map(async (p) => {
        const res = await fetch(`${base}/${which}/${p.split("/").map(encodeURIComponent).join("/")}`);
        if (!res.ok) throw new Error(`Could not read ${p}`);
        zip.file(p, await res.arrayBuffer());
      }),
  );
  // Library blocks and the 3D character travel with the site: their runtimes, every block and
  // the library's pictures.
  const hasBlocks = Array.isArray(c.extras) && c.extras.length > 0;
  const hasChar = typeof c?.character?.src === "string" && c.character.src.trim() !== "";
  if (hasBlocks || hasChar) {
    const libAt = mediaAt + "xp-lib/";
    const list = async (u: string): Promise<string[]> => fetch(u).then((r) => (r.ok ? r.json() : Promise.reject(new Error("Could not read the library"))));
    const libFiles = [...(hasBlocks ? await list("/lib/files.json") : []), ...(hasChar ? await list("/lib/character-files.json") : [])];
    await Promise.all(
      libFiles.map(async (p) => {
        const res = await fetch(`/lib/${p.split("/").map(encodeURIComponent).join("/")}`);
        if (!res.ok) throw new Error(`Could not read library file ${p}`);
        zip.file(libAt + p, await res.arrayBuffer());
      }),
    );
  }
  // A model or picture picked from the builder's own library is copied into media/.
  let own = c;
  for (const path of ["character.src", "character.poster", "design.image"]) {
    const v = getPath(own, path);
    if (typeof v !== "string" || !/^\/(assets|lib|tpl)\/[\w./-]+$/.test(v)) continue;
    const res = await fetch(v);
    if (!res.ok) throw new Error(`Could not read ${v}`);
    const name = `media/${v.split("/").pop()}`;
    zip.file(mediaAt + name, await res.arrayBuffer());
    own = setPath(own, path, `./${name}`);
  }
  const { content, files } = extractMedia(own);
  zip.file(contentAt, contentScript(content));
  for (const f of files) zip.file(mediaAt + f.path, f.base64, { base64: true });
  zip.file(which === "site" ? "README.txt" : "README.md", readme(t, c, which));
  if (which === "source" && t.kind === "vite") zip.file(".gitignore", "node_modules/\ndist/\n.env*\n!.env.example\n");
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

export const zipName = (t: TemplateInfo, c: Content, which: "site" | "source") =>
  `${nameOf(t, c).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || t.id}-${which}.zip`;
