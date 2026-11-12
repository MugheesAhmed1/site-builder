import type { Design } from "./types";

// How the animation system is organised. Every effect belongs to one layer, and a site
// uses at most one effect per "solo" layer, so pieces never fight for attention.
//
//  1. Opening     plays once as the page arrives      line loader, opening counter
//  2. Entrance    how each block appears on scroll    the motion style (728 of them)
//  3. Scrolling   tied to the scroll position         smooth scroll, film, flying tiles, word by word
//  4. Showpiece   one big set piece (solo)            sphere, arc, story track
//  5. Ambient     always alive in the background      live scene, characters, grain
//  6. Pointer     reacts to the mouse or finger       magnetic, cursor, tilt, hover effect
//  7. Transitions between states                      fog theme switch, scrambled titles
//
// Packs are tested combinations across the layers. Picking one sets every switch at once;
// any switch can still be changed afterwards.

export type PackId = "cinema" | "editorial" | "studio" | "launch" | "story" | "playful" | "calm";

export interface Pack {
  id: PackId;
  name: string;
  blurb: string;
  set: Partial<Design>;
}

const OFF: Partial<Design> = {
  smooth: false,
  loader: "none",
  intro: false,
  film: false,
  flight: false,
  scrollWords: false,
  carousel: false,
  grain: false,
  scramble: false,
  fogSwitch: false,
  magnetic: false,
  cursor: false,
  tilt: false,
  showpiece: "none",
  castStory: true,
};

export const PACKS: Pack[] = [
  {
    id: "cinema",
    name: "Cinematic",
    blurb: "A film-like scene behind your words that pushes in as you scroll, a glass pill menu, a glass call to action and your name set huge at the foot.",
    set: { ...OFF, smooth: true, loader: "line", scrollWords: true, fogSwitch: true, magnetic: true, grain: true, heroStyle: "cinema", accentFace: "serif", chrome: "pill", menu: "curtain", footer: "wordmark", ctaStyle: "glass" },
  },
  {
    id: "studio",
    name: "Studio reel",
    blurb: "A spinning sphere of your work, a scroll film, grain and a line loader. Award-site energy.",
    set: { ...OFF, smooth: true, loader: "line", film: true, flight: true, scrollWords: true, grain: true, scramble: true, fogSwitch: true, magnetic: true, cursor: true, tilt: true, showpiece: "sphere" },
  },
  {
    id: "launch",
    name: "Product launch",
    blurb: "Cards curve around a stage and each pick is scanned into place. Built for products and menus.",
    set: { ...OFF, smooth: true, loader: "line", flight: true, scrollWords: true, fogSwitch: true, magnetic: true, tilt: true, showpiece: "arc" },
  },
  {
    id: "story",
    name: "Story track",
    blurb: "Your story slides sideways while your character pushes every line out of its way.",
    set: { ...OFF, smooth: true, film: true, scrollWords: true, grain: true, fogSwitch: true, tilt: true, showpiece: "track", castStory: false },
  },
  {
    id: "editorial",
    name: "Quiet editorial",
    blurb: "Smooth scroll, a masked line loader and words that sharpen as you read. Calm and confident.",
    set: { ...OFF, smooth: true, loader: "line", scrollWords: true, fogSwitch: true },
  },
  {
    id: "playful",
    name: "Playful",
    blurb: "Tiles that fly, a drag carousel, magnetic buttons and scrambled titles. Lively, never noisy.",
    set: { ...OFF, smooth: true, flight: true, carousel: true, scramble: true, fogSwitch: true, magnetic: true, cursor: true, tilt: true, showpiece: "sphere" },
  },
  {
    id: "calm",
    name: "Calm and fast",
    blurb: "Only gentle entrances. Fastest to load and kindest to people who prefer less motion.",
    set: { ...OFF },
  },
];

export function packById(id?: string) {
  return PACKS.find((p) => p.id === id);
}

/** Which pack the current switches match exactly, if any. */
export function matchPack(d: Design): PackId | undefined {
  const norm = (k: keyof Design, v: unknown) => {
    const cur = d[k];
    if (k === "smooth" || k === "scrollWords" || k === "flight" || k === "tilt" || k === "fogSwitch" || k === "castStory") return (cur !== false) === (v !== false);
    if (k === "loader") return (cur || "none") === v;
    if (k === "showpiece") return (cur || "none") === v;
    if (k === "heroStyle" || k === "accentFace" || k === "chrome" || k === "menu" || k === "footer" || k === "ctaStyle") return cur === v;
    return !!cur === !!v;
  };
  return PACKS.find((p) => (Object.keys(p.set) as (keyof Design)[]).every((k) => norm(k, p.set[k])))?.id;
}
