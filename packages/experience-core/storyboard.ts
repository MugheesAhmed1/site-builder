import type { Beat, CameraConfig, ExperienceScene, Interaction, MotionChannels, MotionLanguage, Param, SceneKind, SceneLayer, SceneObject, ScrollMapping, Transition } from "@/template/src/experiences/types";
import { allowedAt, primitive } from "@/template/src/motion/primitives";
import { visibleSections } from "@/template/src/content/sections";
import type { Concept } from "./concepts";

// Stage 3 of the pipeline (PRD sections 7 and 13): the experience storyboard. The concept's
// beats are laid over the site's content so the website becomes a sequence of scenes. The
// hero opens the story, the middle scenes carry it, and the final beat always lands on the
// call to action.

const KIND: Record<string, SceneKind> = {
  hero: "hero",
  tiles: "statistics",
  highlights: "statistics",
  stats: "statistics",
  clients: "showcase",
  services: "feature-world",
  about: "story",
  process: "process",
  gallery: "gallery",
  team: "story",
  pricing: "comparison",
  testimonials: "testimonial",
  faq: "faq",
  cta: "cta",
  visit: "contact",
  custom: "story",
  contact: "contact",
  experience: "timeline",
  education: "timeline",
  projects: "case-study",
  skills: "feature-world",
  awards: "showcase",
  certifications: "showcase",
  languages: "feature-world",
};

export function sceneKindOf(section: string, index: number): SceneKind {
  const k = KIND[section] ?? "story";
  // The first offer after the hero is the product reveal moment.
  if (index === 1 && (k === "feature-world" || k === "case-study")) return "product-reveal";
  return k;
}

function blend(a: Beat, b: Beat, t: number): Beat {
  const out: Beat = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k] ?? b[k];
    const y = b[k] ?? a[k];
    out[k] = typeof x === "number" && typeof y === "number" ? Math.round((x + (y - x) * t) * 1000) / 1000 : ((t < 0.5 ? x : y) as Param);
  }
  return out;
}

/** The beat (fractional index into the concept's beats) each scene lands on. */
export function beatPositions(kinds: SceneKind[], beats: number): number[] {
  const last = beats - 1;
  const n = kinds.length;
  // Scenes from the first call to action or contact onward arrive at the destination.
  let end = kinds.findIndex((k, i) => i > 0 && (k === "cta" || k === "contact") && kinds.slice(i).every((x) => x === "cta" || x === "contact"));
  if (end < 0) end = n - 1;
  const mid = Math.max(1, end - 1);
  return kinds.map((_, i) => {
    if (i === 0) return 0;
    if (i >= end) return last;
    if (last <= 1) return Math.min(last, i / mid);
    return 1 + ((i - 1) / Math.max(1, mid - 1 || 1)) * (last - 2);
  });
}

const ENTRANCE: Record<MotionLanguage, string> = {
  restrained: "entrance.mask",
  precise: "entrance.clip",
  elastic: "entrance.scale",
  stable: "entrance.rise",
  fluid: "entrance.blur",
  bold: "entrance.depth",
};
const HEADLINE: Record<MotionLanguage, string> = {
  restrained: "text.mask",
  precise: "text.chars",
  elastic: "text.chars",
  stable: "text.words",
  fluid: "text.words",
  bold: "text.kinetic",
};

const TRANSITION: Record<string, string> = {
  "environment-morph": "transition.morph",
  "object-continues": "transition.continue",
  warp: "transition.warp",
  depth: "transition.depth",
  "camera-orbit": "transition.continue",
  "camera-dolly": "transition.depth",
  mask: "transition.wipe",
  "page-turn": "transition.wipe",
};

const OBJECT_ENGINES = new Set(["morph", "brew", "grow", "assemble", "orbit"]);
const DOM_ENGINES = new Set(["interface", "ledger", "kinetic"]);
const CENTRED_ENGINES = new Set(["landscape", "depths", "cosmos", "liquid", "playground", "kinetic", "progress", "ledger"]);

export function layerOf(c: Concept, webgl: boolean): SceneLayer {
  if (webgl) return "3d";
  if (OBJECT_ENGINES.has(c.engine)) return "object";
  if (DOM_ENGINES.has(c.engine)) return "dom";
  return "canvas";
}

export interface StoryboardInput {
  concept: Concept;
  kind: "website" | "portfolio";
  content: unknown;
  intensity: number;
  language: MotionLanguage;
  channels: MotionChannels;
  webgl: boolean;
  /** Scenes the person hid in the Page panel stay hidden. */
  hidden?: string[];
}

function allowed(id: string, level: number, channel: number): string | null {
  if (channel <= 0) return null;
  const p = primitive(id);
  if (!p) return id;
  return p.minLevel <= level ? id : null;
}

export function storyboard(s: StoryboardInput): ExperienceScene[] {
  const { concept: c, intensity: level } = s;
  const sections = visibleSections(s.kind, s.content as Record<string, unknown>);
  const kinds = sections.map((id, i) => sceneKindOf(id, i));
  const pos = beatPositions(kinds, c.beats.length);
  const travel: CameraConfig["travel"] = c.metaphor === "dive" ? "dive" : c.metaphor === "orbit" ? "orbit" : c.metaphor === "journey" || c.metaphor === "walk" || c.metaphor === "fly" ? "forward" : c.metaphor === "build" ? "rise" : "push";
  const camOf = (b: Beat) => (typeof b.cam === "number" ? b.cam : typeof b.depth === "number" ? b.depth : typeof b.progress === "number" ? b.progress : undefined);
  const entrance = allowedAt(ENTRANCE[s.language], level);
  const headline = level <= 2 ? "text.words" : allowedAt(HEADLINE[s.language], level);
  const layer = layerOf(c, s.webgl);
  const centred = CENTRED_ENGINES.has(c.engine);
  let side: "left" | "right" = "left";

  const scenes: ExperienceScene[] = sections.map((section, i) => {
    const kind = kinds[i];
    const p = pos[i];
    const lo = Math.floor(p);
    const hi = Math.min(c.beats.length - 1, Math.ceil(p));
    const beat = blend(c.beats[lo].beat, c.beats[hi].beat, p - lo);
    const story = c.beats[Math.round(p)];
    const prevBeat = i > 0 ? blend(c.beats[Math.floor(pos[i - 1])].beat, c.beats[Math.min(c.beats.length - 1, Math.ceil(pos[i - 1]))].beat, pos[i - 1] - Math.floor(pos[i - 1])) : beat;
    const camTo = camOf(beat);
    const camFrom = camOf(prevBeat);
    const camera: CameraConfig | undefined = camTo !== undefined && s.channels.scroll > 0 ? { travel, from: camFrom ?? camTo, to: camTo } : undefined;

    // Words leave room for the stage: centred over open worlds, alternating beside objects.
    let composition: ExperienceScene["composition"];
    if (kind === "cta") composition = "center";
    else if (kind === "faq" || kind === "comparison" || kind === "gallery" || kind === "case-study" || kind === "timeline") composition = "wide";
    else if (centred) composition = kind === "hero" ? "center" : i % 3 === 2 ? "wide" : "center";
    else {
      composition = side;
      side = side === "left" ? "right" : "left";
    }

    const objects: SceneObject[] = [{ id: c.anchor.type, role: "anchor", type: c.anchor.type, behaviours: c.anchor.behaviours }];
    if (c.character && s.channels.characters > 0) {
      const extra = level >= 9 ? (["followCursor", "wander"] as const) : [];
      objects.push({ id: c.character.type, role: "character", type: c.character.type, behaviours: Array.from(new Set([...c.character.behaviours.filter((b) => (b === "followCursor" ? level >= 6 : true)), ...extra])) });
    }
    if (["landscape", "depths", "cosmos", "brew", "grow", "playground", "liquid"].includes(c.engine) && s.channels.environment > 0) objects.push({ id: "particles", role: "particles", type: c.engine + "-particles", behaviours: ["idle", "reactToScroll"] });

    const interactions: Interaction[] = [];
    for (const x of c.interactions) {
      const ch = x.input === "cursor" ? s.channels.cursor : x.input === "click" || x.input === "touch" ? s.channels.click : x.input === "hover" ? s.channels.hover : 1;
      const ok = allowed(x.primitive, level, ch);
      if (ok) interactions.push({ ...x, primitive: ok });
    }
    if (kind === "cta" || kind === "hero") {
      const mag = allowed("hover.magnetic", level, s.channels.hover);
      if (mag) interactions.push({ input: "hover", target: "cta", primitive: mag, response: "The button leans toward the cursor", touch: "The button presses down on tap" });
      interactions.push({ input: "click", target: "cta", primitive: "click.ripple", response: "The button answers the press", touch: "The button answers the tap" });
    }
    if (kind === "gallery") {
      const img = allowed("hover.image", level, s.channels.hover);
      if (img) interactions.push({ input: "hover", target: "gallery", primitive: img, response: "Pictures open up under the cursor", touch: "Swipe through the pictures" });
    }
    if (kind === "faq") interactions.push({ input: "keyboard", target: "faq", primitive: "click.ripple", response: "Questions open with Enter or a click", touch: "Tap a question to open it" });

    const scroll: ScrollMapping[] = [];
    if (s.channels.scroll > 0) {
      if (camera) scroll.push({ source: "scene", target: "camera", ref: "stage" });
      scroll.push({ source: "scene", target: c.engine === "liquid" ? "shader" : OBJECT_ENGINES.has(c.engine) || c.engine === "interface" || c.engine === "ledger" ? "object" : "environment", ref: c.anchor.type });
      if (headline === "text.kinetic" || c.engine === "kinetic") scroll.push({ source: "scene", target: "typography", ref: "headline" });
      if (s.webgl) scroll.push({ source: "scene", target: "shader", ref: "stage" });
    }
    scroll.push({ source: "page", target: "progress", ref: "page" });

    const transitions: Transition[] = [];
    if (i < sections.length - 1 && s.channels.transitions > 0) {
      const t = allowedAt(TRANSITION[c.transitionMechanic] ?? "transition.continue", level);
      transitions.push({ primitive: t, mechanic: c.transitionMechanic, to: sections[i + 1] });
    }

    const pinned = level >= 5 && s.channels.scroll > 0 && (kind === "hero" || kind === "product-reveal" || kind === "story" || kind === "cta");
    const duration = kind === "hero" ? (level >= 7 ? 1.6 : level >= 5 ? 1.3 : 1) : pinned ? (level >= 8 ? 1.4 : 1.2) : 1;

    return {
      id: section,
      section,
      kind,
      title: story.title,
      note: story.note,
      duration,
      layer: i === 0 || layer === "dom" ? layer : layer,
      composition,
      environment: { id: c.world, state: i === 0 ? "idle" : i === sections.length - 1 ? "transition" : "scroll" },
      beat,
      objects,
      camera,
      scroll,
      interactions,
      transitions,
      entrance: i === 0 ? allowedAt("entrance.split", level) : entrance,
      text: i === 0 ? headline : level >= 3 ? allowedAt("text.mask", level) : "text.words",
      hidden: s.hidden?.includes(section) || undefined,
    };
  });
  return scenes;
}
