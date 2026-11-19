import type { AssetMotion, CameraMove, DirectorId, EnvironmentId, Layout, Lighting, SectionAnimation, SectionSpec } from "./content/blocks";

// The Director (PRD journey). Instead of setting every animation by hand, a section gets a
// visual direction. The direction decides spacing, typography, transitions, camera movement,
// animation intensity, asset treatment and visual hierarchy. A second direction can be
// blended in: the first keeps the look (space, type, asset, tone), the second brings its
// movement (transition, camera and intensity). So "Scientific + Cinematic" is a dark
// laboratory with a slow cinematic orbit, while "Editorial + Minimal" is white, large type
// and a still, slowly turning object. Same template, a completely different section.

export interface DirectorTokens {
  id: DirectorId;
  label: string;
  /** One line on what it does, for the studio. */
  note: string;
  /** Section padding multiplier. */
  space: number;
  /** Longest line of body text, in characters. */
  measure: number;
  type: {
    /** Heading size multiplier. */
    scale: number;
    weight: number;
    /** Letter spacing of headings, em. */
    tracking: number;
    caps: boolean;
    face: "display" | "serif" | "mono" | "body";
    /** Body line height. */
    lead: number;
    /** Kicker style. */
    kicker: "mono" | "caps" | "plain" | "none";
  };
  transition: "fade" | "crossfade" | "wipe" | "depth" | "warp" | "none";
  /** Entrance primitive the words use. */
  entrance: string;
  camera: { move: CameraMove; speed: number; distance: number; fov: number };
  /** 0 still to 1 showpiece. */
  intensity: number;
  asset: { lighting: Lighting; material: "real" | "matte" | "glass" | "clay" | "chrome"; motion: AssetMotion; environment: EnvironmentId; shadow: boolean; glow: number };
  /** The page tone of the section. */
  tone: "dark" | "light" | "page";
  hierarchy: { numbered: boolean; rule: boolean; align: "left" | "center" };
  /** What the Director picks when the person has not chosen. */
  prefers: { layout: Layout; animation: SectionAnimation };
}

export const DIRECTORS: Record<DirectorId, DirectorTokens> = {
  cinematic: {
    id: "cinematic",
    label: "Cinematic",
    note: "Wide frames, deep shadow, slow camera and long fades between sections.",
    space: 1.35,
    measure: 52,
    type: { scale: 1.25, weight: 600, tracking: -0.025, caps: false, face: "display", lead: 1.6, kicker: "caps" },
    transition: "depth",
    entrance: "blur",
    camera: { move: "orbit", speed: 0.12, distance: 1.1, fov: 30 },
    intensity: 0.7,
    asset: { lighting: "dramatic", material: "real", motion: "spin", environment: "space", shadow: true, glow: 0.35 },
    tone: "dark",
    hierarchy: { numbered: false, rule: false, align: "center" },
    prefers: { layout: "fullscreen", animation: "orbit" },
  },
  luxury: {
    id: "luxury",
    label: "Luxury",
    note: "Serif type, quiet gold light, generous space and unhurried reveals.",
    space: 1.45,
    measure: 46,
    type: { scale: 1.12, weight: 400, tracking: -0.01, caps: false, face: "serif", lead: 1.75, kicker: "caps" },
    transition: "crossfade",
    entrance: "mask",
    camera: { move: "orbit", speed: 0.06, distance: 1.15, fov: 28 },
    intensity: 0.4,
    asset: { lighting: "warm", material: "chrome", motion: "float", environment: "sunset", shadow: true, glow: 0.2 },
    tone: "dark",
    hierarchy: { numbered: false, rule: true, align: "center" },
    prefers: { layout: "centered", animation: "reveal" },
  },
  editorial: {
    id: "editorial",
    label: "Editorial",
    note: "Magazine composition: big headlines, columns, numbered parts and rules.",
    space: 1.15,
    measure: 62,
    type: { scale: 1.4, weight: 700, tracking: -0.035, caps: false, face: "serif", lead: 1.65, kicker: "mono" },
    transition: "wipe",
    entrance: "rise",
    camera: { move: "static", speed: 0.04, distance: 1, fov: 32 },
    intensity: 0.35,
    asset: { lighting: "soft", material: "matte", motion: "float", environment: "paper", shadow: false, glow: 0 },
    tone: "light",
    hierarchy: { numbered: true, rule: true, align: "left" },
    prefers: { layout: "editorial", animation: "reveal" },
  },
  documentary: {
    id: "documentary",
    label: "Documentary",
    note: "Plain, honest type, real pictures, captions and calm cuts.",
    space: 1,
    measure: 66,
    type: { scale: 1, weight: 600, tracking: -0.01, caps: false, face: "body", lead: 1.7, kicker: "mono" },
    transition: "fade",
    entrance: "rise",
    camera: { move: "static", speed: 0.03, distance: 1, fov: 35 },
    intensity: 0.3,
    asset: { lighting: "soft", material: "real", motion: "none", environment: "forest", shadow: true, glow: 0 },
    tone: "page",
    hierarchy: { numbered: true, rule: false, align: "left" },
    prefers: { layout: "split", animation: "parallax" },
  },
  futuristic: {
    id: "futuristic",
    label: "Futuristic",
    note: "Neon light, mono labels, glass and fast, sharp transitions.",
    space: 1.1,
    measure: 54,
    type: { scale: 1.2, weight: 600, tracking: 0.01, caps: true, face: "display", lead: 1.6, kicker: "mono" },
    transition: "warp",
    entrance: "clip",
    camera: { move: "orbit", speed: 0.22, distance: 1, fov: 38 },
    intensity: 0.85,
    asset: { lighting: "neon", material: "glass", motion: "spin", environment: "city", shadow: false, glow: 0.6 },
    tone: "dark",
    hierarchy: { numbered: true, rule: false, align: "left" },
    prefers: { layout: "asymmetric", animation: "particles" },
  },
  minimal: {
    id: "minimal",
    label: "Minimal",
    note: "White space first, large quiet type, almost no movement.",
    space: 1.55,
    measure: 50,
    type: { scale: 1.3, weight: 500, tracking: -0.03, caps: false, face: "display", lead: 1.7, kicker: "none" },
    transition: "fade",
    entrance: "fade",
    camera: { move: "static", speed: 0.04, distance: 1.05, fov: 30 },
    intensity: 0.15,
    asset: { lighting: "soft", material: "matte", motion: "float", environment: "paper", shadow: false, glow: 0 },
    tone: "light",
    hierarchy: { numbered: false, rule: false, align: "center" },
    prefers: { layout: "centered", animation: "float" },
  },
  scientific: {
    id: "scientific",
    label: "Scientific",
    note: "Laboratory dark, anatomical light, mono labels and measured, controlled motion.",
    space: 1.1,
    measure: 60,
    type: { scale: 1.05, weight: 600, tracking: -0.015, caps: false, face: "body", lead: 1.65, kicker: "mono" },
    transition: "crossfade",
    entrance: "rise",
    camera: { move: "orbit", speed: 0.08, distance: 1, fov: 32 },
    intensity: 0.45,
    asset: { lighting: "lab", material: "real", motion: "pulse", environment: "lab", shadow: true, glow: 0.25 },
    tone: "dark",
    hierarchy: { numbered: true, rule: true, align: "left" },
    prefers: { layout: "split", animation: "scroll" },
  },
  playful: {
    id: "playful",
    label: "Playful",
    note: "Round shapes, bright colour, bouncy entrances and things that wobble.",
    space: 1.05,
    measure: 52,
    type: { scale: 1.2, weight: 800, tracking: -0.02, caps: false, face: "display", lead: 1.55, kicker: "plain" },
    transition: "warp",
    entrance: "scale",
    camera: { move: "orbit", speed: 0.3, distance: 0.95, fov: 40 },
    intensity: 0.75,
    asset: { lighting: "warm", material: "clay", motion: "float", environment: "sunset", shadow: true, glow: 0.1 },
    tone: "light",
    hierarchy: { numbered: false, rule: false, align: "center" },
    prefers: { layout: "asymmetric", animation: "morph" },
  },
  immersive: {
    id: "immersive",
    label: "Immersive",
    note: "The world fills the screen; the words float over it and the camera travels.",
    space: 1.25,
    measure: 48,
    type: { scale: 1.3, weight: 600, tracking: -0.025, caps: false, face: "display", lead: 1.6, kicker: "caps" },
    transition: "depth",
    entrance: "depth",
    camera: { move: "scroll", speed: 0.15, distance: 0.9, fov: 45 },
    intensity: 0.9,
    asset: { lighting: "dramatic", material: "real", motion: "scroll", environment: "aurora", shadow: false, glow: 0.4 },
    tone: "dark",
    hierarchy: { numbered: false, rule: false, align: "center" },
    prefers: { layout: "fullscreen", animation: "scroll" },
  },
  product: {
    id: "product",
    label: "Product-focused",
    note: "The product is the hero: studio light, clean shadow, turntable and specs.",
    space: 1.1,
    measure: 56,
    type: { scale: 1.15, weight: 700, tracking: -0.03, caps: false, face: "display", lead: 1.6, kicker: "caps" },
    transition: "crossfade",
    entrance: "rise",
    camera: { move: "orbit", speed: 0.18, distance: 1, fov: 30 },
    intensity: 0.6,
    asset: { lighting: "studio", material: "real", motion: "spin", environment: "studio", shadow: true, glow: 0.1 },
    tone: "page",
    hierarchy: { numbered: false, rule: false, align: "left" },
    prefers: { layout: "split", animation: "orbit" },
  },
};

export const DIRECTOR_IDS = Object.keys(DIRECTORS) as DirectorId[];

export const isDirector = (v: unknown): v is DirectorId => typeof v === "string" && v in DIRECTORS;

/** The tokens of a direction, with a second one blended in for movement. */
export function direct(primary: DirectorId, secondary?: DirectorId): DirectorTokens {
  const a = DIRECTORS[primary] ?? DIRECTORS.editorial;
  const b = secondary && secondary !== primary ? DIRECTORS[secondary] : null;
  if (!b) return a;
  const mix = (x: number, y: number, k = 0.5) => Math.round((x * (1 - k) + y * k) * 1000) / 1000;
  return {
    ...a,
    label: a.label + " + " + b.label,
    note: `${a.label} look with ${b.label.toLowerCase()} movement.`,
    space: mix(a.space, b.space, 0.3),
    type: { ...a.type, scale: mix(a.type.scale, b.type.scale, 0.3) },
    transition: b.transition,
    entrance: b.entrance,
    camera: { ...b.camera, distance: mix(a.camera.distance, b.camera.distance) },
    intensity: mix(a.intensity, b.intensity, 0.6),
    asset: { ...a.asset, motion: b.asset.motion === "none" ? a.asset.motion : a.asset.motion === "pulse" ? "pulse" : b.asset.motion, glow: mix(a.asset.glow, b.asset.glow) },
  };
}

/** The parameters a section starts from when the Director alone decides. */
export function directedSpec(director: DirectorId, o: { lead?: boolean; index?: number; subject?: string; heroType?: SectionSpec["hero"]["type"]; secondary?: DirectorId } = {}): SectionSpec {
  const t = direct(director, o.secondary);
  const i = o.index ?? 0;
  const heroType = o.heroType ?? (o.lead ? (t.intensity >= 0.4 ? "glb" : "illustration") : "none");
  const layout: Layout = o.lead ? t.prefers.layout : i % 3 === 1 ? "split" : i % 3 === 2 ? (t.prefers.layout === "editorial" ? "editorial" : "asymmetric") : t.prefers.layout === "fullscreen" ? "centered" : t.prefers.layout;
  return {
    layout,
    hero: { type: heroType, subject: o.subject, scale: 1, rotation: [0, 0, 0], position: [0, 0], camera: t.camera.move, lighting: t.asset.lighting, motion: t.asset.motion, illustration: (["orbits", "waves", "blob", "rings", "grid"] as const)[i % 5] },
    background: t.tone === "dark" ? { type: o.lead ? "environment" : "solid", environment: t.asset.environment, tone: "auto", dim: 0.35 } : { type: o.lead && t.intensity >= 0.5 ? "gradient" : "solid", tone: "auto" },
    animation: o.lead ? t.prefers.animation : (["reveal", "parallax", "float", "scroll"] as const)[i % 4],
    director,
    secondary: o.secondary,
  };
}

/** A spec from saved data: unknown values fall back to what the Director would choose. */
export function cleanSpec(v: unknown, fallback: SectionSpec): SectionSpec {
  const s = (v && typeof v === "object" ? v : {}) as Partial<SectionSpec>;
  const pick = <T extends string>(x: unknown, ok: readonly T[], d: T): T => (typeof x === "string" && (ok as readonly string[]).includes(x) ? (x as T) : d);
  const director = isDirector(s.director) ? s.director : fallback.director;
  return {
    layout: pick(s.layout, ["fullscreen", "split", "centered", "asymmetric", "editorial"], fallback.layout),
    hero: { ...fallback.hero, ...(s.hero && typeof s.hero === "object" ? s.hero : {}), type: pick(s.hero?.type, ["glb", "image", "video", "illustration", "particles", "none"], fallback.hero.type) },
    background: { ...fallback.background, ...(s.background && typeof s.background === "object" ? s.background : {}), type: pick(s.background?.type, ["solid", "gradient", "image", "video", "environment", "particles"], fallback.background.type) },
    animation: pick(s.animation, ["float", "reveal", "orbit", "scroll", "parallax", "morph", "particles"], fallback.animation),
    director,
    secondary: isDirector(s.secondary) ? s.secondary : undefined,
  };
}

/** Environment colours: the base, a glow and whether words on it should be light. */
export const ENV_LOOK: Record<EnvironmentId, { base: string; glow: string; floor: string; dark: boolean }> = {
  lab: { base: "#060b12", glow: "#1f6f8b", floor: "#0e1a24", dark: true },
  studio: { base: "#eceae6", glow: "#ffffff", floor: "#d9d6d0", dark: false },
  space: { base: "#04030b", glow: "#3a2a7a", floor: "#0a0820", dark: true },
  ocean: { base: "#021622", glow: "#0f7d9c", floor: "#032a3a", dark: true },
  forest: { base: "#0a140c", glow: "#4f7f3a", floor: "#12210f", dark: true },
  sunset: { base: "#f6e3cf", glow: "#f59e5b", floor: "#e9c8a6", dark: false },
  city: { base: "#07060f", glow: "#c026d3", floor: "#120c22", dark: true },
  paper: { base: "#faf8f4", glow: "#ffffff", floor: "#eee9e0", dark: false },
  aurora: { base: "#030914", glow: "#22c55e", floor: "#06142a", dark: true },
};
