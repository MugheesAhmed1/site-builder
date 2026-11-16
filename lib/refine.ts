import type { SiteContent } from "./types";

// Optional refinement with Google Gemini. The builder works without it: every word is still
// written by rules from the person's answers. When the server has a GEMINI_API_KEY, the
// "AI polish" panel can send the site's words (never links, emails, phone numbers, prices or
// pictures) to /api/refine and get better ones back. The person sees each change before it
// lands, and one Undo takes it all back.
//
// This file is shared by the server route and the browser, so it holds no secrets and makes
// no network calls of its own.

export type RefineTask = "polish" | "headline" | "faq" | "direct";
export type RefineTone = "keep" | "warmer" | "bolder" | "professional" | "playful" | "shorter";

export const TONES: { id: RefineTone; label: string }[] = [
  { id: "keep", label: "Keep my tone" },
  { id: "warmer", label: "Warmer" },
  { id: "bolder", label: "Bolder" },
  { id: "professional", label: "More professional" },
  { id: "playful", label: "More playful" },
  { id: "shorter", label: "Shorter" },
];

// Paths of words worth refining. A trailing ".*" walks an array of strings or objects; for
// objects only the listed keys are taken. Everything else (links, contact details, prices,
// numbers, names of people and the business) is never sent.
const COPY_FIELDS: Record<string, string[]> = {
  "hero.kicker": [],
  "hero.headline": [],
  "hero.sub": [],
  "hero.tagline": [],
  "hero.intro": [],
  "hero.primaryCta": [],
  "hero.secondaryCta": [],
  "about.heading": [],
  "about.paragraphs.*": [],
  "services.*": ["description"],
  "process.*": ["title", "description"],
  "projects.*": ["summary", "impact"],
  "experience.*": ["summary"],
  "faq.*": ["question", "answer"],
  "custom.*": [],
  "cta.heading": [],
  "cta.text": [],
  "cta.button": [],
  "contact.heading": [],
  "contact.blurb": [],
  "gallery.*": ["caption"],
  "highlights.*": ["label"],
};

const MAX_FIELD = 600;
const MAX_FIELDS = 80;

type Bag = Record<string, unknown>;
const isObj = (v: unknown): v is Bag => !!v && typeof v === "object" && !Array.isArray(v);

function getPath(root: unknown, path: string[]): unknown {
  let cur: unknown = root;
  for (const k of path) {
    if (Array.isArray(cur)) cur = cur[Number(k)];
    else if (isObj(cur)) cur = cur[k];
    else return undefined;
  }
  return cur;
}

// The words of a site, flattened to { "hero.headline": "…", "services.0.description": "…" }.
export function collectCopy(content: SiteContent): Record<string, string> {
  const out: Record<string, string> = {};
  const add = (key: string, v: unknown) => {
    if (typeof v !== "string") return;
    const t = v.trim();
    if (!t || t.length > MAX_FIELD || /^(https?:|mailto:|tel:|#)/i.test(t)) return;
    if (Object.keys(out).length >= MAX_FIELDS) return;
    out[key] = t;
  };
  for (const [pattern, keys] of Object.entries(COPY_FIELDS)) {
    if (!pattern.endsWith(".*")) {
      add(pattern, getPath(content, pattern.split(".")));
      continue;
    }
    const base = pattern.slice(0, -2);
    const list = getPath(content, base.split("."));
    if (!Array.isArray(list)) continue;
    list.forEach((item, i) => {
      if (typeof item === "string") add(`${base}.${i}`, item);
      else if (isObj(item)) {
        if (base === "custom") {
          add(`custom.${i}.title`, item.title);
          if (Array.isArray(item.items)) item.items.forEach((it, j) => isObj(it) && (add(`custom.${i}.items.${j}.title`, it.title), add(`custom.${i}.items.${j}.text`, it.text)));
        } else for (const k of keys) add(`${base}.${i}.${k}`, item[k]);
      }
    });
  }
  return out;
}

const ALLOWED = (() => {
  const res = Object.entries(COPY_FIELDS).map(([p, keys]) => {
    const esc = p.replace(/\./g, "\\.").replace(/\\\.\*$/, "\\.\\d+");
    if (p === "custom.*") return new RegExp("^custom\\.\\d+\\.(title|items\\.\\d+\\.(title|text))$");
    return new RegExp("^" + esc + (keys.length ? "\\.(" + keys.join("|") + ")" : "") + "$");
  });
  return (key: string) => res.some((r) => r.test(key));
})();

// Clean one suggestion: plain text, no dashes the house style avoids, sane length.
export function cleanText(s: string, max = MAX_FIELD): string {
  return s
    .replace(/[—–]/g, ", ")
    .replace(/\s+,/g, ",")
    .replace(/[*_`#>]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max);
}

// Write suggested words back into a copy of the content. Only keys that were offered, and
// only where a string already lives, are touched; anything else in the reply is ignored.
export function applyCopy<T extends SiteContent>(content: T, changes: Record<string, string>): T {
  const next = structuredClone(content) as unknown as Bag;
  for (const [key, raw] of Object.entries(changes)) {
    if (typeof raw !== "string" || !ALLOWED(key)) continue;
    const path = key.split(".");
    const last = path.pop()!;
    const parent = getPath(next, path);
    const text = cleanText(raw);
    if (!text) continue;
    if (Array.isArray(parent) && typeof parent[Number(last)] === "string") parent[Number(last)] = text;
    else if (isObj(parent) && typeof parent[last] === "string") parent[last] = text;
  }
  return next as unknown as T;
}

// The changes worth showing: only fields whose words really differ.
export function diffCopy(before: Record<string, string>, after: Record<string, string>): { key: string; from: string; to: string }[] {
  const out: { key: string; from: string; to: string }[] = [];
  for (const [key, to] of Object.entries(after)) {
    const from = before[key];
    if (typeof from !== "string" || typeof to !== "string") continue;
    const t = cleanText(to);
    if (t && t !== from) out.push({ key, from, to: t });
  }
  return out;
}

// A readable name for a field, for the review list.
export function fieldLabel(key: string): string {
  const p = key.split(".");
  const n = (i: string) => String(Number(i) + 1);
  const names: Record<string, string> = { kicker: "Badge", headline: "Headline", sub: "Subheading", tagline: "Tagline", intro: "Intro", primaryCta: "Main button", secondaryCta: "Second button", heading: "Heading", text: "Text", button: "Button", blurb: "Blurb", description: "Description", title: "Title", summary: "Summary", impact: "Result", question: "Question", answer: "Answer", caption: "Caption", label: "Label" };
  const section: Record<string, string> = { hero: "Opening", about: "About", services: "Service", process: "Step", projects: "Project", experience: "Role", faq: "Question", custom: "Section", cta: "Call to action", contact: "Contact", gallery: "Photo", highlights: "Number" };
  if (p[0] === "about" && p[1] === "paragraphs") return `About, paragraph ${n(p[2])}`;
  if (p.length === 2) return `${section[p[0]] ?? p[0]}: ${names[p[1]] ?? p[1]}`;
  if (p[0] === "custom" && p.length === 5) return `Section ${n(p[1])}, item ${n(p[3])}: ${names[p[4]] ?? p[4]}`;
  return `${section[p[0]] ?? p[0]} ${n(p[1])}: ${names[p[2]] ?? p[2]}`;
}

// What the person's site is, in one line, so the model writes for the right audience.
export function siteBrief(content: SiteContent, kind: "website" | "portfolio"): string {
  const c = content as unknown as Bag;
  const hero = (c.hero ?? {}) as Bag;
  const brand = (c.brand ?? {}) as Bag;
  if (kind === "portfolio") return `Personal portfolio for ${String(hero.name ?? "a person")}, ${String(hero.role ?? "")}${hero.location ? ", based in " + String(hero.location) : ""}.`;
  return `Business website for ${String(brand.name ?? "a business")} (${String(brand.category ?? "business")}).`;
}

// The local fallback, used when the server has no key or Gemini is unreachable. It cannot
// rewrite like a model, but it tidies: spacing, capitals, stray dashes, doubled words,
// a missing full stop on long sentences and buttons longer than four words.
export function localPolish(copy: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, v] of Object.entries(copy)) {
    let t = cleanText(v)
      .replace(/\b(\w+)\s+\1\b/gi, "$1")
      .replace(/\s+([.,!?;:])/g, "$1")
      .replace(/([.,!?;:])(?=[A-Za-z])/g, "$1 ")
      .replace(/!{2,}/g, "!")
      .replace(/\bvery\s+/gi, "");
    t = t.charAt(0).toUpperCase() + t.slice(1);
    const isButton = /(Cta|button)$/.test(key);
    const isTitle = /(headline|heading|title|kicker|question|label|caption)$/.test(key);
    if (isButton) t = t.split(" ").slice(0, 4).join(" ").replace(/[.!]+$/, "");
    else if (!isTitle && t.split(" ").length > 6 && !/[.!?]$/.test(t)) t += ".";
    out[key] = t;
  }
  return out;
}

export interface RefineRequest {
  task: RefineTask;
  tone?: RefineTone;
  kind: "website" | "portfolio";
  brief: string;
  copy: Record<string, string>;
  note?: string;
}

export interface RefineResult {
  ok: boolean;
  source: "gemini" | "local";
  model?: string;
  copy?: Record<string, string>; // polish: same keys, better words
  headlines?: { headline: string; sub: string }[]; // headline: three options
  faq?: { question: string; answer: string }[]; // faq: new questions to review
  story?: { atmos: string; accentFace: string; intensity: number; sectionFx: string }; // direct: the opening's direction, plus a reason
  why?: string;
  error?: string;
}
