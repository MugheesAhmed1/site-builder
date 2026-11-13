// Element edits: everything a person changed by clicking it in the builder that is not one
// of their words or photos. A text colour, a section background, a swapped icon, a recoloured
// character, a hidden badge, a button link. They live in design.edits as plain data:
//
//   { "#pf-services|h3.pf-h3|2": { color: "#C2410C", size: 1.2 }, ... }
//
// The key says where the element is (the section it sits in, what kind of element it is and
// which one of those, counted from the top), so it survives a rebuild of the words. The same
// code runs in the builder's preview and in the downloaded site, so what you see is what ships.
import { useEffect } from "react";

// ------------------------------------------------------------------ icons
// A small free icon set drawn for this project (24 by 24, round stroke). People can swap any
// icon or vector on the page for one of these, or upload their own.
export const EDIT_ICONS = {
  star: "M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.8L12 3.5z",
  heart: "M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.500 15.4 12 20 12 20z",
  check: "M5 12.5l4.5 4.5L19 7.5",
  "check-circle": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12.3l2.7 2.7L16 9.500",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  "arrow-up": "M7 17 17 7M9 7h8v8",
  bolt: "M13 3 5 13.500h6l-1 7.500 8-10.500h-6l1-7.500z",
  sparkle: "M12 3v5m0 8v5M3 12h5m8 0h5M6 6l3 3m6 6 3 3m0-12-3 3m-6 6-3 3",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2.500v2M12 19.500v2M2.500 12h2M19.500 12h2M5.300 5.300l1.400 1.400M17.300 17.300l1.400 1.400M18.700 5.300l-1.400 1.400M6.700 17.300l-1.400 1.400",
  moon: "M20 14.500A8 8 0 0 1 9.500 4a8 8 0 1 0 10.500 10.500z",
  leaf: "M5 19c0-8 5-13 14-14 0 9-5 14-13 14M5 19c2-4 5-7 9-9",
  flower: "M12 9.500a2.500 2.500 0 1 0 0 5 2.500 2.500 0 0 0 0-5zM12 9.500c-2-3-1-6 0-6s2 3 0 6zM12 14.500c2 3 1 6 0 6s-2-3 0-6zM9.500 12c-3 2-6 1-6 0s3-2 6 0zM14.500 12c3-2 6-1 6 0s-3 2-6 0z",
  drop: "M12 3.500s6 6.300 6 10.500a6 6 0 0 1-12 0c0-4.200 6-10.500 6-10.500z",
  flame: "M12 21c-3.500 0-6-2.500-6-6 0-3 2-4.500 3-7 2 1 2.500 3 2.500 3 .500-2.500 0-5.500 1.500-8 1 3.500 5 6 5 12 0 3.500-2.500 6-6 6z",
  home: "M4 11 12 4l8 7M6 9.500V20h12V9.500M10 20v-5h4v5",
  pin: "M12 21s6.500-6 6.500-11a6.500 6.500 0 0 0-13 0c0 5 6.500 11 6.500 11zM12 12.500a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5z",
  phone: "M5 4h4l1.500 4.500-2 1.500a11 11 0 0 0 5.500 5.500l1.500-2L20 15v4a1.500 1.500 0 0 1-1.500 1.500C10.500 20.500 3.500 13.500 3.500 5.500A1.500 1.500 0 0 1 5 4z",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  chat: "M4 5h16v11H9l-5 4V5z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.500 2",
  calendar: "M4 6h16v14H4zM4 10h16M8 3.500v4M16 3.500v4",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.500 20.500c.800-4 3.800-6 7.500-6s6.700 2 7.500 6",
  users: "M9 11.500a3.500 3.500 0 1 0 0-7 3.500 3.500 0 0 0 0 7zM2.500 20c.600-3.500 3.200-5.500 6.500-5.500s5.900 2 6.500 5.500M16 4.800a3.500 3.500 0 0 1 0 6.400M18 14.800c1.900.700 3.100 2.500 3.500 5.200",
  briefcase: "M4 8h16v11H4zM9 8V5.500h6V8M4 13h16",
  cart: "M3.500 5h2.500l2 10h9.500l2-7.500H7M9.500 19.500a1 1 0 1 0 0-.100M17 19.500a1 1 0 1 0 0-.100",
  bag: "M6 8h12l1 12H5L6 8zM9 8V7a3 3 0 0 1 6 0v1",
  tag: "M4 4h7l9 9-7 7-9-9V4zM8 8.200a.300.300 0 1 0 0-.100",
  gift: "M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0",
  cup: "M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V8zM16 9.500h1.500a2.500 2.500 0 0 1 0 5H16M8 3.500v2M12 3.500v2",
  fork: "M7 3.500v6a2 2 0 0 0 2 2v9M11 3.500v6a2 2 0 0 1-2 2M9 3.500v5M16 20.500v-17c2.500 1.500 3 5 3 8h-3",
  camera: "M4 8h3.500l1.500-2.500h6L16.500 8H20v11H4zM12 16.500a3.500 3.500 0 1 0 0-7 3.500 3.500 0 0 0 0 7z",
  image: "M4 5h16v14H4zM4 16l4.500-4.500 4 4 2.500-2.500 5 5M15.500 9.500a1 1 0 1 0 0-.100",
  play: "M8 5.500v13l11-6.500-11-6.500z",
  music: "M9 18V6l10-2v12M9 18a2.500 2.500 0 1 1-5 0 2.500 2.500 0 0 1 5 0zM19 16a2.500 2.500 0 1 1-5 0 2.500 2.500 0 0 1 5 0z",
  pen: "M4 20h4L19 9l-4-4L4 16v4zM13.500 6.500l4 4",
  brush: "M14 4l6 6-8 8H8v-4l6-10zM4 20c2 0 4-1 4-2",
  code: "M8.500 7.500 4 12l4.500 4.500M15.500 7.500 20 12l-4.500 4.500M13.500 5l-3 14",
  screen: "M3.500 5h17v11h-17zM9 20h6M12 16v4",
  mobile: "M7.500 3.500h9v17h-9zM11 17.500h2",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
  chart: "M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6",
  trend: "M4 17l5-5 3.500 3.500L20 8M15 8h5v5",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16.500a4.500 4.500 0 1 0 0-9 4.500 4.500 0 0 0 0 9zM12 12.300a.300.300 0 1 0 0-.100",
  shield: "M12 3.500l7 2.500v5.500c0 4.500-3 7.500-7 9-4-1.500-7-4.500-7-9V6l7-2.500zM9 12l2.200 2.200L15 10.500",
  lock: "M6 11h12v9H6zM8.500 11V8a3.500 3.500 0 0 1 7 0v3",
  key: "M14.500 13.500a5 5 0 1 0-4-4L3.500 16.500v4h4v-2.500h2.500V15.500h2l2.500-2zM16.500 7.700a.300.300 0 1 0 0-.100",
  award: "M12 14.500a5.500 5.500 0 1 0 0-11 5.500 5.500 0 0 0 0 11zM8.500 13.500 7 21l5-2.500 5 2.500-1.500-7.500",
  rocket: "M12 15.500 8.500 12c1-5 4-8 9.500-8.500C17.500 9 14.500 12 12 15.500zM8.500 12 5 12.500l2-3M12 15.500l-.500 3.500 3-2M6.500 17.500c-1 .500-2 2-2 3 1 0 2.500-1 3-2",
  bulb: "M9 17.500h6M10 20.500h4M8.500 14.500A6 6 0 1 1 15.500 14.500c-.500.500-.500 1.500-.500 3h-6c0-1.500 0-2.500-.500-3z",
  wrench: "M14.500 6.500a4.500 4.500 0 0 0-5.800 5.800L3.500 17.500l3 3 5.200-5.200a4.500 4.500 0 0 0 5.800-5.800l-3 3-2.500-2.500 3-3-.500-.500z",
  truck: "M3 6.500h11v10H3zM14 10h4l3 3v3.500h-7M7 19a1.500 1.500 0 1 0 0-.100M17.500 19a1.500 1.500 0 1 0 0-.100",
  car: "M4 16.500v-4l2-5h12l2 5v4M4 16.500h16M4 16.500v2.500M20 16.500v2.500M4.500 12h15M7.500 14.300a.300.300 0 1 0 0-.100M16.500 14.300a.300.300 0 1 0 0-.100",
  plane: "M3.500 13.500 20.500 4l-4 16.500-4.500-6-8.500-1zM12 14.500l8.500-10.500",
  tooth: "M7.500 4c-2.500 0-4 2-3.500 5 .500 3 1 4 1.500 7 .300 2 .800 4 2 4 1.500 0 1-5 2.500-5s1 5 2.500 5c1.200 0 1.700-2 2-4 .500-3 1-4 1.500-7 .500-3-1-5-3.500-5-1.500 0-1.500 1-2.500 1s-1-1-2.500-1z",
  cross: "M9.500 4h5v5.500H20v5h-5.500V20h-5v-5.500H4v-5h5.500V4z",
  dumbbell: "M3.500 9.500v5M6.500 7v10M17.500 7v10M20.500 9.500v5M6.500 12h11",
  paw: "M12 20c-3 0-5-1.500-5-3.500 0-2.500 3-5 5-5s5 2.500 5 5c0 2-2 3.500-5 3.500zM6.500 11a1.500 2 0 1 0 0-.100M10 7a1.500 2 0 1 0 0-.100M14 7a1.500 2 0 1 0 0-.100M17.500 11a1.500 2 0 1 0 0-.100",
  book: "M4 5.500c3-1 5.500-1 8 1 2.500-2 5-2 8-1v13c-3-1-5.500-1-8 1-2.500-2-5-2-8-1v-13zM12 6.500v13",
  cap: "M2.500 9.500 12 5l9.500 4.500L12 14 2.500 9.500zM6.500 11.500V16c1.500 1.500 3.500 2 5.500 2s4-.500 5.500-2v-4.500M21.500 9.500v5",
  scales: "M12 4v16M7 20h10M5 7h14M5 7l-2.500 6a2.500 2.500 0 0 0 5 0L5 7zM19 7l-2.500 6a2.500 2.500 0 0 0 5 0L19 7z",
  coins: "M9 13.500c3 0 5.500-1.300 5.500-3s-2.500-3-5.500-3-5.500 1.300-5.500 3 2.500 3 5.500 3zM3.500 10.500v4c0 1.700 2.500 3 5.500 3s5.500-1.300 5.500-3M14.500 8c3 .200 6 1.300 6 3v4c0 1.700-2.500 3-5.500 3",
  building: "M5 20.500v-16h9v16M14 9.500h5v11M3 20.500h18M8 8h3M8 11.500h3M8 15h3",
  scissors: "M6.500 9.500a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5zM6.500 19.500a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5zM8.500 8.500 20 18M8.500 15.500 20 6",
  smile: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.500 14c1 1.500 2.200 2 3.500 2s2.500-.500 3.500-2M9 9.700a.300.300 0 1 0 0-.100M15 9.700a.300.300 0 1 0 0-.100",
  thumb: "M7 20.500H4v-9h3zM7 11.500l4-8c1.500 0 2.500 1 2.500 2.500V9.500h5a1.500 1.500 0 0 1 1.500 1.800l-1.500 7.500a2 2 0 0 1-2 1.700H7",
  bell: "M6 16.500V11a6 6 0 0 1 12 0v5.500l1.500 2h-15l1.500-2zM10 20.500h4",
  search: "M10.500 17a6.500 6.500 0 1 0 0-13 6.500 6.500 0 0 0 0 13zM15.500 15.500l5 5",
  link: "M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1",
  layers: "M12 3.500 3.500 8l8.500 4.500L20.500 8 12 3.500zM3.500 12l8.500 4.500 8.500-4.500M3.500 16l8.500 4.500 8.500-4.500",
  cube: "M12 3.500 4 7.500v9l8 4 8-4v-9l-8-4zM4 7.500l8 4 8-4M12 11.500v9",
  wave: "M3 9c2.200-2.500 4.500-2.500 6 0s3.800 2.500 6 0 3.800-2.500 6 0M3 15c2.200-2.500 4.500-2.500 6 0s3.800 2.500 6 0 3.800-2.500 6 0",
  mountain: "M3 19.500 9.500 7l4 7 2.500-3.500 5 9H3z",
  infinity: "M7.500 8.500c-5 0-5 7 0 7 3.500 0 5.500-7 9-7 5 0 5 7 0 7-3.500 0-5.500-7-9-7z",
};

export const EDIT_ICON_IDS = Object.keys(EDIT_ICONS);

export function iconSvg(id, size) {
  const d = EDIT_ICONS[id];
  if (!d) return "";
  const s = size ? ` width="${size}" height="${size}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"${s} fill="none" stroke="currentColor" stroke-width="1.700" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
}

// ------------------------------------------------------------------ keys

// Classes that come and go while the page runs; they must never be part of a key.
const STATE = /^(is-|has-|pe-|px-|in-)|^(pf-reveal|pf-enter|pf-in|active|open)$/;
const PLAIN = /^[A-Za-z_][\w-]*$/;
const OWN = ":not([data-pe-own]):not([data-pe-own] *)";

function stableClass(el) {
  const list = el.classList || [];
  for (let i = 0; i < list.length; i++) if (!STATE.test(list[i]) && PLAIN.test(list[i])) return list[i];
  return "";
}

function selectorOf(el) {
  const tag = el.tagName.toLowerCase();
  const cls = stableClass(el);
  return cls ? tag + "." + cls : tag;
}

function anchorOf(el, root) {
  let n = el;
  while (n && n !== root) {
    if (n.id && /^pf-[\w-]+$/.test(n.id)) return { el: n, sel: "#" + n.id };
    const tag = n.tagName.toLowerCase();
    if (tag === "header" || tag === "footer" || tag === "nav") {
      const sel = selectorOf(n);
      // Only if that selector leads back to this exact element.
      if (root.querySelector(sel) === n) return { el: n, sel };
    }
    n = n.parentElement;
  }
  return { el: root, sel: "" };
}

/** The key of an element inside a site root, or "" when it cannot be addressed. */
export function editKey(el, root) {
  if (!el || !root || !root.contains(el)) return "";
  if (el === root) return "|.|0";
  if (el.closest && el.closest("[data-pe-own]")) return "";
  const a = anchorOf(el, root);
  if (a.el === el) return a.sel + "|.|0";
  const sel = selectorOf(el);
  const all = a.el.querySelectorAll(sel + OWN);
  const n = Array.prototype.indexOf.call(all, el);
  return n < 0 ? "" : a.sel + "|" + sel + "|" + n;
}

/** The element a key points at, or null when the page no longer has it. */
export function editFind(root, key) {
  if (!root || typeof key !== "string") return null;
  const parts = key.split("|");
  if (parts.length !== 3) return null;
  const [anchor, sel, n] = parts;
  let base = root;
  try {
    if (anchor) base = root.querySelector(anchor);
    if (!base) return null;
    if (sel === ".") return base;
    return base.querySelectorAll(sel + OWN)[Number(n)] || null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ css

const HEX = /^#[0-9a-f]{3,8}$/i;

/** Keeps a colour or gradient value from breaking out of its CSS rule. */
export function cleanCss(v) {
  return String(v == null ? "" : v)
    .replace(/[;{}<>\\]/g, "")
    .replace(/\/\*|\*\//g, "")
    .replace(/url\s*\(/gi, "")
    .replace(/expression\s*\(/gi, "")
    .trim()
    .slice(0, 400);
}

/** Only pictures: a data picture, an https link or a file of the site itself. */
export function cleanSrc(v) {
  const s = String(v == null ? "" : v).trim();
  if (/^data:image\/(png|jpe?g|webp|gif|avif|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(s)) return s;
  if (/^https?:\/\/[^\s"'()<>\\]+$/i.test(s)) return s;
  if (/^\.?\/[\w./-]+$/.test(s) && !s.includes("..")) return s;
  return "";
}

/** Only links people can follow safely. */
export function cleanHref(v) {
  const s = String(v == null ? "" : v).trim();
  if (/^(https?:\/\/|mailto:|tel:|#|\/|\.\/)/i.test(s) && !/[\s"'<>\\]/.test(s)) return s;
  if (/^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(s) && !/["'<>\\]/.test(s)) return "https://" + s;
  return "";
}

const num = (v, a, b, fb) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : fb;
};

/** The CSS declarations for one element's edit. `kind` is "text", "media" (img, svg, canvas, video) or "box". */
export function editCss(e, kind = "box") {
  if (!e || typeof e !== "object") return "";
  const out = [];
  const media = kind === "media";
  if (e.hide) out.push("display:none!important");
  if (e.color) {
    const c = cleanCss(e.color);
    if (c) out.push(`color:${c}!important`, `-webkit-text-fill-color:${c}!important`);
  }
  const img = e.bgImage ? cleanSrc(e.bgImage) : "";
  if (img) {
    const dim = num(e.bgDim, 0, 0.9, 0);
    const veil = dim ? `linear-gradient(rgba(0,0,0,${dim}),rgba(0,0,0,${dim})),` : "";
    out.push(`background:${veil}url("${img}") center/${e.bgFit === "contain" ? "contain" : "cover"} no-repeat!important`);
  } else if (e.bg) {
    const c = cleanCss(e.bg);
    if (c) out.push(`background:${c}!important`);
  }
  if (e.border) {
    const c = cleanCss(e.border);
    if (c) out.push(`border-color:${c}!important`);
  }
  if (e.size != null && Number(e.size) !== 1) {
    const s = num(e.size, 0.3, 4, 1);
    if (media) out.push(`width:calc(var(--pe-w, 100%) * ${s})!important`, `height:calc(var(--pe-h, auto) * ${s})!important`, "max-width:none!important");
    else out.push(`font-size:calc(var(--pe-fs, 1em) * ${s})!important`);
  }
  if (e.weight) out.push(`font-weight:${num(e.weight, 100, 900, 400)}!important`);
  if (e.italic != null) out.push(`font-style:${e.italic ? "italic" : "normal"}!important`);
  if (e.underline != null) out.push(`text-decoration:${e.underline ? "underline" : "none"}!important`);
  if (e.caps != null) out.push(`text-transform:${e.caps ? "uppercase" : "none"}!important`);
  if (e.align && /^(left|center|right)$/.test(e.align)) out.push(`text-align:${e.align}!important`);
  if (e.spacing != null) out.push(`letter-spacing:${num(e.spacing, -0.1, 0.5, 0)}em!important`);
  if (e.radius != null) out.push(`border-radius:${num(e.radius, 0, 999, 0)}px!important`);
  if (e.pad != null) out.push(`padding:${num(e.pad, 0, 200, 0)}px!important`);
  if (e.opacity != null && Number(e.opacity) !== 1) out.push(`opacity:${num(e.opacity, 0, 1, 1)}!important`);
  if (e.fit && /^(cover|contain)$/.test(e.fit)) out.push(`object-fit:${e.fit}!important`);
  const f = [];
  if (e.tint) f.push(`hue-rotate(${num(e.tint, -180, 180, 0)}deg)`);
  if (e.sat != null && Number(e.sat) !== 1) f.push(`saturate(${num(e.sat, 0, 3, 1)})`);
  if (e.bright != null && Number(e.bright) !== 1) f.push(`brightness(${num(e.bright, 0.2, 2, 1)})`);
  if (e.blur) f.push(`blur(${num(e.blur, 0, 40, 0)}px)`);
  if (f.length) out.push(`filter:${f.join(" ")}!important`);
  return out.join(";");
}

/** True when an edit says nothing, so it can be dropped. */
export function isEmptyEdit(e) {
  if (!e) return true;
  return !Object.keys(e).some((k) => {
    const v = e[k];
    if (v == null || v === "" || v === false) return false;
    if ((k === "size" || k === "opacity" || k === "sat" || k === "bright") && Number(v) === 1) return false;
    if ((k === "tint" || k === "blur" || k === "bgDim") && Number(v) === 0) return false;
    return true;
  });
}

/** Sets or clears fields of one element's edit and returns the new edits map. */
export function patchEdits(edits, key, patch) {
  const next = { ...(edits || {}) };
  const e = { ...(next[key] || {}), ...patch };
  for (const k of Object.keys(e)) if (e[k] == null || e[k] === "") delete e[k];
  if (isEmptyEdit(e)) delete next[key];
  else next[key] = e;
  return next;
}

// ------------------------------------------------------------------ applying

const MEDIA = /^(img|svg|canvas|video|picture)$/;
let uid = 0;

function kindOf(el) {
  return MEDIA.test(el.tagName.toLowerCase()) ? "media" : "box";
}

function ownText(el) {
  const out = [];
  for (const n of el.childNodes) if (n.nodeType === 3) out.push(n);
  return out;
}

/** The words an element holds itself (not the words of elements inside it). */
export function ownWords(el) {
  return ownText(el)
    .map((n) => n.nodeValue)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function setText(el, text, memo) {
  let nodes = ownText(el).filter((n) => n.nodeValue.trim() || n.__pe);
  if (!nodes.length) {
    if (el.children.length) return;
    const t = el.ownerDocument.createTextNode("");
    t.__pe = true;
    el.appendChild(t);
    nodes = [t];
  }
  if (!memo.text) memo.text = nodes.map((n) => [n, n.nodeValue]);
  if (nodes[0].nodeValue !== text) nodes[0].nodeValue = text;
  for (let i = 1; i < nodes.length; i++) if (nodes[i].nodeValue !== "") nodes[i].nodeValue = "";
}

function restore(el, memo, what) {
  if (what.text && memo.text) {
    for (const [n, v] of memo.text) if (n.nodeValue !== v) n.nodeValue = v;
    delete memo.text;
  }
  if (what.src && memo.src !== undefined) {
    if (memo.src === null) el.removeAttribute("src");
    else el.setAttribute("src", memo.src);
    if (memo.srcset) el.setAttribute("srcset", memo.srcset);
    delete memo.src;
    delete memo.srcset;
  }
  if (what.href && memo.href !== undefined) {
    if (memo.href === null) el.removeAttribute("href");
    else el.setAttribute("href", memo.href);
    delete memo.href;
  }
  if (what.icon && memo.icon) {
    memo.icon.remove();
    delete memo.icon;
    delete memo.iconSig;
  }
}

/**
 * Applies a map of edits to a site root. Safe to call again and again: it only touches what
 * differs. Returns a function that removes everything it did.
 */
export function createEdits(root) {
  const doc = root.ownerDocument;
  const id = "pe" + ++uid;
  const style = doc.createElement("style");
  style.setAttribute("data-pe-style", id);
  doc.head.appendChild(style);
  root.setAttribute("data-pe-root", id);
  const memos = new Map(); // element -> what we changed on it
  let css = "";

  const apply = (edits) => {
    const entries = Object.entries(edits || {}).filter(([, e]) => !isEmptyEdit(e));
    // Unmark first so sizes are measured without our own rules.
    root.querySelectorAll("[data-pe]").forEach((el) => el.removeAttribute("data-pe"));
    if (root.hasAttribute("data-pe")) root.removeAttribute("data-pe");
    const rules = [];
    const seen = new Set();
    const editing = root.classList.contains("pf-is-editing");
    entries.forEach(([key, e], i) => {
      const el = editFind(root, key);
      if (!el) return;
      seen.add(el);
      let memo = memos.get(el);
      if (!memo) memos.set(el, (memo = {}));
      const kind = kindOf(el);
      const tag = el.tagName.toLowerCase();
      const view = doc.defaultView;

      if (e.size != null && Number(e.size) !== 1 && view) {
        const cs = view.getComputedStyle(el);
        if (kind === "media") {
          const w = parseFloat(cs.width);
          const h = parseFloat(cs.height);
          if (w > 0) el.style.setProperty("--pe-w", w + "px");
          if (h > 0) el.style.setProperty("--pe-h", h + "px");
        } else el.style.setProperty("--pe-fs", cs.fontSize);
      }

      // Words that are not part of the person's content (a label, a badge, a widget).
      if (typeof e.text === "string") setText(el, e.text, memo);
      else restore(el, memo, { text: 1 });

      // A different picture.
      const src = e.src ? cleanSrc(e.src) : "";
      if (src && (tag === "img" || tag === "video")) {
        if (memo.src === undefined) {
          memo.src = el.getAttribute("src");
          memo.srcset = el.getAttribute("srcset") || "";
        }
        if (el.getAttribute("src") !== src) el.setAttribute("src", src);
        if (el.hasAttribute("srcset")) el.removeAttribute("srcset");
      } else restore(el, memo, { src: 1 });

      // Where a button or link goes.
      const href = e.href ? cleanHref(e.href) : "";
      if (href && tag === "a") {
        if (memo.href === undefined) memo.href = el.getAttribute("href");
        if (el.getAttribute("href") !== href) el.setAttribute("href", href);
      } else restore(el, memo, { href: 1 });

      // A different icon or vector: the original is hidden and ours sits right after it.
      const iconSrc = e.iconSrc ? cleanSrc(e.iconSrc) : "";
      const wantIcon = (e.icon && EDIT_ICONS[e.icon]) || iconSrc;
      let hideOriginal = false;
      if (wantIcon && kind === "media") {
        const sig = (e.icon || "") + "|" + iconSrc;
        if (!memo.icon || memo.iconSig !== sig || !memo.icon.isConnected || memo.icon.previousSibling !== el) {
          if (memo.icon) memo.icon.remove();
          let w = 24;
          let h = 24;
          if (view) {
            const cs = view.getComputedStyle(el);
            w = parseFloat(cs.width) || w;
            h = parseFloat(cs.height) || h;
          }
          const box = doc.createElement("i");
          box.setAttribute("data-pe-own", "");
          box.setAttribute("aria-hidden", "true");
          box.className = "pe-icon";
          box.style.cssText = `display:inline-flex;width:${Math.round(w)}px;height:${Math.round(h)}px;flex:none;vertical-align:middle;font-style:normal`;
          if (iconSrc) {
            const im = doc.createElement("img");
            im.src = iconSrc;
            im.alt = "";
            im.style.cssText = "width:100%;height:100%;object-fit:contain;display:block";
            box.appendChild(im);
          } else {
            box.innerHTML = iconSvg(e.icon);
            const sv = box.firstChild;
            if (sv && sv.style) sv.style.cssText = "width:100%;height:100%;display:block";
          }
          el.parentNode.insertBefore(box, el.nextSibling);
          memo.icon = box;
          memo.iconSig = sig;
        }
        memo.icon.setAttribute("data-pe-for", String(i));
        hideOriginal = true;
      } else restore(el, memo, { icon: 1 });

      el.setAttribute("data-pe", String(i));
      const me = `[data-pe-root="${id}"] [data-pe="${i}"],[data-pe-root="${id}"][data-pe="${i}"]`;
      // In the builder a hidden element stays as a ghost so it can be brought back.
      const shown = e.hide && editing ? { ...e, hide: false } : e;
      const body = editCss(shown, kind);
      if (hideOriginal) {
        rules.push(`${me}{display:none!important}`);
        const rest = editCss({ ...shown, size: undefined }, "box");
        const s = e.size != null && Number(e.size) !== 1 ? `scale:${num(e.size, 0.3, 4, 1)};` : "";
        if (rest || s) rules.push(`[data-pe-root="${id}"] [data-pe-for="${i}"]{${s}${rest}}`);
      } else if (body) rules.push(`${me}{${body}}`);
      if (e.hide && editing) rules.push(`${me}{opacity:.28!important;outline:2px dashed currentColor!important;outline-offset:2px}`);
    });
    // Put back anything whose edit has gone.
    for (const [el, memo] of memos) {
      if (seen.has(el)) continue;
      restore(el, memo, { text: 1, src: 1, href: 1, icon: 1 });
      if (el.style) {
        el.style.removeProperty("--pe-fs");
        el.style.removeProperty("--pe-w");
        el.style.removeProperty("--pe-h");
      }
      memos.delete(el);
    }
    const next = rules.join("\n");
    if (next !== css) style.textContent = css = next;
  };

  const destroy = () => {
    apply({});
    style.remove();
    root.removeAttribute("data-pe-root");
  };
  return { apply, destroy };
}

/** Keeps a site's element edits applied while the page renders, animates and resizes. */
export function useEdits(rootRef, edits, editing) {
  const sig = JSON.stringify(edits || {});
  useEffect(() => {
    const root = rootRef.current;
    const map = JSON.parse(sig);
    if (!root || !Object.keys(map).length) return;
    const fx = createEdits(root);
    let raf = 0;
    const run = () => {
      raf = 0;
      fx.apply(map);
    };
    const later = () => {
      if (!raf) raf = requestAnimationFrame(run);
    };
    fx.apply(map);
    const mo = new MutationObserver(later);
    mo.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["src", "href", "id"] });
    window.addEventListener("resize", later);
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      window.removeEventListener("resize", later);
      fx.destroy();
    };
  }, [rootRef, sig, editing]);
}
