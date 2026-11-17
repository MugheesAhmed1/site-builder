import type { Beat, Budget, MotionChannels, Params } from "../experiences/types";

// What every stage engine receives each frame, and the small helpers they share.

export interface Palette {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  onAccent: string;
  dark: boolean;
}

export interface Tap {
  x: number;
  y: number;
  t: number;
}

export interface Frame {
  /** Seconds since the stage started (frozen for reduced motion). */
  t: number;
  dt: number;
  /** Fractional scene index (see motion/scroll.ts). */
  pos: number;
  /** The stage state at pos, blended between the scenes' beats. */
  beat: Beat;
  params: Params;
  w: number;
  h: number;
  /** Pointer in CSS pixels on the stage, and -1..1 from the centre. */
  px: number;
  py: number;
  nx: number;
  ny: number;
  pointer: boolean;
  /** Taps and clicks on the open stage, newest last. */
  taps: Tap[];
  /** Where the anchor object should sit: 0 left, 0.5 centre, 1 right, and how present it is (1 beside the words, 0.4 behind them). */
  side: number;
  presence: number;
  pal: Palette;
  mobile: boolean;
  reduced: boolean;
  /** Intensity as 0.1 to 1. */
  energy: number;
  budget: Budget;
  ch: MotionChannels;
  /** Scroll speed in pixels per frame. */
  speed: number;
  /** Words from the site (brand, services, skills) some engines draw. */
  labels: string[];
  seed: number;
}

export type Engine2D = (g: CanvasRenderingContext2D, f: Frame, s: Record<string, any>) => void;

// ------------------------------------------------------------------ numbers

export const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);
/** 0 outside a..b, rising to 1 at b. */
export const ramp = (x: number, a: number, b: number) => clamp((x - a) / (b - a));
export const num = (b: Beat | Params, k: string, d = 0) => (typeof b[k] === "number" ? (b[k] as number) : d);
export const str = (b: Beat | Params, k: string, d = "") => (typeof b[k] === "string" ? (b[k] as string) : d);

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/** Smooth 1D noise from a few sines, stable per seed. */
export function wave(seed: number) {
  const r = rng(seed);
  const parts = [0, 1, 2, 3].map((i) => ({ f: (0.6 + r() * 0.8) * (i + 1) * 1.7, p: r() * 6.28, a: 1 / (i + 1.3) }));
  return (x: number) => parts.reduce((s, q) => s + Math.sin(x * q.f + q.p) * q.a, 0) / 1.6;
}

// ------------------------------------------------------------------ colour

export function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(v.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((x) => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, "0")).join("");
}

export function mix(a: string, b: string, t: number) {
  const x = hexRgb(a);
  const y = hexRgb(b);
  return rgbHex(lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t));
}

export function rgba(hex: string, a: number) {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${clamp(a).toFixed(3)})`;
}

/** Blend along a list of colour stops at t (0 to 1). */
export function ramp3(stops: string[], t: number) {
  const x = clamp(t) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  return mix(stops[i], stops[i + 1], x - i);
}

export function hsl(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

export function hueOf(hex: string) {
  const [r, g, b] = hexRgb(hex).map((x) => x / 255);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  if (!d) return 0;
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

// ------------------------------------------------------------------ beats

/** The beat at a fractional scene index: numbers blend, words switch half way. */
export function beatAt(beats: Beat[], pos: number): Beat {
  if (!beats.length) return {};
  const p = clamp(pos, 0, beats.length - 1);
  const i = Math.min(beats.length - 2, Math.floor(p));
  if (beats.length === 1) return beats[0];
  const t = p - i;
  const a = beats[i];
  const b = beats[i + 1];
  const out: Beat = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k] ?? b[k];
    const y = b[k] ?? a[k];
    out[k] = typeof x === "number" && typeof y === "number" ? lerp(x, y, smooth(t)) : t < 0.5 ? x : y;
  }
  return out;
}

/** Where the anchor sits for each composition: beside the words, or behind them. */
export function sideOf(composition: string): [number, number] {
  if (composition === "left") return [0.74, 1];
  if (composition === "right") return [0.26, 1];
  if (composition === "wide") return [0.5, 0.35];
  return [0.5, 0.55];
}

/** The anchor's centre and size in pixels, for object engines. */
export function anchorBox(f: Frame) {
  const m = f.mobile;
  const size = Math.min(f.w, f.h) * (m ? 0.5 : 0.62) * (0.75 + 0.25 * f.presence);
  const x = m ? f.w * 0.5 : lerp(f.w * 0.26, f.w * 0.74, (f.side - 0.26) / 0.48);
  const y = m ? f.h * 0.3 : f.h * (0.52 - (1 - f.presence) * 0.06);
  return { x, y, size, alpha: m ? 0.55 + f.presence * 0.25 : 0.35 + f.presence * 0.65 };
}

export function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + k, y);
  g.arcTo(x + w, y, x + w, y + h, k);
  g.arcTo(x + w, y + h, x, y + h, k);
  g.arcTo(x, y + h, x, y, k);
  g.arcTo(x, y, x + w, y, k);
  g.closePath();
}

/** Recent taps within ms, with their age 0..1. */
export function freshTaps(f: Frame, ms = 1200) {
  return f.taps.map((t) => ({ ...t, age: (f.t - t.t) / (ms / 1000) })).filter((t) => t.age >= 0 && t.age < 1);
}

/** One or two capital letters for a monogram. */
export function initialsOf(name: string) {
  const w = name.trim().split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? "") + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase() || "•";
}
