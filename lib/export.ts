"use client";

import JSZip from "jszip";
import { TEMPLATE_FILES } from "./template-files";
import type { PortfolioProject } from "./types";

// Builds the downloadable React (Vite) project: the template files plus this
// person's design and content in src/portfolio-data.json.

function slug(s: string) {
  return (s || "portfolio").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "portfolio";
}

function esc(s: string) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

export async function downloadZip(p: PortfolioProject) {
  if (!p.content) return;
  const zip = new JSZip();
  const folder = zip.folder(slug(p.content.hero.name) + "-portfolio")!;
  for (const [path, text] of Object.entries(TEMPLATE_FILES)) {
    let out = text;
    if (path === "index.html") {
      out = out
        .replace("%PORTFOLIO_TITLE%", esc(p.content.meta.title || p.content.hero.name))
        .replace("%PORTFOLIO_DESCRIPTION%", esc(p.content.meta.description))
        .replace("%PORTFOLIO_THEME%", esc(p.design.colors.bg));
    }
    if (path === "package.json") out = out.replace('"my-portfolio"', JSON.stringify(slug(p.content.hero.name) + "-portfolio"));
    folder.file(path, out);
  }
  folder.file("src/portfolio-data.json", JSON.stringify({ design: p.design, content: p.content }, null, 2));
  const blob = await zip.generateAsync({ type: "blob" });
  saveBlob(blob, slug(p.content.hero.name) + "-portfolio.zip");
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
