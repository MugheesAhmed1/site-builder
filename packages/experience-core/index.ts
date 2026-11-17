import type { Experience, ExperienceMode, MotionChannels, Params } from "@/template/src/experiences/types";
import { CONCEPTS, conceptById, type Concept } from "./concepts";
import { ENVIRONMENTS, environmentById } from "./environments";
import { packById, presetById } from "./presets";
import { directionsFor, hash } from "./direction";
import { motionLanguageFor, understand, type BriefInput, type StyleChoice } from "./understand";
import { storyboard } from "./storyboard";
import { applyBetter, type BetterId } from "./better";
import { budgetFor, channelsFor, fallbacksFor, selectSystems, tierOf, useWebgl } from "./systems";

// The experience concept engine (PRD sections 2, 7 and 78, P0 items 1 to 9). One call runs the
// whole pipeline: understand, creative direction (three directions, the strongest chosen),
// storyboard (the scene graph), select motion systems, then the performance pass. The result
// is the Experience JSON that the studio preview and both downloads render.

export { CONCEPTS, conceptById } from "./concepts";
export { ENVIRONMENTS, environmentById } from "./environments";
export { PRESETS, PACKS, presetById, packById } from "./presets";
export { understand } from "./understand";
export { findImprovements, applyBetter } from "./better";
export type { BetterId, Improvement } from "./better";
export type { Brief, StyleChoice } from "./understand";

export interface GenerateOptions {
  seed?: number;
  intensity?: number;
  preset?: string;
  pack?: string;
  /** Use this concept instead of choosing one. */
  concept?: string;
  mode?: ExperienceMode;
  style?: StyleChoice;
  avoid?: string[];
  channels?: Partial<MotionChannels>;
  /** False keeps the stage in 2D whatever the intensity. */
  allow3d?: boolean;
  sound?: boolean;
  control?: Experience["control"];
  /** Settings layered over the concept's stage (a pack, or a world change). */
  params?: Params;
  world?: string;
  hidden?: string[];
  /** Make it better fixes to keep applying. */
  better?: string[];
}

const clampLevel = (n: number) => Math.max(1, Math.min(10, Math.round(n)));

function intensityFor(c: Concept, o: GenerateOptions): number {
  if (o.intensity !== undefined) return clampLevel(o.intensity);
  let n = c.motionIntensity;
  if (o.style === "minimal") n = Math.min(n, 4);
  if (o.style === "luxury") n = Math.min(n, 5);
  if (o.style === "bold") n = Math.max(n, 7);
  if (o.style === "experimental") n = Math.max(n, 9);
  return clampLevel(Math.max(n, c.minIntensity));
}

export function generateExperience(input: BriefInput, o: GenerateOptions = {}): Experience {
  const seed = o.seed ?? hash(input.query + input.category);
  const brief = understand(input, { style: o.style, mode: o.mode });
  const pack = o.pack ? packById(o.pack) : undefined;
  const preset = o.preset ? presetById(o.preset) : undefined;
  const only = pack ? [pack.concept] : o.concept ? [o.concept] : preset?.concepts;
  const { directions, chosen } = directionsFor({ ...brief, wantMode: o.mode ?? preset?.mode ?? brief.wantMode }, { seed, only, avoid: o.avoid, intensity: o.intensity ?? preset?.intensity });
  const concept = conceptById(o.concept ?? chosen?.concept ?? "") ?? conceptById(chosen?.concept ?? "") ?? CONCEPTS[0];
  const level = intensityFor(concept, { ...o, intensity: o.intensity ?? preset?.intensity });
  const channels = channelsFor(level, o.channels);
  const webgl = useWebgl(concept, level, o.allow3d !== false);
  const language = preset?.motionLanguage ?? motionLanguageFor(brief);
  const smooth = level >= 3 && channels.scroll > 0;
  const sound = !!o.sound;
  const world = o.world && environmentById(o.world) ? o.world : concept.world;
  const env = environmentById(world);
  const params: Params = { ...concept.params, ...(world !== concept.world && env && env.engine === concept.engine ? env.params : {}), ...(pack?.params ?? {}), ...(o.params ?? {}) };
  const scenes = storyboard({ concept, kind: input.kind, content: input.content, intensity: level, language, channels, webgl, hidden: o.hidden });
  for (const s of scenes) if (s.environment) s.environment.id = world;
  const { technologies, profile } = selectSystems(concept, level, webgl, smooth, sound);
  const tier = tierOf(concept, webgl, level);
  const cursorOn = channels.cursor > 0;
  const mode = (o.mode && concept.modes.includes(o.mode) ? o.mode : directions.find((d) => d.concept === concept.id)?.mode) ?? concept.modes[0];
  return applyBetter({
    version: 2,
    seed,
    mode,
    concept: concept.id,
    name: concept.name,
    pitch: concept.pitch,
    metaphor: concept.metaphor,
    preset: preset?.id,
    pack: pack?.id,
    world,
    intensity: level,
    interactionLevel: Math.min(10, Math.round((channels.cursor + channels.click + channels.hover) * 1.1 + (concept.character ? 1 : 0))),
    primaryInteraction: "scroll",
    secondaryInteraction: concept.interactions.find((x) => x.input === "cursor")?.input ?? "click",
    heroMechanic: concept.heroMechanic,
    transitionMechanic: concept.transitionMechanic,
    visualAnchor: concept.visualAnchor,
    motionLanguage: language,
    tier,
    profile,
    technologies,
    stage: { engine: concept.engine, webgl: webgl ? concept.webgl : undefined, params },
    scenes,
    channels,
    cursor: !cursorOn ? "standard" : preset?.cursor ?? (concept.character ? "character" : level >= 6 ? "ring" : "standard"),
    smooth,
    sound,
    budget: budgetFor(tier, level, channels),
    fallbacks: fallbacksFor(concept),
    directions,
    noWebgl: o.allow3d === false || undefined,
    control: o.control ?? "smart",
    better: o.better?.length ? o.better : undefined,
  });
}

/** The options that rebuild the same experience, so a change keeps everything else. */
export function optionsOf(e: Experience): GenerateOptions {
  const custom = e.control === "custom";
  return {
    seed: e.seed,
    intensity: e.intensity,
    concept: e.concept,
    preset: e.preset,
    pack: e.pack,
    mode: e.mode,
    world: e.world,
    sound: e.sound,
    control: e.control,
    allow3d: e.noWebgl ? false : undefined,
    channels: custom ? e.channels : undefined,
    hidden: e.scenes.filter((s) => s.hidden).map((s) => s.section),
    better: e.better,
  };
}

/** Make it better: apply some of the fixes findImprovements offered. */
export function makeBetter(e: Experience, input: BriefInput, ids: BetterId[]): Experience {
  const better = Array.from(new Set([...(e.better ?? []), ...ids.filter((id) => id !== "spacing")]));
  return { ...generateExperience(input, { ...optionsOf(e), better, channels: e.control === "custom" ? e.channels : undefined }), directions: e.directions };
}

/** Motion panel (PRD section 30): set channels by hand. The experience switches to Custom control. */
export function setChannels(e: Experience, input: BriefInput, channels: Partial<MotionChannels>): Experience {
  return { ...generateExperience(input, { ...optionsOf(e), control: "custom", channels: { ...e.channels, ...channels } }), directions: e.directions };
}

/** Back to Smart: the channels follow the intensity again. */
export function setControl(e: Experience, input: BriefInput, control: Experience["control"]): Experience {
  return { ...generateExperience(input, { ...optionsOf(e), control, channels: control === "custom" ? e.channels : undefined }), directions: e.directions };
}

/** Turn the 3D layer on or off (it still only runs where the device allows). */
export function set3d(e: Experience, input: BriefInput, on: boolean): Experience {
  return { ...generateExperience(input, { ...optionsOf(e), allow3d: on ? undefined : false }), directions: e.directions };
}

/** Rebuild the scenes after the content changed (a section added, removed or reordered). */
export function refreshExperience(e: Experience, input: BriefInput): Experience {
  const next = generateExperience(input, optionsOf(e));
  return { ...next, directions: e.directions };
}

/** PRD section 6: the dial changes complexity, keeping the concept. */
export function setIntensity(e: Experience, input: BriefInput, level: number): Experience {
  return { ...generateExperience(input, { ...optionsOf(e), intensity: level, channels: e.control === "custom" ? e.channels : undefined }), directions: e.directions };
}

/** The Experience control: regenerate the concept, change the world or the interaction. */
export function changeConcept(e: Experience, input: BriefInput, concept: string): Experience {
  const c = conceptById(concept);
  if (!c) return e;
  return { ...generateExperience(input, { ...optionsOf(e), concept, world: undefined, preset: undefined, pack: undefined, mode: c.modes[0], intensity: Math.max(e.intensity, c.minIntensity) }), directions: e.directions };
}

/** A new world. Within the same engine the concept stays; otherwise the best concept for that world is used. */
export function changeWorld(e: Experience, input: BriefInput, world: string): Experience {
  const env = environmentById(world);
  if (!env) return e;
  const current = conceptById(e.concept);
  if (current && current.engine === env.engine) return { ...generateExperience(input, { ...optionsOf(e), world }), directions: e.directions };
  const match = CONCEPTS.find((c) => c.world === world) ?? CONCEPTS.find((c) => c.engine === env.engine);
  return match ? { ...changeConcept(e, input, match.id), world: match.world === world ? world : e.world } : e;
}

/** Change the interaction (PRD section 30): editorial, cinematic, interactive world, product or playful. The concept stays when it supports the mode. */
export function changeMode(e: Experience, input: BriefInput, mode: ExperienceMode): Experience {
  const c = conceptById(e.concept);
  if (c?.modes.includes(mode)) return { ...generateExperience(input, { ...optionsOf(e), mode }), directions: e.directions };
  return { ...generateExperience(input, { ...optionsOf(e), concept: undefined, world: undefined, preset: undefined, pack: undefined, mode, intensity: undefined }), directions: e.directions };
}

/** Start from one of the curated presets (PRD section 33). */
export function applyPreset(e: Experience, input: BriefInput, preset: string): Experience {
  if (!presetById(preset)) return e;
  return { ...generateExperience(input, { ...optionsOf(e), preset, concept: undefined, world: undefined, pack: undefined, mode: undefined, intensity: undefined, better: undefined }), directions: e.directions };
}

/** Surprise me (PRD section 32): a new creative direction for the same business. */
export function surprise(e: Experience, input: BriefInput): Experience {
  const seed = hash(String(e.seed) + ":" + e.concept + ":" + Date.now());
  const modes: ExperienceMode[] = ["editorial", "cinematic", "world", "product", "playful"];
  const mode = modes.filter((m) => m !== e.mode)[seed % 4];
  return generateExperience(input, { seed, mode, avoid: [e.concept], intensity: undefined, sound: e.sound });
}

/** Switch to one of the three directions considered at generation (compare and restore). */
export function useDirection(e: Experience, input: BriefInput, label: "A" | "B" | "C"): Experience {
  const d = e.directions.find((x) => x.label === label);
  if (!d) return e;
  return { ...generateExperience(input, { ...optionsOf(e), concept: d.concept, mode: d.mode, world: undefined, intensity: undefined }), directions: e.directions };
}

export interface RemixResult {
  experience: Experience;
  said: string;
}

const MODE_WORDS: [RegExp, ExperienceMode][] = [
  [/cinematic|film|movie|epic|dramatic/, "cinematic"],
  [/playful|fun|bouncy|cheerful|cute/, "playful"],
  [/editorial|classic|elegant|serious|professional|minimal/, "editorial"],
  [/interactive|world|immersive|game/, "world"],
  [/product|demo|software|app|interface/, "product"],
];

/** The remix system (PRD section 31): plain words in, a changed experience out, content and brand kept. */
export function remix(e: Experience, input: BriefInput, phrase: string): RemixResult | null {
  const q = phrase.toLowerCase();
  if (/calm|quiet|subtle|less|slower|tone it down|simpl/.test(q)) {
    const level = Math.max(1, e.intensity - (/much|way|a lot/.test(q) ? 4 : 2));
    return { experience: setIntensity(e, input, level), said: `Calmer: intensity ${e.intensity} to ${level}.` };
  }
  if (/more (motion|movement|animation|intense|wild)|insane|crazy|intens|faster|stronger|wow/.test(q)) {
    const level = Math.min(10, e.intensity + (/much|way|a lot|insane|crazy/.test(q) ? 4 : 2));
    return { experience: setIntensity(e, input, level), said: `More motion: intensity ${e.intensity} to ${level}.` };
  }
  // "Replace the abstract environment with a mountain journey": a named concept or world.
  const byConcept = CONCEPTS.find((c) => q.includes(c.name.toLowerCase()) || q.includes(c.id.replace(/-/g, " ")) || c.keywords.some((k) => k.length > 4 && new RegExp("\\b" + k + "\\b").test(q) && /replace|with|make it|turn|use|switch/.test(q)));
  const byWorld = ENVIRONMENTS.find((w) => new RegExp("\\b" + w.name.toLowerCase() + "\\b").test(q) || new RegExp("\\b" + w.id.replace(/-/g, " ") + "\\b").test(q));
  if (byWorld && byWorld.id !== e.world && /replace|with|make it|turn|use|switch|world|environment|scene/.test(q)) {
    const next = changeWorld(e, input, byWorld.id);
    return { experience: next, said: `New world: ${byWorld.name} (${next.name}).` };
  }
  if (byConcept && byConcept.id !== e.concept) return { experience: changeConcept(e, input, byConcept.id), said: `New concept: ${byConcept.name}.` };
  for (const [re, mode] of MODE_WORDS)
    if (re.test(q)) {
      if (mode === e.mode) {
        const level = Math.min(10, e.intensity + 1);
        return { experience: setIntensity(e, input, level), said: `It is already ${mode}; intensity raised to ${level}.` };
      }
      const next = generateExperience(input, { ...optionsOf(e), concept: undefined, world: undefined, preset: undefined, pack: undefined, mode, intensity: undefined });
      return { experience: { ...next, directions: e.directions }, said: `More ${mode}: ${next.name}.` };
    }
  return null;
}

/** The concepts that suit a business best, for the studio's Experience control. */
export function suggestions(input: BriefInput, seed: number, limit = 6) {
  const brief = understand(input);
  const { directions } = directionsFor(brief, { seed });
  const first = new Set(directions.map((d) => d.concept));
  const rest = CONCEPTS.filter((c) => !first.has(c.id)).slice(0, Math.max(0, limit - first.size));
  return [...directions.map((d) => conceptById(d.concept)!), ...rest];
}
