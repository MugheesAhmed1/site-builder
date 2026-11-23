// What the choreography's two script writers share (scenes.ts: the fixed six-scene story,
// plan.ts: a template's own plan of scenes) and the page that plays either (scenes.ts mount):
// the types of a script, small helpers, the icons, the smooth curve through the camera's keys
// and the moment an element is visible. See docs/FILM.md and docs/FILM-TEMPLATES.md.
import type { TrackKey } from "./film";

export type Data = Record<string, any>;

export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
export const flag = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);
export const HEX = /^#[0-9a-f]{6}$/i;
/** A picture's address the page may draw: https, an uploaded data picture, or a file next to the page. */
export const SAFE_IMG = /^(https:|data:image\/|\.\/|\/)/i;

export interface Variant {
  /** A phone-shaped screen: one column. */
  narrow: boolean;
  /** A wide, low model (a car, a boat) rather than a tall one (a person, a bird). */
  flat: boolean;
  /** How much of the screen's height the centred words take (measured once they are drawn): the figure keeps above them. */
  stack?: number;
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
  /** Moved this many units sideways from its point (spacing that follows the type, not the screen). */
  ox?: number;
  /** Width in units (see Unit): empty means as wide as its words. */
  w?: number;
  /** Fades in from t0 to t1, out from t2 to t3 (hundredths of a screen of scrolling). */
  fade: [number, number, number, number];
  /** Sits below another element (its id) with this gap in units, whatever height its words make. */
  after?: string;
  gap?: number;
  /** Rises this many units into place. */
  rise?: number;
  /** Slides this many units sideways into place (from the left when negative). */
  slide?: number;
  /** Drifts this fraction of the screen's height upward over a screen of scrolling. */
  drift?: number;
  /** Takes its place from this scale (1: no growth). */
  pop?: number;
  /** Counts up to its number while it arrives (an element with [data-count] inside). */
  count?: boolean;
  /** Carries the "is-on" class between these moments (the step or question that is current). */
  on?: [number, number];
}

/** A picture over the room's gradient while a scene plays. */
export interface PlateSpec {
  id: string;
  src: string;
  fade: [number, number, number, number];
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
  plates?: PlateSpec[];
  /**
   * How long the opening plays by itself when the page opens, in the story's own units: the story's
   * clock starts at -intro and runs up to 0, where the page rests until the first scroll. Its keys and
   * the words' first fades lie in that run. 0 or absent: the page opens already at 0.
   */
  intro?: number;
}

export type Slot = [number, number, number, number];

export const BASE: TrackKey = { lift: 0, t: 0, cx: 0.5, cy: 0.5, w: 0.5, h: 0.5, yaw: 0, elev: 8, align: 0, presence: 1, ring: 0, floor: 1, dust: 0.5, halo: 0, word: 0, glow: 0, pulse: 1 };

/** The never-fading start: an element already there when the page opens. */
export const NOW = -100;

export function lines(s: string): string {
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
  // Added for the templates' own stories (docs/FILM-TEMPLATES.md).
  phone: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  calendar: "M5 5h14v15H5zM5 10h14M9 3v4M15 3v4",
  home: "M4 11l8-7 8 7M6 10v10h12V10M10 20v-6h4v6",
  key: "M14 10a4 4 0 1 0-3.9 4.1L12 16l1 1 1-1 1 1 2-2zM8 10h.01",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20c0-4 3-6 7-6s7 2 7 6",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 19c0-3.5 2.8-5.5 6.5-5.5s6.5 2 6.5 5.5M16 5a3.2 3.2 0 0 1 0 6.2M18 14c2.2.6 3.5 2.3 3.5 5",
  cup: "M5 8h11v6a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5zM16 9h2a2.5 2.5 0 0 1 0 5h-2M7 3c0 1.2 1 1.2 1 2.4M11 3c0 1.2 1 1.2 1 2.4",
  fork: "M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16 3c-2 2-2.5 5-2 8h2v10",
  bed: "M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 12h.01",
  anchor: "M12 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 7v14M6 12H4a8 8 0 0 0 16 0h-2M8 11h8",
  camera: "M4 8h3l1.5-2.5h7L17 8h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  tooth: "M8 4c-2.5 0-4 2-4 4.5 0 3 1.5 4.5 2 7 .3 1.6.8 4.5 2 4.5s1-4 2-4 .8 4 2 4 1.7-2.9 2-4.5c.5-2.5 2-4 2-7C18 6 16.5 4 14 4c-1.2 0-1.7.6-3 .6S9.2 4 8 4z",
  dumbbell: "M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12",
  trophy: "M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 20h8",
  mountain: "M3 19l6-10 3.5 5.5L15 11l6 8zM8.5 9.8l1.5 2.2",
  droplet: "M12 3c3.5 4.2 6 7 6 10.5a6 6 0 0 1-12 0C6 10 8.5 7.2 12 3z",
  code: "M9 8l-4 4 4 4M15 8l4 4-4 4M13.5 5l-3 14",
  map: "M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14",
  gift: "M4 11h16v9H4zM3 8h18v3H3zM12 8v12M12 8c-1.5-3.5-5-3.5-5-1.2C7 8 9 8 12 8zM12 8c1.5-3.5 5-3.5 5-1.2C17 8 15 8 12 8z",
  tag: "M3 12V4h8l10 10-8 8zM7.5 8h.01",
  book: "M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h10",
  snow: "M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M9 4.5l3 2 3-2M9 19.5l3-2 3 2",
  scissors: "M6 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM8 7l12 11M8 17L20 6",
  cart: "M3 4h2l2.4 11h10.2L20 8H7M9.5 20h.01M17 20h.01",
  box: "M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8",
  chat: "M4 5h16v11H11l-4 4v-4H4z",
};
export const ICON_NAMES = Object.keys(PATHS);
export const icon = (name: string) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${PATHS[name] || PATHS.spark}"/></svg>`;

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
