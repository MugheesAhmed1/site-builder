import type { Design } from "./types";
import { directStory, normalizeStory } from "@/template/src/story.js";

// Animation intensity, 1 to 10. One slider sets a whole layer of the animation engine:
//   1-3  Simple:   fades and slides, hover states, small touches
//   4-6  Creative: parallax, curtains, magnetic buttons, kinetic titles, smooth scroll
//   7-9  Bold:     pinned scenes, WebGL backdrops, particles, scroll films
//   10   Insane:   a full 3D journey: scroll flies the camera, a giant creature tracks the
//                  cursor, reacts to taps and sound, leaves, and the next section morphs in

export const LEVELS: { min: number; name: string; text: string }[] = [
  { min: 1, name: "Simple", text: "Fades, slides and hover states. Calm and fast." },
  { min: 4, name: "Creative", text: "Parallax, curtain reveals, magnetic buttons, kinetic titles and smooth scroll." },
  { min: 7, name: "Bold", text: "Pinned scenes, live 3D backdrops, particles and scroll films." },
  { min: 10, name: "Insane", text: "A 3D world you fly through. A giant creature watches the cursor, reacts to taps and sound, then leaves as the next section morphs in." },
];

export const levelOf = (n: number) => [...LEVELS].reverse().find((l) => n >= l.min) ?? LEVELS[0];

/** Every switch a level sets. The person can still change any of them afterwards. */
export function intensityPatch(n: number, design: Design, category: string): Partial<Design> {
  const level = Math.max(1, Math.min(10, Math.round(n)));
  const leavingJourney = design.heroStyle === "journey" && level < 10;
  const base: Partial<Design> = {
    intensity: level,
    motion: "expressive",
    anim: design.anim === "M-000" ? "M-002" : design.anim,
    heroStyle: leavingJourney ? "centered" : design.heroStyle,
  };
  if (level <= 3)
    return { ...base, sectionFx: level === 1 ? "none" : "rise", scrollFx: level >= 3, smooth: false, magnetic: false, cursor: false, tilt: false, scramble: false, grain: false, loader: "none", showpiece: "none", flight: false, film: false, hover: "lift" };
  if (level <= 6)
    return { ...base, sectionFx: level === 4 ? "rise" : level === 5 ? "curtain" : "zoom", scrollFx: true, smooth: true, magnetic: true, cursor: level >= 6, tilt: true, scramble: level >= 5, scrollWords: true, loader: level >= 6 ? "line" : "none", showpiece: "none", hover: "spotlight", backdrop: design.backdrop && design.backdrop !== "none" ? design.backdrop : "aurora" };
  if (level <= 9)
    return { ...base, sectionFx: level === 7 ? "tilt" : level === 8 ? "curtain" : "stack", scrollFx: true, smooth: true, magnetic: true, cursor: true, tilt: true, scramble: true, scrollWords: true, flight: true, loader: "line", grain: level >= 8, showpiece: level >= 8 ? "sphere" : "none", backdrop: "particles", hover: "spotlight" };
  const story = design.story ? normalizeStory({ ...design.story, intensity: "insane" }) : directStory(category, "", "insane");
  return { ...base, heroStyle: "journey", story, sectionFx: "curtain", scrollFx: true, smooth: true, magnetic: true, cursor: true, tilt: true, scrollWords: true, loader: "none", grain: false, showpiece: "none", chrome: "pill", hover: "spotlight" };
}
