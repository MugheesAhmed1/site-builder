// The animator engine: a short query ("dentist clinic in isb") becomes a whole, animated site.
//
// 1. Master prompt. The query is read (business type, city, name, site or portfolio) and grown into
//    a master prompt: who the business is, who it serves, its tone, its colour and type, how much it
//    moves, which template carries it and which library blocks it adds. Gemini writes it when the
//    server has a key; the rules below write a plainer one when it does not.
// 2. Experience. The engine takes the chosen template's own content (the examples it was built
//    from) and rewrites it for the business: every word slot, the palette (hue-shifted, so the
//    template's contrast survives), the fonts, the motion, and the library blocks with their words.
//
// The result is ordinary template content, so it opens in the template studio, where every part
// stays editable, and downloads like any template. This file is shared by the server route and the
// browser: no secrets, no network calls.
import { CATEGORIES, categoryById, classify, extractHints } from "./categories";
import { BLOCKS, blockById, mediaFor } from "./library-blocks";
import { clone, getPath, setPath, type Content, type SchemaField } from "./template-schema.mjs";
import { TEMPLATES, templateById, type TemplateInfo } from "./templates";

export type Motion = "calm" | "lively" | "bold";

export interface MasterPlan {
  query: string;
  kind: "website" | "portfolio";
  /** A business type id from lib/categories.ts. */
  business: string;
  name: string;
  city: string;
  audience: string;
  tone: string;
  /** The master prompt itself: the brief every later step writes from. */
  prompt: string;
  /** Template id. */
  template: string;
  /** Library block ids, in page order. */
  blocks: string[];
  accent: string;
  fonts: { display: string; body: string };
  motion: Motion;
  source: "gemini" | "local";
  model?: string;
}

/** One piece of text the engine may rewrite: a key, what it is, and the template's example. */
export interface Slot {
  key: string;
  label: string;
  example: string;
}

// ---------------------------------------------------------------- reading the query

/** Short city names people type, mostly Pakistani, plus a few common elsewhere. */
const CITY_ALIASES: Record<string, string> = {
  isb: "Islamabad", islamabad: "Islamabad", lhr: "Lahore", lahore: "Lahore", khi: "Karachi", karachi: "Karachi",
  rwp: "Rawalpindi", pindi: "Rawalpindi", rawalpindi: "Rawalpindi", pew: "Peshawar", peshawar: "Peshawar",
  fsd: "Faisalabad", faisalabad: "Faisalabad", mul: "Multan", multan: "Multan", qta: "Quetta", quetta: "Quetta",
  skt: "Sialkot", sialkot: "Sialkot", hyd: "Hyderabad", hyderabad: "Hyderabad", gujranwala: "Gujranwala",
  abbottabad: "Abbottabad", murree: "Murree", dxb: "Dubai", dubai: "Dubai", nyc: "New York", ldn: "London", london: "London",
};

export function cityOf(query: string): string {
  const named = extractHints(query).city;
  if (named) return CITY_ALIASES[named.toLowerCase()] || named;
  const m = /\b(?:in|at|from|near|based in)\s+([a-z]+)\b/i.exec(query);
  if (m && CITY_ALIASES[m[1].toLowerCase()]) return CITY_ALIASES[m[1].toLowerCase()];
  for (const w of query.toLowerCase().split(/[^a-z]+/)) if (CITY_ALIASES[w] && w.length > 3) return CITY_ALIASES[w];
  return "";
}

const title = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

/** What the business is, in the person's words: "dentist clinic in isb" gives "dentist clinic". */
function whatOf(query: string) {
  return query
    .toLowerCase()
    .replace(/\b(?:in|at|from|near|based in)\s+[a-z]+(?:\s+[a-z]+)?\s*$/i, "")
    .replace(/\b(?:a|an|the|my|our|website|site|web|page|landing|for|make|build|create|need|i|we|want)\b/g, " ")
    .replace(/[^a-z0-9& ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameFor(query: string, business: string, city: string) {
  const named = extractHints(query).name;
  if (named) return named;
  const what = whatOf(query) || categoryById(business).label.split(/[ ,]/)[0].toLowerCase();
  const nouns: Record<string, string> = { dentist: "Dental Studio", hospital: "Health Centre", health: "Care Clinic", beauty: "Beauty Studio", fitness: "Fitness Club", food: "Kitchen", law: "Law Chambers", school: "Academy", hotel: "House", property: "Estates", trades: "Works", auto: "Motors", pets: "Pet Care", shop: "Store", agency: "Studio", consulting: "Partners", photo: "Studio", creator: "Studio", events: "Events", nonprofit: "Foundation", product: "Labs" };
  const noun = nouns[business];
  if (city && noun) return `${city} ${noun}`;
  return title(what || "New Studio");
}

// ---------------------------------------------------------------- choosing a template and blocks

/** Templates a business suits when no template is filed under it directly, closest feel first. */
const NEAREST: Record<string, string[]> = {
  dentist: ["brightline", "cornerstone", "mossline"], hospital: ["brightline", "mossline", "cornerstone"], health: ["brightline", "ironhouse", "tidewater"],
  beauty: ["brightline", "tidewater", "fernhollow"], fitness: ["ironhouse", "stride", "jack"], law: ["cornerstone", "distill", "lithos"],
  hotel: ["tidewater", "ashgrove", "fernhollow"], property: ["cornerstone", "tidewater", "lithos"], trades: ["cornerstone", "ironhouse", "distill"],
  auto: ["ironhouse", "jack", "distill"], pets: ["brightline", "stride", "fernhollow"], events: ["ashgrove", "tidewater", "milo"], food: ["ashgrove", "stride", "tidewater"],
  general: ["distill", "mossline", "jack"],
};

export function rankTemplates(business: string, kind: "website" | "portfolio" = "website"): TemplateInfo[] {
  const want = kind === "portfolio" ? ["creator", "photo", "agency"] : [business];
  const near = NEAREST[business] || [];
  const score = (t: TemplateInfo) => {
    let s = 0;
    for (const b of want) {
      const i = t.business.indexOf(b);
      if (i >= 0) s = Math.max(s, 100 - i * 10);
    }
    const n = near.indexOf(t.id);
    if (n >= 0) s = Math.max(s, 60 - n * 10);
    return s;
  };
  return [...TEMPLATES].sort((a, b) => score(b) - score(a));
}

export function pickBlocks(business: string, motion: Motion, template: string): string[] {
  const own = (id: string) => blockById(id)?.from === template;
  const sections = BLOCKS.filter((b) => b.kind === "section" && b.business.includes(business) && !own(b.id))
    .map((b) => b.id)
    .slice(0, 3);
  if (sections.length < 2) for (const id of ["count-up-stats", "numbered-list", "contact-form"]) if (!sections.includes(id) && !own(id) && sections.length < 3) sections.push(id);
  // A contact block sits last; a site without a way to reach the business is not done.
  const list = sections.filter((x) => x !== "contact-form");
  if (!own("contact-form")) list.push("contact-form");
  if (motion !== "calm") list.push("scroll-progress");
  if (motion === "bold") list.push("custom-cursor");
  return list;
}

const TONES: Record<string, string> = {
  dentist: "calm, reassuring and precise", hospital: "calm, clear and trustworthy", health: "warm, calm and reassuring", beauty: "warm, confident and refined",
  fitness: "energetic, direct and motivating", food: "warm, generous and sensory", law: "measured, precise and confident", school: "warm, encouraging and clear",
  hotel: "calm, welcoming and quietly luxurious", agency: "confident, sharp and playful", creator: "personal, bold and curious", photo: "quiet, visual and personal",
  shop: "lively, friendly and punchy", product: "clear, confident and modern",
};
const ACCENTS: Record<string, string> = {
  dentist: "#1f9ebd", hospital: "#2f7ad1", health: "#2e9f7f", beauty: "#c46b8a", fitness: "#e2512b", food: "#d9822b", law: "#7d6b3d",
  school: "#3466d6", hotel: "#a8834f", property: "#3c7a68", trades: "#e0a21b", auto: "#d23a2f", pets: "#e08a3c", events: "#8a4fd1",
  agency: "#ff5a1f", creator: "#7c5cff", photo: "#c9a46a", shop: "#ff6a3d", product: "#2b8cff", consulting: "#2c6e8f", nonprofit: "#2f9e62",
};
const MOTION: Record<string, Motion> = { dentist: "calm", hospital: "calm", health: "calm", law: "calm", school: "lively", hotel: "calm", fitness: "bold", agency: "bold", creator: "bold", events: "bold", shop: "lively" };

/** The master plan written by rules: used when there is no Gemini key, and to fill gaps in its answer. */
export function localPlan(query: string): MasterPlan {
  const q = query.trim().slice(0, 300);
  const c = classify(q);
  const kind = c.kind === "portfolio" ? "portfolio" : "website";
  const business = c.category === "portfolio" ? "creator" : c.category;
  const city = cityOf(q);
  const name = nameFor(q, business, city);
  const cat = categoryById(business);
  const motion = MOTION[business] || "lively";
  const template = rankTemplates(business, kind)[0].id;
  const tone = TONES[business] || "clear, warm and confident";
  const audience = city ? `people in and around ${city} looking for a ${whatOf(q) || cat.label.toLowerCase()}` : `people looking for a ${whatOf(q) || cat.label.toLowerCase()}`;
  const plan: MasterPlan = {
    query: q,
    kind,
    business,
    name,
    city,
    audience,
    tone,
    prompt: "",
    template,
    blocks: pickBlocks(business, motion, template),
    accent: ACCENTS[business] || "#4f6bff",
    fonts: { display: "", body: "" },
    motion,
    source: "local",
  };
  plan.prompt = masterPromptText(plan);
  return plan;
}

export function masterPromptText(p: MasterPlan) {
  const cat = categoryById(p.business);
  const t = templateById(p.template);
  return [
    `Create a ${p.kind === "portfolio" ? "portfolio" : "website"} for ${p.name}, a ${whatOf(p.query) || cat.label.toLowerCase()}${p.city ? ` in ${p.city}` : ""}.`,
    `Audience: ${p.audience}.`,
    `Voice: ${p.tone}. Plain, specific words; no invented prices, awards, years or claims.`,
    `What it offers: ${cat.services.join(", ")}.`,
    `First impression: ${cat.kicker.toLowerCase()}; the main action is "${cat.primaryCta}".`,
    `Look: accent ${p.accent}${p.fonts.display ? `, ${p.fonts.display} for headings and ${p.fonts.body || p.fonts.display} for text` : ""}.`,
    `Motion: ${p.motion === "calm" ? "calm, slow reveals that never distract" : p.motion === "bold" ? "bold, with a custom cursor and strong scroll moments" : "lively reveals and a scroll progress line"}.`,
    `Built on the ${t?.name || p.template} template${p.blocks.length ? `, adding ${p.blocks.map((b) => blockById(b)?.name || b).join(", ")}` : ""}.`,
  ].join("\n");
}

/** Keeps only what the engine can use from a plan someone (or a model) wrote. */
export function normalizePlan(raw: Partial<MasterPlan> & Record<string, unknown>, fallback: MasterPlan): MasterPlan {
  const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? cleanWords(v, max) : "");
  const business = CATEGORIES.some((c) => c.id === raw.business) ? String(raw.business) : fallback.business;
  const template = templateById(String(raw.template || "")) ? String(raw.template) : fallback.template;
  const motion: Motion = raw.motion === "calm" || raw.motion === "lively" || raw.motion === "bold" ? raw.motion : fallback.motion;
  const blocks = (Array.isArray(raw.blocks) ? raw.blocks : fallback.blocks).map(String).filter((b, i, a) => !!blockById(b) && a.indexOf(b) === i).slice(0, 6);
  const fonts = raw.fonts && typeof raw.fonts === "object" ? (raw.fonts as Record<string, unknown>) : {};
  const font = (v: unknown) => (typeof v === "string" && /^[A-Za-z0-9 ]{2,40}$/.test(v.trim()) ? v.trim() : "");
  const p: MasterPlan = {
    query: fallback.query,
    kind: raw.kind === "portfolio" ? "portfolio" : raw.kind === "website" ? "website" : fallback.kind,
    business,
    name: str(raw.name, 60) || fallback.name,
    city: str(raw.city, 40) || fallback.city,
    audience: str(raw.audience, 200) || fallback.audience,
    tone: str(raw.tone, 120) || fallback.tone,
    prompt: typeof raw.prompt === "string" && raw.prompt.trim() ? raw.prompt.replace(/[—–]/g, ", ").trim().slice(0, 3000) : "",
    template,
    blocks: blocks.length ? blocks : pickBlocks(business, motion, template),
    accent: typeof raw.accent === "string" && /^#[0-9a-f]{6}$/i.test(raw.accent) ? raw.accent : fallback.accent,
    fonts: { display: font(fonts.display), body: font(fonts.body) },
    motion,
    source: raw.source === "gemini" ? "gemini" : fallback.source,
    model: typeof raw.model === "string" ? raw.model : undefined,
  };
  if (!p.prompt) p.prompt = masterPromptText(p);
  return p;
}

// ---------------------------------------------------------------- the template's words

const SKIP = /(?:email|href|link|url|action|phone|tel|year|price|address|sheet|currency|code)$/i;
const LOOKS_LIKE_DATA = /^(?:https?:|mailto:|tel:|#|\.\/|\/)|@|^[\d\s.,:%+$€£-]+$/;

/** Every piece of text in a template's content (and in its blocks) that the engine may rewrite. */
export function slotsOf(t: TemplateInfo, content: Content): Slot[] {
  const out: Slot[] = [];
  const walk = (fields: SchemaField[], base: string, root: unknown, group: string) => {
    for (const f of fields) {
      const path = base + f.path;
      if (f.type === "list") {
        const items = getPath(root, f.path);
        if (Array.isArray(items)) items.slice(0, 12).forEach((item, i) => walk(f.fields || [], `${path}.${i}.`, item, `${group} / ${f.itemLabel || f.label} ${i + 1}`));
        continue;
      }
      if (f.type !== "text" && f.type !== "textarea") continue;
      const v = getPath(root, f.path);
      if (typeof v !== "string" || !v.trim() || v.length > 900 || path === "brand.name" || SKIP.test(f.path) || LOOKS_LIKE_DATA.test(v.trim())) continue;
      out.push({ key: path, label: `${group} / ${f.label}`, example: v });
    }
  };
  for (const g of t.schema) walk(g.fields.filter((f) => f.type !== "blocks"), "", content, g.group);
  (Array.isArray(content.extras) ? content.extras : []).forEach((x: { block: string; props?: Content }, i: number) => {
    const b = blockById(x.block);
    if (b) walk(b.fields, `extras.${i}.props.`, { ...b.defaults, ...(x.props || {}) }, `Block ${b.name}`);
  });
  return out.slice(0, 160);
}

/** Text from a model, tidied: no dashes the house style avoids, no markdown, newlines kept. */
export function cleanWords(s: string, max = 900) {
  return s
    .replace(/[—–]/g, ", ")
    .replace(/\s+,/g, ",")
    .replace(/[*_`#>]+/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

// ---------------------------------------------------------------- colour

function hexToHsl(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToHex(h: number, s: number, l: number) {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return "#" + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
}

/**
 * The template's colour moved to the business's accent: coloured values take the accent's hue,
 * keeping their own lightness and strength, so light stays light, dark stays dark and contrast
 * holds. Greys and near-blacks get only a faint tint of it.
 */
export function shiftColor(value: string, accent: string): string {
  const from = hexToHsl(value);
  const to = hexToHsl(accent);
  if (!from || !to) return value;
  const [, s, l] = from;
  if (s < 0.18) return s < 0.04 ? value : hslToHex(to[0], Math.min(s, 0.12), l);
  return hslToHex(to[0], Math.max(s, Math.min(to[1], 0.85) * 0.9), l);
}

// ---------------------------------------------------------------- building the experience

export interface Writes {
  /** Slot key to new text. */
  texts?: Record<string, string>;
}

/** The finished content: the template's own, rewritten for the plan. */
export function buildContent(t: TemplateInfo, plan: MasterPlan, writes: Writes = {}): Content {
  let c = clone(t.content);
  const oldName = String(getPath(c, "brand.name") || t.name);

  // Blocks first, so their words are rewritten with the rest. Pictures in them come from the
  // library, the ones made for this business first.
  const pics = mediaFor("image", [plan.business]).filter((m) => m.src.startsWith("/lib/media/"));
  c.extras = plan.blocks.map((id, i) => {
    const b = blockById(id)!;
    const props = clone(b.defaults) as Content;
    for (const f of b.fields) if (f.type === "image" && pics.length) props[f.path] = "lib:" + pics[i % pics.length].src.slice(11);
    for (const f of b.fields) if (f.type === "color" && typeof props[f.path] === "string") props[f.path] = shiftColor(props[f.path], plan.accent);
    if (id === "contact-form") for (const f of b.fields) if (/email$/i.test(f.path)) props[f.path] = emailFor(plan.name);
    return { block: id, props };
  });

  // Words: the model's where it wrote them; otherwise the old name becomes the new one.
  const slots = slotsOf(t, c);
  for (const s of slots) {
    const w = writes.texts?.[s.key];
    if (typeof w === "string" && w.trim()) c = setPath(c, s.key, cleanWords(w, Math.max(80, s.example.length * 3)));
    else if (oldName && s.example.includes(oldName)) c = setPath(c, s.key, s.example.split(oldName).join(plan.name));
  }
  if (typeof getPath(c, "brand.name") === "string") c = setPath(c, "brand.name", plan.name);

  // Contact details: the owner's own are never left on someone else's site.
  const walkEmail = (fields: SchemaField[], base: string) => {
    for (const f of fields) {
      if (f.type === "text" && /email$/i.test(f.path) && typeof getPath(c, base + f.path) === "string") c = setPath(c, base + f.path, emailFor(plan.name));
      // Lists too (a team's or agents' own addresses).
      const v = getPath(c, base + f.path);
      if (f.type === "list" && Array.isArray(v)) v.forEach((_: unknown, i: number) => walkEmail(f.fields || [], `${base}${f.path}.${i}.`));
    }
  };
  for (const g of t.schema) walkEmail(g.fields, "");

  // Colour and type.
  for (const g of t.schema)
    for (const f of g.fields) {
      const v = getPath(c, f.path);
      if (f.type === "color" && typeof v === "string") c = setPath(c, f.path, shiftColor(v, plan.accent));
      if (f.type === "colors" && Array.isArray(v)) c = setPath(c, f.path, v.map((x) => (typeof x === "string" ? shiftColor(x, plan.accent) : x)));
      if (f.type === "font" && typeof v === "string") {
        const display = /head|display|title|serif|brand/i.test(f.path + f.label);
        const pick = display ? plan.fonts.display : plan.fonts.body || plan.fonts.display;
        if (pick) c = setPath(c, f.path, pick);
      }
    }

  // Motion: calm sites switch off the template's loudest extras where it has a switch for them.
  if (plan.motion === "calm")
    for (const g of t.schema)
      for (const f of g.fields) if (f.type === "toggle" && /(?:cursor|sparks|particles|grain)$/i.test(f.path) && getPath(c, f.path) === true) c = setPath(c, f.path, false);
  return c;
}

/**
 * Words written by rules for the slots that matter most, used when no model wrote them: the
 * opening, search text, services and the call to action. The rest keep the template's words
 * with the new name, for the person to change in the studio.
 */
export function localTexts(t: TemplateInfo, plan: MasterPlan): Record<string, string> {
  const cat = categoryById(plan.business);
  const what = whatOf(plan.query) || cat.label.toLowerCase();
  const fill = (s: string) => s.replace(/\{name\}/g, plan.name).replace(/\{city\}/g, plan.city || "your area").replace(/\{what\}/g, what).replace(/\{audience\}/g, "you");
  const headline = fill(cat.headlines.find((h) => plan.city || !h.includes("{city}")) || cat.headlines[0]);
  const sub = `${cat.kicker}${plan.city ? ` in ${plan.city}` : ""}. ${cat.services.slice(0, 3).join(", ")}.`;
  const out: Record<string, string> = {};
  let service = 0;
  for (const s of slotsOf(t, buildContent(t, plan))) {
    const k = s.key;
    if (k === "seo.title") out[k] = `${plan.name}${plan.city ? ` | ${title(what)} in ${plan.city}` : ""}`;
    else if (k === "seo.description") out[k] = `${plan.name}: ${sub}`;
    else if (/^hero\.(?:title|headline|line1)$/.test(k)) out[k] = headline;
    else if (/^hero\.line2$/.test(k)) out[k] = "";
    else if (/^hero\.(?:text|sub|caption1?|description|intro)$/.test(k)) out[k] = sub;
    else if (/^hero\.(?:kicker|eyebrow|label)$/.test(k)) out[k] = cat.kicker;
    else if (/^hero\.(?:button|cta)$/.test(k)) out[k] = cat.primaryCta;
    else if (/^services\.items\.\d+\.title$/.test(k) && service < cat.services.length) out[k] = cat.services[service++];
    else if (/^(?:brand\.)?tagline$/.test(k)) out[k] = cat.kicker;
  }
  // A line left empty (hero.line2) stays out of the way only if it was optional; keep text there.
  for (const [k, v] of Object.entries(out)) if (!v) delete out[k];
  return out;
}

export function emailFor(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24) || "studio";
  return `hello@${slug}.com`;
}

/** Slots and their examples in the shape the writing step sends to the model. */
export function slotBrief(slots: Slot[]) {
  return Object.fromEntries(slots.map((s) => [s.key, { what: s.label, example: s.example }]));
}

/** What the engine knows of each template and block, for the master prompt step. */
export function catalog() {
  return {
    templates: TEMPLATES.map((t) => ({ id: t.id, name: t.name, suits: t.business, madeFor: t.sector, feel: t.pitch, styles: t.categories })),
    blocks: BLOCKS.map((b) => ({ id: b.id, name: b.name, kind: b.kind, suits: b.business, what: b.description })),
  };
}
