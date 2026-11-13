"use client";

import { propPaths } from "@/template/src/props.js";
import { platePath } from "@/template/src/plates.js";
import { getMedia, mediaRefs, swapMedia } from "@/lib/media";
import { palette, resolveScheme } from "@/template/src/theme.js";
import { sceneAssets } from "@/template/src/scenes.js";
import type { PortfolioContent, Project, WebsiteContent } from "./types";
import { ART_LICENCE_FILE } from "@/template/src/library-art.js";

// Two downloads are built here from the same project:
// - "ready": a finished site (index.html, site.js, site.css, site-data.js and its pictures).
//   It needs no build step: unzip and upload the folder to any host. This is the default.
// - "source": the editable React (Vite) project, for people who want to change the code.
// Both carry the same search and sharing basics: an icon, a share picture, a description,
// business details for search engines and a robots.txt.

export type DownloadKind = "ready" | "source";

export function slug(s: string) {
  return (s || "site").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "site";
}

function esc(s: string) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function siteName(p: Project) {
  if (!p.content) return p.name;
  return p.kind === "website" ? (p.content as WebsiteContent).brand.name : (p.content as PortfolioContent).hero.name;
}

function initials(name: string) {
  const words = (name || "S").trim().split(/\s+/).filter(Boolean);
  const pick = words.length > 1 ? words[0][0] + words[1][0] : (words[0] || "S").slice(0, 1);
  return pick.toUpperCase();
}

// The site icon: the name's initials on the accent colour. An SVG stays sharp at any size.
export function faviconSvg(p: Project) {
  const pal = palette(p.design, resolveScheme(p.design, false));
  const text = initials(siteName(p));
  const r = Math.round(Math.min(32, Math.max(0, (p.design.radius ?? 12) * 1.6)));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="${r}" fill="${pal.accent}"/><text x="32" y="33" text-anchor="middle" dominant-baseline="central" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-weight="700" font-size="${text.length > 1 ? 28 : 36}" fill="${pal.onAccent}">${esc(text)}</text></svg>\n`;
}

function wrapLines(g: CanvasRenderingContext2D, text: string, max: number, limit: number) {
  const out: string[] = [];
  let line = "";
  for (const w of text.split(/\s+/)) {
    const next = line ? line + " " + w : w;
    if (g.measureText(next).width > max && line) {
      out.push(line);
      line = w;
      if (out.length === limit) break;
    } else line = next;
  }
  if (out.length < limit && line) out.push(line);
  else if (line && out.length === limit) out[limit - 1] = out[limit - 1].replace(/\s+\S*$/, "") + "…";
  return out;
}

// The picture that shows when the site's link is shared (1200 x 630), drawn in the
// site's own colours from its name and headline.
export async function sharePicture(p: Project): Promise<Blob | null> {
  if (typeof document === "undefined" || !p.content) return null;
  const pal = palette(p.design, resolveScheme(p.design, false));
  const c = document.createElement("canvas");
  c.width = 1200;
  c.height = 630;
  const g = c.getContext("2d");
  if (!g) return null;
  const name = siteName(p);
  const line = p.kind === "website" ? (p.content as WebsiteContent).hero.headline : (p.content as PortfolioContent).hero.role || (p.content as PortfolioContent).hero.tagline;
  g.fillStyle = pal.bg;
  g.fillRect(0, 0, 1200, 630);
  const glow = g.createRadialGradient(1000, 90, 0, 1000, 90, 620);
  glow.addColorStop(0, pal.accent + "55");
  glow.addColorStop(1, pal.accent + "00");
  g.fillStyle = glow;
  g.fillRect(0, 0, 1200, 630);
  g.fillStyle = pal.accent;
  g.fillRect(80, 86, 72, 10);
  const font = `"${p.design.fonts?.display || "system-ui"}", system-ui, -apple-system, "Segoe UI", sans-serif`;
  try {
    await document.fonts.load(`700 84px ${font}`);
  } catch {}
  g.textBaseline = "top";
  g.fillStyle = pal.text;
  g.font = `700 84px ${font}`;
  let y = 140;
  for (const l of wrapLines(g, name, 1040, 2)) {
    g.fillText(l, 80, y);
    y += 98;
  }
  g.fillStyle = pal.muted;
  g.font = `500 40px ${font}`;
  y += 14;
  for (const l of wrapLines(g, line || p.content.meta.description || "", 1040, 3)) {
    g.fillText(l, 80, y);
    y += 54;
  }
  return new Promise((res) => c.toBlob((b) => res(b), "image/png"));
}

const mail = (v: string) => (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v || "") ? v : undefined);
const phone = (v: string) => ((v || "").replace(/\D/g, "").length >= 6 ? v : undefined);

// Business details in the format search engines read (schema.org).
export function structuredData(p: Project) {
  if (!p.content) return null;
  if (p.kind === "website") {
    const c = p.content as WebsiteContent;
    const same = [c.contact.instagram, c.contact.facebook, c.contact.linkedin].filter((u) => /^https?:\/\//.test(u || ""));
    const hours = (c.visit?.hours || []).filter((h) => h.days && h.time).map((h) => `${h.days} ${h.time}`);
    return {
      "@context": "https://schema.org",
      "@type": c.visit?.address ? "LocalBusiness" : "Organization",
      name: c.brand.name,
      description: c.meta.description || undefined,
      address: c.visit?.address || undefined,
      telephone: phone(c.contact.phone),
      email: mail(c.contact.email),
      openingHours: hours.length ? hours : undefined,
      hasMap: /^https?:\/\//.test(c.visit?.mapUrl || "") ? c.visit.mapUrl : undefined,
      sameAs: same.length ? same : undefined,
    };
  }
  const c = p.content as PortfolioContent;
  const same = [c.contact.linkedin, c.contact.github, c.contact.website].filter((u) => /^https?:\/\//.test(u || ""));
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: c.hero.name,
    jobTitle: c.hero.role || undefined,
    description: c.meta.description || undefined,
    email: mail(c.contact.email),
    telephone: phone(c.contact.phone),
    address: c.hero.location || undefined,
    sameAs: same.length ? same : undefined,
  };
}

// Everything that goes inside <head> beyond the title and description. `base` is "" for the
// source project (files are served from the site root) and "." for the ready site, which
// uses relative links so it also works inside a sub-folder.
export function headTags(p: Project, base: "" | ".") {
  if (!p.content) return "";
  const title = esc(p.content.meta.title || siteName(p));
  const desc = esc(p.content.meta.description);
  const ld = structuredData(p);
  const fonts = p.design.fonts ? Array.from(new Set([p.design.fonts.display, p.design.fonts.body, p.design.fonts.mono])).filter(Boolean) : [];
  const fontsHref = fonts.length ? "https://fonts.googleapis.com/css2?" + fonts.map((f) => "family=" + encodeURIComponent(f).replace(/%20/g, "+") + ":wght@400;500;600;700").join("&") + "&display=swap" : "";
  return [
    `<link rel="icon" href="${base}/favicon.svg" type="image/svg+xml" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${desc}" />`,
    `<meta property="og:image" content="${base}/share.png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${desc}" />`,
    `<meta name="twitter:image" content="${base}/share.png" />`,
    // The fonts start loading with the page but never hold up the first paint: the page
    // shows in a fallback face and swaps when they arrive.
    fontsHref ? `<link rel="preload" as="style" href="${fontsHref}" />` : "",
    fontsHref ? `<link rel="stylesheet" href="${fontsHref}" media="print" onload="this.media='all'" />` : "",
    fontsHref ? `<noscript><link rel="stylesheet" href="${fontsHref}" /></noscript>` : "",
    ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>` : "",
  ]
    .filter(Boolean)
    .join("\n    ");
}

const ROBOTS = "User-agent: *\nAllow: /\n";

export function realAssets(p: Project): string[] {
  const out = new Set<string>(sceneAssets(p.design.scene));
  // The sphere and arc showpieces give picture-less tiles a cut-out from the real-life pack.
  if (p.design.showpiece === "sphere" || p.design.showpiece === "arc") {
    const cat = p.kind === "portfolio" ? "portfolio" : (p.content as WebsiteContent | null)?.brand?.category || p.category;
    for (const path of propPaths(cat)) out.add(path);
  }
  // Cinema openings and the glass call to action show a scene from public/real/cinema.
  const d = p.design;
  if (d.heroStyle === "cinema" || d.heroStyle === "scatter" || d.ctaStyle === "glass") {
    const role = p.kind === "portfolio" ? (p.content as PortfolioContent | null)?.hero?.role : undefined;
    const cat = p.kind === "portfolio" ? "portfolio" : (p.content as WebsiteContent | null)?.brand?.category || p.category;
    out.add(d.plate ? platePath(d.plate) : platePath(cat, role));
  }
  JSON.stringify([p.design, p.content], (_k, v) => {
    if (typeof v === "string" && /^\/real\/[\w/-]+\.webp$/.test(v)) out.add(v);
    return v;
  });
  // Pictures from the free public art library carry their open-source licence notice.
  if ([...out].some((f) => f.startsWith("/real/library/"))) out.add(ART_LICENCE_FILE);
  return [...out];
}

// Collects the site's own files (videos, pictures, real-life pack pictures) and returns the
// site data with every reference pointing at a real file. `prefix` is "/" or "./".
async function gather(p: Project, put: (path: string, data: Blob | string, base64?: boolean) => void, prefix: "/" | "./") {
  // Videos uploaded in the builder are copied out of the browser's storage into media/.
  let vn = 0;
  const vids = new Map<string, string>();
  for (const ref of mediaRefs([p.content, p.design.video])) {
    const b = await getMedia(ref);
    if (!b) continue;
    const ext = /webm/.test(b.type) ? "webm" : /quicktime/.test(b.type) ? "mov" : "mp4";
    const name = `media/video-${++vn}.${ext}`;
    put(name, b);
    vids.set(ref, prefix + name);
  }
  // Real-life pack pictures (a photoreal character, real fish or sprites) are files served by
  // the builder under /real; the download gets its own copy at the same path.
  for (const path of realAssets(p)) {
    const r = await fetch(path).catch(() => null);
    if (r && r.ok) put(path.slice(1), await r.blob());
  }
  // Pictures uploaded or pasted in the builder become real files in images/.
  let n = 0;
  const fix = (_k: string, v: unknown) => {
    if (typeof v !== "string") return v;
    const m = v.match(/^data:image\/(png|jpe?g|webp|gif|svg\+xml|avif);base64,(.+)$/);
    if (m) {
      const ext = m[1] === "jpeg" ? "jpg" : m[1] === "svg+xml" ? "svg" : m[1];
      const name = `images/picture-${++n}.${ext}`;
      put(name, m[2], true);
      return prefix + name;
    }
    if (prefix === "./" && /^\/(real|images|media)\//.test(v)) return "." + v;
    return v;
  };
  const content = JSON.parse(JSON.stringify(swapMedia(p.content, (r) => vids.get(r) || "")), fix);
  const design = JSON.parse(JSON.stringify(swapMedia(p.design, (r) => vids.get(r) || "")), fix);
  return { kind: p.kind, design, content };
}

// The picture the visitor sees first (the hero photo, or a real-life character), so the
// page can start fetching it before the script runs.
function firstPicture(data: { design: any; content: any }): string {
  const hero = data.content?.hero?.imageUrl || data.content?.hero?.photoUrl;
  if (typeof hero === "string" && /^\.\/(images|real)\//.test(hero)) return hero;
  const ch = data.design?.cast?.character?.src;
  return typeof ch === "string" && /^\.\/real\//.test(ch) ? ch : "";
}

// What the page shows before its script has arrived: the right background straight away and,
// on a slow connection, the name and headline in plain HTML. It only fades in after a short
// wait, so on a fast connection the real page simply appears with its own entrance. The
// script replaces it when it starts. Sites with an opening loader skip the words, because
// the loader is their first view.
function firstView(p: Project): { css: string; html: string } {
  const light = palette(p.design, resolveScheme(p.design, false));
  const dark = palette(p.design, resolveScheme(p.design, true));
  const differs = light.bg !== dark.bg;
  const h = p.content!.hero as { headline?: string; sub?: string; name?: string; tagline?: string; role?: string };
  const headline = h.headline || h.name || siteName(p);
  const sub = h.sub || h.tagline || h.role || "";
  const f = p.design.fonts;
  const stack = (name?: string) => (name ? `'${name.replace(/['"\\<>]/g, "")}',` : "") + "ui-sans-serif,system-ui,sans-serif";
  const css = [
    `html,body{margin:0;background:${light.bg}}`,
    `.first-view{min-height:100vh;min-height:100svh;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;gap:18px;padding:96px clamp(20px,6vw,88px);color:${light.text};font-family:${stack(f?.body)};opacity:0;animation:first-view .4s ease-out .7s forwards}`,
    `.first-view b{font-size:15px;font-weight:600;color:${light.accent}}`,
    `.first-view h1{margin:0;max-width:18ch;font-family:${stack(f?.display)};font-size:clamp(36px,7vw,76px);line-height:1.04;letter-spacing:-.02em;font-weight:600;text-wrap:balance}`,
    `.first-view p{margin:0;max-width:46ch;font-size:clamp(16px,2vw,19px);line-height:1.5;color:${light.muted}}`,
    `@keyframes first-view{to{opacity:1}}`,
    differs ? `@media (prefers-color-scheme:dark){html,body{background:${dark.bg}}.first-view{color:${dark.text}}.first-view b{color:${dark.accent}}.first-view p{color:${dark.muted}}}` : "",
  ].join("");
  const quiet = p.design.loader === "line" || p.design.intro;
  const html = quiet ? "" : `<div class="first-view"><b>${esc(siteName(p))}</b><h1>${esc(headline)}</h1>${sub && sub !== siteName(p) ? `<p>${esc(sub)}</p>` : ""}</div>`;
  return { css, html };
}

async function kitFile(name: string) {
  const r = await fetch("/site-kit/" + name, { cache: "no-cache" });
  if (!r.ok) throw new Error("The ready-to-host files could not be loaded (" + name + "). Check your connection and try again.");
  return r.text();
}

const READY_README = (name: string) => `${name}
${"=".repeat(Math.max(3, name.length))}

This folder is your finished website. It needs no installing and no building.

PUT IT ONLINE (free, about one minute)

  1. Netlify Drop: open https://app.netlify.com/drop and drag this whole folder onto the page.
     You get a live link straight away. Sign up (free) to keep it and add your own domain.
  2. Or Cloudflare Pages: Workers & Pages, Create, Pages, Upload assets, then drag this folder.
  3. Or any web host: upload everything in this folder to the public folder of your hosting.

LOOK AT IT FIRST

  Double-click index.html to open the site on your computer.

CHANGE SOMETHING LATER

  The easy way: open the builder again, edit, and download a fresh copy.
  By hand: every word and setting is in site-data.js. Edit it in any text editor and reload.
  Pictures are in the images folder; replace a file with one of the same name.

WHAT IS IN HERE

  index.html      the page, with its title, description and sharing details
  site.js         the site's code (already built)
  site.css        the site's styles
  site-3d.js      the 3D scenes (three.js), loaded only when one is shown
  site-data.js    your words, colours, fonts and motion settings
  favicon.svg     the small icon in the browser tab
  share.png       the picture shown when the link is shared
  robots.txt      tells search engines they may list the site
  images, media, real   your pictures and videos
`;

export async function buildZip(p: Project, kind: DownloadKind = "ready"): Promise<{ blob: Blob; name: string }> {
  if (!p.content) throw new Error("Finish the site step first.");
  // The zip library and the template source are only needed at this moment, so they load
  // here instead of with every page.
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const base = slug(siteName(p)) + (p.kind === "website" ? "-site" : "-portfolio");
  const folder = zip.folder(base)!;
  const title = esc(p.content.meta.title || siteName(p));
  const desc = esc(p.content.meta.description);
  const theme = esc(palette(p.design, resolveScheme(p.design, false)).bg);
  const share = await sharePicture(p).catch(() => null);
  const h = p.content.hero as { headline?: string; sub?: string; name?: string; tagline?: string };
  const fg = esc(palette(p.design, resolveScheme(p.design, false)).text);

  if (kind === "source") {
    const { TEMPLATE_FILES } = await import("./template-files");
    for (const [path, text] of Object.entries(TEMPLATE_FILES)) {
      let out = text;
      if (path === "index.html") {
        out = out.replace("%SITE_TITLE%", title).replace("%SITE_DESCRIPTION%", desc).replace("%SITE_THEME%", theme).replace("<!--SITE_HEAD-->", headTags(p, ""));
      }
      if (path === "package.json") out = out.replace('"my-site"', JSON.stringify(base));
      folder.file(path, out);
    }
    const data = await gather(p, (path, d, b64) => folder.file("public/" + path, d, b64 ? { base64: true } : undefined), "/");
    folder.file("public/favicon.svg", faviconSvg(p));
    folder.file("public/robots.txt", ROBOTS);
    if (share) folder.file("public/share.png", share);
    folder.file("src/site-data.json", JSON.stringify(data, null, 2));
  } else {
    const [js, css, js3d] = await Promise.all([kitFile("site.js"), kitFile("site.css"), kitFile("site-3d.js")]);
    const data = await gather(p, (path, d, b64) => folder.file(path, d, b64 ? { base64: true } : undefined), "./");
    const first = firstPicture(data);
    const shell = firstView(p);
    folder.file("site.js", js);
    folder.file("site.css", css);
    // The 3D scenes (three.js), fetched by the page only when a 3D scene is shown.
    folder.file("site-3d.js", js3d);
    folder.file("site-data.js", "// Your site's words, colours, fonts and motion settings. Edit and reload.\nwindow.__ASSET_BASE__ = \".\";\nwindow.__SITE_DATA__ = " + JSON.stringify(data, null, 2).replace(/<\/script/gi, "<\\/script") + ";\n");
    folder.file("favicon.svg", faviconSvg(p));
    folder.file("robots.txt", ROBOTS);
    if (share) folder.file("share.png", share);
    folder.file("README.txt", READY_README(siteName(p)));
    folder.file(
      "index.html",
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${desc}" />
    <meta name="theme-color" content="${theme}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    ${headTags(p, ".")}
    <link rel="stylesheet" href="./site.css" />${first ? `\n    <link rel="preload" as="image" href="${esc(first)}" fetchpriority="high" />` : ""}
    <style>${shell.css}</style>
  </head>
  <body>
    <div id="root">${shell.html}</div>
    <noscript><main style="max-width:40rem;margin:15vh auto;padding:0 24px;font-family:system-ui,sans-serif;color:${fg}"><h1>${esc(h.headline || h.name || siteName(p))}</h1><p>${esc(h.sub || h.tagline || p.content.meta.description)}</p><p>Turn on JavaScript to see the full site.</p></main></noscript>
    <script src="./site-data.js" defer></script>
    <script src="./site.js" defer></script>
  </body>
</html>
`
    );
  }
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  return { blob, name: base + (kind === "source" ? "-source" : "") + ".zip" };
}

export async function downloadZip(p: Project, kind: DownloadKind = "ready") {
  if (!p.content) return;
  const { blob, name } = await buildZip(p, kind);
  saveBlob(blob, name);
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
