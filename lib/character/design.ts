// Step 3 of the journey: the design system, drawn from the character (docs/CHARACTER-JOURNEY.md).
// The character's palette gives the accent, the second colour, the tint of every neutral and the
// background gradient behind it; its style and the brief's tone pick the typefaces, the corners and
// how much the site moves. One design system gives a light and a dark set of colours, so it fits
// any template in the template's own mode, and every text colour passes WCAG AA.
import { adjust, contrast, ensureContrast, fromLch, hueGap, onColor, toLch } from "./color";
import type { CharacterPalette } from "./palette";

export type Mode = "light" | "dark";
export type GradientStyle = "glow" | "linear" | "radial" | "aurora" | "solid";
export type Motion = "calm" | "lively" | "bold";
export type Radius = "sharp" | "soft" | "round";

export interface FontPair {
  id: string;
  name: string;
  display: string;
  body: string;
  /** What it suits, matched against the character's style and the brief's tone. */
  tags: string[];
}

/** Free Google Fonts pairs, each tried on real sites. */
export const FONT_PAIRS: FontPair[] = [
  { id: "playful", name: "Playful", display: "Fredoka", body: "Nunito", tags: ["playful", "cute", "kids", "friendly", "toy", "pastel", "stylized", "mascot", "fun"] },
  { id: "modern", name: "Modern", display: "Space Grotesk", body: "Inter", tags: ["tech", "modern", "product", "startup", "clean", "app", "digital"] },
  { id: "editorial", name: "Editorial", display: "Fraunces", body: "Work Sans", tags: ["editorial", "warm", "food", "craft", "natural", "story", "vintage"] },
  { id: "luxury", name: "Luxury", display: "Cormorant Garamond", body: "Manrope", tags: ["luxury", "premium", "elegant", "fashion", "jewellery", "realistic", "classic", "calm"] },
  { id: "bold", name: "Bold", display: "Anton", body: "Inter", tags: ["bold", "sport", "fitness", "loud", "energetic", "automotive", "racing", "street"] },
  { id: "future", name: "Futuristic", display: "Unbounded", body: "Manrope", tags: ["futuristic", "space", "sci-fi", "robot", "gaming", "neon", "cinematic", "tech"] },
  { id: "classic", name: "Classic", display: "Playfair Display", body: "Plus Jakarta Sans", tags: ["classic", "trust", "law", "property", "finance", "hotel", "realistic"] },
  { id: "minimal", name: "Minimal", display: "Inter Tight", body: "Inter", tags: ["minimal", "clean", "product", "architecture", "studio", "monochrome"] },
  { id: "geometric", name: "Geometric", display: "Outfit", body: "DM Sans", tags: ["friendly", "clinic", "health", "education", "service", "low-poly", "clean"] },
  { id: "expressive", name: "Expressive", display: "Syne", body: "Manrope", tags: ["creative", "agency", "portfolio", "art", "music", "fashion", "experimental"] },
  { id: "soft-serif", name: "Soft serif", display: "DM Serif Display", body: "DM Sans", tags: ["warm", "wellness", "beauty", "cafe", "calm", "natural"] },
  { id: "rounded", name: "Rounded", display: "Lexend", body: "Lexend", tags: ["friendly", "kids", "education", "accessible", "app", "cute"] },
];

export const pairById = (id: string) => FONT_PAIRS.find((p) => p.id === id);

export interface DesignSystem {
  id: string;
  name: string;
  /** One line on the idea behind it. */
  note: string;
  accent: string;
  accent2: string;
  /** Hue that tints the neutrals (pages, cards, text) and how strongly, 0 to 1. */
  tintHue: number;
  tint: number;
  /** "auto" takes each template's own mode. */
  mode: "auto" | Mode;
  gradient: { style: GradientStyle; angle: number; light: [string, string, string]; dark: [string, string, string] };
  fonts: { pair: string; display: string; body: string };
  radius: Radius;
  motion: Motion;
}

export interface Tokens {
  mode: Mode;
  page: string;
  surface: string;
  surface2: string;
  ink: string;
  ink2: string;
  muted: string;
  line: string;
  accent: string;
  accentDeep: string;
  accent2: string;
  soft: string;
  onAccent: string;
  dark: string;
  onDark: string;
  light: string;
  onLight: string;
  gradient: [string, string, string];
}

// ------------------------------------------------------------------ what a character feels like

/** Words from the character's tags and style plus the brief's tone, lower case. */
export function moodWords(...lists: (string | string[] | undefined)[]): string[] {
  const out = new Set<string>();
  for (const l of lists) for (const w of (Array.isArray(l) ? l : String(l ?? "").split(/[^a-z-]+/i))) if (w) out.add(w.toLowerCase());
  return [...out];
}

/** Font pairs, best match first. */
export function rankFonts(words: string[]): FontPair[] {
  const set = new Set(words);
  const score = (p: FontPair) => p.tags.reduce((s, t, i) => s + (set.has(t) ? 3 - Math.min(2, i * 0.2) : 0), 0);
  return [...FONT_PAIRS].sort((a, b) => score(b) - score(a) || FONT_PAIRS.indexOf(a) - FONT_PAIRS.indexOf(b));
}

export function motionFor(words: string[]): Motion {
  const has = (...w: string[]) => w.some((x) => words.includes(x));
  if (has("bold", "sport", "fitness", "racing", "energetic", "gaming", "loud", "street", "aggressive")) return "bold";
  if (has("playful", "cute", "kids", "fun", "toy", "mascot", "friendly", "pastel", "stylized")) return "lively";
  return "calm";
}

export function radiusFor(words: string[]): Radius {
  const has = (...w: string[]) => w.some((x) => words.includes(x));
  if (has("playful", "cute", "kids", "friendly", "toy", "pastel", "rounded")) return "round";
  if (has("luxury", "editorial", "architecture", "minimal", "classic", "bold")) return "sharp";
  return "soft";
}

// ------------------------------------------------------------------ the gradient behind it

/**
 * The background the character stands on. In the dark set the base is a deep version of the
 * character's own hue and the glow behind it is its accent; in the light set the same hues are
 * airy. The glow always sits at a different lightness from the character, so it stands out.
 */
export function gradientFor(p: CharacterPalette, accent: string, accent2: string, mood: "deep" | "air" | "vivid" | "quiet" = "deep") {
  const a = toLch(accent);
  const b = toLch(accent2);
  const d = toLch(p.dominant);
  const baseHue = d.c > 0.05 ? d.h : a.h;
  const glowL = p.tone === "light" ? 0.46 : p.tone === "dark" ? 0.62 : 0.54;
  const strength = mood === "vivid" ? 1.15 : mood === "quiet" ? 0.45 : 1;
  const dark: [string, string, string] = [
    fromLch(mood === "quiet" ? 0.15 : 0.17, Math.min(0.05, d.c * 0.4 + 0.02) * strength, baseHue),
    fromLch(glowL, Math.min(0.2, Math.max(0.07, a.c * 0.95)) * strength, a.h),
    fromLch(0.3, Math.min(0.11, Math.max(0.04, b.c * 0.6)) * strength, b.h),
  ];
  const light: [string, string, string] = [
    fromLch(0.975, Math.min(0.025, 0.01 + d.c * 0.15) * strength, baseHue),
    fromLch(p.tone === "light" ? 0.74 : 0.84, Math.min(0.14, Math.max(0.05, a.c * 0.55)) * strength, a.h),
    fromLch(0.91, Math.min(0.07, Math.max(0.025, b.c * 0.35)) * strength, b.h),
  ];
  return { dark, light };
}

/**
 * The gradient as CSS. The glow sits behind where the character stands (x, y in %). Mixing is
 * left to the browser (color-mix in OKLab), so a template's own copy of this function
 * (templates/_kit/character.tsx) gives exactly the same background.
 */
export function gradientCss(stops: string[], style: GradientStyle = "glow", angle = 160, at: [number, number] = [68, 46]): string {
  const [g1, g2, g3] = [stops[0] || "#111111", stops[1] || stops[0] || "#333333", stops[2] || stops[0] || "#222222"];
  const m = (a: string, b: string, p: number) => `color-mix(in oklab, ${a} ${p}%, ${b})`;
  switch (style) {
    case "solid":
      return g1;
    case "linear":
      return `linear-gradient(${angle}deg, ${g1} 0%, ${g2} 55%, ${g3} 100%)`;
    case "radial":
      return `radial-gradient(circle at ${at[0]}% ${at[1]}%, ${g2} 0%, ${m(g2, g1, 45)} 32%, ${g1} 72%)`;
    case "aurora":
      return `radial-gradient(60% 70% at ${at[0]}% ${at[1]}%, ${m(g2, "transparent", 80)} 0%, transparent 62%), radial-gradient(45% 55% at 14% 86%, ${g3} 0%, transparent 70%), radial-gradient(40% 50% at 92% 8%, ${m(m(g2, g3, 50), "transparent", 60)} 0%, transparent 70%), linear-gradient(${angle}deg, ${g1} 0%, ${m(g1, g3, 50)} 100%)`;
    default:
      return `radial-gradient(52% 62% at ${at[0]}% ${at[1]}%, ${g2} 0%, ${m(g2, g1, 40)} 38%, transparent 72%), linear-gradient(${angle}deg, ${g1} 0%, ${m(g1, g3, 35)} 100%)`;
  }
}

// ------------------------------------------------------------------ colours for a mode

/** Every colour a template needs, in one mode, with contrast checked. */
export function tokens(d: DesignSystem, mode: Mode): Tokens {
  const h = d.tintHue;
  const t = Math.max(0, Math.min(1, d.tint));
  const n = (l: number, c = 0.02) => fromLch(l, c * t, h);
  const a = toLch(d.accent);
  let page: string, surface: string, surface2: string, ink: string, ink2: string, muted: string, line: string;
  if (mode === "dark") {
    page = n(0.155, 0.03);
    surface = n(0.2, 0.032);
    surface2 = n(0.245, 0.035);
    ink = n(0.965, 0.012);
    ink2 = n(0.86, 0.016);
    muted = n(0.72, 0.022);
    line = n(0.31, 0.03);
  } else {
    page = n(0.982, 0.012);
    surface = n(0.997, 0.004);
    surface2 = n(0.95, 0.02);
    ink = n(0.2, 0.035);
    ink2 = n(0.32, 0.035);
    muted = n(0.5, 0.03);
    line = n(0.89, 0.02);
  }
  // The accent keeps its hue; in each mode it is moved until it reads as a link or a button edge.
  let accent = d.accent;
  if (mode === "dark" && a.l < 0.6) accent = adjust(accent, { l: Math.max(a.l, 0.68) });
  if (mode === "light" && a.l > 0.72) accent = adjust(accent, { l: 0.6 });
  accent = ensureContrast(accent, page, 3);
  const accentDeep = adjust(accent, (x) => ({ l: mode === "dark" ? x.l - 0.08 : x.l - 0.1 }));
  const accent2 = ensureContrast(mode === "dark" ? adjust(d.accent2, (x) => ({ l: Math.max(x.l, 0.7) })) : adjust(d.accent2, (x) => ({ l: Math.min(x.l, 0.6) })), page, 3);
  const soft = mode === "dark" ? fromLch(0.28, Math.min(0.07, a.c * 0.4), a.h) : fromLch(0.93, Math.min(0.05, a.c * 0.35), a.h);
  const onAccent = onColor(accent, n(0.16, 0.03), "#ffffff");
  const dark = n(0.18, 0.04);
  const light = n(0.97, 0.012);
  muted = ensureContrast(muted, page, 4.6);
  ink2 = ensureContrast(ink2, page, 7);
  ink = ensureContrast(ink, page, 12);
  return {
    mode,
    page,
    surface,
    surface2,
    ink,
    ink2,
    muted,
    line,
    accent,
    accentDeep: ensureContrast(accentDeep, page, 3),
    accent2,
    soft,
    onAccent,
    dark,
    onDark: ensureContrast(n(0.96, 0.012), dark, 12),
    light,
    onLight: ensureContrast(n(0.18, 0.035), light, 12),
    gradient: mode === "dark" ? d.gradient.dark : d.gradient.light,
  };
}

/** True when every text pairing of a token set passes AA (4.5:1, 3:1 for big text and edges). */
export function readable(k: Tokens): { ok: boolean; problems: string[] } {
  const checks: [string, string, string, number][] = [
    ["text on page", k.ink, k.page, 4.5],
    ["text on cards", k.ink, k.surface, 4.5],
    ["muted text on page", k.muted, k.page, 4.5],
    ["button text", k.onAccent, k.accent, 4.5],
    ["text on dark bands", k.onDark, k.dark, 4.5],
    ["text on light bands", k.onLight, k.light, 4.5],
    ["accent on page", k.accent, k.page, 3],
  ];
  const problems = checks.filter(([, f, b, r]) => contrast(f, b) < r).map(([w, f, b]) => `${w} is ${contrast(f, b).toFixed(2)}:1`);
  return { ok: problems.length === 0, problems };
}

// ------------------------------------------------------------------ the options offered

/** Hues that suit a trade when the character brings none of its own (a black shoe, a silver can). */
const TRADE_HUES: Record<string, string> = {
  restaurant: "#e0703a", cafe: "#c8813e", clinic: "#2a9d8f", dentist: "#2a9d8f", gym: "#e5ff3a", fitness: "#e5ff3a", hotel: "#b5833c",
  property: "#c08b5c", legal: "#3b5bdb", finance: "#3b5bdb", tech: "#5b6cff", saas: "#5b6cff", agency: "#ff5a36", shop: "#ff4d8d",
  education: "#4c6ef5", creator: "#a855f7", portfolio: "#7c5cff", events: "#f0539b", product: "#3d7bff", beauty: "#e07aa0",
};

export function tradeAccent(business: string): string {
  return TRADE_HUES[business] || "#6d5dfc";
}

function make(id: string, name: string, note: string, p: CharacterPalette, accent: string, accent2: string, mood: "deep" | "air" | "vivid" | "quiet", base: Omit<DesignSystem, "id" | "name" | "note" | "accent" | "accent2" | "gradient" | "tintHue" | "tint">, style: GradientStyle, tint = 0.55): DesignSystem {
  const g = gradientFor(p, accent, accent2, mood);
  const d = toLch(p.dominant);
  return { ...base, id, name, note, accent, accent2, tintHue: d.c > 0.05 ? d.h : toLch(accent).h, tint, gradient: { style, angle: 160, ...g } };
}

/**
 * Five design systems for a character: its own colours first, then a deep night version, an airy
 * daylight one, a vivid one and a quiet monochrome. Words (its style tags and the brief's tone)
 * pick the typefaces, corners and motion they share.
 */
export function designOptions(p: CharacterPalette, words: string[], fallbackAccent = "#6d5dfc"): DesignSystem[] {
  const pal = p.neutral ? { ...p, accent: fallbackAccent, second: adjust(fallbackAccent, (x) => ({ h: (x.h + 40) % 360, l: Math.min(0.85, x.l + 0.12) })) } : p;
  const fonts = rankFonts(words)[0];
  const base = { mode: "auto" as const, fonts: { pair: fonts.id, display: fonts.display, body: fonts.body }, radius: radiusFor(words), motion: motionFor(words) };
  const a = toLch(pal.accent);
  // A vivid accent: the same hue at full strength; its partner sits across the wheel.
  const vivid = fromLch(Math.min(0.72, Math.max(0.58, a.l)), Math.max(0.17, a.c * 1.25), a.h);
  const vivid2 = fromLch(0.74, 0.15, (a.h + 150) % 360);
  // A quiet accent: the hue, held back.
  const quiet = fromLch(Math.min(0.62, Math.max(0.45, a.l)), Math.min(0.06, a.c * 0.5 + 0.02), a.h);
  const quiet2 = fromLch(0.8, 0.03, a.h);
  const second = hueGap(toLch(pal.second).h, a.h) < 12 && Math.abs(toLch(pal.second).l - a.l) < 0.1 ? adjust(pal.second, (x) => ({ h: (x.h + 35) % 360 })) : pal.second;
  return [
    make("character", "From your character", "Its own colours: the accent, a second colour for highlights and a glow behind it.", pal, pal.accent, second, "deep", base, "glow"),
    make("night", "Night stage", "A deep backdrop in the character's hue, so it glows like a product shot.", pal, pal.accent, second, "deep", { ...base, mode: "dark" }, "radial", 0.75),
    make("daylight", "Daylight", "Airy and light, the character's colours as soft pastels.", pal, pal.accent, second, "air", { ...base, mode: "light" }, "aurora", 0.45),
    make("vivid", "Vivid", "The accent at full strength with a bold partner across the colour wheel.", pal, vivid, vivid2, "vivid", { ...base, motion: base.motion === "calm" ? "lively" : base.motion }, "aurora", 0.6),
    make("quiet", "Quiet", "Near monochrome: the character's hue, held back, for a calm and premium feel.", pal, quiet, quiet2, "quiet", { ...base, motion: "calm", radius: base.radius === "round" ? "soft" : base.radius }, "linear", 0.35),
  ];
}

/** The mode a design system takes in a template made in `native` mode. */
export const modeIn = (d: DesignSystem, native: Mode): Mode => (d.mode === "auto" ? native : d.mode);

/** Corner radius in pixels for each choice. */
export const RADIUS_PX: Record<Radius, number> = { sharp: 2, soft: 12, round: 26 };

/** True when a template's default page colour is dark. */
export function isDark(hex: string): boolean {
  return contrast(hex, "#000000") < contrast(hex, "#ffffff");
}

/** A rough check that a gradient's glow stands out from its base, for tests and the UI. */
export function glowStandsOut(stops: [string, string, string]): boolean {
  return contrast(stops[0], stops[1]) > 1.6;
}
