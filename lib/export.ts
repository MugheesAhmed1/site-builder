"use client";

import JSZip from "jszip";
import { TEMPLATE_FILES } from "./template-files";
import { palette, resolveScheme } from "@/template/src/theme.js";
import type { PortfolioContent, Project, WebsiteContent } from "./types";

// Builds the downloadable React (Vite) project: the template files plus this
// site's kind, design system and content in src/site-data.json.

export function slug(s: string) {
  return (s || "site").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "site";
}

function esc(s: string) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

export function siteName(p: Project) {
  if (!p.content) return p.name;
  return p.kind === "website" ? (p.content as WebsiteContent).brand.name : (p.content as PortfolioContent).hero.name;
}

export async function downloadZip(p: Project) {
  if (!p.content) return;
  const zip = new JSZip();
  const base = slug(siteName(p)) + (p.kind === "website" ? "-site" : "-portfolio");
  const folder = zip.folder(base)!;
  for (const [path, text] of Object.entries(TEMPLATE_FILES)) {
    let out = text;
    if (path === "index.html") {
      out = out
        .replace("%SITE_TITLE%", esc(p.content.meta.title || siteName(p)))
        .replace("%SITE_DESCRIPTION%", esc(p.content.meta.description))
        .replace("%SITE_THEME%", esc(palette(p.design, resolveScheme(p.design, false)).bg));
    }
    if (path === "package.json") out = out.replace('"my-site"', JSON.stringify(base));
    folder.file(path, out);
  }
  // Pictures uploaded or pasted in the builder become real files in public/images.
  let n = 0;
  const content = JSON.parse(JSON.stringify(p.content), (_k, v) => {
    if (typeof v !== "string") return v;
    const m = v.match(/^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/);
    if (!m) return v;
    const name = `images/picture-${++n}.${m[1] === "jpeg" ? "jpg" : m[1]}`;
    folder.file("public/" + name, m[2], { base64: true });
    return "/" + name;
  });
  folder.file("src/site-data.json", JSON.stringify({ kind: p.kind, design: p.design, content }, null, 2));
  const blob = await zip.generateAsync({ type: "blob" });
  saveBlob(blob, base + ".zip");
}

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
