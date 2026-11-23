// The film (docs/FILM.md): the 3D character stops being a picture in the hero and becomes the
// camera's subject for the whole page. One fixed stage sits over the page; every section is a
// shot (side on, three-quarter, from above, low, close), and the scroll position blends from shot
// to shot, so scrolling plays a camera move and scrolling back plays it in reverse.
//
// Nothing in a template has to change. The director reads the page as it is:
// - the hero's character spot is the first shot's frame, and the echo spot (if any) is another;
// - every other section gets the largest empty part of the screen, found by measuring its words,
//   pictures, buttons and cards when that section is in view, and a section with no room lets
//   the model step out of the way;
// - headings in a section ease in as its shot lands (--xp-shot on the section, 0 to 1);
// - an outlined wordmark can sit behind the model in the opening shot, and a soft spotlight halo
//   grows for the view from above.
import type { FilmDirector, FilmShot } from "./engine";

type Kind = "hero" | "three" | "top" | "side" | "low" | "close" | "echo" | "script";

interface Look {
  /** Where the model faces, in degrees from its resting turn. */
  face: number;
  elev: number;
  align: number;
  ring: number;
  floor: number;
  dust: number;
  halo: number;
  word: number;
  /** How much of its free box it fills. */
  fill: number;
  /** The light pools under it and the spreading ring (the choreography's own: 0 in the rest). */
  glow: number;
  pulse: number;
  /** How high it hovers above the floor, as a fraction of its own height (the floor stays put). */
  lift: number;
}

const LOOKS: Record<Kind, Look> = {
  hero: { face: 0, elev: 7, align: 0, ring: 1, floor: 1, dust: 0.8, halo: 0.25, word: 1, fill: 1, glow: 0, pulse: 1, lift: 0 },
  three: { face: 58, elev: 15, align: 0, ring: 0.25, floor: 1, dust: 1, halo: 0.35, word: 0, fill: 0.92, glow: 0, pulse: 1, lift: 0 },
  top: { face: 120, elev: 78, align: 1, ring: 0, floor: 0.15, dust: 0.5, halo: 1, word: 0, fill: 0.9, glow: 0, pulse: 1, lift: 0 },
  side: { face: 180, elev: 5, align: 0, ring: 0.6, floor: 1, dust: 0.7, halo: 0.3, word: 0, fill: 0.95, glow: 0, pulse: 1, lift: 0 },
  low: { face: -38, elev: -7, align: 0, ring: 0.4, floor: 0.6, dust: 1, halo: 0.45, word: 0, fill: 0.95, glow: 0, pulse: 1, lift: 0 },
  close: { face: 28, elev: 11, align: 0, ring: 0, floor: 0.7, dust: 1, halo: 0.4, word: 0, fill: 1.15, glow: 0, pulse: 1, lift: 0 },
  script: { face: 0, elev: 7, align: 0, ring: 0, floor: 1, dust: 0.5, halo: 0, word: 0, fill: 1, glow: 0, pulse: 1, lift: 0 },
  echo: { face: 42, elev: 9, align: 0, ring: 0.8, floor: 1, dust: 0.8, halo: 0.3, word: 0, fill: 1, glow: 0, pulse: 1, lift: 0 },
};

/** Shots after the opening: for wide, low models (vehicles) and for everything else. */
const FLAT_ORDER: Kind[] = ["three", "top", "side", "close", "low"];
const TALL_ORDER: Kind[] = ["three", "low", "side", "close", "top"];

interface Anchor {
  /** Scroll position where this shot is fully in place. */
  at: number;
  kind: Kind;
  /** Order among shots that are not fixed spots (hero, echo). */
  seq: number;
  /** The section it belongs to. */
  sec: HTMLElement | null;
  /** The box for the model when this shot is in place (viewport pixels), or null: no room. */
  box: { x: number; y: number; w: number; h: number } | null;
  /** Small extra turn for second and later shots in a long section. */
  drift: number;
  /** The shape (width over height) the model wants for this shot. */
  want?: number;
  /** A shot written out by the choreography (scenes.ts): the first or last of the track. */
  key?: TrackKey;
}

/** One moment of the choreography's camera; positions are fractions of the screen. */
export interface TrackKey {
  /** Scroll position in hundredths of the screen's height from the top of the track. */
  t: number;
  cx: number;
  cy: number;
  w: number;
  h: number;
  /** Turn from the side-on (flat models) or front-on (tall models) view, in degrees. */
  yaw: number;
  elev: number;
  align: number;
  presence: number;
  ring: number;
  floor: number;
  dust: number;
  halo: number;
  word: number;
  glow: number;
  pulse: number;
  lift: number;
}

/** A tall section of the page the choreography plays in (its sticky screen stays put). */
export interface Track {
  el: HTMLElement;
  /** How long it scrolls, in hundredths of the screen's height. */
  len: number;
  /** The camera at a moment (t as in TrackKey). */
  sample(t: number): TrackKey;
  /** True when the track opens the page: it brings its own opening shot and outlined word. */
  opening: boolean;
  /** Added to the camera's moment while the opening plays by itself (below 0), before the page's own scroll. */
  shift?: () => number;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** The film's CSS: the stage over the page and the headings that wait for their shot. */
const STYLE = `.xp-film{position:fixed;inset:0;z-index:4;pointer-events:none;overflow:hidden;contain:strict}
.xp-film-stage{position:absolute;inset:0}
.xp-film-halo{position:absolute;left:0;top:0;width:10px;height:10px;border-radius:50%;opacity:0;mix-blend-mode:screen;will-change:transform,opacity}
.xp-film-word{position:absolute;left:0;right:0;top:0;transform-origin:50% 0;text-align:center;white-space:nowrap;line-height:.82;font-weight:800;text-transform:uppercase;letter-spacing:-.02em;color:transparent;opacity:0;will-change:transform,opacity;-webkit-mask-image:linear-gradient(180deg,#000 30%,transparent 96%);mask-image:linear-gradient(180deg,#000 30%,transparent 96%)}
.xp-film-on [data-xp-film-sec] :is(h1,h2,h3){filter:opacity(calc(.22 + .78 * var(--xp-shot,1)));translate:0 calc((1 - var(--xp-shot,1)) * 18px)}
.xp-film-on [data-xp-character="hero"] > .xp-char-poster{transition:opacity .6s ease}
.xp-film-on.xp-film-live [data-xp-character="hero"] > .xp-char-poster,.xp-film-on [data-xp-character="echo"] > .xp-char-poster{opacity:0!important}
@media (prefers-reduced-motion: reduce){.xp-film-on [data-xp-film-sec] :is(h1,h2,h3){filter:none;translate:none}}`;

// ---------------------------------------------------------------- finding room on the screen

const COLS = 24;
const ROWS = 16;

/**
 * The best free box in a grid of taken cells: big, close to the shape the model wants, and not
 * pushed hard against an edge. Brute force over every box, with a prefix sum (24 x 16 is small).
 */
export function freeBox(taken: boolean[][], want: number, minW: number, minH: number, W: number, H: number): Box | null {
  const rows = taken.length;
  const cols = taken[0]?.length || 0;
  const sum: number[][] = Array.from({ length: rows + 1 }, () => new Array(cols + 1).fill(0));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) sum[r + 1][c + 1] = (taken[r][c] ? 1 : 0) + sum[r][c + 1] + sum[r + 1][c] - sum[r][c];
  const cw = W / cols;
  const ch = H / rows;
  let best: Box | null = null;
  let bestScore = 0;
  for (let r0 = 0; r0 < rows; r0++)
    for (let r1 = r0 + 1; r1 <= rows; r1++) {
      const h = (r1 - r0) * ch;
      if (h < minH) continue;
      for (let c0 = 0; c0 < cols; c0++)
        for (let c1 = c0 + 1; c1 <= cols; c1++) {
          const w = (c1 - c0) * cw;
          if (w < minW) continue;
          if (sum[r1][c1] - sum[r0][c1] - sum[r1][c0] + sum[r0][c0] > 0) break;
          // The part of the box the model can fill, at the shape it wants.
          const usable = Math.min(w, h * want) * Math.min(h, w / want);
          const cx = (c0 + c1) / 2 / cols - 0.5;
          const cy = (r0 + r1) / 2 / rows - 0.5;
          const score = usable * (1 - Math.abs(cy) * 0.35) * (1 - Math.abs(cx) * 0.15);
          if (score > bestScore) (bestScore = score), (best = { x: c0 * cw, y: r0 * ch, w, h });
        }
    }
  return best;
}

const TAKES = "h1,h2,h3,h4,h5,h6,p,li,a,button,input,textarea,select,label,img,video,picture,svg,blockquote,figure,table,pre,iframe,canvas,dl";

/** True when an element draws a box of its own (a card, a panel, a pill). */
function drawsBox(cs: CSSStyleDeclaration): boolean {
  if (cs.backgroundImage && cs.backgroundImage !== "none") return true;
  const bg = cs.backgroundColor;
  const m = /rgba?\(([^)]+)\)/.exec(bg || "");
  if (m) {
    const parts = m[1].split(/[ ,/]+/).filter(Boolean);
    const a = parts.length > 3 ? parseFloat(parts[3]) : 1;
    if (a > 0.06) return true;
  }
  if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none" && parseFloat(cs.borderLeftWidth) > 0) return true;
  return !!cs.boxShadow && cs.boxShadow !== "none";
}

interface Thing {
  /** Document coordinates; fixed things are in viewport coordinates. */
  x: number;
  y: number;
  w: number;
  h: number;
  fixed: boolean;
}

/** A thing to keep clear, and whether it is pinned (fixed, sticky, or inside something sticky). */
interface Item {
  el: Element;
  fixed: boolean;
  pinned: boolean;
  /** Words (a heading, a paragraph, a label): the model must never sit on these. */
  text: boolean;
}

/** Everything on the page the model must not cover (measured once; positions are read fresh). */
function things(doc: Document, skip: (el: Element) => boolean): Item[] {
  const win = doc.defaultView!;
  const W = win.innerWidth;
  const H = win.innerHeight;
  const out: Item[] = [];
  const stuck = new WeakSet<Element>();
  const all = doc.body.getElementsByTagName("*");
  const n = Math.min(all.length, 5000);
  for (let i = 0; i < n; i++) {
    const el = all[i] as HTMLElement;
    if (skip(el)) continue;
    const tag = el.tagName;
    const cs = win.getComputedStyle(el);
    const ownPin = cs.position === "fixed" || cs.position === "sticky";
    const pinned = ownPin || (!!el.parentElement && stuck.has(el.parentElement));
    if (pinned) stuck.add(el);
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "BR") continue;
    let wants = el.matches(TAKES);
    let words = false;
    if (!wants) for (const c of Array.from(el.childNodes)) if (c.nodeType === 3 && (c.textContent || "").trim()) (words = true), (wants = true);
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const big = r.width * r.height > W * H * 0.55 || (r.width > W * 0.96 && r.height > H * 0.5);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    if (!wants && !big && drawsBox(cs)) wants = true;
    if (!wants || (big && !words && tag !== "IMG" && tag !== "VIDEO")) continue;
    out.push({ el, fixed: cs.position === "fixed", pinned, text: words || /^(H[1-6]|P|LI|BLOCKQUOTE|LABEL|A|BUTTON)$/.test(tag) });
  }
  return out;
}

/**
 * Where the things are now. Pinned things count where they are on the screen when `live` (the
 * shot is close to where the page is scrolled), and where they sit in the page otherwise.
 */
function snapshot(items: Item[], win: Window, live: boolean): Thing[] {
  const sy = win.scrollY;
  const sx = win.scrollX;
  const out: Thing[] = [];
  for (const it of items) {
    const r = it.el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const fixed = it.fixed || (live && it.pinned);
    out.push(fixed ? { x: r.left, y: r.top, w: r.width, h: r.height, fixed } : { x: r.left + sx, y: r.top + sy, w: r.width, h: r.height, fixed });
  }
  return out;
}

/** The free box when the page is scrolled to `at`. */
function roomAt(list: Thing[], at: number, W: number, H: number, want: number, mobile: boolean): Box | null {
  const taken = Array.from({ length: ROWS }, () => new Array<boolean>(COLS).fill(false));
  const pad = Math.min(W, H) * 0.018;
  for (const t of list) {
    const y = t.fixed ? t.y : t.y - at;
    const x0 = Math.floor(((t.x - pad) / W) * COLS);
    const x1 = Math.ceil(((t.x + t.w + pad) / W) * COLS);
    const y0 = Math.floor(((y - pad) / H) * ROWS);
    const y1 = Math.ceil(((y + t.h + pad) / H) * ROWS);
    if (y1 <= 0 || y0 >= ROWS || x1 <= 0 || x0 >= COLS) continue;
    for (let r = Math.max(0, y0); r < Math.min(ROWS, y1); r++) for (let c = Math.max(0, x0); c < Math.min(COLS, x1); c++) taken[r][c] = true;
  }
  return freeBox(taken, want, W * (mobile ? 0.5 : 0.2), H * (mobile ? 0.2 : 0.24), W, H);
}

// ---------------------------------------------------------------- the director

export interface FilmOptions {
  /** The outlined word behind the model in the opening shot ("" for none). */
  wordmark?: string;
  /** Gradient colours: base, glow, second. */
  stops?: string[];
  /** The model's shape is known (or changed): wide and low, or tall. */
  onShape?: (flat: boolean) => void;
}

export interface Film extends FilmDirector {
  /** The fixed layer the model is drawn into. */
  stage: HTMLElement;
  /** The model is drawing: hide the spot's picture. */
  live(): void;
  update(next: FilmOptions): void;
  /** Measure the page again (after it changes). */
  measure(): void;
  /** Hands the camera to a choreography (scenes.ts) while the page is in its track; null to stop. */
  setTrack(track: Track | null): void;
  dispose(): void;
}

const lum = (hex: string) => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return 0;
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};

/** Top-level sections of the page, in order: section, footer, header blocks and [data-xp-shot]. */
function sections(doc: Document, layer: HTMLElement): HTMLElement[] {
  const found = Array.from(doc.querySelectorAll<HTMLElement>("section,footer,[data-xp-shot]")).filter((el) => !layer.contains(el) && !el.closest("[data-xp-film-track],[data-xp-noshot]"));
  const top = found.filter((el) => !found.some((o) => o !== el && o.contains(el)));
  const list = top.length ? top : Array.from(doc.body.children).filter((el): el is HTMLElement => el instanceof HTMLElement && el !== layer && !el.matches("[data-xp-film-track],[data-xp-noshot]"));
  return list.filter((el) => el.getBoundingClientRect().height > 120);
}

export function createFilm(doc: Document, hero: HTMLElement, init: FilmOptions = {}): Film {
  const win = doc.defaultView || window;
  let opts: FilmOptions = { ...init };
  if (!doc.getElementById("xp-film-style")) {
    const st = doc.createElement("style");
    st.id = "xp-film-style";
    st.textContent = STYLE;
    doc.head.appendChild(st);
  }
  const layer = doc.createElement("div");
  layer.className = "xp-film";
  layer.setAttribute("aria-hidden", "true");
  const halo = doc.createElement("div");
  halo.className = "xp-film-halo";
  const word = doc.createElement("div");
  word.className = "xp-film-word";
  const stage = doc.createElement("div");
  stage.className = "xp-film-stage";
  layer.append(halo, word, stage);
  doc.body.appendChild(layer);
  doc.documentElement.classList.add("xp-film-on");

  let anchors: Anchor[] = [];
  let items: Item[] = [];
  let lastLive = 0;
  let lastDodge = 0;
  let liveAt = -1;
  // 0..1: how much the model gives way because words are under it right now (pages that move
  // their words with the scroll can bring them under the model between measurements).
  let dodge = 1;
  let dodgeV = 0;
  let dodgeWant = 1;
  let dodgeSig = "";
  const checkDodge = (y: number, box: { cx: number; cy: number; w: number; h: number }) => {
    // Nothing moved since the last look: the answer is the same.
    const sig = `${Math.round(y)}|${Math.round(box.cx / 4)}|${Math.round(box.cy / 4)}|${Math.round(box.w / 8)}|${items.length}`;
    if (sig === dodgeSig) return;
    dodgeSig = sig;
    const W = win.innerWidth;
    const H = win.innerHeight;
    // Its core: the middle of the box, where the model really is.
    const x0 = box.cx - box.w * 0.34;
    const x1 = box.cx + box.w * 0.34;
    const y0 = box.cy - box.h * 0.34;
    const y1 = box.cy + box.h * 0.34;
    const area = Math.max(1, (x1 - x0) * (y1 - y0));
    let hit = 0;
    for (const it of items) {
      if (!it.text) continue;
      const r = it.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > H || r.right < 0 || r.left > W || r.width < 4) continue;
      const ix = Math.min(x1, r.right) - Math.max(x0, r.left);
      const iy = Math.min(y1, r.bottom) - Math.max(y0, r.top);
      if (ix <= 0 || iy <= 0) continue;
      // Only words that are really there: not clipped away, covered or hidden.
      const px = Math.max(x0, r.left) + ix / 2;
      const py = Math.max(y0, r.top) + iy / 2;
      const top = doc.elementFromPoint(px, py);
      if (!top || !(it.el.contains(top) || top.contains(it.el))) continue;
      if (Number(win.getComputedStyle(it.el).opacity) < 0.1) continue;
      hit += ix * iy;
    }
    dodgeWant = hit / area > 0.06 ? 0 : 1;
    void y;
  };
  /** Shots close to where the page is: measured again from where things are on the screen now. */
  const liveMeasure = (y: number) => {
    const now = performance.now();
    if (now - lastLive < 400 || Math.abs(y - liveAt) < 2) return;
    lastLive = now;
    liveAt = y;
    const W = win.innerWidth;
    const H = win.innerHeight;
    let list: Thing[] | null = null;
    for (const a of anchors) {
      if (a.kind === "hero" || a.kind === "echo" || !a.want || Math.abs(a.at - y) > H * 0.7) continue;
      list ||= snapshot(items, win, true);
      a.box = roomAt(list, a.at, W, H, a.want, W < 700);
    }
  };
  let track: Track | null = null;
  let trackTop = 0;
  let secs: HTMLElement[] = [];
  let flat = false;
  let measuredFlat: boolean | null = null;
  let heroTop = 0;
  let heroMid = 0;
  let wordH = 0;
  let wordK = 1;
  let heroCx = 0;
  let heroW = 0;
  const shotOf = new Map<HTMLElement, number>();

  let haloSoft = "";
  let haloDisc = "";
  let haloMode = false;
  const paint = () => {
    const stops = opts.stops || [];
    const base = stops[0] || "#111111";
    const glow = stops[1] || "#7c5cff";
    const dark = lum(base) < 0.2;
    haloSoft = `radial-gradient(closest-side, color-mix(in oklab, ${glow} 55%, #ffffff) 0%, color-mix(in oklab, ${glow} 30%, transparent) 45%, transparent 100%)`;
    // The script's halo is a lit disc: bright to the model's edge, then fading to nothing.
    const lit = `color-mix(in oklab, ${glow} 16%, ${dark ? "#ffffff" : "#000000"})`;
    haloDisc = `radial-gradient(closest-side, ${lit} 0%, color-mix(in oklab, ${lit} 88%, transparent) 34%, color-mix(in oklab, ${lit} 52%, transparent) 60%, color-mix(in oklab, ${lit} 16%, transparent) 82%, transparent 100%)`;
    halo.style.background = haloMode ? haloDisc : haloSoft;
    halo.style.mixBlendMode = dark ? "screen" : "multiply";
    const text = String(opts.wordmark || "").trim();
    word.textContent = text;
    word.style.display = text ? "" : "none";
    const ink = dark ? "rgba(255,255,255,.6)" : "rgba(0,0,0,.4)";
    word.style.setProperty("-webkit-text-stroke", `1.5px ${ink}`);
    const h1 = doc.querySelector("h1");
    word.style.fontFamily = h1 ? win.getComputedStyle(h1).fontFamily : "inherit";
  };

  const fitWord = () => {
    if (!word.textContent) return;
    word.style.fontSize = "100px";
    word.style.width = "max-content";
    const w = word.getBoundingClientRect().width || 1;
    word.style.width = "";
    const W = win.innerWidth;
    const span = Math.min(W * 0.94, Math.max(heroW * 1.5, W * 0.5));
    word.style.fontSize = `${Math.min(100 * (span / w), win.innerHeight * 0.32)}px`;
    word.style.width = `${span}px`;
    word.style.left = `${clamp(heroCx - span / 2, 0, W - span)}px`;
    word.style.right = "auto";
    // A short word on a wide screen would sit squat: stretch it up to a cap height of about a fifth
    // of the screen, as the tall condensed words of a poster are.
    const fs = parseFloat(word.style.fontSize) || 100;
    wordK = clamp((win.innerHeight * 0.215) / (fs * 0.7), 1, 1.9);
    wordH = word.offsetHeight * wordK;
  };

  let measures = 0;
  let measureMs = 0;
  const measure = () => {
    const t0 = performance.now();
    measureOnce();
    measures++;
    measureMs += performance.now() - t0;
  };
  const measureOnce = () => {
    const W = win.innerWidth;
    const H = win.innerHeight;
    const mobile = W < 700;
    const sy = win.scrollY;
    const maxScroll = Math.max(0, doc.documentElement.scrollHeight - H);
    const skip = (el: Element) => layer.contains(el) || !!el.closest("[data-xp-character],[data-xp-film-track]");
    items = things(doc, skip);
    const list = snapshot(items, win, false);
    const near = snapshot(items, win, true);
    const room = (at: number, want: number) => roomAt(Math.abs(at - sy) < H * 0.6 ? near : list, at, W, H, want, mobile);
    for (const s of secs) s.removeAttribute("data-xp-film-sec");
    secs = sections(doc, layer);
    const order = flat ? FLAT_ORDER : TALL_ORDER;
    const out: Anchor[] = [];
    const spotBox = (el: HTMLElement, at: number) => {
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top + sy - at, w: r.width, h: r.height };
    };
    const heroSec = secs.find((s) => s.contains(hero)) || null;
    const hr = hero.getBoundingClientRect();
    heroTop = hr.top + sy;
    heroMid = heroTop + hr.height * 0.42;
    heroCx = hr.left + hr.width / 2;
    heroW = hr.width;
    let seq = 0;
    for (const sec of secs) {
      sec.setAttribute("data-xp-film-sec", "");
      const r = sec.getBoundingClientRect();
      const top = r.top + sy;
      const hgt = r.height;
      const echo = sec.querySelector<HTMLElement>('[data-xp-character="echo"]');
      if (sec === heroSec) {
        const at = clamp(Math.min(top, heroTop + hr.height / 2 - H / 2), 0, maxScroll);
        out.push({ at, kind: "hero", seq: -1, sec, box: spotBox(hero, at), drift: 0 });
        // A tall hero gets a second, wider shot further down.
        if (hgt > H * 1.6) {
          const at2 = clamp(top + hgt - H, 0, maxScroll);
          const kind = order[seq % order.length];
          out.push({ at: at2, kind, seq: seq++, sec, box: room(at2, kind === "top" ? 0.6 : flat ? 2 : 0.9), want: kind === "top" ? 0.6 : flat ? 2 : 0.9, drift: 0 });
        }
        continue;
      }
      if (echo && echo.getBoundingClientRect().height > 40) {
        const er = echo.getBoundingClientRect();
        const at = clamp(er.top + sy + er.height / 2 - H / 2, 0, maxScroll);
        out.push({ at, kind: "echo", seq: -1, sec, box: spotBox(echo, at), drift: 0 });
        continue;
      }
      const kind = order[seq % order.length];
      const want = kind === "top" ? (flat ? 0.55 : 0.9) : flat ? 2.1 : 0.85;
      const n = hgt > H * 1.3 ? Math.min(4, Math.ceil(hgt / H)) : 1;
      for (let k = 0; k < n; k++) {
        const at = clamp(n === 1 ? top + hgt / 2 - H / 2 : top + (k * (hgt - H)) / (n - 1), 0, maxScroll);
        out.push({ at, kind, seq, sec, box: room(at, want), want, drift: k * 16 });
      }
      seq++;
    }
    // The choreography's track: its first and last moments are shots of their own, and the camera
    // plays what its script says in between.
    trackTop = 0;
    if (track && track.el.isConnected) {
      const tr = track.el.getBoundingClientRect();
      trackTop = tr.top + sy;
      const unit = H / 100;
      const first = track.sample(0);
      const last = track.sample(track.len);
      out.push({ at: trackTop, kind: "script", seq: -1, sec: null, box: null, drift: 0, key: first });
      out.push({ at: trackTop + track.len * unit, kind: "script", seq: -1, sec: null, box: null, drift: 0, key: last });
      if (track.opening) {
        heroCx = W / 2;
        heroW = W * 0.62;
      }
    }
    out.sort((a, b) => a.at - b.at);
    // Until its first shot the model stays in its spot in the hero, so shots above it are dropped.
    const first = out.findIndex((a) => a.kind === "hero");
    if (first > 0) out.splice(0, first);
    // Shots too close together blend into one: keep the fixed spots, drop the rest.
    const kept: Anchor[] = [];
    for (const a of out) {
      const prev = kept[kept.length - 1];
      if (prev && a.at - prev.at < H * 0.22 && !(a.kind === "script" || prev.kind === "script")) {
        if (prev.kind === "hero" || prev.kind === "echo" || !(a.kind === "hero" || a.kind === "echo")) continue;
        kept.pop();
      }
      kept.push(a);
    }
    if (!kept.length) kept.push({ at: 0, kind: "hero", seq: -1, sec: null, box: spotBox(hero, 0), drift: 0 });
    // Shots inside the track would only get in the way of its script.
    if (track && track.el.isConnected) {
      const end = trackTop + track.len * (H / 100);
      for (let i = kept.length - 1; i >= 0; i--) if (kept[i].kind !== "script" && kept[i].at > trackTop - 1 && kept[i].at < end + 1) kept.splice(i, 1);
    }
    anchors = kept;
    shotOf.clear();
    for (const a of anchors) if (a.sec && !shotOf.has(a.sec)) shotOf.set(a.sec, 1);
    // Turns only ever go one way, so scrolling down keeps it turning like a camera on a track.
    let yaw = 0;
    for (const a of anchors) {
      if (a.key) continue;
      const want = LOOKS[a.kind].face + a.drift;
      if (a === anchors[0] || !Number.isFinite(yaw)) yaw = want;
      else {
        // The same angle, the nearest way round, going on forward rather than back.
        let y = want + 360 * Math.round((yaw - want) / 360);
        if (y < yaw - 60) y += 360;
        yaw = y;
      }
      (a as Anchor & { yaw: number }).yaw = yaw;
    }
    fitWord();
  };

  // Springs for every value the camera reads, so moves ease in and settle like a crane shot.
  const keys = ["cx", "cy", "w", "h", "yaw", "elev", "align", "presence", "ring", "floor", "dust", "halo", "word", "glow", "pulse", "lift"] as const;
  type K = (typeof keys)[number];
  type Vals = Record<K, number>;
  const cur = {} as Record<K, { p: number; v: number }>;
  let primed = false;
  const step = (x: { p: number; v: number }, target: number, dt: number, k = 70) => {
    const d = 2 * Math.sqrt(k) * 0.92;
    const a = (target - x.p) * k - x.v * d;
    x.v += a * dt;
    x.p += x.v * dt;
  };

  let lastSec: string = "";
  /** True while the camera is playing a choreography's script (so the halo and word follow it). */
  let scripted = false;
  /** Where the camera is in the track, in hundredths of a screen (for the outlined word). */
  let trackT = 0;
  const target = (y: number, info: { flat: boolean; turn: number; base: number }): Vals => {
    const W = win.innerWidth;
    const H = win.innerHeight;
    let i = 0;
    while (i < anchors.length - 1 && anchors[i + 1].at <= y) i++;
    const A = anchors[i];
    const B = anchors[Math.min(i + 1, anchors.length - 1)];
    // The camera's turn is kept as a turn from the base (side on or front on), whatever its origin.
    const restRel = info.turn - info.base;
    const turnDelta = info.turn - (info.flat ? -32 : -18);
    const keyVals = (k: TrackKey): Vals => ({ cx: k.cx * W, cy: k.cy * H, w: k.w * W, h: k.h * H, yaw: k.yaw + turnDelta, elev: k.elev, align: k.align, presence: k.presence, ring: k.ring, floor: k.floor, dust: k.dust, halo: k.halo, word: k.word, glow: k.glow, pulse: k.pulse, lift: k.lift ?? 0 });
    scripted = false;
    // Inside the track: the script plays, exactly.
    if (track && A.key && B.key && A !== B && y >= A.at) {
      scripted = true;
      trackT = clamp((y - A.at) / (H / 100), 0, track.len);
      return keyVals(track.sample(trackT + (track.shift ? track.shift() : 0)));
    }
    const p = A === B ? 0 : clamp((y - A.at) / Math.max(1, B.at - A.at));
    // Hold each shot a while, then move.
    const k = smooth(0.18, 0.82, p);
    const fallback = (a: Anchor, other: Anchor) => a.box || other.box || { x: W * 0.55, y: H * 0.25, w: W * 0.4, h: H * 0.5 };
    const boxFor = (a: Anchor, other: Anchor) => {
      const b = fallback(a, other);
      const f = LOOKS[a.kind].fill;
      const fixedSpot = a.kind === "hero" || a.kind === "echo";
      // Never bigger than most of the screen: it is a subject, not a wall.
      const w = fixedSpot ? b.w * f : Math.min(b.w * f, W * 0.62);
      const h = fixedSpot ? b.h * f : Math.min(b.h * f, H * 0.7);
      // A fixed spot scrolls with the page until its shot is in place, then the film holds it.
      const shift = a.kind === "hero" || a.kind === "echo" ? Math.max(0, a.at - y) * (a.kind === "hero" ? 0 : 1) : 0;
      return { cx: b.x + b.w / 2, cy: b.y + b.h / 2 + shift, w, h };
    };
    const valsOf = (a: Anchor, other: Anchor): Vals => {
      if (a.key) return keyVals(a.key);
      const b = boxFor(a, other);
      const l = LOOKS[a.kind];
      const has = a.box ? 1 : 0;
      return { cx: b.cx, cy: b.cy, w: b.w, h: b.h, yaw: restRel + ((a as Anchor & { yaw: number }).yaw ?? 0), elev: l.elev, align: l.align, presence: has, ring: l.ring, floor: l.floor, dust: l.dust, halo: l.halo * has, word: l.word, glow: l.glow, pulse: l.pulse, lift: l.lift };
    };
    const va = valsOf(A, B);
    const vb = valsOf(B, A);
    // The shortest way round when a script's turn meets a shot's.
    if (!!A.key !== !!B.key) vb.yaw += 360 * Math.round((va.yaw - vb.yaw) / 360);
    // Before the first shot (a hero lower on the page) the spot scrolls with the page.
    let lead = 0;
    if (y < anchors[0].at && anchors[0].kind === "hero") lead = anchors[0].at - y;
    // A spot that has scrolled well off the screen takes the model with it.
    const heroGone = A.kind === "hero" && A === B ? clamp((y - A.at) / (H * 0.9)) : 0;
    // The script's last moment goes up the screen with the page when its track lets go.
    let leave = 0;
    if (A.key && A === B && track) leave = Math.max(0, y - A.at);
    const out = {} as Vals;
    for (const key of keys) out[key] = lerp(va[key], vb[key], k);
    out.cy += lead - heroGone * H * 0.6 - leave;
    out.presence *= 1 - heroGone;
    if (leave) out.presence *= 1 - clamp(leave / (H * 0.8));
    return out;
  };

  const focus = (y: number) => {
    const H = win.innerHeight;
    // A section's headings are sharp while any of its shots is near.
    const near = new Map<HTMLElement, number>();
    for (const a of anchors) {
      if (!a.sec) continue;
      const d = Math.abs(y - a.at);
      const f = 1 - smooth(H * 0.1, H * 0.6, d);
      near.set(a.sec, Math.max(near.get(a.sec) ?? 0, f));
    }
    let sig = "";
    for (const s of secs) {
      const f = near.has(s) ? near.get(s)! : 1;
      const v = (Math.round(f * 50) / 50).toFixed(2);
      sig += v;
      if (s.style.getPropertyValue("--xp-shot") !== v) s.style.setProperty("--xp-shot", v);
    }
    lastSec = sig;
  };

  let mo: MutationObserver | null = null;
  let re = 0;
  let lastMeasure = 0;
  // Pages that keep changing (tickers, typing words) are measured at most about once a second.
  const later = () => {
    if (re) return;
    const wait = Math.max(260, 1200 - (performance.now() - lastMeasure));
    re = win.setTimeout(() => {
      re = 0;
      lastMeasure = performance.now();
      measure();
    }, wait);
  };
  const onResize = () => later();
  win.addEventListener("resize", onResize);
  win.addEventListener("load", later);
  mo = new MutationObserver((list) => {
    if (list.every((m) => layer.contains(m.target as Node))) return;
    later();
  });
  mo.observe(doc.body, { childList: true, subtree: true });
  void doc.fonts?.ready?.then(later);
  paint();
  measure();

  // For checks in a browser: where the shots are and what the camera is doing.
  (win as unknown as { __XP_FILM__?: () => unknown }).__XP_FILM__ = () => ({
    anchors: anchors.map((a) => ({ at: Math.round(a.at), kind: a.kind, box: a.box && { x: Math.round(a.box.x), y: Math.round(a.box.y), w: Math.round(a.box.w), h: Math.round(a.box.h) } })),
    cur: Object.fromEntries(keys.filter((k) => cur[k]).map((k) => [k, Math.round(cur[k].p * 100) / 100])),
    dodge: Math.round(dodge * 100) / 100,
    measures,
    measureMs: Math.round(measureMs),
  });

  const film: Film = {
    stage,
    shot(dt, info): FilmShot {
      if (measuredFlat !== info.flat) {
        measuredFlat = info.flat;
        flat = info.flat;
        opts.onShape?.(flat);
        measure();
      }
      const y = win.scrollY;
      liveMeasure(y);
      const t = target(y, info);
      // Near a fixed spot (the hero, the echo, the choreography) the page placed it on purpose: no dodging.
      let ni = 0;
      for (let i = 1; i < anchors.length; i++) if (Math.abs(anchors[i].at - y) < Math.abs(anchors[ni].at - y)) ni = i;
      const spot = scripted || (anchors[ni] && (anchors[ni].kind === "hero" || anchors[ni].kind === "echo" || anchors[ni].kind === "script"));
      if (spot) dodgeWant = 1;
      else if (performance.now() - lastDodge > 250) {
        lastDodge = performance.now();
        checkDodge(y, primed ? { cx: cur.cx.p, cy: cur.cy.p, w: cur.w.p, h: cur.h.p } : t);
      }
      if (info.reduced || (win as unknown as { __XP_FILM_SNAP__?: boolean }).__XP_FILM_SNAP__) dodge = dodgeWant;
      else {
        const a = (dodgeWant - dodge) * 90 - dodgeV * 19;
        dodgeV += a * Math.min(dt, 0.05);
        dodge = clamp(dodge + dodgeV * Math.min(dt, 0.05));
      }
      t.presence *= dodge;
      // Checks in a browser can ask for every move to land at once (window.__XP_FILM_SNAP__).
      const snap = !!(win as unknown as { __XP_FILM_SNAP__?: boolean }).__XP_FILM_SNAP__;
      if (!primed || info.reduced || snap) {
        for (const k of keys) cur[k] = { p: t[k], v: 0 };
        primed = true;
      } else for (const k of keys) step(cur[k], t[k], Math.min(dt, 0.05), k === "yaw" || k === "elev" ? 42 : 70);
      focus(y);
      const v = (k: K) => cur[k].p;
      // The halo and the wordmark live in the page, behind the model.
      // The script's halo is a disc a little bigger than the model; the page's a soft glow.
      if (scripted !== haloMode) {
        haloMode = scripted;
        halo.style.background = haloMode ? haloDisc : haloSoft;
      }
      const size = Math.max(v("w"), v("h")) * (scripted ? 1.28 : 1.5);
      halo.style.width = halo.style.height = `${size}px`;
      halo.style.transform = `translate(${v("cx") - size / 2}px, ${v("cy") - size / 2}px)`;
      halo.style.opacity = String(clamp(v("halo")) * (scripted ? 0.9 : 0.6));
      const wo = clamp(v("word"));
      word.style.opacity = String(wo);
      if (track && track.opening) {
        // In the opening track the word sits near the top of the screen and drifts up slowly.
        const H = win.innerHeight;
        const t0 = scripted ? trackT : Math.max(0, (y - trackTop) / (H / 100));
        word.style.transform = `translateY(${H * 0.13 - wordH * 0.1 - t0 * (H / 100) * 0.1}px) scaleY(${wordK.toFixed(3)})`;
      } else word.style.transform = `translateY(${heroMid - wordH * 0.62 - y * 0.55}px) scaleY(${wordK.toFixed(3)})`;
      // Stepping out of the way: it shrinks as it fades, so it never hangs over words as a ghost.
      const pr = clamp(v("presence"));
      const shrink = 0.55 + 0.45 * pr;
      return { cx: v("cx"), cy: v("cy"), w: v("w") * shrink, h: v("h") * shrink, yaw: v("yaw"), elev: v("elev"), align: clamp(v("align")), presence: pr * pr, ring: clamp(v("ring")), floor: clamp(v("floor")), dust: clamp(v("dust")), glow: clamp(v("glow")), pulse: clamp(v("pulse")), lift: clamp(v("lift")) };
    },
    live() {
      doc.documentElement.classList.add("xp-film-live");
    },
    update(next) {
      opts = { ...opts, ...next };
      paint();
      fitWord();
    },
    measure,
    setTrack(next) {
      track = next;
      measure();
    },
    dispose() {
      mo?.disconnect();
      if (re) win.clearTimeout(re);
      win.removeEventListener("resize", onResize);
      win.removeEventListener("load", later);
      for (const s of secs) s.removeAttribute("data-xp-film-sec"), s.style.removeProperty("--xp-shot");
      doc.documentElement.classList.remove("xp-film-on", "xp-film-live");
      layer.remove();
      void lastSec;
    },
  };
  return film;
}
