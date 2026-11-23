// The choreography (docs/FILM.md): a page whose sections are written around the character.
//
// The film (film.ts) can only read a page and guess where the model should go. Here the story is
// written the other way round. A tall "track" holds one sticky screen; scrolling plays a script
// where the camera, the words, the spec chips and the cards are all keyed to the same clock (in
// hundredths of a screen's height). Every chip sits where the model is not, every card flanks
// it, the halo grows behind it as the camera climbs, and scrolling back plays all of it in
// reverse. Scenes are fixed compositions (opening, specs, view from above, paint, reviews,
// finale) that take their words from content.film and their colours from the character's own
// gradient, so one story fits any model and any template.
import type { Film, Track, TrackKey } from "./film";

type Data = Record<string, any>;

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const flag = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);
const HEX = /^#[0-9a-f]{6}$/i;

// ---------------------------------------------------------------- content

export interface FilmContent {
  hero: { title: string; text: string; cta: string; ctaHref: string };
  specs: { on: boolean; eyebrow: string; title: string; text: string };
  chips: { icon: string; label: string; value: string }[];
  ring: { on: boolean; eyebrow: string; title: string };
  cards: { icon: string; title: string; text: string }[];
  paint: { on: boolean; eyebrow: string; title: string; text: string; hint: string };
  swatches: { name: string; color: string }[];
  voices: { on: boolean; eyebrow: string; title: string };
  quotes: { text: string; name: string; role: string }[];
  finale: { on: boolean; title: string; text: string; cta: string; ctaHref: string };
}

const list = <T,>(v: unknown, n: number, f: (x: Data) => T | null): T[] =>
  (Array.isArray(v) ? v : [])
    .slice(0, n)
    .map((x) => (x && typeof x === "object" ? f(x as Data) : null))
    .filter((x): x is T => !!x);

/** What a page says in its film: always whole, whatever the content holds. */
export function filmContent(data: Data, name = ""): FilmContent {
  const f: Data = (data && data.film) || {};
  const fill = (s: unknown) => str(s).replace(/\{name\}/g, name).replace(/\{year\}/g, String(new Date().getFullYear())).trim();
  const h: Data = f.hero || {};
  const s: Data = f.specs || {};
  const r: Data = f.ring || {};
  const p: Data = f.paint || {};
  const v: Data = f.voices || {};
  const e: Data = f.finale || {};
  return {
    hero: { title: fill(h.title) || name, text: fill(h.text), cta: fill(h.cta), ctaHref: str(h.ctaHref, "#") },
    specs: { on: flag(s.on, true), eyebrow: fill(s.eyebrow), title: fill(s.title), text: fill(s.text) },
    chips: list(f.chips, 6, (x) => (fill(x.label) || fill(x.value) ? { icon: str(x.icon, "spark"), label: fill(x.label), value: fill(x.value) } : null)),
    ring: { on: flag(r.on, true), eyebrow: fill(r.eyebrow), title: fill(r.title) },
    cards: list(f.cards, 6, (x) => (fill(x.title) || fill(x.text) ? { icon: str(x.icon, "spark"), title: fill(x.title), text: fill(x.text) } : null)),
    paint: { on: flag(p.on, false), eyebrow: fill(p.eyebrow), title: fill(p.title), text: fill(p.text), hint: fill(p.hint) },
    swatches: list(f.swatches, 6, (x) => (HEX.test(str(x.color)) ? { name: fill(x.name), color: str(x.color).toLowerCase() } : null)),
    voices: { on: flag(v.on, false), eyebrow: fill(v.eyebrow), title: fill(v.title) },
    quotes: list(f.quotes, 3, (x) => (fill(x.text) ? { text: fill(x.text), name: fill(x.name), role: fill(x.role) } : null)),
    finale: { on: flag(e.on, false), title: fill(e.title), text: fill(e.text), cta: fill(e.cta), ctaHref: str(e.ctaHref, "#") },
  };
}

// ---------------------------------------------------------------- the script

export interface Variant {
  /** A phone-shaped screen: one column. */
  narrow: boolean;
  /** A wide, low model (a car, a boat) rather than a tall one (a person, a bird). */
  flat: boolean;
}

export interface ElSpec {
  id: string;
  kind: string;
  html: string;
  /** Where its anchor point sits, as fractions of the screen. */
  x: number;
  y: number;
  /** Which part of the element sits on that point (0 left or top, 0.5 middle, 1 right or bottom). */
  ax?: number;
  ay?: number;
  /** Width in units (see Unit): empty means as wide as its words. */
  w?: number;
  /** Fades in from t0 to t1, out from t2 to t3 (hundredths of a screen of scrolling). */
  fade: [number, number, number, number];
  /** Sits below another element (its id) with this gap in units, whatever height its words make. */
  after?: string;
  gap?: number;
  /** Rises this many units into place. */
  rise?: number;
  /** Drifts this fraction of the screen's height upward over a screen of scrolling. */
  drift?: number;
}

export interface SceneInfo {
  id: string;
  slug: string;
  at: number;
  len: number;
}

export interface Script {
  len: number;
  keys: TrackKey[];
  els: ElSpec[];
  scenes: SceneInfo[];
}

type Slot = [number, number, number, number];

const BASE: TrackKey = { lift: 0, t: 0, cx: 0.5, cy: 0.5, w: 0.5, h: 0.5, yaw: 0, elev: 8, align: 0, presence: 1, ring: 0, floor: 1, dust: 0.5, halo: 0, word: 0, glow: 0, pulse: 1 };

/** Scene lengths, in hundredths of a screen of scrolling. */
const LEN = { hero: 150, specs: 125, ring: 195, paint: 150, voices: 140, finale: 100 };

/** The never-fading start: an element already there when the page opens. */
const NOW = -100;

function lines(s: string): string {
  return s
    .split(/\n+/)
    .filter(Boolean)
    .map((l) => `<span class="l">${esc(l)}</span>`)
    .join("");
}

const PATHS: Record<string, string> = {
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
  gauge: "M12 14l4-4M3.5 17a9 9 0 1 1 17 0",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  battery: "M3 8h15v8H3zM18 11h3v2h-3z",
  seat: "M8 4v8a3 3 0 0 0 3 3h6M8 12H5v5h13v3",
  wind: "M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8",
  weight: "M6 20h12l-1.5-11h-9zM9.5 9a2.5 2.5 0 1 1 5 0",
  shield: "M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  wave: "M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0",
  leaf: "M5 19c0-8 5-14 14-14 0 9-6 14-14 14zM5 19l7-7",
  spark: "M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
  check: "M5 12.5l4.5 4.5L19 7.5",
  pulse: "M3 12h4l2-6 4 12 2-6h6",
  down: "M12 4v11M7 11l5 5 5-5M5 20h14",
  range: "M3 15l12-12 6 6L9 21zM8 10l2 2M11 7l2 2M5 13l2 2",
  layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",
  chip: "M7 7h10v10H7zM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19",
  flame: "M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 2 1 2 0-3 1-5 2-8z",
  pin: "M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11zM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  clockfast: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM2 5l3-2M22 5l-3-2",
};
export const ICON_NAMES = Object.keys(PATHS);
export const icon = (name: string) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${PATHS[name] || PATHS.spark}"/></svg>`;

/** Where the cards go: a column of up to three on each side, evenly spread. */
function cardSlots(n: number): { side: "l" | "r"; y: number }[] {
  const left = Math.ceil(n / 2);
  const right = n - left;
  const col = (m: number) => Array.from({ length: m }, (_, i) => 0.545 - ((m - 1) * 0.235) / 2 - 0.105 + i * 0.235);
  return [...col(left).map((y) => ({ side: "l" as const, y })), ...col(right).map((y) => ({ side: "r" as const, y }))];
}

/**
 * The whole script for a story: the camera's keys, and every element's place and moment.
 * `opening` is true when the track opens the page (it brings the opening scene); on a template
 * that has its own opening the story starts with the specs.
 */
export function buildScript(c: FilmContent, v: Variant, opening: boolean): Script {
  const keys: TrackKey[] = [];
  const els: ElSpec[] = [];
  const scenes: SceneInfo[] = [];
  let prev: TrackKey = { ...BASE };
  const k = (t: number, slot: Slot | null, p: Partial<TrackKey> = {}) => {
    const next: TrackKey = { ...prev, t, ...(slot ? { cx: slot[0], cy: slot[1], w: slot[2], h: slot[3] } : {}), ...p };
    keys.push(next);
    prev = next;
  };
  const el = (e: ElSpec) => els.push(e);
  const F = v.flat;
  const N = v.narrow;
  // Cars and boats hover high above the floor; a person or an animal only lifts a little.
  const up = (x: number) => (F ? x : x * 0.35);
  let at = 0;
  const scene = (id: string, slug: string, len: number) => {
    scenes.push({ id, slug, at, len });
    const a = at;
    at += len;
    return a;
  };

  // ------------------------------------------------ opening: the model low and big, words to one side
  if (opening) {
    const a = scene("hero", "top", LEN.hero);
    // A wide, low model is fitted by its width (the height is only a loose limit), so a car and a
    // boat both fill the same stretch of the screen.
    const hero: Slot = N ? (F ? [0.5, 0.745, 0.96, 0.6] : [0.5, 0.7, 0.84, 0.46]) : F ? [0.526, 0.68, 0.74, 0.6] : [0.67, 0.55, 0.38, 0.76];
    const yaw0 = F ? 0 : -22;
    k(a, hero, { yaw: yaw0, elev: 7, floor: 1, dust: 0.45, word: 1, glow: 0, pulse: 1, ring: 0 });
    k(a + 14, null, { pulse: 0 });
    // Lift off: a ring spreads from under it, light pools gather beneath, the dust wakes up.
    const lift = (dy: number, dw: number): Slot => [hero[0] + (N ? 0 : 0.04), hero[1] - dy, hero[2] - dw, hero[3]];
    k(a + 26, lift(0.045, 0), { pulse: 0.3, glow: 0.35, dust: 0.6, lift: up(0.12) });
    k(a + 38, lift(0.055, 0.005), { pulse: 0.65, glow: 0.6, dust: 0.75, lift: up(0.22) });
    k(a + 50, lift(0.073, 0.01), { pulse: 1, glow: 1, dust: 0.9, word: 0.92, lift: up(0.3) });
    // Then it floats while the camera pulls back and the big word fades.
    const far: Slot = N ? (F ? [0.5, 0.5, 0.94, 0.6] : [0.5, 0.52, 0.8, 0.36]) : F ? [0.607, 0.505, 0.645, 0.6] : [0.7, 0.52, 0.36, 0.72];
    k(a + 80, N ? [0.5, 0.58, 0.95, 0.6] : F ? [0.585, 0.555, 0.71, 0.6] : [0.685, 0.535, 0.37, 0.74], { elev: 9, word: 0.5, dust: 1, yaw: F ? 0 : -16 });
    k(a + 100, N ? [0.5, 0.54, 0.94, 0.6] : F ? [0.595, 0.507, 0.67, 0.6] : [0.695, 0.525, 0.365, 0.73], { word: 0.18 });
    k(a + 125, null, { word: 0 });
    k(a + LEN.hero, far, { elev: 11, yaw: F ? 0 : -10, word: 0 });

    const x = N ? 0.07 : 0.03;
    const ty = N ? 0.3 : 0.285;
    el({ id: "h-title", kind: "title", html: lines(c.hero.title), x, y: ty, fade: [NOW, NOW, a + 6, a + 43] });
    if (c.hero.text) el({ id: "h-text", kind: "text", html: esc(c.hero.text), x, y: 0, after: "h-title", gap: 1.8, w: 30, fade: [NOW, NOW, a + 5, a + 38] });
    if (c.hero.cta) el({ id: "h-cta", kind: "cta", html: `<a class="xp-btn" href="${esc(c.hero.ctaHref)}">${esc(c.hero.cta)}</a>`, x, y: 0, after: c.hero.text ? "h-text" : "h-title", gap: 2.4, fade: [NOW, NOW, a + 2, a + 35] });
    el({ id: "h-cue", kind: "cue", html: `<span>Scroll</span><i></i>`, x: 0.5, y: 0.915, ax: 0.5, fade: [NOW, NOW, a + 0, a + 14] });
  }

  // ------------------------------------------------ specs: three-quarter view, a title, chips below
  if (c.specs.on && (c.specs.title || c.chips.length)) {
    const first = at === 0;
    const a = scene("specs", "specs", LEN.specs);
    const slot: Slot = N ? (F ? [0.5, 0.5, 0.94, 0.6] : [0.5, 0.5, 0.78, 0.36]) : F ? [0.59, 0.465, 0.5, 0.6] : [0.7, 0.52, 0.36, 0.72];
    const yaw = F ? 58 : 26;
    if (first) k(a, slot, { yaw, elev: 15, floor: 1, dust: 1, glow: F ? 1 : 0.5, word: 0, halo: 0 });
    else {
      k(a + 26, slot, { yaw, elev: 15 });
    }
    k(a + 50, slot, {});
    k(a + 100, [slot[0], slot[1] - 0.005, slot[2], slot[3]], {});
    k(a + 112, [slot[0] - 0.005, slot[1] + 0.025, slot[2] + 0.03, slot[3] + 0.02], { elev: 20, yaw: yaw + 4 });
    k(a + LEN.specs, [slot[0] - 0.01, slot[1] + 0.005, slot[2] + 0.065, slot[3] + 0.025], { elev: 30, yaw: yaw + 4, glow: 0.5, floor: 0.8 });

    const x = N ? 0.07 : 0.03;
    const ein = first ? NOW : a + 8;
    const eout: [number, number] = [a + 100, a + 128];
    const y = N ? 0.085 : 0.165;
    if (c.specs.eyebrow) el({ id: "s-eyebrow", kind: "eyebrow", html: esc(c.specs.eyebrow), x, y, fade: [ein, first ? NOW : a + 22, ...eout] });
    if (c.specs.title) el({ id: "s-title", kind: "title", html: lines(c.specs.title), x, y: N ? 0.105 : 0.19, after: c.specs.eyebrow ? "s-eyebrow" : undefined, gap: 0.7, fade: [ein, first ? NOW : a + 24, ...eout] });
    if (c.specs.text) el({ id: "s-text", kind: "text", html: esc(c.specs.text), x, y: 0, after: c.specs.title ? "s-title" : c.specs.eyebrow ? "s-eyebrow" : undefined, gap: 1.8, w: N ? 31 : 29, fade: [first ? NOW : a + 12, first ? NOW : a + 30, ...eout] });
    // Chips: where the model is not. For a wide, low model they scatter under it, first the one
    // right below its nose; for a tall one they stack in a column under the words.
    const wideFlat: [number, number][] = [[0.44, 0.79], [0.22, 0.575], [0.03, 0.68], [0.22, 0.79], [0.07, 0.88], [0.62, 0.88]];
    const wideTall: [number, number][] = [[0.03, 0.52], [0.03, 0.6], [0.03, 0.68], [0.03, 0.76], [0.03, 0.84], [0.03, 0.92]];
    const narrow: [number, number][] = [[0.06, 0.7], [0.52, 0.7], [0.06, 0.775], [0.52, 0.775], [0.06, 0.85], [0.52, 0.85]];
    const spots = N ? narrow : F ? wideFlat : wideTall;
    c.chips.forEach((chip, i) => {
      const t0 = a + (first ? 4 : 20) + i * 6.5;
      el({
        id: `chip${i}`,
        kind: "chip",
        html: `${icon(chip.icon)}<b>${esc(chip.label)}</b>${chip.value ? `<i>${esc(chip.value)}</i>` : ""}`,
        x: spots[i][0],
        y: spots[i][1],
        fade: [t0, t0 + 14, a + 100, a + 126],
        rise: 1.2,
        drift: 0.025,
      });
    });
    void y;
  }

  // ------------------------------------------------ the view from above: halo, six cards around it
  if (c.ring.on && c.cards.length) {
    // A phone shows one card at a time, so the scene is longer there.
    const rl = N ? LEN.ring + 90 : LEN.ring;
    const a = scene("ring", "angles", rl);
    const hold: Slot = N ? (F ? [0.5, 0.405, 0.3, 0.4] : [0.5, 0.42, 0.5, 0.4]) : F ? [0.49, 0.505, 0.22, 0.55] : [0.5, 0.56, 0.3, 0.74];
    if (F) {
      // The camera swings round and climbs until it looks straight down, nose up the screen.
      k(a + 15, N ? [0.5, 0.43, 0.46, 0.34] : [0.52, 0.41, 0.5, 0.44], { yaw: -28, elev: 56, glow: 0, floor: 0.3, dust: 0.8, halo: 0.05, ring: 0 });
      k(a + 32, N ? [0.5, 0.43, 0.5, 0.38] : [0.505, 0.42, 0.43, 0.48], { yaw: -38, elev: 66, halo: 0.1 });
      k(a + 50, N ? [0.5, 0.42, 0.52, 0.4] : [0.51, 0.4, 0.44, 0.44], { yaw: -46, elev: 72, halo: 0.15, floor: 0.15 });
      k(a + 65, N ? [0.5, 0.41, 0.46, 0.42] : [0.5, 0.47, 0.36, 0.555], { yaw: -57, elev: 78, halo: 0.35 });
      k(a + 80, N ? [0.5, 0.405, 0.38, 0.42] : [0.51, 0.475, 0.3, 0.52], { yaw: -78, elev: 84, halo: 0.6 });
      k(a + 93, hold, { yaw: -90, elev: 86, halo: 1, floor: 0.1, dust: 0.55 });
      k(a + rl - 20, hold, {});
    } else {
      // A tall model stays upright; it turns slowly so every side is seen while the cards are read.
      k(a + 20, [0.58, 0.55, 0.32, 0.74], { yaw: 40, elev: 10, glow: 0.3, floor: 0.7, dust: 0.8, halo: 0.2 });
      k(a + 60, [0.52, 0.56, 0.3, 0.74], { yaw: 70, elev: 9, halo: 0.6, floor: 0.4 });
      k(a + 93, hold, { yaw: 96, elev: 8, halo: 1, floor: 0.2, dust: 0.55 });
      k(a + rl - 20, [hold[0], hold[1], hold[2], hold[3]], { yaw: 140 });
    }
    const ein = a + 77;
    const eout = a + rl - 28;
    if (c.ring.eyebrow) el({ id: "r-eyebrow", kind: "eyebrow", html: esc(c.ring.eyebrow), x: 0.5, y: N ? 0.07 : 0.07, ax: 0.5, fade: [ein, ein + 16, eout, eout + 24] });
    if (c.ring.title) el({ id: "r-title", kind: "head", html: esc(c.ring.title), x: 0.5, y: N ? 0.09 : 0.092, ax: 0.5, fade: [ein, ein + 16, eout, eout + 24] });
    const slots = cardSlots(c.cards.length);
    const n = c.cards.length;
    c.cards.forEach((card, i) => {
      const s = slots[i];
      const html = `<span class="ic">${icon(card.icon)}</span><b>${esc(card.title)}</b><span>${esc(card.text)}</span>`;
      const inT = a + 77 + i * 4.3;
      // Out again the way they came: the right side first, then the left.
      const outT = eout - 8 + (n - 1 - i) * 3;
      if (N) {
        // One card at a time under the model.
        const slice = (eout - (a + 100)) / n;
        const t0 = a + 100 + i * slice;
        el({ id: `card${i}`, kind: "card", html, x: 0.5, y: 0.66, ax: 0.5, w: 31, fade: [t0 - 4, t0 + 4, t0 + slice - 8, t0 + slice], rise: 1.4 });
      } else el({ id: `card${i}`, kind: "card", html, x: s.side === "l" ? 0.03 : 0.97, y: s.y, ax: s.side === "l" ? 0 : 1, w: 21, fade: [inT, inT + 12, outT, outT + 18], rise: 1.6 });
    });
  }

  // ------------------------------------------------ paint: the model by its owner's choice of colour
  if (c.paint.on && c.swatches.length) {
    const a = scene("paint", "customize", LEN.paint);
    const slot: Slot = N ? (F ? [0.5, 0.34, 0.92, 0.6] : [0.5, 0.34, 0.6, 0.4]) : F ? [0.36, 0.57, 0.62, 0.6] : [0.34, 0.55, 0.34, 0.74];
    const rear = F ? -135 : 150;
    k(a + 30, slot, { yaw: rear, elev: 14, halo: 0.3, floor: 1, dust: 0.9, glow: F ? 0.7 : 0.35, ring: 0, lift: up(0.18) });
    k(a + LEN.paint - 20, [slot[0], slot[1] - 0.01, slot[2], slot[3]], { yaw: rear - 18, elev: 12 });
    const x = N ? 0.07 : 0.62;
    const ein = a + 36;
    const eout = a + LEN.paint - 24;
    if (c.paint.eyebrow) el({ id: "p-eyebrow", kind: "eyebrow", html: esc(c.paint.eyebrow), x, y: N ? 0.56 : 0.27, fade: [ein, ein + 16, eout, eout + 20] });
    if (c.paint.title) el({ id: "p-title", kind: "title", html: lines(c.paint.title), x, y: N ? 0.585 : 0.295, after: c.paint.eyebrow ? "p-eyebrow" : undefined, gap: 0.7, fade: [ein, ein + 18, eout, eout + 20] });
    if (c.paint.text) el({ id: "p-text", kind: "text", html: esc(c.paint.text), x, y: 0, after: c.paint.title ? "p-title" : undefined, gap: 1.8, w: N ? 31 : 29, fade: [ein + 4, ein + 22, eout, eout + 20] });
    el({
      id: "p-swatches",
      kind: "swatches",
      html: c.swatches.map((s, i) => `<button type="button" class="xp-sw" data-color="${esc(s.color)}" style="--c:${esc(s.color)}" aria-label="${esc(s.name || s.color)}" aria-pressed="${i === 0}"></button>`).join("") + (c.paint.hint ? `<small>${esc(c.paint.hint)}</small>` : ""),
      x,
      y: N ? 0.8 : 0.66,
      after: c.paint.text ? "p-text" : c.paint.title ? "p-title" : undefined,
      gap: 2.6,
      fade: [ein + 8, ein + 26, eout, eout + 20],
      rise: 1.2,
    });
  }

  // ------------------------------------------------ reviews: the model at ease, one voice at a time
  if (c.voices.on && c.quotes.length) {
    const a = scene("voices", "reviews", LEN.voices);
    const slot: Slot = N ? (F ? [0.5, 0.78, 0.92, 0.6] : [0.5, 0.74, 0.5, 0.34]) : F ? [0.66, 0.68, 0.62, 0.6] : [0.7, 0.55, 0.34, 0.74];
    k(a + 30, slot, { yaw: F ? -200 : 215, elev: 6, halo: 0.1, floor: 1, dust: 0.8, glow: F ? 0.5 : 0.3, lift: up(0.12) });
    k(a + LEN.voices - 20, [slot[0] + 0.01, slot[1], slot[2], slot[3]], { yaw: F ? -214 : 232 });
    const x = N ? 0.07 : 0.05;
    const ein = a + 16;
    const eout = a + LEN.voices - 18;
    if (c.voices.eyebrow) el({ id: "v-eyebrow", kind: "eyebrow", html: esc(c.voices.eyebrow), x, y: N ? 0.085 : 0.15, fade: [ein, ein + 14, eout, eout + 18] });
    if (c.voices.title) el({ id: "v-title", kind: "title", html: lines(c.voices.title), x, y: N ? 0.105 : 0.17, after: c.voices.eyebrow ? "v-eyebrow" : undefined, gap: 0.7, fade: [ein, ein + 16, eout, eout + 18] });
    const n = c.quotes.length;
    const span = (eout - (a + 34)) / n;
    c.quotes.forEach((q, i) => {
      const t0 = a + 34 + i * span;
      const last = i === n - 1;
      el({
        id: `quote${i}`,
        kind: "quote",
        html: `<span class="stars">${icon("star").repeat(5)}</span><p>${esc(q.text)}</p><span class="who"><b>${esc(q.name)}</b>${q.role ? ` ${esc(q.role)}` : ""}</span>`,
        x,
        y: N ? 0.3 : 0.4,
        w: N ? 31 : 36,
        fade: [t0, t0 + 12, last ? eout : t0 + span - 12, last ? eout + 18 : t0 + span],
        rise: 1.4,
      });
    });
  }

  // ------------------------------------------------ finale: back where it began, with something to do
  if (c.finale.on && (c.finale.title || c.finale.cta)) {
    const a = scene("finale", "start", LEN.finale);
    const slot: Slot = N ? (F ? [0.5, 0.745, 0.96, 0.6] : [0.5, 0.7, 0.84, 0.46]) : F ? [0.526, 0.68, 0.74, 0.6] : [0.67, 0.55, 0.38, 0.76];
    const yaw = F ? -360 : 338;
    k(a + 12, [prev.cx, prev.cy, prev.w, prev.h], { pulse: 1 });
    k(a + 13, null, { pulse: 0 });
    k(a + 44, slot, { yaw, elev: 7, halo: 0, floor: 1, dust: 0.7, glow: F ? 0.4 : 0.2, word: 1, pulse: 1 });
    k(a + LEN.finale, slot, { yaw: yaw + (F ? -6 : 6) });
    const x = N ? 0.07 : 0.03;
    const ein = a + 30;
    if (c.finale.title) el({ id: "f-title", kind: "title", html: lines(c.finale.title), x, y: N ? 0.105 : 0.285, fade: [ein, ein + 22, 1e9, 1e9] });
    if (c.finale.text) el({ id: "f-text", kind: "text", html: esc(c.finale.text), x, y: 0, after: c.finale.title ? "f-title" : undefined, gap: 1.8, w: 30, fade: [ein + 4, ein + 26, 1e9, 1e9] });
    if (c.finale.cta) el({ id: "f-cta", kind: "cta", html: `<a class="xp-btn" href="${esc(c.finale.ctaHref)}">${esc(c.finale.cta)}</a>`, x, y: 0, after: c.finale.text ? "f-text" : c.finale.title ? "f-title" : undefined, gap: 2.4, fade: [ein + 8, ein + 30, 1e9, 1e9] });
  }

  if (!keys.length) k(0, [0.5, 0.5, 0.5, 0.5], {});
  return { len: Math.max(at, 1), keys, els, scenes };
}

// ---------------------------------------------------------------- sampling the keys

/** A smooth curve through the keys that never overshoots one (a monotone cubic, per value). */
export function sampler(keys: TrackKey[]): (t: number) => TrackKey {
  const names = Object.keys(BASE).filter((n) => n !== "t") as (keyof TrackKey)[];
  const n = keys.length;
  const tang: Record<string, number[]> = {};
  for (const name of names) {
    const d: number[] = [];
    const m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) d.push((keys[i + 1][name] - keys[i][name]) / Math.max(1e-6, keys[i + 1].t - keys[i].t));
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) m[i] = 0;
      else {
        const h0 = keys[i].t - keys[i - 1].t;
        const h1 = keys[i + 1].t - keys[i].t;
        const w1 = 2 * h1 + h0;
        const w2 = h1 + 2 * h0;
        m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
      }
    }
    if (n > 1) {
      m[0] = d[0];
      m[n - 1] = d[n - 2];
    }
    tang[name] = m;
  }
  return (t: number) => {
    if (n === 1 || t <= keys[0].t) return keys[0];
    if (t >= keys[n - 1].t) return keys[n - 1];
    let i = 0;
    while (i < n - 2 && keys[i + 1].t <= t) i++;
    const a = keys[i];
    const b = keys[i + 1];
    const h = b.t - a.t;
    const s = (t - a.t) / h;
    const s2 = s * s;
    const s3 = s2 * s;
    const out = { t } as TrackKey;
    for (const name of names) {
      const m = tang[name];
      (out as unknown as Record<string, number>)[name] = (2 * s3 - 3 * s2 + 1) * a[name] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * b[name] + (s3 - s2) * h * m[i + 1];
    }
    return out;
  };
}

/** How visible an element is at a moment: 0 to 1, in then out. */
export function visibility(f: [number, number, number, number], t: number): { vis: number; arrive: number; leave: number } {
  const arrive = f[1] <= f[0] ? (t >= f[0] ? 1 : 0) : smooth(f[0], f[1], t);
  const leave = f[3] <= f[2] ? (t >= f[2] ? 0 : 1) : 1 - smooth(f[2], f[3], t);
  return { vis: arrive * leave, arrive, leave };
}

// ---------------------------------------------------------------- the page

const STYLE = `.xp-track{position:relative;--u:9.6px;--xp-t-ink:#f3f3f6;--xp-t-ink2:rgba(255,255,255,.66);--xp-t-line:rgba(255,255,255,.12);--xp-t-glass:rgba(255,255,255,.05);--xp-t-bg:#0b0b0e;--xp-t-accent:#8b6cff;color:var(--xp-t-ink);font-family:var(--f-body,system-ui),system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.xp-track *{box-sizing:border-box}
.xp-bg{position:sticky;top:0;height:100vh;margin-bottom:-100vh;overflow:hidden;pointer-events:none}
.xp-bg i{position:absolute;inset:0;will-change:opacity}
.xp-pin{position:sticky;top:0;height:100vh;z-index:5;overflow:hidden;pointer-events:none}
.xp-el{position:absolute;left:0;top:0;opacity:0;visibility:hidden;will-change:transform,opacity;margin:0}
.xp-el a,.xp-el button{pointer-events:auto}
.xp-spot{position:absolute;pointer-events:none;opacity:1}
.xp-spot>img.xp-char-poster{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none}
.xp-el .l{display:block}
.xp-eyebrow{font-size:max(10px,calc(.86*var(--u)));letter-spacing:.26em;text-transform:uppercase;color:var(--xp-t-ink2);font-weight:600;white-space:nowrap}
.xp-title{font-family:var(--f-display,var(--f-body)),system-ui,sans-serif;font-weight:800;text-transform:uppercase;line-height:.97;letter-spacing:-.012em;font-size:max(26px,calc(5*var(--u)))}
.xp-head{font-family:var(--f-display,var(--f-body)),system-ui,sans-serif;font-weight:800;text-transform:uppercase;line-height:1;letter-spacing:-.005em;font-size:max(20px,calc(3.1*var(--u)));white-space:nowrap}
.xp-text{font-size:max(13px,calc(1.62*var(--u)));line-height:1.45;color:var(--xp-t-ink2);max-width:calc(var(--w,29)*var(--u))}
.xp-btn{display:inline-flex;align-items:center;justify-content:center;height:max(38px,calc(4.3*var(--u)));padding:0 max(18px,calc(2.3*var(--u)));border-radius:999px;background:var(--xp-t-ink);color:var(--xp-t-bg);font-size:max(13px,calc(1.45*var(--u)));font-weight:600;text-decoration:none;white-space:nowrap;transition:transform .2s ease,opacity .2s ease}
.xp-btn:hover{transform:translateY(-1px)}
.xp-btn:focus-visible,.xp-sw:focus-visible{outline:2px solid var(--xp-t-ink);outline-offset:3px}
.xp-cue{display:grid;justify-items:center;gap:8px;font-size:max(9px,calc(.8*var(--u)));letter-spacing:.3em;text-transform:uppercase;color:var(--xp-t-ink2)}
.xp-cue i{width:1px;height:calc(3.2*var(--u));background:linear-gradient(var(--xp-t-ink2),transparent)}
.xp-chip{display:inline-flex;align-items:center;gap:max(7px,calc(.8*var(--u)));height:max(32px,calc(3.7*var(--u)));padding:0 max(13px,calc(1.4*var(--u))) 0 max(11px,calc(1.1*var(--u)));border-radius:999px;background:var(--xp-t-glass);border:1px solid var(--xp-t-line);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);white-space:nowrap;font-size:max(11.5px,calc(1.18*var(--u)))}
.xp-chip svg{width:1.35em;height:1.35em;flex:none;opacity:.7}
.xp-chip b{font-weight:700}
.xp-chip i{font-style:normal;color:var(--xp-t-ink2)}
.xp-card{width:calc(var(--w,21)*var(--u));display:grid;gap:max(5px,calc(.55*var(--u)));align-content:start;padding:max(14px,calc(1.8*var(--u)));border-radius:max(14px,calc(1.7*var(--u)));background:var(--xp-t-glass);border:1px solid var(--xp-t-line);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);min-height:calc(14.2*var(--u))}
.xp-card .ic{display:grid;place-items:center;width:max(26px,calc(2.7*var(--u)));height:max(26px,calc(2.7*var(--u)));border-radius:max(8px,calc(.8*var(--u)));border:1px solid var(--xp-t-line);margin-bottom:max(6px,calc(.9*var(--u)));color:var(--xp-t-ink2)}
.xp-card .ic svg{width:55%;height:55%}
.xp-card b{font-size:max(13.5px,calc(1.5*var(--u)));font-weight:700;line-height:1.2}
.xp-card span:last-child{font-size:max(12px,calc(1.24*var(--u)));line-height:1.45;color:var(--xp-t-ink2)}
.xp-swatches{display:flex;align-items:center;gap:max(10px,calc(1.2*var(--u)));flex-wrap:wrap}
.xp-swatches small{flex-basis:100%;margin-top:max(4px,calc(.5*var(--u)));font-size:max(11px,calc(1.05*var(--u)));color:var(--xp-t-ink2);letter-spacing:.06em}
.xp-sw{width:max(30px,calc(3.5*var(--u)));height:max(30px,calc(3.5*var(--u)));border-radius:50%;border:2px solid var(--xp-t-line);background:var(--c);cursor:pointer;padding:0;transition:transform .2s ease,box-shadow .2s ease}
.xp-sw[aria-pressed=true]{box-shadow:0 0 0 3px var(--xp-t-bg),0 0 0 5px var(--xp-t-ink)}
.xp-sw:hover{transform:scale(1.08)}
.xp-quote{width:calc(var(--w,36)*var(--u))}
.xp-quote .stars{display:flex;gap:3px;color:var(--xp-t-accent);margin-bottom:max(10px,calc(1.1*var(--u)))}
.xp-quote .stars svg{width:max(14px,calc(1.5*var(--u)));height:max(14px,calc(1.5*var(--u)));fill:currentColor;stroke:none}
.xp-quote p{margin:0;font-family:var(--f-display,var(--f-body)),system-ui,sans-serif;font-weight:700;text-transform:uppercase;line-height:1.06;letter-spacing:-.005em;font-size:max(22px,calc(3.1*var(--u)))}
.xp-quote .who{display:block;margin-top:max(12px,calc(1.4*var(--u)));font-size:max(12px,calc(1.3*var(--u)));color:var(--xp-t-ink2)}
.xp-quote .who b{color:var(--xp-t-ink);font-weight:700}
@media (prefers-reduced-motion:reduce){.xp-btn,.xp-sw{transition:none}}`;

export interface Scenes {
  readonly track: HTMLElement;
  /** The place the model's first shot stands, with its picture while the model loads. */
  readonly hero: HTMLElement | null;
  /** Hands the camera to the script. */
  attach(film: Film): void;
  detach(): void;
  /** The content changed: true if the story was drawn again. */
  update(data: Data): boolean;
  /** The model's shape is known: wide and low, or tall. */
  shape(flat: boolean): void;
  dispose(): void;
}

export interface ScenesOptions {
  /** An empty element that is to hold the track (the template made a place for it). */
  host: HTMLElement | null;
  /** Otherwise the track goes after this element. */
  after: HTMLElement | null;
  /** The track opens the page and brings the opening scene. */
  opening: boolean;
  /** A visitor chose a colour for the model (null: as made). */
  paint?: (color: string | null) => void;
}

const lum = (hex: string) => {
  if (!HEX.test(hex)) return 0;
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};

export function mountScenes(doc: Document, data: Data, o: ScenesOptions): Scenes | null {
  const win = doc.defaultView || window;
  if (!doc.getElementById("xp-scenes-style")) {
    const st = doc.createElement("style");
    st.id = "xp-scenes-style";
    st.textContent = STYLE;
    doc.head.appendChild(st);
  }
  const brand = () => str(data.brand?.name) || str(data.character?.name);
  let content = filmContent(data, brand());
  let flat = true;
  let script: Script = buildScript(content, { narrow: false, flat }, o.opening);
  let sample = sampler(script.keys);

  const track = doc.createElement("section");
  track.className = "xp-track";
  track.setAttribute("data-xp-film-track", "");
  track.setAttribute("aria-label", "Story");
  // The room: a spotlight from above and a lit band of floor, fixed to the screen behind the model.
  const bg = doc.createElement("div");
  bg.className = "xp-bg";
  bg.setAttribute("aria-hidden", "true");
  const bgSpot = doc.createElement("i");
  const bgFloor = doc.createElement("i");
  bg.append(bgSpot, bgFloor);
  track.appendChild(bg);
  const pin = doc.createElement("div");
  pin.className = "xp-pin";
  track.appendChild(pin);
  let host: HTMLElement | null = o.host;
  if (host) {
    host.textContent = "";
    host.appendChild(track);
  } else if (o.after && o.after.parentElement) o.after.insertAdjacentElement("afterend", track);
  else doc.body.appendChild(track);

  let spot: HTMLElement | null = null;
  const nodes = new Map<string, HTMLElement>();
  let film: Film | null = null;
  let W = 0;
  let H = 0;
  let unit = 9.6;
  let narrow = false;
  let raf = 0;
  let lastT = NaN;
  let alive = true;
  const reduced = () => !!win.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // The track's colours come from the character's own gradient: its base, glow and second colour.
  const paintTheme = () => {
    const d: Data = data.design || {};
    const st: string[] = Array.isArray(d.stops) ? d.stops.filter((x: unknown) => typeof x === "string") : [];
    const base = HEX.test(st[0] || "") ? st[0] : "#0d0d10";
    const glow = HEX.test(st[1] || "") ? st[1] : "#8b6cff";
    const second = HEX.test(st[2] || "") ? st[2] : base;
    const dark = lum(base) < 0.18;
    const s = track.style;
    s.setProperty("--xp-t-ink", dark ? "#f4f4f7" : "#101014");
    s.setProperty("--xp-t-ink2", dark ? "rgba(255,255,255,.66)" : "rgba(16,16,20,.64)");
    s.setProperty("--xp-t-line", dark ? "rgba(255,255,255,.13)" : "rgba(16,16,20,.14)");
    s.setProperty("--xp-t-glass", dark ? "rgba(255,255,255,.055)" : "rgba(255,255,255,.62)");
    s.setProperty("--xp-t-bg", base);
    s.setProperty("--xp-t-accent", glow);
    // A spotlight from above over a deep, slightly lifting floor of the gradient's own colours.
    s.background = `linear-gradient(180deg, ${base} 0%, color-mix(in oklab, ${base} 70%, ${second}) 100%)`;
    const lit = `color-mix(in oklab, ${glow} 12%, ${dark ? "#ffffff" : "#ffffff"})`;
    bgSpot.style.background = dark
      ? `radial-gradient(70% 78% at 50% 22%, color-mix(in oklab, ${lit} 36%, transparent) 0%, color-mix(in oklab, ${lit} 14%, transparent) 46%, transparent 78%)`
      : `radial-gradient(70% 78% at 50% 22%, rgba(255,255,255,.7) 0%, rgba(255,255,255,.25) 46%, transparent 78%)`;
    bgFloor.style.background = `radial-gradient(92% 20% at 50% 92%, color-mix(in oklab, ${lit} ${dark ? 40 : 46}%, transparent) 0%, color-mix(in oklab, ${lit} ${dark ? 16 : 20}%, transparent) 55%, transparent 100%)`;
  };

  const build = () => {
    nodes.clear();
    for (const n of Array.from(pin.children)) n.remove();
    spot = null;
    // The model's first spot: here for the film to find, and to show the picture until it is drawn.
    if (o.opening && str(data.character?.src)) {
      spot = doc.createElement("div");
      spot.className = "xp-spot";
      spot.setAttribute("data-xp-character", "hero");
      spot.setAttribute("role", "img");
      spot.setAttribute("aria-label", str(data.character?.name) || "3D character");
      const poster = str(data.character?.poster);
      if (/^(https:|data:image\/|\.\/|\/)/i.test(poster)) {
        const im = doc.createElement("img");
        im.className = "xp-char-poster";
        im.alt = "";
        im.src = poster;
        im.draggable = false;
        spot.appendChild(im);
      }
      pin.appendChild(spot);
    }
    for (const e of script.els) {
      const n = doc.createElement("div");
      n.className = `xp-el xp-${e.kind === "swatches" ? "swatches" : e.kind}`;
      n.setAttribute("data-xp-el", e.id);
      n.innerHTML = e.html;
      pin.appendChild(n);
      nodes.set(e.id, n);
    }
    // Colour choices repaint the model.
    pin.querySelectorAll<HTMLButtonElement>(".xp-sw").forEach((b, i, all) => {
      b.addEventListener("click", () => {
        all.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        o.paint?.(i === 0 ? null : b.getAttribute("data-color"));
      });
    });
  };

  /** Where every element goes for this screen: its place, its width and the model's first spot. */
  const place = () => {
    W = Math.max(1, win.innerWidth);
    H = Math.max(1, win.innerHeight);
    narrow = W < 700 || W / H < 0.85;
    unit = narrow ? Math.max(8, W / 36) : Math.max(7, Math.min(W, H * 1.36) / 96);
    track.style.setProperty("--u", `${unit.toFixed(2)}px`);
    const next = buildScript(content, { narrow, flat }, o.opening);
    script = next;
    sample = sampler(next.keys);
    // Elements come and go with the screen's shape and the model's: draw them again if the set changed.
    const ids = next.els.map((e) => e.id).join("|");
    if (ids !== Array.from(nodes.keys()).join("|") || nodes.size === 0) build();
    track.style.height = `${(script.len + 100) * (H / 100)}px`;
    pin.style.height = `${H}px`;
    // Words that sit below other words go where those words end, whatever size the font made them.
    const tops = new Map<string, number>();
    for (const e of script.els) {
      const n = nodes.get(e.id);
      if (!n) continue;
      let top = e.y * H;
      const above = e.after ? nodes.get(e.after) : null;
      if (e.after && above && tops.has(e.after)) top = tops.get(e.after)! + above.offsetHeight + (e.gap ?? 1.5) * unit;
      tops.set(e.id, top);
      const spec = e;
      n.style.left = `${spec.x * 100}%`;
      n.style.top = `${top.toFixed(1)}px`;
      n.style.translate = `${-(spec.ax ?? 0) * 100}% ${-(spec.ay ?? 0) * 100}%`;
      if (spec.w) n.style.setProperty("--w", String(spec.w));
      else n.style.removeProperty("--w");
    }
    if (spot) {
      const s = script.keys[0];
      spot.style.left = `${(s.cx - s.w / 2) * 100}%`;
      spot.style.top = `${(s.cy - s.h / 2) * 100}%`;
      spot.style.width = `${s.w * 100}%`;
      spot.style.height = `${s.h * 100}%`;
    }
    lastT = NaN;
    film?.setTrack(trackFor());
    draw();
  };

  const trackFor = (): Track => ({ el: track, len: script.len, sample: (t) => sample(t), opening: o.opening });

  /** Every element at the page's place in the story. */
  const draw = () => {
    raf = 0;
    if (!alive) return;
    const r = track.getBoundingClientRect();
    const t = -r.top / (H / 100);
    if (t === lastT) return;
    lastT = t;
    const calm = reduced();
    const far = t < -120 || t > script.len + 160;
    if (!far) {
      const k = sample(clamp(t, 0, script.len));
      bgSpot.style.opacity = (0.35 + 0.65 * (1 - k.halo * 0.6)).toFixed(2);
      bgFloor.style.opacity = clamp(k.floor).toFixed(2);
    }
    for (const e of script.els) {
      const n = nodes.get(e.id);
      if (!n) continue;
      const { vis, arrive, leave } = far ? { vis: 0, arrive: 0, leave: 0 } : visibility(e.fade, t);
      const on = vis > 0.01;
      if (!on) {
        if (n.style.visibility !== "hidden") (n.style.visibility = "hidden"), (n.style.opacity = "0");
        continue;
      }
      if (n.style.visibility !== "visible") n.style.visibility = "visible";
      n.style.opacity = vis.toFixed(3);
      if (calm) continue;
      const rise = (e.rise ?? 1) * unit;
      const dy = (1 - arrive) * rise - (1 - leave) * rise * 0.6 - (e.drift ? (e.drift * H * clamp((t - e.fade[0]) / 100, 0, 2)) : 0);
      n.style.transform = `translate3d(0, ${dy.toFixed(1)}px, 0)`;
    }
  };
  const schedule = () => {
    if (!raf && alive) raf = win.requestAnimationFrame(draw);
  };
  const onScroll = () => schedule();
  const onResize = () => {
    if (win.innerWidth === W && Math.abs(win.innerHeight - H) < 64) return schedule();
    place();
  };
  win.addEventListener("scroll", onScroll, { passive: true });
  win.addEventListener("resize", onResize);

  // Links to a scene (#specs, #angles, #customize, #reviews, #start) scroll the story to it.
  const onClick = (ev: MouseEvent) => {
    const a = (ev.target as Element | null)?.closest?.("a[href^='#']") as HTMLAnchorElement | null;
    if (!a || ev.defaultPrevented || ev.metaKey || ev.ctrlKey) return;
    const slug = (a.getAttribute("href") || "").slice(1);
    const sc = script.scenes.find((x) => x.slug === slug);
    if (!sc) return;
    ev.preventDefault();
    const top = track.getBoundingClientRect().top + win.scrollY;
    const to = top + (sc.at + (sc.slug === "top" ? 0 : sc.len * 0.55)) * (H / 100);
    win.scrollTo({ top: Math.max(0, to), behavior: reduced() ? "auto" : "smooth" });
  };
  doc.addEventListener("click", onClick);

  (win as unknown as { __XP_SCENES__?: () => unknown }).__XP_SCENES__ = () => ({ len: script.len, t: Math.round(lastT * 10) / 10, narrow, flat, unit: Math.round(unit * 10) / 10, scenes: script.scenes, els: script.els.map((e) => ({ id: e.id, x: e.x, y: e.y, fade: e.fade })), keys: script.keys.length });

  paintTheme();
  place();
  void doc.fonts?.ready?.then(() => alive && place());

  return {
    track,
    get hero() {
      return spot;
    },
    attach(f) {
      film = f;
      f.setTrack(trackFor());
      schedule();
    },
    detach() {
      film = null;
    },
    update(next) {
      data = next;
      paintTheme();
      const c = filmContent(data, brand());
      if (JSON.stringify(c) === JSON.stringify(content) && (!!spot === (o.opening && !!str(data.character?.src)))) return false;
      content = c;
      nodes.clear();
      place();
      return true;
    },
    shape(f) {
      if (f === flat) return;
      flat = f;
      place();
    },
    dispose() {
      alive = false;
      if (raf) win.cancelAnimationFrame(raf);
      win.removeEventListener("scroll", onScroll);
      win.removeEventListener("resize", onResize);
      doc.removeEventListener("click", onClick);
      film?.setTrack(null);
      track.remove();
      if (host && host.isConnected) host.textContent = "";
    },
  };
}
