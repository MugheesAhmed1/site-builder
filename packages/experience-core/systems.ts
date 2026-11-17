import type { Budget, DependencyProfile, Experience, MotionChannels, PerformanceTier } from "@/template/src/experiences/types";
import type { Concept } from "./concepts";

// Stage 4 (select motion systems, PRD sections 7 and 42) and stage 6 (performance pass,
// PRD sections 7, 18, 37 and 38) of the pipeline.
//
// The systems are the smallest set the experience needs. GSAP and ScrollTrigger are not used:
// their licence is not one of the open licences PRD section 35 prefers and it restricts use in
// website-building tools, so scroll orchestration is our own code (src/motion/scroll.ts)
// with Lenis (MIT) for smooth scrolling. Rapier stays optional; the playground's light
// physics is our own.

/** The packages each profile installs in the React download (PRD section 42). */
export const PROFILE_PACKAGES: Record<DependencyProfile, string[]> = {
  basic: ["react", "react-dom", "motion"],
  cinematic: ["react", "react-dom", "motion", "lenis"],
  webgl: ["react", "react-dom", "motion", "lenis", "three", "@react-three/fiber"],
  physics: ["react", "react-dom", "motion", "lenis", "three", "@react-three/fiber", "@react-three/rapier"],
};

export function selectSystems(c: Concept, level: number, webgl: boolean, smooth: boolean, sound: boolean): { technologies: string[]; profile: DependencyProfile } {
  const t = new Set<string>(["css", "motion"]);
  if (["interface", "ledger", "kinetic", "assemble", "morph", "grow"].includes(c.engine)) t.add("svg");
  if (!["interface", "ledger", "kinetic", "assemble"].includes(c.engine)) t.add("canvas");
  if (smooth) t.add("lenis");
  if (webgl) ["three", "r3f"].forEach((x) => t.add(x));
  if (webgl && level >= 9) t.add("postprocessing");
  if (sound) t.add("web-audio");
  const profile: DependencyProfile = webgl ? "webgl" : smooth ? "cinematic" : "basic";
  return { technologies: Array.from(t), profile };
}

/** Whether the 3D version of a concept is used: only when it has one, the intensity calls for it (7 and up) and the person has not turned it off. */
export function useWebgl(c: Concept, level: number, allow = true): boolean {
  return !!c.webgl && level >= 7 && allow;
}

export function tierOf(c: Concept, webgl: boolean, level: number): PerformanceTier {
  if (webgl) return level >= 10 ? "extreme" : "heavy";
  if (c.performanceTier === "light" || level <= 2) return "light";
  return "medium";
}

/** The performance pass: budgets that keep the concept but drop the excess. */
export function budgetFor(tier: PerformanceTier, level: number, channels: MotionChannels): Budget {
  const env = channels.environment / 3;
  const base: Record<PerformanceTier, Budget> = {
    light: { particles: 40, dpr: 1.5, timelines: 4, texture: 512, lowFps: 30 },
    medium: { particles: 140, dpr: 1.75, timelines: 6, texture: 1024, lowFps: 30 },
    heavy: { particles: 220, dpr: 1.5, timelines: 8, texture: 1024, lowFps: 30 },
    extreme: { particles: 320, dpr: 1.5, timelines: 10, texture: 2048, lowFps: 30 },
  };
  const b = { ...base[tier] };
  // Calm levels never need a crowd of particles, whatever the tier.
  b.particles = Math.round(b.particles * Math.min(1, 0.25 + level / 10) * Math.max(0.3, env));
  b.timelines = Math.max(2, Math.min(b.timelines, 2 + Math.round(level / 2)));
  return b;
}

export const DEFAULT_CHANNELS: MotionChannels = { scroll: 2, cursor: 2, hover: 2, click: 2, transitions: 2, typography: 2, characters: 2, environment: 2 };

/** PRD section 6: what each level adds. Channels the person set by hand win. */
export function channelsFor(level: number, base: Partial<MotionChannels> = {}): MotionChannels {
  const lvl = (lo: number, mid: number, hi: number) => (level >= hi ? 3 : level >= mid ? 2 : level >= lo ? 1 : 0);
  return {
    scroll: base.scroll ?? lvl(1, 4, 7),
    cursor: base.cursor ?? lvl(3, 5, 8),
    hover: base.hover ?? lvl(1, 3, 6),
    click: base.click ?? lvl(1, 4, 7),
    transitions: base.transitions ?? lvl(2, 5, 8),
    typography: base.typography ?? lvl(1, 4, 7),
    characters: base.characters ?? lvl(3, 5, 9),
    environment: base.environment ?? lvl(1, 4, 8),
  };
}

export function fallbacksFor(c: Concept): Experience["fallbacks"] {
  return {
    mobile: c.mobileStrategy,
    reducedMotion: c.reducedMotionStrategy,
    lowPower: c.webgl ? "The 2D version of the stage at a lower frame rate, then a still if the device is still slow" : "The stage drops to a lower frame rate, then to a still if the device is still slow",
  };
}
