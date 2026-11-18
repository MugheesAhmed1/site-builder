import { fill, lines, safeSrc, type XP } from './xp';

// Everything below that a person can change comes from the template content (xp-content.js).
// These are live bindings: setContent() replaces them before the page (re)starts.
export let SHEET_URL = '';
export let INTRO_VIDEO_URL = '';

/** Size in pixels of the product picture sheet the boxes below are measured on. */
export let SW = 2688;
export let SH = 1520;
export const BH = (849 + 8) / (403 + 8); // ~2.085158

export interface FlavourSpec {
  id: number;
  name: string;
  lines: [string, string?];
  color: string;
  box: [number, number, number, number];
  bit: number;
  ingredients: string;
}

const DEFAULT_FLAVOURS: FlavourSpec[] = [
  {
    id: 0,
    name: 'Peanut Cocoa',
    lines: ['PEANUT', 'COCOA'],
    color: '#b79474',
    box: [98, 145, 403, 849],
    bit: 1,
    ingredients: 'Peanuts, oats, dates, cocoa, pea protein, sea salt.',
  },
  {
    id: 1,
    name: 'Berry Oat',
    lines: ['BERRY', 'OAT'],
    color: '#ab9ac4',
    box: [620, 145, 402, 849],
    bit: 0,
    ingredients: 'Oats, blueberries, raspberries, dates, pea protein, almonds.',
  },
  {
    id: 2,
    name: 'Salted Caramel',
    lines: ['SALTED', 'CARAMEL'],
    color: '#d1ad6c',
    box: [1137, 145, 402, 849],
    bit: 2,
    ingredients: 'Dates, cashews, oats, pea protein, sea salt, vanilla.',
  },
  {
    id: 3,
    name: 'Mint Chip',
    lines: ['MINT', 'CHIP'],
    color: '#94bdb4',
    box: [1661, 145, 402, 849],
    bit: 3,
    ingredients: 'Oats, dark chocolate, almonds, pea protein, peppermint oil.',
  },
  {
    id: 4,
    name: 'Strawberry',
    lines: ['STRAW-', 'BERRY'],
    color: '#d396a7',
    box: [2184, 145, 403, 849],
    bit: 4,
    ingredients: 'Oats, strawberries, dates, cashews, pea protein, lemon.',
  },
];

const DEFAULT_BITS: Array<[number, number, number, number]> = [
  [650, 1090, 340, 305], // 0: blueberries and raspberry
  [110, 1125, 280, 255], // 1: chocolate chunks and peanuts
  [1175, 1110, 320, 285], // 2: salted caramel cube
  [1680, 1085, 380, 305], // 3: mint leaves and dark chocolate
  [2280, 1095, 250, 295], // 4: half strawberry
];

export const HERO_BITS_LAYOUT = [
  { x: 0.12, y: 0.2, size: 120, rot: -18, bit: 0, phoneHide: false },
  { x: 0.86, y: 0.18, size: 96, rot: 22, bit: 2, phoneHide: true },
  { x: 0.07, y: 0.74, size: 84, rot: 12, bit: 3, phoneHide: false },
  { x: 0.655, y: 0.15, size: 78, rot: -10, bit: 4, phoneHide: true },
  { x: 0.205, y: 0.885, size: 70, rot: 30, bit: 1, phoneHide: true },
];

export const ARC_SLOTS = [
  { k: 0, dx: 0, dy: 0, h: 430, rz: 0, ry: 0 },
  { k: 1, dx: 245, dy: 24, h: 330, rz: 4, ry: 16 },
  { k: 2, dx: 452, dy: 44, h: 312, rz: 8, ry: 26 },
  { k: 3, dx: 660, dy: 80, h: 296, rz: 12, ry: 34 },
  { k: 4, dx: 860, dy: 118, h: 280, rz: 15, ry: 40 },
];

const DEFAULT_STEPS = [
  {
    num: '01',
    head: ['REAL FOOD,', 'FIRST'],
    cap: ['OATS, NUTS, FRUIT.', "NOTHING YOU CAN'T SAY."],
    ry: 0,
  },
  {
    num: '02',
    head: ['PRESSED,', 'NOT BAKED'],
    cap: ['REAL INGREDIENTS.', 'CLEAN ENERGY.'],
    ry: 180,
  },
  {
    num: '03',
    head: ['WRAPPED', 'SAME DAY'],
    cap: ['COLD-PRESSED AT DAWN.', 'SEALED BY NOON.'],
    ry: 360,
  },
  {
    num: '04',
    head: ['BERRY', 'OAT'],
    cap: ['12G PLANT PROTEIN.', 'NO CRASH.'],
    ry: 720,
  },
];

export let FLAVOURS: FlavourSpec[] = DEFAULT_FLAVOURS;
export let BITS: Array<[number, number, number, number]> = DEFAULT_BITS;
export let INSIDE_STEPS: { num: string; head: string[]; cap: string[]; ry: number }[] = DEFAULT_STEPS;
export let FONTS = { display: 'Archivo Black', body: 'Inter', mono: 'DM Mono' };
/** Words printed on the 3D bar's wrapper. */
export let PACK = {
  brand: 'STRIDE',
  weight: '50 G',
  nutritionTitle: 'NUTRITION',
  serving: 'Serving size 1 bar (50 g)',
  nutrition: [] as [string, string, boolean][],
  ingredientsTitle: 'INGREDIENTS',
  barcode: '5 060123 4560',
  slogan: 'PRESSED, NOT BAKED',
};

const BOX = (v: unknown, d: [number, number, number, number]): [number, number, number, number] => {
  const n = String(v ?? '').split(/[ ,]+/).map(Number).filter((x) => Number.isFinite(x));
  return n.length === 4 && n[2] > 0 && n[3] > 0 ? [n[0], n[1], n[2], n[3]] : d;
};
const HEX = /^#[0-9a-f]{6}$/i;
const SAFE_FONT = /^[A-Za-z0-9 ]{2,40}$/;

/** Fill the live bindings from the content. */
export function setContent(data: XP): void {
  const sheet = data.sheet || {};
  SHEET_URL = safeSrc(sheet.image);
  INTRO_VIDEO_URL = safeSrc(data.intro?.video);
  SW = Number(sheet.width) > 0 ? Number(sheet.width) : 2688;
  SH = Number(sheet.height) > 0 ? Number(sheet.height) : 1520;
  const bits = lines(sheet.bits, data).map((l, i) => BOX(l, DEFAULT_BITS[i % DEFAULT_BITS.length]));
  BITS = bits.length ? bits : DEFAULT_BITS;
  const items: XP[] = Array.isArray(data.flavours) ? data.flavours : [];
  const list = items.map((it, i) => {
    const d = DEFAULT_FLAVOURS[i % DEFAULT_FLAVOURS.length];
    const name = fill(it.name, data) || d.name;
    const label = lines(it.label, data);
    return {
      id: i,
      name,
      lines: (label.length ? [label[0], label[1]] : [name.toUpperCase()]) as [string, string?],
      color: HEX.test(String(it.color || '')) ? String(it.color) : d.color,
      box: BOX(it.box, d.box),
      bit: Math.max(0, Math.min(BITS.length - 1, Math.round(Number(it.bit ?? d.bit)) || 0)),
      ingredients: fill(it.ingredients, data),
    };
  });
  FLAVOURS = list.length ? list : DEFAULT_FLAVOURS;
  const steps: XP[] = Array.isArray(data.inside?.steps) ? data.inside.steps : [];
  INSIDE_STEPS = DEFAULT_STEPS.map((d, i) => {
    const st = steps[i] || {};
    const head = lines(st.title, data);
    const cap = lines(st.caption, data);
    return { num: String(i + 1).padStart(2, '0'), head: head.length ? head : [''], cap, ry: d.ry };
  });
  const fonts = data.theme?.fonts || {};
  FONTS = {
    display: SAFE_FONT.test(fonts.display || '') ? fonts.display : 'Archivo Black',
    body: SAFE_FONT.test(fonts.body || '') ? fonts.body : 'Inter',
    mono: SAFE_FONT.test(fonts.mono || '') ? fonts.mono : 'DM Mono',
  };
  const p = data.pack || {};
  PACK = {
    brand: fill(p.brand || data.brand?.name, data).toUpperCase(),
    weight: fill(p.weight, data),
    nutritionTitle: fill(p.nutritionTitle, data),
    serving: fill(p.serving, data),
    nutrition: lines(p.nutrition, data).slice(0, 9).map((l, i) => {
      const k = l.indexOf('|');
      return [k < 0 ? l : l.slice(0, k).trim(), k < 0 ? '' : l.slice(k + 1).trim(), i < 2] as [string, string, boolean];
    }),
    ingredientsTitle: fill(p.ingredientsTitle, data),
    barcode: fill(p.barcode, data),
    slogan: fill(p.slogan, data),
  };
}

/** Escaped text lines joined with line breaks, for the few places that set HTML directly. */
export function htmlLines(parts: string[]): string {
  const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
  return parts.map(esc).join('<br/>');
}

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function clamp(v: number, lo = 0, hi = 1): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function spriteCss(box: [number, number, number, number], pad = 0): {
  backgroundSize: string;
  backgroundPosition: string;
} {
  const x = box[0] - pad;
  const y = box[1] - pad;
  const w = box[2] + 2 * pad;
  const h = box[3] + 2 * pad;
  const sx = (SW / w) * 100;
  const sy = (SH / h) * 100;
  const px = (x / (SW - w)) * 100;
  const py = (y / (SH - h)) * 100;
  return {
    backgroundSize: `${sx.toFixed(4)}% ${sy.toFixed(4)}%`,
    backgroundPosition: `${px.toFixed(4)}% ${py.toFixed(4)}%`,
  };
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function hexWithAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function mixHex(hexA: string, hexB: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));
  return `rgb(${r},${g},${b})`;
}

/**
 * Exact cubic-bezier(x1, y1, x2, y2) solver via Newton-Raphson + bisection fallback.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const ax = 3 * x1 - 3 * x2 + 1;
  const bx = 3 * x2 - 6 * x1;
  const cx = 3 * x1;

  const ay = 3 * y1 - 3 * y2 + 1;
  const by = 3 * y2 - 6 * y1;
  const cy = 3 * y1;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) return sampleY(t);
      const d = sampleDX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 16; i++) {
      const cur = sampleX(t);
      if (Math.abs(cur - x) < 1e-6) break;
      if (x > cur) lo = t;
      else hi = t;
      t = 0.5 * (lo + hi);
    }
    return sampleY(t);
  };
}

export const easeGlide = cubicBezier(0.25, 0.75, 0.2, 1);
export const easeEntrance = cubicBezier(0.16, 1, 0.3, 1);
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * clamp(t, 0, 1)) - 1) / 2;

export function seededRand(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
