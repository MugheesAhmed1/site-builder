import type { Design } from "./types";

// Starting points for the design system. The user can change every value afterwards.
// "Ledger" takes its cues from Mughees's portfolio: deep navy (#0F1620), fintech
// receipt-style experience cards, monospace reference codes and animated counters.

export const PRESETS: Design[] = [
  {
    preset: "Ledger",
    mode: "dark",
    colors: {
      bg: "#0F1620",
      surface: "#16212E",
      text: "#E7EDF4",
      muted: "#8D9DB2",
      primary: "#34D399",
      accent: "#F5B941",
      border: "#243244",
    },
    fonts: { heading: "Space Grotesk", body: "Inter", mono: "JetBrains Mono" },
    radius: 14,
    animation: "rich",
    heroStyle: "split",
    experienceStyle: "receipts",
  },
  {
    preset: "Minimal",
    mode: "light",
    colors: {
      bg: "#FFFFFF",
      surface: "#F6F7F9",
      text: "#111827",
      muted: "#5B6474",
      primary: "#2563EB",
      accent: "#0EA5E9",
      border: "#E5E7EB",
    },
    fonts: { heading: "Inter", body: "Inter", mono: "IBM Plex Mono" },
    radius: 10,
    animation: "subtle",
    heroStyle: "centered",
    experienceStyle: "timeline",
  },
  {
    preset: "Neon",
    mode: "dark",
    colors: {
      bg: "#0B0716",
      surface: "#161029",
      text: "#F4F0FF",
      muted: "#A49BC2",
      primary: "#A78BFA",
      accent: "#F472B6",
      border: "#2A2147",
    },
    fonts: { heading: "Sora", body: "DM Sans", mono: "Fira Code" },
    radius: 20,
    animation: "rich",
    heroStyle: "centered",
    experienceStyle: "cards",
  },
  {
    preset: "Editorial",
    mode: "light",
    colors: {
      bg: "#FBF7F0",
      surface: "#F3ECE0",
      text: "#2A211B",
      muted: "#6E6156",
      primary: "#B4532A",
      accent: "#2F6B5B",
      border: "#E2D7C6",
    },
    fonts: { heading: "Fraunces", body: "Source Sans 3", mono: "IBM Plex Mono" },
    radius: 6,
    animation: "subtle",
    heroStyle: "split",
    experienceStyle: "timeline",
  },
];

export const FONT_CHOICES = [
  "Inter",
  "Space Grotesk",
  "Sora",
  "DM Sans",
  "Manrope",
  "Plus Jakarta Sans",
  "Outfit",
  "Poppins",
  "Fraunces",
  "Playfair Display",
  "Source Sans 3",
  "JetBrains Mono",
  "IBM Plex Mono",
  "Fira Code",
];

export function clonePreset(name: string): Design {
  const p = PRESETS.find((x) => x.preset === name) ?? PRESETS[0];
  return JSON.parse(JSON.stringify(p));
}
