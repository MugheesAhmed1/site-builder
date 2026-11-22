// Steps 3 to 6 of the journey meet here (docs/CHARACTER-JOURNEY.md): a design system drawn from
// the character is poured into a template. Each template says which of its colours plays which
// part (template.json "roles"): its page, its cards, its text, its accent and so on. The design
// system's colours for the template's mode go into those parts, its typefaces into the template's
// font slots, the gradient into the stage the character stands on, and the character itself into
// content.character. Colours a template has no part for stay as they are.
import { adjust, fromLch, mix, toLch } from "./color";
import { RADIUS_PX, isDark, modeIn, tokens, type DesignSystem, type Mode, type Tokens } from "./design";

/** The part a template colour plays. */
export type Role =
  | Exclude<keyof Tokens, "mode" | "gradient">
  /** A bright version of the accent that dark text sits on (chips, highlights). */
  | "fill"
  | "fill2"
  /** A pale tint of the accent for light text effects on dark pages. */
  | "tint"
  /** A deep colour in the second hue (bands, map water). */
  | "deep"
  /** A quieter muted (code comments, hairline captions). */
  | "faint"
  /** The stage gradient's base, glow and second colour. */
  | "g1"
  | "g2"
  | "g3"
  | "keep";

export interface TemplateRoles {
  /** The template's own mode: the colours its page was made in. */
  mode: Mode;
  /** The modes it can take. Default: its own only. */
  modes?: Mode[];
  /** The stage the character stands on: dark (light words on it) or light (dark words). */
  stage: Mode;
  colors: Record<string, Role>;
  fonts?: Record<string, "display" | "body" | "keep">;
  /** The theme number that holds the corner radius in pixels, if any. */
  radius?: string;
}

type Content = Record<string, any>;

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const HEX = /^#[0-9a-f]{6}$/i;

/**
 * Roles for a template that has none: read from its colour names and how light each colour is.
 * The builder's own templates all carry roles; this keeps a new or uploaded one working.
 */
export function guessRoles(theme: { colors?: Record<string, string>; fonts?: Record<string, string> } = {}): TemplateRoles {
  const colors = theme.colors || {};
  const pageKey = ["page", "bg", "background", "paper", "mist"].find((k) => HEX.test(colors[k] || ""));
  const mode: Mode = pageKey && isDark(colors[pageKey]) ? "dark" : "light";
  const out: Record<string, Role> = {};
  for (const [k, v] of Object.entries(colors)) {
    if (!HEX.test(String(v))) continue;
    const n = k.toLowerCase();
    const r: Role =
      /^(page|bg|background|paper|mist|canvas)$/.test(n) ? "page"
      : /^(surface|panel|card|cards|box)$/.test(n) ? "surface"
      : /^(surface2|panel2|raised)$/.test(n) ? "surface2"
      : /^(text|ink|fg|foreground|heading|title)$/.test(n) ? "ink"
      : /^(body|ink2|text2|subtle)$/.test(n) ? "ink2"
      : /^(muted|grey|gray|caption)$/.test(n) ? "muted"
      : /^(line|border|rule|divider)$/.test(n) ? "line"
      : /^(accent|primary|brand|hot|main)$/.test(n) ? "accent"
      : /(soft|light)$/.test(n) && /accent|hot|primary|brand/.test(n) ? "soft"
      : /(deep|hover|dark)$/.test(n) && /accent|hot|primary|brand/.test(n) ? "accentDeep"
      : /^(accent2|secondary|second|highlight|glow)$/.test(n) ? "accent2"
      : /^(onaccent|buttontext|onprimary)$/.test(n) ? "onAccent"
      : /^(dark|night|ink3)$/.test(n) ? "dark"
      : /^(ondark|textondark)$/.test(n) ? "onDark"
      : /^(light|cream|white)$/.test(n) ? "light"
      : /^(onlight|lighttext)$/.test(n) ? "onLight"
      : /^(deep|sea|navy)$/.test(n) ? "deep"
      : "keep";
    out[k] = r;
  }
  const fonts: Record<string, "display" | "body" | "keep"> = {};
  for (const k of Object.keys(theme.fonts || {})) fonts[k] = /display|serif|head|title/i.test(k) ? "display" : /mono|code/i.test(k) ? "keep" : "body";
  return { mode, stage: mode, colors: out, fonts };
}

/** The roles a template carries, or a guess from its colours. */
export function rolesOf(t: { roles?: TemplateRoles; content?: Content }): TemplateRoles {
  return t.roles && t.roles.colors ? t.roles : guessRoles(t.content?.theme);
}

/** The mode a design system takes in a template: its own choice where the template can show it. */
export function modeFor(d: DesignSystem, r: TemplateRoles): Mode {
  const want = modeIn(d, r.mode);
  return (r.modes?.length ? r.modes : [r.mode]).includes(want) ? want : r.mode;
}

/** The stage gradient a template gets from a design system. */
export const stageStops = (d: DesignSystem, r: TemplateRoles): [string, string, string] => [...(r.stage === "dark" ? d.gradient.dark : d.gradient.light)] as [string, string, string];

/** One colour for a part, in a mode. */
export function colorFor(role: Role, k: Tokens, d: DesignSystem, stops: [string, string, string]): string | undefined {
  const a = toLch(d.accent);
  const b = toLch(d.accent2);
  switch (role) {
    case "keep":
      return undefined;
    case "fill":
      return fromLch(0.88, Math.min(0.2, Math.max(0.1, a.c)), a.h);
    case "fill2":
      return fromLch(0.82, Math.min(0.19, Math.max(0.09, b.c)), b.h);
    case "tint":
      return fromLch(0.93, Math.min(0.06, Math.max(0.025, a.c * 0.4)), a.h);
    case "deep":
      return fromLch(k.mode === "dark" ? 0.26 : 0.33, Math.min(0.08, Math.max(0.03, b.c * 0.5)), b.h);
    case "faint":
      return mix(k.muted, k.page, 0.42);
    case "g1":
      return stops[0];
    case "g2":
      return stops[1];
    case "g3":
      return stops[2];
    default:
      return k[role];
  }
}

/** Idle motion for the design system's pace. */
const PACE = { calm: { speed: 0.8, motion: "float" }, lively: { speed: 1.1, motion: "float" }, bold: { speed: 1.25, motion: "sway" } } as const;

/**
 * A template's content with a design system poured in: colours by role in the template's mode,
 * typefaces, corners, the stage gradient and the light on the character. Words, pictures and
 * sections are untouched.
 */
export function applyDesign(content: Content, roles: TemplateRoles, d: DesignSystem): Content {
  const next = clone(content);
  const mode = modeFor(d, roles);
  const k = tokens(d, mode);
  const stops = stageStops(d, roles);
  next.theme = next.theme || {};
  const colors: Record<string, string> = { ...(next.theme.colors || {}) };
  for (const [key, role] of Object.entries(roles.colors)) {
    if (!(key in colors)) continue;
    const c = colorFor(role, k, d, stops);
    if (c) colors[key] = c;
  }
  next.theme.colors = colors;
  if (next.theme.fonts) {
    const fonts: Record<string, string> = { ...next.theme.fonts };
    for (const [key, role] of Object.entries(roles.fonts || {})) {
      if (!(key in fonts) || role === "keep") continue;
      fonts[key] = role === "display" ? d.fonts.display : d.fonts.body;
    }
    next.theme.fonts = fonts;
  }
  if (roles.radius && typeof next.theme[roles.radius] === "number") next.theme[roles.radius] = RADIUS_PX[d.radius];
  next.design = { ...(next.design || {}), stops, style: d.gradient.style, angle: d.gradient.angle, light: roles.stage === "dark" ? adjust(d.accent2, (x) => ({ l: Math.max(x.l, 0.78) })) : adjust(d.accent2, (x) => ({ l: Math.min(Math.max(x.l, 0.62), 0.8) })), image: "" };
  const pace = PACE[d.motion] || PACE.calm;
  next.character = { ...(next.character || {}), paint: d.accent, speed: pace.speed, motion: next.character?.motion === "spin" || next.character?.motion === "still" ? next.character.motion : pace.motion };
  return next;
}

/** What content.character needs from a library model. */
export interface ModelInfo {
  asset: string;
  preview: string;
  name: string;
  clips?: { name: string }[];
  display?: { tint?: string | null; screen?: string | null };
  credit?: string;
  category?: string;
}

/**
 * content.character for a model: where it is, its picture and name, the parts a site may paint
 * and the screens that show the site's gradient. The pose a person set (turn, size) is kept.
 */
export function characterFrom(m: ModelInfo, current: Content = {}): Content {
  const vehicle = m.category === "vehicle";
  return {
    ...current,
    src: m.asset,
    poster: m.preview,
    name: m.name,
    clip: "",
    finish: current.finish && current.finish !== "original" && current.parts ? current.finish : "original",
    parts: m.display?.tint || "",
    screen: m.display?.screen || "",
    credit: m.credit || "",
    turn: typeof current.turn === "number" && current.src ? current.turn : vehicle ? -32 : -18,
  };
}

/** The whole content for a template, a design system and a model: what the journey's step 6 starts from. */
export function composeContent(content: Content, roles: TemplateRoles, d: DesignSystem, m?: ModelInfo | null): Content {
  const next = applyDesign(content, roles, d);
  if (m) next.character = { ...characterFrom(m, next.character), paint: next.character.paint, speed: next.character.speed, motion: next.character.motion };
  return next;
}
