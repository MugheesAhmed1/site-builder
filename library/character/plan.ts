// A template's own story (docs/FILM-TEMPLATES.md): an ordered plan of scenes, each one a section of
// the page written around the central 3D figure. Where scenes.ts has one fixed story (opening,
// specs, view from above, colours, reviews, finale), a template here chooses its scenes (steps,
// numbers, pictures, plans, people, questions, how to find it...), how each is laid out (a
// composition), and how the camera moves from one to the next (a logic). The result is the same
// kind of script as scenes.ts writes, so the same page plays it: the camera, the words, the cards
// and the pictures all keyed to the scroll.
import type { TrackKey } from "./film";
import { BASE, NOW, SAFE_IMG, clamp, esc, flag, icon, lines, str } from "./scene-kit";
import type { Data, ElSpec, PlateSpec, SceneInfo, Script, Slot, Variant } from "./scene-kit";

// ---------------------------------------------------------------- vocabulary

export const SCENE_TYPES = ["hero", "facts", "cards", "steps", "stats", "gallery", "plans", "people", "voices", "faq", "visit", "paint", "finale"] as const;
export type SceneType = (typeof SCENE_TYPES)[number];

/** How a scene is laid out: the first is the default. "side": words on the left, the figure on the right; "flip": the other way round. */
export const COMPS: Record<SceneType, string[]> = {
  hero: ["word", "center"],
  facts: ["side", "flip"],
  cards: ["flank", "stage"],
  steps: ["side", "flip"],
  stats: ["flank", "stage"],
  gallery: ["stage"],
  plans: ["stage"],
  people: ["flank", "stage"],
  voices: ["side", "flip"],
  faq: ["side", "flip"],
  visit: ["side", "flip"],
  paint: ["side", "flip"],
  finale: ["center", "side"],
};

/** How the camera moves from scene to scene. */
export const LOGICS = ["turntable", "orbit", "drift", "flip", "rise", "descend", "still"] as const;
/** What fills the air round the figure (air.ts). */
export const LOOKS = ["studio", "embers", "snow", "bubbles", "petals", "fireflies", "confetti", "sparks", "stars", "leaves", "none"] as const;
/** How the figure arrives in the opening scene. */
export const OPENINGS = ["lift", "drop", "spin", "zoom", "reveal"] as const;
/** How long each opening plays by itself when the page opens, in the story's own units (about 50 ms each; scenes.ts). */
export const INTRO: Record<(typeof OPENINGS)[number], number> = { lift: 12, drop: 34, spin: 34, zoom: 30, reveal: 30 };
/** How words and cards arrive. */
export const MOTIONS = ["rise", "slide", "pop", "zoom", "drift"] as const;

/** The most items a scene takes. */
export const CAPS: Record<SceneType, number> = { hero: 0, facts: 6, cards: 6, steps: 5, stats: 4, gallery: 5, plans: 3, people: 4, voices: 3, faq: 5, visit: 5, paint: 6, finale: 0 };

/** A scene's type from its id: the part before a dash, underscore or number ("steps", "steps2" and "steps-story" are all steps). */
export const typeOf = (id: string): SceneType | null => {
  const t = id.split(/[-_\d]/)[0];
  return (SCENE_TYPES as readonly string[]).includes(t) ? (t as SceneType) : null;
};

// ---------------------------------------------------------------- content

export interface PlanItem {
  icon: string;
  title: string;
  text: string;
  label: string;
  value: string;
  image: string;
  name: string;
  role: string;
  q: string;
  a: string;
  price: string;
  per: string;
  features: string[];
  cta: string;
  ctaHref: string;
  color: string;
}

export interface PlanScene {
  id: string;
  type: SceneType;
  comp: string;
  eyebrow: string;
  title: string;
  text: string;
  hint: string;
  cta: string;
  ctaHref: string;
  /** A picture behind the room while the scene plays. */
  plate: string;
  /** The plan that is shown as the one to take (1 to 3; 0 for none). */
  featured: number;
  items: PlanItem[];
}

export interface FilmPlan {
  logic: string;
  look: string;
  opening: string;
  motion: string;
  scenes: PlanScene[];
}

const pick = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d);

/** The words of one scene, always whole whatever the content holds. */
function sceneOf(id: string, type: SceneType, raw: Data, name: string): PlanScene | null {
  const fill = (s: unknown) => str(s).replace(/\{name\}/g, name).replace(/\{year\}/g, String(new Date().getFullYear())).trim();
  const img = (s: unknown) => {
    const v = str(s).trim();
    return SAFE_IMG.test(v) ? v : "";
  };
  const rows: Data[] = Array.isArray(raw.items) ? raw.items.filter((x: unknown) => x && typeof x === "object") : [];
  const items: PlanItem[] = rows.slice(0, CAPS[type]).map((x) => {
    const feats = Array.isArray(x.features) ? x.features : str(x.features).split(/\n+/);
    return {
      icon: str(x.icon, "spark"),
      title: fill(x.title),
      text: fill(x.text),
      label: fill(x.label),
      value: fill(x.value),
      image: img(x.image),
      name: fill(x.name),
      role: fill(x.role),
      q: fill(x.q),
      a: fill(x.a),
      price: fill(x.price),
      per: fill(x.per),
      features: feats.map((f: unknown) => fill(f)).filter(Boolean).slice(0, 5),
      cta: fill(x.cta),
      ctaHref: str(x.ctaHref, "#"),
      color: HEX_OK.test(str(x.color)) ? str(x.color).toLowerCase() : "",
    };
  });
  const own = (it: PlanItem) => !!(it.title || it.text || it.label || it.value || it.name || it.q || it.price || it.color || it.image);
  const s: PlanScene = {
    id,
    type,
    comp: pick(raw.comp, COMPS[type] as readonly string[], COMPS[type][0]),
    eyebrow: fill(raw.eyebrow),
    title: fill(raw.title) || (type === "hero" ? name : ""),
    text: fill(raw.text),
    hint: fill(raw.hint),
    cta: fill(raw.cta),
    ctaHref: str(raw.ctaHref, "#"),
    plate: img(raw.plate),
    featured: Math.max(0, Math.min(3, Math.round(typeof raw.featured === "number" ? raw.featured : 0))),
    items: items.filter(own),
  };
  // A scene with nothing to say, or nothing to show, is left out.
  const needs: SceneType[] = ["facts", "cards", "steps", "stats", "gallery", "plans", "people", "voices", "faq", "visit", "paint"];
  if (needs.includes(type) && !s.items.length) return null;
  if (type === "finale" && !(s.title || s.cta)) return null;
  return s;
}

const HEX_OK = /^#[0-9a-f]{6}$/i;

/** The plan a page asks for (content.film.order lists its scenes), or null when it has none. */
export function filmPlan(data: Data, name = ""): FilmPlan | null {
  const f: Data = (data && data.film) || {};
  if (typeof f.order !== "string" || !f.order.trim()) return null;
  const scenes: PlanScene[] = [];
  const seen = new Set<string>();
  for (const id of f.order.split(/[\s,]+/).filter(Boolean)) {
    if (seen.has(id)) continue;
    seen.add(id);
    const type = typeOf(id);
    const raw = f[id];
    if (!type || !raw || typeof raw !== "object" || !flag((raw as Data).on, true)) continue;
    const s = sceneOf(id, type, raw as Data, name);
    if (s) scenes.push(s);
  }
  return { logic: pick(f.logic, LOGICS, "orbit"), look: pick(f.look, LOOKS, "studio"), opening: pick(f.opening, OPENINGS, "lift"), motion: pick(f.motion, MOTIONS, "rise"), scenes };
}

// ---------------------------------------------------------------- poses

interface Pose {
  box: Slot;
  yaw: number;
  elev: number;
  halo: number;
  floor: number;
  dust: number;
  glow: number;
  lift: number;
}

/**
 * Where the figure stands for a composition: the box it is fitted into (fractions of the screen).
 * `small` is for scenes whose cards start high (pictures, plans), so the figure keeps above them.
 */
function zone(comp: string, v: Variant, small = false): Slot {
  const { narrow: N, flat: F } = v;
  // A phone has one layout for every scene: the words above, the figure under them, the item below.
  if (N) return F ? [0.5, 0.4, 0.92, 0.3] : [0.5, 0.41, 0.5, 0.34];
  switch (comp) {
    case "side":
      return F ? [0.66, 0.53, 0.58, 0.56] : [0.7, 0.54, 0.34, 0.74];
    case "flip":
      return F ? [0.33, 0.53, 0.56, 0.56] : [0.3, 0.54, 0.34, 0.74];
    case "flank":
      return F ? [0.5, 0.56, 0.36, 0.52] : [0.5, 0.56, 0.26, 0.74];
    case "stage":
      return small ? (F ? [0.5, 0.375, 0.42, 0.32] : [0.5, 0.375, 0.2, 0.34]) : F ? [0.5, 0.42, 0.52, 0.4] : [0.5, 0.41, 0.26, 0.42];
    default:
      return F ? [0.5, 0.36, 0.6, 0.5] : [0.5, 0.36, 0.28, 0.5];
  }
}

/** How the camera looks at the figure in the i-th of n scenes, by logic. */
function look(logic: string, i: number, n: number, comp: string, F: boolean): { yaw: number; elev: number; lift: number } {
  const r = n > 1 ? i / (n - 1) : 0;
  const odd = i % 2 === 1;
  switch (logic) {
    case "orbit":
      return { yaw: (F ? 18 : -14) + i * (F ? 58 : 62), elev: 11 + 7 * Math.sin(i * 1.4), lift: F ? 0.1 : 0.03 };
    case "drift": {
      const s = comp === "flip" ? -1 : comp === "side" ? 1 : odd ? -1 : 1;
      return { yaw: (F ? 36 : 26) * s, elev: 10 + (i % 3) * 3, lift: F ? 0.08 : 0.03 };
    }
    case "flip":
      return { yaw: odd ? (F ? -152 : 168) : F ? 30 : 22, elev: 10, lift: F ? 0.08 : 0.03 };
    case "rise":
      return { yaw: (F ? 26 : 20) + i * 8, elev: 8 + r * 30, lift: F ? 0.1 + r * 0.1 : 0.04 };
    case "descend":
      return { yaw: (F ? 40 : 30) - i * 10, elev: 36 - r * 30, lift: F ? 0.16 : 0.05 };
    case "still":
      return { yaw: (F ? 20 : 14) * (odd ? -1 : 1), elev: 10, lift: F ? 0.06 : 0.02 };
    default:
      return { yaw: odd ? (F ? 58 : 26) : F ? -38 : -20, elev: odd ? 15 : 10, lift: F ? 0.1 : 0.03 };
  }
}

// ---------------------------------------------------------------- pieces of words

const numWords = (n: number) => String(n).padStart(2, "0");

/** A number to count up to: "12,000+" counts 0 to 12,000 and keeps its "+". */
function countAttrs(value: string): string {
  const m = /^([^0-9-]*)(-?[\d][\d.,]*)(.*)$/.exec(value);
  if (!m) return "";
  const num = parseFloat(m[2].replace(/,/g, ""));
  if (!isFinite(num)) return "";
  const dec = (m[2].split(".")[1] || "").replace(/\D/g, "").length;
  return ` data-count="${num}" data-dec="${dec}" data-pre="${esc(m[1])}" data-suf="${esc(m[3])}" data-group="${/,/.test(m[2]) ? 1 : 0}"`;
}

const card = (it: PlanItem) => `<span class="ic">${icon(it.icon)}</span><b>${esc(it.title)}</b><span>${esc(it.text)}</span>`;

const stat = (it: PlanItem) => `<b class="n"${countAttrs(it.value)}>${esc(it.value)}</b><span class="lb">${esc(it.label || it.title)}</span>`;

const step = (it: PlanItem, i: number) => `<span class="no">${numWords(i + 1)}</span><b>${esc(it.title)}</b>${it.text ? `<span class="tx">${esc(it.text)}</span>` : ""}`;

const plan = (it: PlanItem, featured: boolean, tag: string) =>
  `${featured && tag ? `<span class="tag">${esc(tag)}</span>` : ""}<b class="nm">${esc(it.name || it.title)}</b><span class="pr"><em>${esc(it.price)}</em>${it.per ? `<small>${esc(it.per)}</small>` : ""}</span>${it.text ? `<span class="tx">${esc(it.text)}</span>` : ""}${
    it.features.length ? `<ul>${it.features.map((f) => `<li>${icon("check")}${esc(f)}</li>`).join("")}</ul>` : ""
  }${it.cta ? `<a class="xp-btn" href="${esc(it.ctaHref)}">${esc(it.cta)}</a>` : ""}`;

const pic = (it: PlanItem) =>
  `<span class="img">${it.image ? `<img src="${esc(it.image)}" alt="${esc(it.title)}" decoding="async" draggable="false">` : ""}</span><b>${esc(it.title)}</b>${it.text ? `<span class="tx">${esc(it.text)}</span>` : ""}`;

const person = (it: PlanItem) =>
  `<span class="av">${it.image ? `<img src="${esc(it.image)}" alt="" decoding="async" draggable="false">` : `<i>${esc((it.name || "?").trim().charAt(0).toUpperCase())}</i>`}</span><b>${esc(it.name || it.title)}</b>${it.role ? `<i class="rl">${esc(it.role)}</i>` : ""}${it.text ? `<span class="tx">${esc(it.text)}</span>` : ""}`;

const fact = (it: PlanItem) => `<span class="ic">${icon(it.icon)}</span><span class="tx"><i>${esc(it.label)}</i><b>${esc(it.value || it.title)}</b></span>`;

const chip = (it: PlanItem) => `${icon(it.icon)}<b>${esc(it.label || it.title)}</b>${it.value ? `<i>${esc(it.value)}</i>` : ""}`;

// ---------------------------------------------------------------- the script

/** Scene lengths, in hundredths of a screen of scrolling; a phone shows items one at a time, so it takes longer. */
function lengthOf(type: SceneType, n: number, N: boolean): number {
  switch (type) {
    case "hero":
      return 150;
    case "facts":
      return 125;
    case "cards":
      return N ? 90 + 38 * n : 170;
    case "steps":
    case "faq":
      return 80 + 56 * n;
    case "stats":
    case "people":
      return N ? 80 + 42 * n : 140;
    case "gallery":
      return N ? 80 + 42 * n : 150;
    case "plans":
      return N ? 80 + 52 * n : 165;
    case "voices":
      return 70 + 56 * n;
    case "visit":
      return N ? 120 : 135;
    case "paint":
      return 150;
    default:
      return 100;
  }
}

/** The centres of n things in a row across the screen, as fractions of its width. */
/** The line the centred words stand on (as a fraction of the screen's height). */
const STACK_Y = 0.94;

const rowX = (n: number) => (n <= 1 ? [0.5] : n === 2 ? [0.36, 0.64] : n === 3 ? [0.2, 0.5, 0.8] : n === 4 ? [0.15, 0.385, 0.615, 0.85] : Array.from({ length: n }, (_, i) => 0.1 + (0.8 * i) / (n - 1)));

/** Where the cards go: a column of up to three on each side, evenly spread. */
function sideSlots(n: number): { side: "l" | "r"; y: number }[] {
  const left = Math.ceil(n / 2);
  const right = n - left;
  const col = (m: number) => Array.from({ length: m }, (_, i) => 0.545 - ((m - 1) * 0.235) / 2 - 0.105 + i * 0.235);
  return [...col(left).map((y) => ({ side: "l" as const, y })), ...col(right).map((y) => ({ side: "r" as const, y }))];
}

export function buildPlan(plan_: FilmPlan, v: Variant, opening: boolean): Script {
  const keys: TrackKey[] = [];
  const els: ElSpec[] = [];
  const scenes: SceneInfo[] = [];
  const plates: PlateSpec[] = [];
  /** How long the opening plays by itself before the first scroll position (the hero sets it). */
  let intro = 0;
  let prev: TrackKey = { ...BASE };
  const k = (t: number, slot: Slot | null, p: Partial<TrackKey> = {}) => {
    const next: TrackKey = { ...prev, t, ...(slot ? { cx: slot[0], cy: slot[1], w: slot[2], h: slot[3] } : {}), ...p };
    keys.push(next);
    prev = next;
  };
  const el = (e: ElSpec) => els.push(e);
  const F = v.flat;
  const N = v.narrow;
  /** Title, words and button as one block that stands on a line and grows upward (centred scenes). */
  const stack = (id: string, s: { title: string; text: string; cta: string; ctaHref: string }, fade: [number, number, number, number]) =>
    el({
      id,
      kind: "stack c",
      html: `${s.title ? `<div class="xp-title">${lines(s.title)}</div>` : ""}${s.text ? `<div class="xp-text">${esc(s.text)}</div>` : ""}${s.cta ? `<div class="xp-cta"><a class="xp-btn" href="${esc(s.ctaHref)}">${esc(s.cta)}</a></div>` : ""}`,
      x: 0.5,
      y: STACK_Y,
      ax: 0.5,
      ay: 1,
      w: N ? 31 : 36,
      fade,
      rise: 1.4,
    });
  /** Where the figure begins the page and where it ends it: low and big beside the words, or above them. */
  const homeSlot = (center: boolean): Slot => {
    if (!center) return N ? (F ? [0.5, 0.745, 0.96, 0.6] : [0.5, 0.7, 0.84, 0.46]) : F ? [0.566, 0.68, 0.74, 0.6] : [0.71, 0.55, 0.38, 0.76];
    const base: Slot = N ? (F ? [0.5, 0.36, 0.92, 0.3] : [0.5, 0.38, 0.5, 0.36]) : F ? [0.5, 0.42, 0.64, 0.46] : [0.5, 0.42, 0.3, 0.54];
    // Its feet stay above the words that stand under it (they are measured: v.stack is their height).
    const over = base[1] + base[3] / 2 - (STACK_Y - (v.stack ?? 0.27) - 0.03);
    if (over <= 0) return base;
    const h = Math.max(0.28, base[3] - over);
    return [base[0], base[1] - base[3] / 2 + h / 2, base[2], h];
  };
  const list = plan_.scenes.filter((s) => s.type !== "hero" || opening);
  let at = 0;
  const begin = (s: PlanScene, len: number) => {
    // A link to #top plays the story from its start, #start from its end.
    scenes.push({ id: s.id, slug: s.type === "hero" ? "top" : s.type === "finale" ? "start" : s.id, at, len });
    const a = at;
    at += len;
    if (s.plate) plates.push({ id: s.id, src: s.plate, fade: [a - 8, a + 22, a + len - 14, a + len + 24] });
    return a;
  };
  /** The figure's pose for scene i of the list: where (the composition), how it is seen (the logic). */
  const pose = (s: PlanScene, i: number, small = false): Pose => {
    const l = look(plan_.logic, i, list.length, s.comp, F);
    const box = zone(s.comp, v, small);
    const flank = s.comp === "flank" || s.comp === "stage";
    return { box, yaw: l.yaw, elev: l.elev, halo: flank ? 0.3 : 0.12, floor: 1, dust: 0.85, glow: l.lift > 0 ? 0.35 : 0, lift: l.lift };
  };
  /** The camera's two keys for a scene: arrived by a+26, then a slow drift until it leaves. */
  const hold = (a: number, len: number, p: Pose, extra: Partial<TrackKey> = {}) => {
    k(a + 26, p.box, { yaw: p.yaw, elev: p.elev, halo: p.halo, floor: p.floor, dust: p.dust, glow: p.glow, lift: p.lift, ring: 0, word: 0, pulse: 1, ...extra });
    k(a + len - 20, [p.box[0] + 0.004, p.box[1], p.box[2], p.box[3]], { yaw: p.yaw + 8, elev: p.elev });
  };
  const X = N ? 0.07 : 0.05;
  /** Where words stand on the right of the screen, when the figure is on the left. */
  const RX = 0.64;
  /** Eyebrow, title and text on the left (or right of the screen for a flipped composition); returns the last one's id. */
  const head = (s: PlanScene, a: number, len: number, o: { right?: boolean; y?: number } = {}) => {
    const x = N ? 0.07 : o.right ? RX : X;
    const y = N ? 0.065 : o.y ?? 0.15;
    const ein = a + 8;
    const eout: [number, number] = [a + len - 26, a + len - 4];
    let last = "";
    if (s.eyebrow) (last = `${s.id}-eyebrow`), el({ id: last, kind: "eyebrow", html: esc(s.eyebrow), x, y, fade: [ein, ein + 14, ...eout] });
    if (s.title) {
      const id = `${s.id}-title`;
      el({ id, kind: "title", html: lines(s.title), x, y: y + (N ? 0.022 : 0.026), after: last || undefined, gap: 0.7, fade: [ein, ein + 16, ...eout] });
      last = id;
    }
    if (s.text && !N) {
      const id = `${s.id}-text`;
      el({ id, kind: "text", html: esc(s.text), x, y: 0, after: last || undefined, gap: 1.8, w: 29, fade: [ein + 6, ein + 22, ...eout] });
      last = id;
    }
    return last;
  };
  /** Eyebrow and a one-line heading, centred at the top. */
  const headC = (s: PlanScene, a: number, len: number) => {
    const ein = a + 14;
    const eout: [number, number] = [a + len - 26, a + len - 4];
    const y = N ? 0.06 : 0.07;
    if (s.eyebrow) el({ id: `${s.id}-eyebrow`, kind: "eyebrow", html: esc(s.eyebrow), x: 0.5, y, ax: 0.5, fade: [ein, ein + 14, ...eout] });
    if (s.title) el({ id: `${s.id}-title`, kind: N ? "title c" : "head", html: N ? lines(s.title) : esc(s.title.replace(/\n+/g, " ")), x: 0.5, y: y + (N ? 0.022 : 0.022), ax: 0.5, fade: [ein, ein + 16, ...eout] });
    if (s.text && !N) el({ id: `${s.id}-text`, kind: "text c", html: esc(s.text), x: 0.5, y: 0.15, after: s.title ? `${s.id}-title` : undefined, gap: 1, ax: 0.5, w: 56, fade: [ein + 6, ein + 22, ...eout] });
  };

  list.forEach((s, i) => {
    const n = s.items.length;
    const len = lengthOf(s.type, n, N);
    const a = begin(s, len);
    const out = a + len - 28;
    const flip = s.comp === "flip";
    const mirror = (x: number) => (flip ? 1 - x : x);

    switch (s.type) {
      // ------------------------------------------------ the opening
      case "hero": {
        // A tall figure on a phone stands above its words (there is no room beside it): the same stack as a centred hero.
        const center = s.comp === "center" || (N && !F);
        const l = look(plan_.logic, i, list.length, "side", F);
        const up = (x: number) => (F ? x : x * 0.35);
        // The figure low and big, then lifted into the light while the camera eases back.
        const hero: Slot = homeSlot(center);
        const yaw0 = F ? 0 : -22;
        const settle = (dy: number, dw: number): Slot => [hero[0], hero[1] - dy, hero[2] - dw, hero[3]];
        // The opening plays by itself when the page opens: the story's clock runs from -I to 0 (mountScenes),
        // so the figure has arrived and every word is in place when a visitor first sees the page. Scrolling
        // then lifts it into the light.
        const I = (INTRO as Record<string, number>)[plan_.opening] ?? INTRO.lift;
        intro = I;
        switch (plan_.opening) {
          case "drop":
            // Hangs in the air above the floor, then falls and lands: a ripple spreads from the impact.
            k(-I, [hero[0], hero[1] - (F ? 0.3 : 0.13), hero[2] * 0.92, hero[3] * 0.92], { yaw: yaw0 + 24, elev: 15, floor: 0.4, dust: 0.3, word: 1, glow: 0, pulse: 1, ring: 0, lift: F ? 0.6 : 0.3 });
            k(-14, hero, { yaw: yaw0, elev: 7, floor: 1, dust: 0.5, lift: 0 });
            k(-13, null, { pulse: 0 });
            k(0, settle(0.02, 0), { pulse: 0.45, glow: 0.4, dust: 0.7, lift: up(0.05) });
            k(50, settle(0.05, 0.005), { pulse: 1, glow: 1, dust: 0.9, word: 0.92, lift: up(0.16) });
            break;
          case "spin":
            // Whirls into place from a full turn away, and settles as it lifts.
            k(-I, hero, { yaw: yaw0 - 330, elev: 9, floor: 1, dust: 0.5, word: 1, glow: 0, pulse: 1, ring: 0, lift: 0 });
            k(-I * 0.5, null, { yaw: yaw0 - 170 });
            k(0, settle(0.03, 0), { yaw: yaw0, elev: 7, glow: 0.6, dust: 0.7, lift: up(0.12) });
            k(50, settle(0.06, 0.01), { glow: 1, dust: 0.9, word: 0.92, lift: up(0.24) });
            break;
          case "zoom":
            // Rushes in from far away, down out of a high view.
            k(-I, [hero[0], hero[1] - 0.05, hero[2] * 0.24, hero[3] * 0.24], { yaw: yaw0 + 50, elev: 22, floor: 0.6, dust: 1, word: 1, glow: 0.3, pulse: 1, ring: 0, lift: up(0.1) });
            k(0, hero, { yaw: yaw0 + 6, elev: 9, floor: 1, dust: 0.7, glow: 0.5 });
            k(50, settle(0.05, 0.005), { yaw: yaw0, elev: 7, glow: 1, dust: 0.9, word: 0.92, lift: up(0.2) });
            break;
          case "reveal":
            // Comes out of the dark: the light grows round it first.
            k(-I, hero, { yaw: yaw0, elev: 7, presence: 0.15, floor: 0.2, dust: 1, word: 0.2, glow: 0, pulse: 1, ring: 0, lift: up(0.1) });
            k(0, settle(0.02, 0), { presence: 1, floor: 0.75, glow: 0.4, word: 0.6 });
            k(50, settle(0.05, 0.005), { floor: 1, glow: 1, dust: 0.9, word: 0.92, lift: up(0.2) });
            break;
          default:
            // Lifts off: it takes its place on the floor, then a ring spreads from under it, light pools gather
            // beneath, the dust wakes up.
            k(-I, hero, { yaw: yaw0, elev: 7, presence: 0.2, floor: 0.5, dust: 0.2, word: 0.5, glow: 0, pulse: 1, ring: 0 });
            k(0, hero, { presence: 1, floor: 1, dust: 0.45, word: 1 });
            k(14, null, { pulse: 0 });
            k(26, settle(0.04, 0), { pulse: 0.3, glow: 0.35, dust: 0.6, lift: up(0.12) });
            k(38, settle(0.05, 0.005), { pulse: 0.65, glow: 0.6, dust: 0.75, lift: up(0.22) });
            k(50, settle(0.065, 0.01), { pulse: 1, glow: 1, dust: 0.9, word: 0.92, lift: up(0.3) });
        }
        // Once the words have gone, a centred figure grows to the middle of the screen (the next scene begins from there).
        const far: Slot = center ? (N ? [hero[0], hero[1] - 0.075, hero[2] * 0.97, hero[3]] : F ? [0.5, 0.5, 0.7, 0.54] : [0.5, 0.5, 0.34, 0.66]) : N ? (F ? [0.5, 0.5, 0.94, 0.6] : [0.5, 0.52, 0.8, 0.36]) : F ? [0.607, 0.505, 0.645, 0.6] : [0.7, 0.52, 0.36, 0.72];
        k(a + 90, null, { elev: 9, word: 0.5, dust: 1, yaw: F ? 0 : -16 });
        k(a + 125, null, { word: 0 });
        k(a + 150, far, { elev: 11, yaw: l.yaw * 0.3, word: 0 });
        if (center) {
          stack(`${s.id}-stack`, s, [-I * 0.6, -I * 0.1, a + 6, a + 43]);
        } else {
          const x = N ? 0.07 : 0.03;
          const ty = N ? 0.3 : 0.285;
          el({ id: `${s.id}-title`, kind: "title", html: lines(s.title), x, y: ty, fade: [-I * 0.7, -I * 0.25, a + 6, a + 43] });
          if (s.text) el({ id: `${s.id}-text`, kind: "text", html: esc(s.text), x, y: 0, after: `${s.id}-title`, gap: 1.8, w: 30, fade: [-I * 0.55, -I * 0.1, a + 5, a + 38] });
          if (s.cta) el({ id: `${s.id}-cta`, kind: "cta", html: `<a class="xp-btn" href="${esc(s.ctaHref)}">${esc(s.cta)}</a>`, x, y: 0, after: s.text ? `${s.id}-text` : `${s.id}-title`, gap: 2.4, fade: [-I * 0.4, 0, a + 2, a + 35] });
        }
        el({ id: `${s.id}-cue`, kind: "cue", html: `<span>Scroll</span><i></i>`, x: 0.5, y: 0.915, ax: 0.5, fade: [-I * 0.3, 0, a + 3, a + 16] });
        break;
      }

      // ------------------------------------------------ chips where the figure is not
      case "facts": {
        const p = pose(s, i);
        hold(a, len, p);
        const head_ = head(s, a, len, { right: flip });
        let above = "";
        s.items.forEach((it, j) => {
          const t0 = a + 20 + j * 6.5;
          const id = `${s.id}-chip${j}`;
          // One column under the words (the whole of it on a phone), each fact where the one above it ends,
          // so a long title or a wrapping fact never lands on its neighbour or on the figure.
          if (N) el({ id, kind: "chip", html: chip(it), x: 0.06, y: 0.63, after: above || undefined, gap: 0.9, fade: [t0, t0 + 14, out, out + 26], rise: 1.2 });
          else el({ id, kind: "chip", html: chip(it), x: flip ? RX : X, y: 0.52, after: above || head_, gap: j === 0 ? 2.2 : 0.8, fade: [t0, t0 + 14, out, out + 26], rise: 1.2 });
          above = id;
        });
        break;
      }

      // ------------------------------------------------ cards: round the figure, or in a row beneath it
      case "cards":
      case "people": {
        const stage = s.comp === "stage";
        const p = pose(s, i);
        hold(a, len, p, F && !N ? {} : {});
        if (N) head(s, a, len);
        else headC(s, a, len);
        const w = s.type === "people" ? 20 : 21;
        const html = (it: PlanItem) => (s.type === "people" ? person(it) : card(it));
        const cls = s.type === "people" ? "person" : "card";
        if (N) {
          const slice = (out - (a + 40)) / n;
          s.items.forEach((it, j) => {
            const t0 = a + 40 + j * slice;
            el({ id: `${s.id}-i${j}`, kind: cls, html: html(it), x: 0.5, y: 0.64, ax: 0.5, w: 31, fade: [t0 - 4, t0 + 4, t0 + slice - 8, t0 + slice], rise: 1.4 });
          });
        } else if (stage) {
          const xs = rowX(n);
          s.items.forEach((it, j) => {
            const t0 = a + 34 + j * 6;
            el({ id: `${s.id}-i${j}`, kind: cls, html: html(it), x: xs[j], y: 0.7, ax: 0.5, w: n > 4 ? 18 : w + 2, fade: [t0, t0 + 14, out - 4 + (n - 1 - j) * 3, out + 16], rise: 1.6 });
          });
        } else {
          const slots = sideSlots(n);
          s.items.forEach((it, j) => {
            const sl = slots[j];
            const inT = a + 30 + j * 4.3;
            const outT = out - 8 + (n - 1 - j) * 3;
            el({ id: `${s.id}-i${j}`, kind: cls, html: html(it), x: sl.side === "l" ? 0.03 : 0.97, y: sl.y, ax: sl.side === "l" ? 0 : 1, w, fade: [inT, inT + 12, outT, outT + 18], rise: 1.6 });
          });
        }
        break;
      }

      // ------------------------------------------------ big numbers that count up
      case "stats": {
        const stage = s.comp === "stage";
        const p = pose(s, i);
        hold(a, len, p);
        if (N) head(s, a, len);
        else headC(s, a, len);
        if (N) {
          const slice = (out - (a + 40)) / n;
          s.items.forEach((it, j) => {
            const t0 = a + 40 + j * slice;
            el({ id: `${s.id}-i${j}`, kind: "stat c", html: stat(it), x: 0.5, y: 0.66, ax: 0.5, w: 31, fade: [t0 - 4, t0 + 6, t0 + slice - 8, t0 + slice], rise: 1.2, count: true });
          });
        } else if (stage) {
          const xs = rowX(n);
          s.items.forEach((it, j) => {
            const t0 = a + 34 + j * 6;
            el({ id: `${s.id}-i${j}`, kind: "stat c", html: stat(it), x: xs[j], y: 0.72, ax: 0.5, w: 22, fade: [t0, t0 + 16, out - 4 + (n - 1 - j) * 3, out + 16], rise: 1.6, count: true });
          });
        } else {
          const left = Math.ceil(n / 2);
          s.items.forEach((it, j) => {
            const l = j < left;
            const rows = l ? left : n - left;
            const idx = l ? j : j - left;
            const y = rows === 1 ? 0.5 : 0.36 + idx * (0.28 / Math.max(1, rows - 1)) * (rows === 2 ? 1 : 0.7);
            const t0 = a + 30 + j * 6;
            el({ id: `${s.id}-i${j}`, kind: l ? "stat" : "stat r", html: stat(it), x: l ? 0.05 : 0.95, y, ax: l ? 0 : 1, w: 20, fade: [t0, t0 + 16, out - 4, out + 16], rise: 1.4, count: true });
          });
        }
        break;
      }

      // ------------------------------------------------ steps and questions: a rail, and the one that is current
      case "steps":
      case "faq": {
        const p = pose(s, i);
        hold(a, len, p);
        const last = head(s, a, len, { right: flip });
        const x = N ? 0.07 : flip ? RX : X;
        const span = (out - (a + 36)) / n;
        s.items.forEach((it, j) => {
          const t0 = a + 36 + j * span;
          // The rail: a node for every step, lit from its turn to the end.
          el({ id: `${s.id}-n${j}`, kind: j === n - 1 ? "node last" : "node", html: `<i>${j + 1}</i>`, x, ox: j * 4.4, y: N ? 0.585 : 0.5, after: N ? undefined : last || undefined, gap: 2.6, fade: [a + 22 + j * 3, a + 34 + j * 3, out, out + 22], on: [t0 - 4, out + 40], rise: 0.8 });
        });
        s.items.forEach((it, j) => {
          const t0 = a + 36 + j * span;
          const t1 = j === n - 1 ? out : t0 + span;
          const html = s.type === "faq" ? `<b class="q">${esc(it.q || it.title)}</b><span class="tx">${esc(it.a || it.text)}</span>` : step(it, j);
          el({ id: `${s.id}-i${j}`, kind: s.type === "faq" ? "ask" : "step", html, x, y: 0.65, after: N ? undefined : `${s.id}-n0`, gap: 2.2, w: 31, fade: [t0 - 6, t0 + 6, j === n - 1 ? t1 : t1 - 6, j === n - 1 ? t1 + 22 : t1 + 4], rise: 1.4 });
        });
        break;
      }

      // ------------------------------------------------ pictures in a row beneath the figure
      case "gallery": {
        const p = pose(s, i, true);
        hold(a, len, p);
        if (N) head(s, a, len);
        else headC(s, a, len);
        if (N) {
          const slice = (out - (a + 40)) / n;
          s.items.forEach((it, j) => {
            const t0 = a + 40 + j * slice;
            el({ id: `${s.id}-i${j}`, kind: "pic", html: pic(it), x: 0.5, y: 0.6, ax: 0.5, w: 30, fade: [t0 - 4, t0 + 6, t0 + slice - 8, t0 + slice], rise: 1.4 });
          });
        } else {
          const xs = rowX(n);
          s.items.forEach((it, j) => {
            const t0 = a + 32 + j * 6;
            el({ id: `${s.id}-i${j}`, kind: "pic", html: pic(it), x: xs[j], y: 0.6, ax: 0.5, w: n > 4 ? 15.5 : 17.5, fade: [t0, t0 + 16, out - 4 + (n - 1 - j) * 3, out + 16], rise: 1.8, drift: 0.012 * (j % 2 ? 1 : -1) });
          });
        }
        break;
      }

      // ------------------------------------------------ plans: tall cards in a row beneath a smaller figure
      case "plans": {
        const p = pose(s, i, true);
        hold(a, len, p);
        if (N) head(s, a, len);
        else headC(s, a, len);
        if (N) {
          const slice = (out - (a + 40)) / n;
          s.items.forEach((it, j) => {
            const t0 = a + 40 + j * slice;
            el({ id: `${s.id}-i${j}`, kind: `plan${s.featured === j + 1 ? " is-featured" : ""}`, html: plan({ ...it, features: it.features.slice(0, 3) }, s.featured === j + 1, s.hint), x: 0.5, y: 0.58, ax: 0.5, w: 31, fade: [t0 - 4, t0 + 6, t0 + slice - 8, t0 + slice], rise: 1.4 });
          });
        } else {
          const xs = rowX(n);
          s.items.forEach((it, j) => {
            const t0 = a + 34 + j * 7;
            el({ id: `${s.id}-i${j}`, kind: `plan${s.featured === j + 1 ? " is-featured" : ""}`, html: plan(it, s.featured === j + 1, s.hint), x: xs[j], y: 0.57, ax: 0.5, w: 23, fade: [t0, t0 + 16, out - 4 + (n - 1 - j) * 3, out + 16], rise: 1.6 });
          });
        }
        break;
      }

      // ------------------------------------------------ one voice at a time
      case "voices": {
        const p = pose(s, i);
        hold(a, len, p);
        const x = N ? 0.07 : flip ? RX : 0.05;
        const ein = a + 16;
        if (s.eyebrow) el({ id: `${s.id}-eyebrow`, kind: "eyebrow", html: esc(s.eyebrow), x, y: N ? 0.065 : 0.15, fade: [ein, ein + 14, out, out + 22] });
        if (s.title) el({ id: `${s.id}-title`, kind: "title", html: lines(s.title), x, y: N ? 0.087 : 0.17, after: s.eyebrow ? `${s.id}-eyebrow` : undefined, gap: 0.7, fade: [ein, ein + 16, out, out + 22] });
        const span = (out - (a + 34)) / n;
        s.items.forEach((it, j) => {
          const t0 = a + 34 + j * span;
          const lastOne = j === n - 1;
          el({
            id: `${s.id}-i${j}`,
            kind: "quote",
            html: `<span class="stars">${icon("star").repeat(5)}</span><p>${esc(it.text)}</p><span class="who"><b>${esc(it.name)}</b>${it.role ? ` ${esc(it.role)}` : ""}</span>`,
            x,
            y: N ? 0.64 : 0.4,
            w: N ? 31 : 36,
            fade: [t0, t0 + 12, lastOne ? out : t0 + span - 12, lastOne ? out + 22 : t0 + span],
            rise: 1.4,
          });
        });
        break;
      }

      // ------------------------------------------------ how to find it: lines of facts and one button
      case "visit": {
        const p = pose(s, i);
        hold(a, len, p);
        const last = head(s, a, len, { right: flip });
        const x = N ? 0.07 : flip ? RX : X;
        // Beside the figure the lines follow the words; on a phone they sit below the figure.
        let prevId = N ? "" : last;
        s.items.forEach((it, j) => {
          const t0 = a + 30 + j * 7;
          const id = `${s.id}-i${j}`;
          el({ id, kind: "fact", html: fact(it), x, y: N ? Math.max(0.5, 0.75 - 0.04 * n) : 0.46, after: prevId || undefined, gap: j === 0 && prevId ? 2.2 : 0, w: 34, fade: [t0, t0 + 14, out, out + 22], rise: 1.2 });
          prevId = id;
        });
        if (s.cta) el({ id: `${s.id}-cta`, kind: "cta", html: `<a class="xp-btn" href="${esc(s.ctaHref)}">${esc(s.cta)}</a>`, x, y: 0.9, after: prevId || undefined, gap: N ? 1.6 : 2.4, fade: [a + 30 + n * 7, a + 44 + n * 7, out, out + 22], rise: 1.2 });
        break;
      }

      // ------------------------------------------------ colours: the figure by its owner's choice
      case "paint": {
        const p = pose(s, i);
        hold(a, len, p, { halo: 0.3 });
        const x = N ? 0.07 : flip ? RX : X;
        const ein = a + 24;
        if (s.eyebrow) el({ id: `${s.id}-eyebrow`, kind: "eyebrow", html: esc(s.eyebrow), x, y: N ? 0.56 : 0.27, fade: [ein, ein + 16, out, out + 20] });
        if (s.title) el({ id: `${s.id}-title`, kind: "title", html: lines(s.title), x, y: N ? 0.585 : 0.295, after: s.eyebrow ? `${s.id}-eyebrow` : undefined, gap: 0.7, fade: [ein, ein + 18, out, out + 20] });
        if (s.text) el({ id: `${s.id}-text`, kind: "text", html: esc(s.text), x, y: 0, after: s.title ? `${s.id}-title` : undefined, gap: 1.8, w: N ? 31 : 29, fade: [ein + 4, ein + 22, out, out + 20] });
        el({
          id: `${s.id}-swatches`,
          kind: "swatches",
          html:
            s.items.filter((it) => it.color).map((it, j) => `<button type="button" class="xp-sw" data-color="${esc(it.color)}" style="--c:${esc(it.color)}" aria-label="${esc(it.title || it.name || it.color)}" aria-pressed="${j === 0}"></button>`).join("") + (s.hint ? `<small>${esc(s.hint)}</small>` : ""),
          x,
          y: N ? 0.8 : 0.66,
          after: s.text ? `${s.id}-text` : s.title ? `${s.id}-title` : undefined,
          gap: 2.6,
          fade: [ein + 8, ein + 26, out, out + 20],
          rise: 1.2,
        });
        break;
      }

      // ------------------------------------------------ the end: back where it began, with something to do
      case "finale": {
        const center = s.comp === "center";
        const slot: Slot = homeSlot(center);
        // Back where it began, the same way round: turning on in the direction it was going (an
        // orbit goes on round), or the short way back for the other logics.
        const home = F ? 0 : -22;
        let d = (((home - prev.yaw) % 360) + 360) % 360;
        if (plan_.logic !== "orbit" && d > 180) d -= 360;
        const end = prev.yaw + d;
        k(a + 12, [prev.cx, prev.cy, prev.w, prev.h], { pulse: 1 });
        k(a + 13, null, { pulse: 0 });
        k(a + 44, slot, { yaw: end, elev: 7, halo: 0, floor: 1, dust: 0.7, glow: F ? 0.4 : 0.2, word: 1, pulse: 1, lift: F ? 0.1 : 0.03 });
        k(a + len, slot, { yaw: end + 6 });
        const ein = a + 30;
        if (center) {
          stack(`${s.id}-stack`, s, [ein, ein + 22, 1e9, 1e9]);
        } else {
          const x = N ? 0.07 : 0.03;
          if (s.title) el({ id: `${s.id}-title`, kind: "title", html: lines(s.title), x, y: N ? 0.105 : 0.285, fade: [ein, ein + 22, 1e9, 1e9] });
          if (s.text) el({ id: `${s.id}-text`, kind: "text", html: esc(s.text), x, y: 0, after: s.title ? `${s.id}-title` : undefined, gap: 1.8, w: 30, fade: [ein + 4, ein + 26, 1e9, 1e9] });
          if (s.cta) el({ id: `${s.id}-cta`, kind: "cta", html: `<a class="xp-btn" href="${esc(s.ctaHref)}">${esc(s.cta)}</a>`, x, y: 0, after: s.text ? `${s.id}-text` : s.title ? `${s.id}-title` : undefined, gap: 2.4, fade: [ein + 8, ein + 30, 1e9, 1e9] });
        }
        break;
      }
    }
  });

  // How words and cards arrive: the same everywhere in a page, a choice of the template.
  const mot = plan_.motion;
  if (mot !== "rise")
    for (const e of els) {
      if (e.kind === "cue" || e.kind.startsWith("node")) continue;
      const side = e.ax === 0.5 ? 0 : (e.ax ?? 0) >= 1 || e.x > 0.55 ? 1 : -1;
      if (mot === "slide" && side) e.slide = side * 4;
      else if (mot === "pop") e.pop = 0.9;
      else if (mot === "zoom") e.pop = 1.12;
      else if (mot === "drift") e.rise = (e.rise ?? 1) * 2.8;
    }
  // On a phone a headline stays inside the screen (it wraps instead of running past the edge).
  if (N) for (const e of els) if (e.kind.startsWith("title") && !e.w) e.w = 31;
  if (!keys.length) k(0, [0.5, 0.5, 0.5, 0.5], {});
  return { len: Math.max(at, 1), keys, els, scenes, plates, intro };
}

void clamp;
