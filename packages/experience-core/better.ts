import type { Experience, ExperienceScene } from "@/template/src/experiences/types";
import { primitive } from "@/template/src/motion/primitives";

// Make it better (PRD section 66). The engine reads a finished experience and looks for weak
// visual hierarchy, repetitive motion, poor spacing, weak transitions, inconsistent animation
// and performance issues. Each finding comes with one targeted fix. A fix is stored by id on
// the experience (`better`), so it survives every later rebuild of the scenes, and applying
// one is a single undoable step in the studio.

export type BetterId = "hero" | "vary" | "transitions" | "consistent" | "performance" | "interaction" | "spacing";

export interface Improvement {
  id: BetterId;
  /** The weakness, in plain words. */
  problem: string;
  /** What the fix changes. */
  fix: string;
  /** Spacing lives in the design system, not in the experience. */
  design?: { density: "regular" | "airy" };
}

const at = (id: string, level: number) => (primitive(id)?.minLevel ?? 1) <= level;
const first = (ids: string[], level: number, fallback: string) => ids.find((id) => at(id, level)) ?? fallback;
const shown = (e: Experience) => e.scenes.filter((s) => !s.hidden);

const ENTRANCE_POOL = ["entrance.mask", "entrance.clip", "entrance.blur", "entrance.rise", "entrance.scale", "entrance.depth", "entrance.slide", "entrance.reveal"];
const TRANSITION_POOL = ["transition.continue", "transition.morph", "transition.wipe", "transition.depth"];

/** Find what would make this experience better. Fixes already applied are not offered again. */
export function findImprovements(e: Experience, design?: { density?: string; sections?: number }): Improvement[] {
  const out: Improvement[] = [];
  const done = new Set(e.better ?? []);
  const scenes = shown(e);
  const hero = scenes[0];
  const rest = scenes.slice(1);
  const level = e.intensity;

  // Weak visual hierarchy: the opening line arrives no stronger than everything after it.
  const heroStrength = hero ? (primitive(hero.text)?.intensity ?? 1) : 0;
  const restStrength = Math.max(0, ...rest.map((s) => primitive(s.text)?.intensity ?? 1));
  if (hero && !done.has("hero") && level >= 3 && heroStrength <= restStrength)
    out.push({ id: "hero", problem: "The opening line arrives the same way as every other heading, so nothing says where to look first.", fix: "Give the opening line its own, stronger reveal and a little more time on screen." });

  // Repetitive motion: three or more sections in a row arrive the same way.
  let run = 1;
  let longest = 1;
  for (let i = 1; i < rest.length; i++) {
    run = rest[i].entrance === rest[i - 1].entrance ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  if (!done.has("vary") && longest >= 3 && level >= 2)
    out.push({ id: "vary", problem: `${longest} sections in a row arrive with the same movement.`, fix: "Alternate two or three entrances that belong to the same motion language." });

  // Weak transitions: every change between scenes is the same cut, or there is none.
  const ts = scenes.flatMap((s) => s.transitions.map((t) => t.primitive));
  if (!done.has("transitions") && level >= 3 && scenes.length >= 4 && (ts.length === 0 || new Set(ts).size === 1))
    out.push({ id: "transitions", problem: ts.length ? "Every scene change uses the same transition." : "Scenes change without any transition.", fix: "Use a stronger transition at the turning points of the story and keep the rest simple." });

  // Inconsistent animation: entrances from too many different families.
  const families = new Set(rest.map((s) => s.entrance));
  if (!done.has("consistent") && families.size > 3)
    out.push({ id: "consistent", problem: `Sections arrive in ${families.size} different ways, which reads as unplanned.`, fix: "Settle on two entrances that suit the motion language." });

  // Performance: more on the stage than a phone should carry.
  if (!done.has("performance") && (e.budget.particles > 300 || e.budget.dpr > 1.75 || (e.stage.webgl && e.tier === "heavy" && e.intensity >= 9)))
    out.push({ id: "performance", problem: "The stage asks for more particles and pixels than many phones can draw smoothly.", fix: "Lower the particle count and the pixel ratio; the look stays the same." });

  // No interactive moment (Experience QA): nothing answers the cursor or a tap.
  const interactive = scenes.flatMap((s) => s.interactions).filter((x) => x.input !== "keyboard" && x.target !== "cta" && x.target !== "faq");
  if (!done.has("interaction") && interactive.length === 0)
    out.push({ id: "interaction", problem: "Nothing on the page answers the cursor or a tap.", fix: "Let the stage react to the cursor and to taps." });

  // Poor spacing: a long page packed tightly.
  if (design && design.density === "compact" && (design.sections ?? scenes.length) >= 6)
    out.push({ id: "spacing", problem: "A long page with tight spacing feels crowded between scenes.", fix: "Give the sections more room to breathe.", design: { density: "regular" } });

  return out;
}

/** Apply stored fixes to freshly built scenes. Pure: the same ids always give the same result. */
export function applyBetter(e: Experience): Experience {
  const ids = new Set(e.better ?? []);
  if (!ids.size) return e;
  const level = e.intensity;
  let scenes: ExperienceScene[] = e.scenes.map((s) => ({ ...s }));
  const visible = scenes.filter((s) => !s.hidden);
  if (ids.has("hero") && visible[0]) {
    const h = visible[0];
    h.text = first(["text.kinetic", "text.depth", "text.chars", "text.mask"].filter((id) => id !== h.text), level, h.text);
    h.entrance = first(["entrance.split", "entrance.depth"], level, h.entrance);
    h.duration = Math.round((h.duration + 0.2) * 10) / 10;
  }
  if (ids.has("vary") || ids.has("consistent")) {
    const base = visible[1]?.entrance ?? "entrance.rise";
    const pool = [base, ...ENTRANCE_POOL.filter((id) => id !== base && at(id, level))].slice(0, ids.has("consistent") ? 2 : 3);
    visible.slice(1).forEach((s, i) => (s.entrance = pool[i % pool.length]));
  }
  if (ids.has("transitions")) {
    const strong = first(["transition.depth", "transition.morph", "transition.wipe"], level, "transition.continue");
    const n = visible.length;
    visible.forEach((s, i) => {
      if (i >= n - 1) return;
      const turn = i === 0 || i === Math.floor(n / 2) || i === n - 2;
      const prim = turn ? strong : TRANSITION_POOL.find((id) => at(id, level)) ?? "transition.crossfade";
      s.transitions = [{ primitive: prim, mechanic: s.transitions[0]?.mechanic ?? e.transitionMechanic, to: visible[i + 1].section }];
    });
  }
  let budget = e.budget;
  if (ids.has("performance")) budget = { ...budget, particles: Math.min(budget.particles, 240), dpr: Math.min(budget.dpr, 1.5) };
  let channels = e.channels;
  if (ids.has("interaction")) {
    channels = { ...channels, cursor: Math.max(1, channels.cursor), click: Math.max(1, channels.click) };
    scenes = scenes.map((s, i) =>
      i === 0 && !s.interactions.some((x) => x.target !== "cta")
        ? { ...s, interactions: [...s.interactions, { input: "click", target: "stage", primitive: "click.burst", response: "The stage answers a click", touch: "The stage answers a tap" }] }
        : s,
    );
  }
  return { ...e, scenes, budget, channels };
}
