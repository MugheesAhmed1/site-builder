// The person's changes to a design direction, kept apart from it so a new character can bring new
// directions without losing what they chose (their accent, type, mode, background, corners, motion).
import { isDark, pairById, tokens, type DesignSystem, type GradientStyle, type Mode, type Motion, type Radius, type Tokens } from "@/lib/character/design";

export interface Tweak {
  accent?: string;
  pair?: string;
  mode?: "auto" | Mode;
  style?: GradientStyle;
  radius?: Radius;
  motion?: Motion;
}

export function applyTweak(d: DesignSystem, t: Tweak): DesignSystem {
  const p = t.pair ? pairById(t.pair) : undefined;
  return {
    ...d,
    accent: t.accent && /^#[0-9a-f]{6}$/i.test(t.accent) ? t.accent : d.accent,
    mode: t.mode ?? d.mode,
    radius: t.radius ?? d.radius,
    motion: t.motion ?? d.motion,
    gradient: { ...d.gradient, style: t.style ?? d.gradient.style },
    fonts: p ? { pair: p.id, display: p.display, body: p.body } : d.fonts,
  };
}

/** How a direction looks on its own: its mode ("auto" shows dark, the stage a hero sits on), stage and colours. */
export function stageOf(d: DesignSystem): { mode: Mode; stops: [string, string, string]; k: Tokens; dark: boolean } {
  const mode: Mode = d.mode === "auto" ? "dark" : d.mode;
  const stops = [...(mode === "dark" ? d.gradient.dark : d.gradient.light)] as [string, string, string];
  return { mode, stops, k: tokens(d, mode), dark: isDark(stops[0]) };
}

export function fontsHref(families: string[]) {
  const q = families.map((f) => "family=" + encodeURIComponent(f).replace(/%20/g, "+") + ":wght@400;600;700").join("&");
  return "https://fonts.googleapis.com/css2?" + q + "&display=swap";
}
