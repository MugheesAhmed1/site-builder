import type { Design, DesignPart } from "./types";
import { hexToOklch, oklchToHex, palette, contrast } from "@/template/src/theme.js";
import { MOTIONS } from "@/template/src/motion.js";

// Rule-based design-system generator. No AI: every system is built from curated parts
// (type pairings, accent colours, neutral tints, shape and layout settings) combined with
// a seeded random generator, so the same seed always gives the same system.
//
// LIBRARY holds 4 hand-made presets plus 236 generated ones (240 in total). Users can also
// shuffle a brand-new one, remix a single part (colour, type, shape or layout), lock the
// parts they like, and save their own. Colour readability is enforced in theme.js.

export type Mood = "tech" | "editorial" | "warm" | "minimal" | "bold";

export const TYPE_PAIRINGS: { display: string; body: string; mono: string; style: "grotesk" | "geometric" | "humanist" | "serif"; mood: Mood }[] = [
  { display: "Space Grotesk", body: "IBM Plex Sans", mono: "IBM Plex Mono", style: "grotesk", mood: "tech" },
  { display: "Bricolage Grotesque", body: "Hanken Grotesk", mono: "JetBrains Mono", style: "grotesk", mood: "bold" },
  { display: "Instrument Sans", body: "Instrument Sans", mono: "DM Mono", style: "grotesk", mood: "minimal" },
  { display: "Fraunces", body: "Public Sans", mono: "IBM Plex Mono", style: "serif", mood: "editorial" },
  { display: "Schibsted Grotesk", body: "Schibsted Grotesk", mono: "JetBrains Mono", style: "grotesk", mood: "minimal" },
  { display: "Familjen Grotesk", body: "Source Sans 3", mono: "Space Mono", style: "grotesk", mood: "bold" },
  { display: "Syne", body: "Figtree", mono: "DM Mono", style: "geometric", mood: "bold" },
  { display: "Newsreader", body: "Atkinson Hyperlegible", mono: "IBM Plex Mono", style: "serif", mood: "editorial" },
  { display: "Sora", body: "Hanken Grotesk", mono: "JetBrains Mono", style: "geometric", mood: "tech" },
  { display: "Outfit", body: "Figtree", mono: "Geist Mono", style: "geometric", mood: "warm" },
  { display: "Manrope", body: "Manrope", mono: "JetBrains Mono", style: "geometric", mood: "minimal" },
  { display: "Unbounded", body: "Hanken Grotesk", mono: "Space Mono", style: "geometric", mood: "bold" },
  { display: "Playfair Display", body: "Source Sans 3", mono: "IBM Plex Mono", style: "serif", mood: "editorial" },
  { display: "DM Serif Display", body: "DM Sans", mono: "DM Mono", style: "serif", mood: "warm" },
  { display: "Young Serif", body: "Instrument Sans", mono: "DM Mono", style: "serif", mood: "warm" },
  { display: "Archivo", body: "Archivo", mono: "IBM Plex Mono", style: "grotesk", mood: "tech" },
  { display: "Epilogue", body: "Public Sans", mono: "JetBrains Mono", style: "grotesk", mood: "bold" },
  { display: "Lexend", body: "Lexend", mono: "Geist Mono", style: "geometric", mood: "warm" },
  { display: "Red Hat Display", body: "Red Hat Text", mono: "Red Hat Mono", style: "geometric", mood: "tech" },
  { display: "Cormorant Garamond", body: "Karla", mono: "IBM Plex Mono", style: "serif", mood: "editorial" },
  { display: "Chivo", body: "Chivo", mono: "Chivo Mono", style: "grotesk", mood: "minimal" },
  { display: "Albert Sans", body: "Albert Sans", mono: "JetBrains Mono", style: "geometric", mood: "warm" },
  { display: "Space Grotesk", body: "Public Sans", mono: "Space Mono", style: "grotesk", mood: "tech" },
  { display: "Libre Caslon Text", body: "Libre Franklin", mono: "IBM Plex Mono", style: "serif", mood: "editorial" },
];

export const ACCENTS: { name: string; hex: string; moods: Mood[] }[] = [
  { name: "Settlement green", hex: "#34D399", moods: ["tech", "minimal"] },
  { name: "Vermilion", hex: "#D9480F", moods: ["bold", "warm"] },
  { name: "Cobalt", hex: "#2A5BD7", moods: ["minimal", "tech"] },
  { name: "Forest", hex: "#2F6B4F", moods: ["editorial", "warm"] },
  { name: "Signal orange", hex: "#F76707", moods: ["bold", "tech"] },
  { name: "Ink blue", hex: "#1D3B8B", moods: ["editorial", "minimal"] },
  { name: "Teal", hex: "#0F9D8A", moods: ["tech", "minimal", "warm"] },
  { name: "Brick", hex: "#B23A2B", moods: ["editorial", "warm"] },
  { name: "Saffron", hex: "#E8A317", moods: ["warm", "bold"] },
  { name: "Plum", hex: "#8E3B6E", moods: ["editorial", "bold"] },
  { name: "Lagoon", hex: "#0B7FAB", moods: ["minimal", "tech"] },
  { name: "Moss", hex: "#5B7F2A", moods: ["warm", "editorial"] },
  { name: "Coral", hex: "#F0624D", moods: ["warm", "bold"] },
  { name: "Electric lime", hex: "#A3E635", moods: ["bold", "tech"] },
  { name: "Terracotta", hex: "#C2603A", moods: ["warm", "editorial"] },
  { name: "Ultramarine", hex: "#3B4CCA", moods: ["bold", "minimal"] },
  { name: "Rose", hex: "#D6336C", moods: ["bold", "warm"] },
  { name: "Pine", hex: "#1F6F5C", moods: ["minimal", "editorial"] },
  { name: "Amber", hex: "#F59F00", moods: ["tech", "warm"] },
  { name: "Cyan", hex: "#22B8CF", moods: ["tech", "bold"] },
  { name: "Oxblood", hex: "#7A1F2B", moods: ["editorial"] },
  { name: "Graphite", hex: "#495057", moods: ["minimal", "editorial"] },
  { name: "Mint", hex: "#38D9A9", moods: ["tech", "warm"] },
  { name: "Tangerine", hex: "#FD7E14", moods: ["warm", "bold"] },
];

export const HUES: { name: string; hue: number }[] = [
  { name: "Navy", hue: 257 },
  { name: "Slate", hue: 230 },
  { name: "Steel", hue: 215 },
  { name: "Teal", hue: 190 },
  { name: "Sage", hue: 150 },
  { name: "Moss", hue: 125 },
  { name: "Sand", hue: 85 },
  { name: "Wheat", hue: 75 },
  { name: "Clay", hue: 50 },
  { name: "Rosewood", hue: 20 },
  { name: "Plum", hue: 330 },
  { name: "Iris", hue: 285 },
];

const RADII = [0, 2, 4, 6, 8, 10, 12, 16, 20];
const ADJ = ["Harbor", "Quiet", "North", "Copper", "Signal", "Paper", "Field", "Orbit", "Linen", "Atlas", "Ember", "Tide", "Granite", "Meadow", "Neon", "Ledger", "Studio", "Prism", "Salt", "Cedar", "Velvet", "Chalk", "Delta", "Summit", "Juniper", "Basalt", "Cobalt", "Marigold", "Fjord", "Dune"];
const NOUN = ["Press", "Works", "House", "Grid", "Line", "Room", "Index", "Frame", "Desk", "Yard", "Folio", "Hall", "Bureau", "Post", "Field", "Mark", "Room", "Lane", "Club", "Office"];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const pick = <T,>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];

function moodOf(d: Design): Mood {
  return TYPE_PAIRINGS.find((p) => p.display === d.fonts.display && p.body === d.fonts.body)?.mood ?? "minimal";
}

function rollType(r: () => number): Pick<Design, "fonts"> {
  const p = pick(r, TYPE_PAIRINGS);
  return { fonts: { display: p.display, body: p.body, mono: p.mono } };
}

function rollColour(r: () => number, mood: Mood): Pick<Design, "accent" | "hue" | "tint" | "mode"> {
  const fitting = ACCENTS.filter((a) => a.moods.includes(mood));
  const accent = (r() < 0.8 && fitting.length ? pick(r, fitting) : pick(r, ACCENTS)).hex;
  const hue = r() < 0.35 ? Math.round(hexHue(accent)) : pick(r, HUES).hue;
  const tint = Math.round((0.004 + r() * 0.024) * 1000) / 1000;
  const m = r();
  const mode: Design["mode"] = m < 0.45 ? "light" : m < 0.82 ? "dark" : "auto";
  return { accent, hue, tint, mode };
}

function rollShape(r: () => number, mood: Mood): Pick<Design, "radius" | "density"> {
  const radius = mood === "editorial" ? pick(r, [0, 2, 4]) : mood === "bold" ? pick(r, [0, 4, 12, 20]) : pick(r, RADII);
  const d = r();
  return { radius, density: d < 0.25 ? "compact" : d < 0.7 ? "regular" : "airy" };
}

function rollLayout(r: () => number, mood: Mood): Pick<Design, "heroStyle" | "experienceStyle" | "projectStyle" | "serviceStyle"> {
  return {
    heroStyle: r() < 0.4 ? "stage" : mood === "editorial" ? pick(r, ["portrait", "split", "statement"] as const) : mood === "bold" ? pick(r, ["statement", "centered", "split"] as const) : pick(r, ["statement", "portrait", "split", "centered"] as const),
    experienceStyle: mood === "tech" ? (r() < 0.7 ? "ledger" : "timeline") : mood === "editorial" ? (r() < 0.7 ? "list" : "timeline") : pick(r, ["ledger", "timeline", "list"] as const),
    projectStyle: mood === "editorial" ? pick(r, ["case", "index"] as const) : pick(r, ["grid", "case", "index"] as const),
    serviceStyle: pick(r, ["menu", "bento", "rows"] as const),
  };
}

// Always animated by default; "Still" is only ever a deliberate choice.
function rollMotion(r: () => number, mood: Mood): Pick<Design, "motion" | "anim" | "hover" | "progress" | "marquee" | "backdrop"> {
  const pool = MOTIONS.slice(1).filter((m: { tempo: string }) => (mood === "minimal" || mood === "editorial" ? m.tempo !== "quick" || r() < 0.5 : true));
  const m = pick(r, pool) as { id: string; hover: Design["hover"] };
  const backdrop: Design["backdrop"] = pick(r, mood === "bold" || mood === "tech" ? (["aurora", "particles", "mesh", "grid"] as const) : (["none", "aurora", "mesh", "particles"] as const));
  return { motion: "expressive", anim: m.id, hover: r() < 0.25 ? "spotlight" : m.hover, progress: r() < 0.5, marquee: r() < 0.6, backdrop };
}

function hexHue(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  // Rough HSL hue to OKLCH hue alignment for tints; close enough for a background tint.
  return (h + 25) % 360;
}

function nameFor(seed: number): string {
  const r = mulberry32(seed ^ 0x9e3779b9);
  return `${pick(r, ADJ)} ${pick(r, NOUN)}`;
}

export function generateDesign(seed: number, id?: string): Design {
  const r = mulberry32(seed);
  const type = rollType(r);
  const mood = TYPE_PAIRINGS.find((p) => p.display === type.fonts.display && p.body === type.fonts.body)!.mood;
  return {
    id: id ?? `S-${(seed % 100000).toString().padStart(5, "0")}`,
    preset: nameFor(seed),
    ...rollColour(r, mood),
    ...type,
    ...rollShape(r, mood),
    ...rollLayout(r, mood),
    ...rollMotion(r, mood),
  };
}

// Re-rolls one part, keeping everything else (and every locked part) as it is.
export function remix(d: Design, part: DesignPart, seed = Math.floor(Math.random() * 1e9)): Design {
  const r = mulberry32(seed);
  const mood = moodOf(d);
  const next: Design = { ...d, id: `S-${(seed % 100000).toString().padStart(5, "0")}`, preset: nameFor(seed) };
  if (part === "colour") Object.assign(next, rollColour(r, mood));
  if (part === "type") Object.assign(next, rollType(r));
  if (part === "shape") Object.assign(next, rollShape(r, mood));
  if (part === "layout") Object.assign(next, rollLayout(r, mood));
  if (part === "motion") Object.assign(next, rollMotion(r, mood));
  return next;
}

// A fresh system that keeps the locked parts of the current one.
export function shuffle(d: Design, locks: Partial<Record<DesignPart, boolean>>, seed = Math.floor(Math.random() * 1e9)): Design {
  const fresh = generateDesign(seed);
  const keep: Partial<Design> = {};
  if (locks.colour) Object.assign(keep, { accent: d.accent, hue: d.hue, tint: d.tint, mode: d.mode });
  if (locks.type) Object.assign(keep, { fonts: d.fonts });
  if (locks.shape) Object.assign(keep, { radius: d.radius, density: d.density });
  if (locks.layout) Object.assign(keep, { heroStyle: d.heroStyle, experienceStyle: d.experienceStyle, projectStyle: d.projectStyle, serviceStyle: d.serviceStyle });
  if (locks.motion) Object.assign(keep, { motion: d.motion, anim: d.anim, hover: d.hover, progress: d.progress, marquee: d.marquee });
  return { ...fresh, ...keep };
}

// A system unique to this person, seeded from their name and what they asked for.
// When a mood is given (from the tone question), it keeps rolling until the type fits it.
export function personalDesign(name: string, query: string, mood?: Mood): Design {
  const base = hashString((name + "|" + query).toLowerCase().trim());
  let seed = base;
  let d = generateDesign(seed);
  for (let i = 1; mood && moodOf(d) !== mood && i < 200; i++) {
    seed = (base + i * 2654435761) >>> 0;
    d = generateDesign(seed);
  }
  return { ...d, id: "YOU-" + (seed % 10000).toString().padStart(4, "0"), preset: "Yours: " + nameFor(seed) };
}

export function moodFor(d: Design): Mood {
  return moodOf(d);
}

// ---- Colour optimizer ----------------------------------------------------------------
// Rule-based colour harmony. Every option is checked for contrast in light and dark.

export interface ColourOption {
  label: string;
  note: string;
  accent: string;
  hue: number;
  tint: number;
}

const rot = (h: number, by: number) => (((h + by) % 360) + 360) % 360;

export function colourOptions(d: Design): ColourOption[] {
  const [L, C, H] = hexToOklch(d.accent);
  const c = Math.max(C, 0.09);
  const mk = (label: string, note: string, accentH: number, hue: number, tint = d.tint, l = L): ColourOption => ({
    label,
    note,
    accent: oklchToHex(l, c, accentH),
    hue: Math.round(hue),
    tint,
  });
  return [
    mk("Matched", "Background tinted toward the accent", H, H, Math.max(d.tint, 0.016)),
    mk("Analogous", "Accent shifted to a neighbouring hue", rot(H, 30), rot(H, 30)),
    mk("Complementary", "Neutrals from the opposite hue", H, rot(H, 180), Math.max(d.tint, 0.012)),
    mk("Split", "Accent and neutrals 150 degrees apart", H, rot(H, 150)),
    mk("Triadic", "Accent moved a third of the wheel", rot(H, 120), d.hue),
    mk("Calm", "Lower intensity, near grey neutrals", H, d.hue, 0.005, Math.min(0.62, L)),
    mk("Vivid", "Stronger accent, warmer neutrals", H, 70, 0.022, 0.66),
  ].map((o) => ({ ...o, accent: o.label === "Calm" ? oklchToHex(Math.min(0.6, L), c * 0.6, H) : o.label === "Vivid" ? oklchToHex(0.66, Math.min(0.24, c * 1.3), H) : o.accent }));
}

// Contrast of body text and the accent against the background, for both themes.
export function contrastReport(d: Design) {
  return (["light", "dark"] as const).map((scheme) => {
    const p = palette(d, scheme);
    return {
      scheme,
      text: contrast(p.text, p.bg),
      muted: contrast(p.muted, p.bg),
      accent: contrast(p.accent, p.bg),
      button: contrast(p.onAccent, p.accent),
      shifted: p.accent.toUpperCase() !== d.accent.toUpperCase(),
    };
  });
}

// Builds a full system around a brand colour the person already has.
export function fromBrandColour(d: Design, hex: string): Design {
  const [, , H] = hexToOklch(hex);
  return { ...d, accent: hex.toUpperCase(), hue: Math.round(H), tint: Math.max(d.tint, 0.012) };
}

const HAND_MADE: Design[] = [
  {
    // Inspired by Mughees's portfolio (mugheesahmed-portfolio.vercel.app): deep navy base,
    // settlement green, reference codes and the "career ledger". An approximation only.
    id: "DS-001",
    anim: "M-020", hover: "glow", progress: true, marquee: true, projectStyle: "grid", serviceStyle: "rows",
    preset: "Ledger",
    mode: "dark",
    hue: 257,
    tint: 0.015,
    accent: "#34D399",
    fonts: { display: "Space Grotesk", body: "IBM Plex Sans", mono: "IBM Plex Mono" },
    radius: 10,
    density: "regular",
    motion: "expressive",
    heroStyle: "statement",
    experienceStyle: "ledger",
  },
  {
    id: "DS-002",
    anim: "M-056", hover: "lift", progress: false, marquee: true, projectStyle: "case", serviceStyle: "bento",
    preset: "Studio",
    mode: "light",
    hue: 70,
    tint: 0.02,
    accent: "#D9480F",
    fonts: { display: "Bricolage Grotesque", body: "Hanken Grotesk", mono: "JetBrains Mono" },
    radius: 4,
    density: "airy",
    motion: "expressive",
    heroStyle: "portrait",
    experienceStyle: "list",
  },
  {
    id: "DS-003",
    anim: "M-004", hover: "line", progress: true, marquee: false, projectStyle: "index", serviceStyle: "menu",
    preset: "Quiet",
    mode: "auto",
    hue: 230,
    tint: 0.01,
    accent: "#2A5BD7",
    fonts: { display: "Instrument Sans", body: "Instrument Sans", mono: "DM Mono" },
    radius: 8,
    density: "regular",
    motion: "expressive",
    heroStyle: "statement",
    experienceStyle: "timeline",
  },
  {
    id: "DS-004",
    anim: "M-060", hover: "line", progress: false, marquee: false, projectStyle: "case", serviceStyle: "menu",
    preset: "Editorial",
    mode: "light",
    hue: 85,
    tint: 0.018,
    accent: "#2F6B4F",
    fonts: { display: "Fraunces", body: "Public Sans", mono: "IBM Plex Mono" },
    radius: 2,
    density: "airy",
    motion: "expressive",
    heroStyle: "portrait",
    experienceStyle: "list",
  },
];

function buildLibrary(total: number): Design[] {
  const out = [...HAND_MADE];
  const seen = new Set(out.map((d) => d.preset));
  const sig = new Set(out.map((d) => `${d.fonts.display}|${d.accent}|${d.mode}`));
  let seed = 1000;
  while (out.length < total) {
    seed += 7919;
    const d = generateDesign(seed);
    const s = `${d.fonts.display}|${d.accent}|${d.mode}`;
    if (seen.has(d.preset) || sig.has(s)) continue;
    seen.add(d.preset);
    sig.add(s);
    d.id = "DS-" + String(out.length + 1).padStart(3, "0");
    out.push(d);
  }
  return out;
}

export const LIBRARY: Design[] = buildLibrary(240);

export function styleOf(d: Design) {
  return TYPE_PAIRINGS.find((p) => p.display === d.fonts.display)?.style ?? "grotesk";
}

export const ALL_FONTS = Array.from(new Set(TYPE_PAIRINGS.flatMap((p) => [p.display, p.body, p.mono])));

export function fontsHref(families: string[], weights = "500;600") {
  const q = families.map((f) => "family=" + encodeURIComponent(f).replace(/%20/g, "+") + ":wght@" + weights).join("&");
  return "https://fonts.googleapis.com/css2?" + q + "&display=swap";
}

// Projects saved by earlier versions used other design shapes. Map them over.
export function normalizeDesign(d: unknown): Design {
  const x = (d ?? {}) as Partial<Design> & Record<string, unknown>;
  const defaults: Partial<Design> = { density: "regular", anim: "M-002", hover: "lift", progress: false, marquee: false, projectStyle: "grid", serviceStyle: "menu", motion: "expressive" };
  if (typeof x.hue === "number" && x.fonts && "display" in (x.fonts as object)) {
    const out = { ...LIBRARY[0], ...defaults, ...x, id: x.id ?? "custom" } as Design;
    if (out.motion === "none" && !x.anim) out.anim = "M-000";
    return out;
  }
  const base = { ...LIBRARY[0] };
  const old = x as unknown as { colors?: { primary?: string }; mode?: string };
  if (old.colors?.primary) base.accent = old.colors.primary;
  if (old.mode === "light" || old.mode === "dark") base.mode = old.mode;
  return base;
}
