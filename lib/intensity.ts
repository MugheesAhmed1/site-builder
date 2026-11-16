import type { Design } from "./types";
import { pickAtmos } from "@/template/src/atmos/catalog.js";

// Animation intensity, 1 to 10. One slider sets a whole layer of the animation engine:
//   1-3  Simple:   fades and slides, hover states; the cinematic background holds still
//   4-6  Creative: the background drifts slowly, curtain reveals, magnetic buttons, kinetic titles
//   7-9  Bold:     the background follows the pointer and pulls focus on scroll, pinned scenes
//   10   Insane:   the densest, fastest atmosphere, deep scroll moves and section morphs

export const LEVELS: { min: number; name: string; text: string }[] = [
  { min: 1, name: "Simple", text: "Fades, slides and hover states over a still cinematic background. Calm and fast." },
  { min: 4, name: "Creative", text: "The background drifts slowly. Curtain reveals, magnetic buttons, kinetic titles and smooth scroll." },
  { min: 7, name: "Bold", text: "A living background that follows the pointer and pulls focus as you scroll, with pinned scenes." },
  { min: 10, name: "Insane", text: "Everything at once: the densest, fastest atmosphere, deep scroll moves and sections that morph in." },
];

export const levelOf = (n: number) => [...LEVELS].reverse().find((l) => n >= l.min) ?? LEVELS[0];

/** Every switch a level sets. The person can still change any of them afterwards. */
export function intensityPatch(n: number, design: Design, category: string): Partial<Design> {
  const level = Math.max(1, Math.min(10, Math.round(n)));
  // Every level opens on the cinematic background unless the person picked another opening.
  const legacy = !design.heroStyle || design.heroStyle === "journey" || design.heroStyle === "cinema" || design.heroStyle === "scatter";
  const base: Partial<Design> = {
    intensity: level,
    motion: "expressive",
    anim: design.anim === "M-000" ? "M-002" : design.anim,
    heroStyle: legacy || level >= 7 ? "atmos" : design.heroStyle,
    atmos: design.atmos || pickAtmos(category, ""),
  };
  if (level <= 3)
    return { ...base, sectionFx: level === 1 ? "none" : "rise", scrollFx: level >= 3, smooth: false, magnetic: false, cursor: false, tilt: false, scramble: false, grain: false, loader: "none", showpiece: "none", flight: false, film: false, hover: "lift" };
  if (level <= 6)
    return { ...base, sectionFx: level === 4 ? "rise" : level === 5 ? "curtain" : "zoom", scrollFx: true, smooth: true, magnetic: true, cursor: level >= 6, tilt: true, scramble: level >= 5, scrollWords: true, loader: level >= 6 ? "line" : "none", showpiece: "none", hover: "spotlight" };
  if (level <= 9)
    return { ...base, sectionFx: level === 7 ? "tilt" : level === 8 ? "curtain" : "stack", scrollFx: true, smooth: true, magnetic: true, cursor: true, tilt: true, scramble: true, scrollWords: true, flight: true, loader: "line", grain: false, showpiece: level >= 9 ? "sphere" : "none", hover: "spotlight", chrome: "pill" };
  return { ...base, sectionFx: "curtain", scrollFx: true, smooth: true, magnetic: true, cursor: true, tilt: true, scrollWords: true, flight: true, loader: "none", grain: false, showpiece: "none", chrome: "pill", hover: "spotlight" };
}
