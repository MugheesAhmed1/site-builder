// Step 2 of the journey (docs/CHARACTER-JOURNEY.md): the interview. One line from the person grows
// into a brief through a short chat: one question at a time, each with answers to tap. Gemini runs
// the chat on the server (/api/chat) when it has a key; these rules run it otherwise, and also fill
// any gap in Gemini's answer, so the interview always finishes. Shared by the server and the browser.
import { categoryById, CATEGORIES, extractHints } from "../categories";
import { localPlan } from "../animator";
import { roleOf } from "../voice";

export interface Brief {
  idea: string;
  kind: "website" | "portfolio";
  /** A business type id from lib/categories.ts. */
  business: string;
  name: string;
  /** What it is or offers, in a few words. */
  what: string;
  audience: string;
  /** How it should feel, in a few words. */
  tone: string;
  /** What the site must have: sections and features. */
  sections: string[];
  /** The 3D character in words ("a friendly robot mascot", "me, from my photo"). */
  character: string;
  /** Colour wishes, in words; empty means "from the character". */
  colors: string;
  city: string;
  email: string;
  /** The main action: "Book a visit". */
  cta: string;
  /** A library model they chose before the chat (its id, from the home page): the character is settled. */
  star?: string;
}

/** Fields a question can fill. */
export type BriefField = "name" | "what" | "audience" | "tone" | "sections" | "character" | "colors" | "cta" | "email";

export interface ChatTurn {
  role: "ai" | "me";
  text: string;
  /** For the AI's questions: the answers offered as chips. */
  chips?: string[];
  /** For the AI's questions: the brief field the answer fills. */
  field?: BriefField;
  /** For the AI's questions: chips can be combined (sections). */
  multi?: boolean;
}

export interface ChatStep {
  /** A short reaction to the last answer, then the next question; or the closing summary. */
  reply: string;
  chips: string[];
  field?: BriefField;
  multi?: boolean;
  brief: Brief;
  done: boolean;
  source: "gemini" | "rules";
}

/** At most this many questions: people want their site, not a form. */
export const MAX_QUESTIONS = 6;

const clean = (s: unknown, max = 160) =>
  String(s ?? "")
    .replace(/[–—]/g, ",")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const list = (v: unknown, max = 10) =>
  (Array.isArray(v) ? v : String(v ?? "").split(/[,\n;]+/))
    .map((x) => clean(x, 60))
    .filter(Boolean)
    .slice(0, max);

/** The brief as the rules first understand the line. */
export function startBrief(idea: string): Brief {
  const p = localPlan(idea);
  const portfolio = p.kind === "portfolio";
  return {
    idea: clean(idea, 300),
    kind: p.kind,
    business: p.business,
    // A portfolio carries the person's own name: asked for, never guessed from the line.
    name: portfolio ? extractHints(idea).name || "" : p.name,
    what: portfolio ? roleOf(idea) || "Creative" : categoryById(p.business).label,
    audience: p.audience,
    tone: "",
    sections: [],
    character: "",
    colors: "",
    city: p.city,
    email: "",
    cta: portfolio ? "Work with me" : categoryById(p.business).primaryCta,
  };
}

/** A brief from anything (Gemini's answer, a saved copy), with every field in place. */
export function normalizeBrief(raw: unknown, base: Brief): Brief {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pick = (k: keyof Brief, max = 160) => (typeof r[k] === "string" && clean(r[k], max) ? clean(r[k], max) : (base[k] as string));
  const business = typeof r.business === "string" && CATEGORIES.some((c) => c.id === r.business) ? (r.business as string) : base.business;
  const email = typeof r.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim()) ? r.email.trim() : base.email;
  // A character chosen before the chat stays chosen, whatever the AI suggests.
  const star = base.star || (typeof r.star === "string" && /^[a-z0-9-]{3,80}$/.test(r.star) ? r.star : "");
  return {
    idea: base.idea,
    kind: r.kind === "portfolio" || r.kind === "website" ? r.kind : base.kind,
    business,
    name: pick("name", 60),
    what: pick("what", 120),
    audience: pick("audience", 160),
    tone: pick("tone", 80),
    sections: Array.isArray(r.sections) || typeof r.sections === "string" ? (list(r.sections).length ? list(r.sections) : base.sections) : base.sections,
    character: base.star && base.character ? base.character : pick("character", 120),
    colors: pick("colors", 80),
    city: pick("city", 40),
    email,
    cta: pick("cta", 30),
    ...(star ? { star } : {}),
  };
}

const SECTIONS_BY_KIND: Record<string, string[]> = {
  portfolio: ["Selected work", "About me", "Experience", "Skills", "Testimonials", "Contact form"],
  food: ["Menu", "Our story", "Gallery", "Reviews", "Opening hours", "Book a table"],
  dentist: ["Treatments", "Prices", "Meet the team", "Reviews", "FAQ", "Book a visit"],
  health: ["Services", "How it works", "Team", "Reviews", "FAQ", "Booking"],
  hospital: ["Departments", "Doctors", "Patient guide", "Emergency info", "FAQ", "Appointments"],
  fitness: ["Programs", "Timetable", "Membership prices", "Coaches", "Results", "Free trial"],
  beauty: ["Treatments", "Price list", "Gallery", "Reviews", "Booking"],
  product: ["Features", "How it works", "Pricing", "Testimonials", "FAQ", "Sign up"],
  shop: ["Products", "Bestsellers", "Reviews", "Shipping and returns", "Newsletter"],
  agency: ["Work", "Services", "Process", "Clients say", "Contact"],
  school: ["Courses", "Teachers", "Timetable", "Fees", "Admissions", "FAQ"],
  hotel: ["Rooms", "Experiences", "Gallery", "Reviews", "Location", "Book a stay"],
  property: ["Listings", "Areas", "Valuation", "Agents", "Contact"],
  events: ["Upcoming events", "Gallery", "Tickets", "FAQ", "Contact"],
  general: ["Services", "About", "How it works", "Reviews", "FAQ", "Contact"],
};

/** Characters the library has, in words, that suit each kind of business. */
const CHARACTER_IDEAS: Record<string, string[]> = {
  portfolio: ["Me, from my photo", "An astronaut", "A friendly robot", "A crystal"],
  creator: ["Me, from my photo", "An astronaut", "A friendly robot", "A dragon"],
  food: ["A burger", "A steaming pot", "A mug of coffee", "A bowl of olives"],
  dentist: ["A friendly robot", "A smiling kid", "A gift box", "Our logo, from a picture"],
  health: ["A friendly robot", "A potted plant", "A smiling kid", "Our logo, from a picture"],
  fitness: ["An armoured warrior", "A sneaker", "A sports car", "A trophy"],
  beauty: ["A vase of flowers", "A leather loafer", "A glass orb", "Our product, from a photo"],
  product: ["Our product, from a photo", "A foldable phone", "A friendly robot", "A glass orb"],
  shop: ["Our product, from a photo", "A backpack", "A sneaker", "A gift box"],
  agency: ["A friendly robot", "An astronaut", "A crystal", "A dragon"],
  school: ["A smiling kid", "A book", "A friendly robot", "An astronaut"],
  hotel: ["A yacht", "A cosy bedroom", "A lantern", "A teacup"],
  property: ["A house", "A tower", "A smiling kid", "A cosy bedroom"],
  events: ["A gift box", "A trophy", "A dragon", "A lantern"],
  auto: ["A sports car", "A formula racer", "A motorbike", "A truck"],
  pets: ["A friendly fox", "A deer", "A macaw", "A myna bird"],
  general: ["A friendly robot", "An astronaut", "A dragon", "Our logo, from a picture"],
};

export const charactersFor = (b: Pick<Brief, "business" | "kind">) => CHARACTER_IDEAS[b.kind === "portfolio" ? "portfolio" : b.business] || CHARACTER_IDEAS.general;
export const sectionsFor = (b: Pick<Brief, "business" | "kind">) => SECTIONS_BY_KIND[b.kind === "portfolio" ? "portfolio" : b.business] || SECTIONS_BY_KIND.general;

const TONE_CHIPS = ["Calm and premium", "Warm and friendly", "Bold and loud", "Playful", "Futuristic", "Classic and editorial"];
const COLOR_CHIPS = ["From the character", "Warm and earthy", "Cool blues", "Black and gold", "Bright and playful", "Soft pastels"];

interface RuleQuestion {
  field: BriefField;
  ask: (b: Brief) => string;
  chips: (b: Brief) => string[];
  multi?: boolean;
  /** Skip when the line already answered it. */
  skip?: (b: Brief, asked: Set<BriefField>) => boolean;
}

const RULES: RuleQuestion[] = [
  {
    field: "name",
    ask: (b) => (b.kind === "portfolio" ? "Let's start with you. What's your name, as it should appear on the site?" : "Great idea. What is it called?"),
    chips: (b) => [b.name, "Not decided yet"].filter(Boolean),
    // Asked unless the line itself named it ("called Crumb", "my bakery Crumb House"): a name
    // the rules only guessed from the description ("Fantasy Game Studio") is offered as a chip.
    skip: (b) => !!b.name && !!extractHints(b.idea).name && b.idea.toLowerCase().includes(b.name.toLowerCase()),
  },
  {
    field: "audience",
    ask: (b) => `Who is ${b.kind === "portfolio" ? "it" : b.name || "it"} for? The words and the feel follow them.`,
    chips: (b) => (b.kind === "portfolio" ? ["Recruiters and hiring managers", "Clients who want to hire me", "Other creatives", "Everyone"] : [b.city ? `People in ${b.city}` : "Local customers", "Families", "Busy professionals", "Businesses"]),
  },
  {
    field: "tone",
    ask: () => "How should it feel when someone lands on it?",
    chips: () => TONE_CHIPS,
  },
  {
    field: "sections",
    ask: () => "What must the site have? Pick as many as you like.",
    chips: (b) => sectionsFor(b),
    multi: true,
  },
  {
    field: "character",
    ask: () => "Now the star of the site: a 3D character every part of it is built around. What should it be?",
    chips: (b) => charactersFor(b),
    skip: (b) => !!b.star && !!b.character,
  },
  {
    field: "colors",
    ask: () => "Any colours you love? By default the whole site takes its colours from the character.",
    chips: () => COLOR_CHIPS,
  },
];

/** Applies an answer to the brief. */
export function answer(b: Brief, field: BriefField | undefined, text: string): Brief {
  const t = clean(text, 200);
  if (!field || !t) return b;
  if (field === "sections") return { ...b, sections: list(t) };
  if (field === "name" && /^not decided/i.test(t)) return b;
  if (field === "colors" && /^from the character/i.test(t)) return { ...b, colors: "" };
  if (field === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? { ...b, email: t } : b;
  if (field === "character" && b.star) {
    // They named another character after all: theirs wins over the one picked on the way in.
    const rest: Brief = { ...b, character: t };
    delete rest.star;
    return rest;
  }
  return { ...b, [field]: t };
}

/** The next step by the rules: the next unanswered question, or the summary when all are in. */
export function ruleStep(brief: Brief, turns: ChatTurn[]): ChatStep {
  const asked = new Set(turns.filter((t) => t.role === "ai" && t.field).map((t) => t.field as BriefField));
  const next = RULES.find((q) => !asked.has(q.field) && !q.skip?.(brief, asked));
  const lastAnswer = [...turns].reverse().find((t) => t.role === "me")?.text;
  const nod = lastAnswer ? pickNod(lastAnswer) + " " : "";
  if (!next || asked.size >= MAX_QUESTIONS) {
    return { reply: summary(brief), chips: [], brief, done: true, source: "rules" };
  }
  return { reply: nod + next.ask(brief), chips: next.chips(brief).slice(0, 6), field: next.field, multi: next.multi, brief, done: false, source: "rules" };
}

const NODS = ["Got it.", "Nice.", "Good choice.", "Perfect.", "Noted."];
const pickNod = (s: string) => NODS[s.length % NODS.length];

/** The closing line: what the site will be, in one breath. */
export function summary(b: Brief): string {
  const who = b.kind === "portfolio" ? `a portfolio for ${b.name || "you"}` : `a site for ${b.name || "your business"}`;
  const feel = b.tone ? `, ${b.tone.toLowerCase()}` : "";
  const star = b.character ? `, starring ${b.character.replace(/^(a|an|the)\s+/i, (m) => m.toLowerCase())}` : "";
  const next = b.star ? "Your character is ready below: keep it or change it, then we choose the colours and type from it." : "Pick the character below, then we choose the colours and type from it.";
  return `Here is the plan: ${who}${feel}${star}. ${next}`;
}
