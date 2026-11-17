import type { ExperienceMode, MotionLanguage } from "@/template/src/experiences/types";

// Stage 1 of the generation pipeline (PRD section 7): understand the business before any
// visual decision. Rules only, so it runs in the browser, offline and for free. The words of
// the request, the answers and the written page are all read.

export interface BriefInput {
  kind: "website" | "portfolio";
  category: string;
  query: string;
  answers?: Record<string, string>;
  content?: unknown;
}

export interface Brief {
  kind: "website" | "portfolio";
  category: string;
  business: string;
  audience: string;
  location: string;
  offering: string;
  /** Personality traits, strongest first. */
  personality: Personality[];
  tone: string;
  cta: string;
  /** Every meaningful word, lower case, for matching concepts. */
  keywords: string[];
  /** The words the person wrote about what they do (the request and the offer), which count most. */
  focus: string[];
  /** The feeling the site should leave, in plain words. */
  feeling: string;
  /** Style chips the person picked on the home page, if any. */
  style?: StyleChoice;
  /** The experience chip the person picked, if any. */
  wantMode?: ExperienceMode;
}

export type Personality = "calm" | "warm" | "bold" | "playful" | "luxury" | "technical" | "trustworthy" | "natural" | "energetic" | "creative";
export type StyleChoice = "minimal" | "bold" | "playful" | "luxury" | "experimental";

const TRAITS: [Personality, RegExp][] = [
  ["luxury", /\b(luxury|premium|boutique|bespoke|exclusive|fine|private|couture|elegant|villa|jewel)/],
  ["playful", /\b(fun|kids?|children|play|toy|party|candy|colourful|colorful|game|pet|puppy|creator|sweet)/],
  ["technical", /\b(software|saas|app|platform|ai|data|api|cloud|cyber|security|developer|engineer|tech|automation|analytics)/],
  ["trustworthy", /\b(law|legal|clinic|hospital|dental|dentist|doctor|finance|accountant|insurance|bank|audit|care|health)/],
  ["natural", /\b(organic|garden|flower|forest|eco|green|nature|farm|plant|florist|botanical|herbal)/],
  ["energetic", /\b(gym|fitness|sport|boxing|crossfit|dance|run|training|festival|club|music)/],
  ["creative", /\b(design|studio|agency|art|photo|film|creative|brand|illustrat|portfolio)/],
  ["warm", /\b(cafe|café|coffee|bakery|family|home|friendly|local|neighbourhood|community|kitchen)/],
  ["calm", /\b(spa|yoga|wellness|retreat|therapy|mindful|calm|quiet|relax)/],
  ["bold", /\b(bold|loud|street|urban|night|launch|disrupt|fast)/],
];

const TONE_TRAIT: Record<string, Personality> = {
  "Calm and minimal": "calm",
  "Warm and friendly": "warm",
  "Bold and loud": "bold",
  "Classic and editorial": "trustworthy",
  "Modern and technical": "technical",
};

const STOP = new Set("a an and the for of in on at to my our your with from by is are we i me this that it its be best new website site portfolio page web".split(" "));

function collect(x: unknown, out: string[] = [], depth = 0): string[] {
  if (depth > 6 || out.length > 4000) return out;
  if (typeof x === "string") out.push(x);
  else if (Array.isArray(x)) x.forEach((v) => collect(v, out, depth + 1));
  else if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) if (!/url|href|email|phone|whatsapp|link|sections/i.test(k)) collect(v, out, depth + 1);
  return out;
}

export function understand(input: BriefInput, choices: { style?: StyleChoice; mode?: ExperienceMode } = {}): Brief {
  const a = input.answers ?? {};
  const content = (input.content ?? {}) as Record<string, any>;
  const text = [input.query, ...Object.values(a), ...collect(content)].join(" ").toLowerCase();
  const words = Array.from(new Set(text.replace(/[^a-z0-9À-ɏ\s-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w))));
  const own = [input.query, a.what, a.role, a.name].filter(Boolean).join(" ").toLowerCase();
  const focus = Array.from(new Set(own.replace(/[^a-z0-9\u00c0-\u024f\s-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w))));
  const scored = TRAITS.map(([t, re]) => [t, (text.match(new RegExp(re.source, "g")) || []).length] as const).filter(([, n]) => n > 0).sort((x, y) => y[1] - x[1]);
  const personality: Personality[] = scored.map(([t]) => t);
  const tone = a.tone || "";
  if (TONE_TRAIT[tone] && !personality.includes(TONE_TRAIT[tone])) personality.unshift(TONE_TRAIT[tone]);
  if (choices.style === "luxury") personality.unshift("luxury");
  if (choices.style === "playful") personality.unshift("playful");
  if (choices.style === "bold" || choices.style === "experimental") personality.unshift("bold");
  if (choices.style === "minimal") personality.unshift("calm");
  if (!personality.length) personality.push(input.kind === "portfolio" ? "creative" : "warm");

  const brand = content.brand?.name || content.hero?.name || a.name || "";
  const offering = a.what || a.role || content.hero?.role || content.brand?.category || "";
  const location = a.city || a.location || content.hero?.location || "";
  const cta = content.hero?.primaryCta || content.cta?.button || "Get in touch";
  const audience = a.customers || a.audience || (input.kind === "portfolio" ? "hiring teams and clients" : "local customers");
  const feeling = FEELING[personality[0]];
  return {
    kind: input.kind,
    category: input.category,
    business: brand,
    audience,
    location,
    offering,
    personality: Array.from(new Set(personality)),
    tone,
    cta,
    keywords: words,
    focus,
    feeling,
    style: choices.style,
    wantMode: choices.mode,
  };
}

const FEELING: Record<Personality, string> = {
  calm: "at ease",
  warm: "welcome",
  bold: "excited",
  playful: "delighted",
  luxury: "special",
  technical: "confident it works",
  trustworthy: "in safe hands",
  natural: "refreshed",
  energetic: "fired up",
  creative: "inspired",
};

/** PRD section 23: the motion language that matches the personality. */
export function motionLanguageFor(b: Brief): MotionLanguage {
  const p = b.personality[0];
  if (p === "luxury" || p === "calm") return "restrained";
  if (p === "technical") return "precise";
  if (p === "playful") return "elastic";
  if (p === "trustworthy") return "stable";
  if (p === "natural" || p === "warm") return "fluid";
  return "bold";
}

/** The mode a brief leans toward before any concept is scored (PRD section 5). */
export function modeAffinity(b: Brief): Record<ExperienceMode, number> {
  const s: Record<ExperienceMode, number> = { editorial: 0, cinematic: 0, world: 0, product: 0, playful: 0 };
  const add = (m: ExperienceMode, n: number) => (s[m] += n);
  for (const [i, p] of b.personality.entries()) {
    const w = i === 0 ? 3 : 1;
    if (p === "luxury" || p === "trustworthy" || p === "calm") add("editorial", w);
    if (p === "technical") add("product", w);
    if (p === "playful" || p === "energetic") add("playful", w);
    if (p === "creative") (add("world", w), add("cinematic", w / 2));
    if (p === "natural" || p === "warm") (add("cinematic", w / 2), add("playful", w / 2));
    if (p === "bold") (add("cinematic", w), add("playful", w / 2));
  }
  const cat = b.category;
  if (["law", "consulting", "hospital", "dentist"].includes(cat) || /role-(finance|hr|writer)/.test(cat)) add("editorial", 2);
  if (["hotel", "auto", "property", "photo"].includes(cat)) add("cinematic", 2);
  if (["product"].includes(cat) || /role-(pm|dev|data|it)/.test(cat)) add("product", 2);
  if (["events", "creator", "school", "pets", "food"].includes(cat)) add("playful", 1.5);
  if (b.wantMode) add(b.wantMode, 8);
  if (b.style === "experimental") (add("world", 3), add("playful", 1));
  return s;
}
