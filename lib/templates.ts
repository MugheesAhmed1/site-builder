// Imported whole-project templates (docs/TEMPLATES.md). The registry is written by
// scripts/build-templates.mjs from templates/<id>/template.json; the built files live in
// public/tpl/<id>. A template keeps its own code and look; a person changes its slots.
import registry from "./templates.gen.json";
import { applyToText, fileKind, plan } from "./template-apply.mjs";
import type { Replacement, TemplateSlot } from "./template-apply.mjs";

export type { Replacement, TemplateSlot };

export interface TemplateInfo {
  id: string;
  name: string;
  pitch: string;
  kind: "vite" | "static";
  categories: string[];
  industries?: string[];
  features?: string[];
  intensity: number;
  /** Real WebGL or similar: the gallery shows a still until someone asks for it to play. */
  heavy: boolean;
  licence: { kind: string; holder: string; note: string; added: string };
  /** Pictures or video the template loads from other hosts. */
  remoteAssets: string[];
  slots: (TemplateSlot & { hint?: string })[];
  poster: boolean;
  siteFiles: number;
  sourceFiles: number;
}

export const TEMPLATES = registry as TemplateInfo[];

export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id);

export const templateBase = (id: string) => `/tpl/${id}`;

/** The preview page, with the replacements in its address so they are in place on first paint. */
export function previewSrc(id: string, reps: Replacement[]) {
  const hash = reps.length ? "#xp=" + encodeURIComponent(JSON.stringify(reps.map(({ type, from, to }) => ({ type, from, to })))) : "";
  return `${templateBase(id)}/site/preview.html${hash}`;
}

export { plan };

const STORE = (id: string) => `xp-template:${id}`;

export function loadValues(id: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORE(id)) || "{}");
  } catch {
    return {};
  }
}

export function saveValues(id: string, v: Record<string, string>) {
  try {
    localStorage.setItem(STORE(id), JSON.stringify(v));
  } catch {
    /* private mode: the values just are not remembered */
  }
}

function readme(t: TemplateInfo, values: Record<string, string>, which: "site" | "source") {
  const name = values.name?.trim() || t.name;
  const run =
    which === "site"
      ? "This folder is the finished site. Upload all of it to any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages) or open index.html."
      : t.kind === "vite"
        ? "Install and run:\n\n    npm install\n    npm run dev\n\nBuild the site with `npm run build`; the result is in dist/."
        : "The site is index.html and the files next to it. Open it, or upload the folder to any static host.";
  const remote = t.remoteAssets.length
    ? `\n\nSome pictures or video load from other hosts:\n\n${t.remoteAssets.map((u) => `- ${u}`).join("\n")}\n\nCopy them next to index.html and point the page at the copies before launch, so the site does not depend on those hosts.`
    : "";
  return `# ${name}\n\nMade with Site Builder from the ${t.name} template.\n\n${run}${remote}\n\nTemplate: ${t.name}, supplied by ${t.licence.holder}. ${t.licence.note}\n`;
}

/** A zip of the built site or of the source, with the person's words and pictures in place. */
export async function templateZip(t: TemplateInfo, values: Record<string, string>, which: "site" | "source"): Promise<Blob> {
  const base = templateBase(t.id);
  const list: { site: string[]; source: string[] } = await fetch(`${base}/files.json`).then((r) => r.json());
  const reps = plan(t.slots, values);
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  await Promise.all(
    list[which].map(async (p) => {
      const res = await fetch(`${base}/${which}/${p.split("/").map(encodeURIComponent).join("/")}`);
      if (!res.ok) throw new Error(`Could not read ${p}`);
      if (fileKind(p)) zip.file(p, applyToText(p, await res.text(), reps));
      else zip.file(p, await res.arrayBuffer());
    }),
  );
  zip.file(which === "site" ? "README.txt" : "README.md", readme(t, values, which));
  if (which === "source" && t.kind === "vite") zip.file(".gitignore", "node_modules/\ndist/\n.env*\n!.env.example\n");
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

export const zipName = (t: TemplateInfo, values: Record<string, string>, which: "site" | "source") =>
  `${(values.name?.trim() || t.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || t.id}-${which}.zip`;
