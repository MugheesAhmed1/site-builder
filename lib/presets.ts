import type { Design } from "./types";

// Starting points for the design system. Every value can be changed afterwards.
// Each preset is one neutral hue, one accent and a deliberate type pairing; light and
// dark palettes are derived from those in template/src/theme.js.
//
// "Ledger" is inspired by Mughees's portfolio (mugheesahmed-portfolio.vercel.app):
// deep navy base (#0F1620 sits at hue ~257), a settlement-green accent, monospace
// reference codes and the "career ledger" experience layout. It is an approximation,
// not a copy of that site's stylesheet.

export const PRESETS: (Design & { blurb: string })[] = [
  {
    preset: "Ledger",
    blurb: "Fintech calm. Navy, settlement green, reference codes.",
    mode: "dark",
    hue: 257,
    tint: 0.015,
    accent: "#34D399",
    fonts: { display: "Space Grotesk", body: "IBM Plex Sans", mono: "IBM Plex Mono" },
    radius: 10,
    motion: "expressive",
    heroStyle: "statement",
    experienceStyle: "ledger",
  },
  {
    preset: "Studio",
    blurb: "Warm paper, vermilion, confident display type.",
    mode: "light",
    hue: 70,
    tint: 0.02,
    accent: "#D9480F",
    fonts: { display: "Bricolage Grotesque", body: "Hanken Grotesk", mono: "JetBrains Mono" },
    radius: 4,
    motion: "subtle",
    heroStyle: "portrait",
    experienceStyle: "list",
  },
  {
    preset: "Quiet",
    blurb: "Cool greys, cobalt, nothing in the way of the work.",
    mode: "auto",
    hue: 230,
    tint: 0.01,
    accent: "#2A5BD7",
    fonts: { display: "Instrument Sans", body: "Instrument Sans", mono: "DM Mono" },
    radius: 8,
    motion: "subtle",
    heroStyle: "statement",
    experienceStyle: "timeline",
  },
  {
    preset: "Editorial",
    blurb: "For writers and designers. Serif display, forest green.",
    mode: "light",
    hue: 85,
    tint: 0.018,
    accent: "#2F6B4F",
    fonts: { display: "Fraunces", body: "Public Sans", mono: "IBM Plex Mono" },
    radius: 2,
    motion: "subtle",
    heroStyle: "portrait",
    experienceStyle: "list",
  },
];

export const FONT_CHOICES = {
  display: ["Space Grotesk", "Bricolage Grotesque", "Instrument Sans", "Fraunces", "Schibsted Grotesk", "Familjen Grotesk", "Syne", "Newsreader", "Hanken Grotesk"],
  body: ["IBM Plex Sans", "Hanken Grotesk", "Instrument Sans", "Public Sans", "Source Sans 3", "Figtree", "Schibsted Grotesk", "Atkinson Hyperlegible"],
  mono: ["IBM Plex Mono", "JetBrains Mono", "DM Mono", "Space Mono", "Geist Mono"],
};

export const HUE_CHOICES = [
  { name: "Navy", hue: 257 },
  { name: "Slate", hue: 230 },
  { name: "Teal", hue: 190 },
  { name: "Moss", hue: 140 },
  { name: "Sand", hue: 85 },
  { name: "Clay", hue: 50 },
  { name: "Plum", hue: 330 },
];

export function clonePreset(name: string): Design {
  const p = PRESETS.find((x) => x.preset === name) ?? PRESETS[0];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { blurb, ...design } = p;
  return JSON.parse(JSON.stringify(design));
}

// Projects saved by the first version used a different design shape. Map them over.
export function normalizeDesign(d: unknown): Design {
  const x = (d ?? {}) as Partial<Design> & Record<string, unknown>;
  if (typeof x.hue === "number" && x.fonts && "display" in (x.fonts as object)) return x as Design;
  const base = clonePreset(String(x.preset ?? "Ledger").split(" ")[0]);
  const old = x as unknown as { colors?: { primary?: string }; mode?: string };
  if (old.colors?.primary) base.accent = old.colors.primary;
  if (old.mode === "light" || old.mode === "dark") base.mode = old.mode;
  return base;
}
