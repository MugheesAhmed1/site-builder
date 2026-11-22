// A character's colours, measured from its picture (the library preview, a render of an uploaded
// model, or the photo it was made from). Pixels are clustered in OKLab (k-means++ with a fixed
// seed, so the same picture always gives the same palette) and each cluster is weighed by how
// much of the character it covers. Transparent pixels (the background of a preview) are left out.
import { HEX, adjust, fromLch, hexToRgb, hueGap, labToRgb, rgbToHex, rgbToLab, toLch, type Lab } from "./color";

export interface Swatch {
  hex: string;
  /** Share of the character it covers, 0 to 1. */
  weight: number;
}

export interface CharacterPalette {
  /** Clusters, largest first. */
  colors: Swatch[];
  /** The colour it is mostly made of. */
  dominant: string;
  /** Its most characterful colour: strong and big enough to notice. */
  accent: string;
  /** A second colour that differs from the accent, for gradients and highlights. */
  second: string;
  /** Mostly greys, blacks, whites or metals: the accent comes from elsewhere. */
  neutral: boolean;
  /** Mostly light (a white robot) or mostly dark (black shoes): decides what it stands out on. */
  tone: "light" | "dark" | "mid";
}

// A tiny deterministic random source, so palettes never change between runs.
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Pixels (RGBA, as from a canvas) to a palette. Returns null when nothing visible is in them. */
export function paletteFromPixels(data: ArrayLike<number>, opts: { k?: number; sample?: number; alpha?: number } = {}): CharacterPalette | null {
  const k = opts.k ?? 6;
  const want = opts.sample ?? 6000;
  const minAlpha = opts.alpha ?? 160;
  const total = Math.floor(data.length / 4);
  const step = Math.max(1, Math.floor(total / want));
  const pts: Lab[] = [];
  for (let i = 0; i < total; i += step) {
    if (data[i * 4 + 3] < minAlpha) continue;
    pts.push(rgbToLab([data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]));
  }
  if (pts.length < 12) return null;

  // k-means++ seeding.
  const rand = rng(pts.length * 31 + 7);
  const d2 = (a: Lab, b: Lab) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const centres: Lab[] = [pts[Math.floor(rand() * pts.length)]];
  const nearest = new Float64Array(pts.length).fill(Infinity);
  while (centres.length < Math.min(k, pts.length)) {
    let sum = 0;
    const last = centres[centres.length - 1];
    for (let i = 0; i < pts.length; i++) {
      nearest[i] = Math.min(nearest[i], d2(pts[i], last));
      sum += nearest[i];
    }
    if (sum === 0) break;
    let r = rand() * sum;
    let pick = 0;
    for (; pick < pts.length - 1; pick++) if ((r -= nearest[pick]) <= 0) break;
    centres.push(pts[pick]);
  }

  const assign = new Int32Array(pts.length);
  for (let iter = 0; iter < 14; iter++) {
    let moved = 0;
    for (let i = 0; i < pts.length; i++) {
      let best = 0;
      let bd = Infinity;
      for (let c = 0; c < centres.length; c++) {
        const d = d2(pts[i], centres[c]);
        if (d < bd) (bd = d), (best = c);
      }
      if (assign[i] !== best) (assign[i] = best), moved++;
    }
    const acc = centres.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < pts.length; i++) {
      const a = acc[assign[i]];
      a[0] += pts[i][0];
      a[1] += pts[i][1];
      a[2] += pts[i][2];
      a[3]++;
    }
    acc.forEach((a, c) => a[3] && (centres[c] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]));
    if (iter > 2 && moved === 0) break;
  }

  const counts = centres.map(() => 0);
  for (let i = 0; i < pts.length; i++) counts[assign[i]]++;
  let colors: Swatch[] = centres
    .map((c, i) => ({ hex: rgbToHex(labToRgb(c)), weight: counts[i] / pts.length }))
    .filter((s) => s.weight > 0.004)
    .sort((a, b) => b.weight - a.weight);

  // Clusters that look the same are merged.
  const merged: Swatch[] = [];
  for (const s of colors) {
    const twin = merged.find((m) => {
      const a = rgbToLab(hexToRgb(m.hex));
      const b = rgbToLab(hexToRgb(s.hex));
      return Math.sqrt(d2(a, b)) < 0.045;
    });
    if (twin) twin.weight += s.weight;
    else merged.push({ ...s });
  }
  colors = merged.sort((a, b) => b.weight - a.weight);
  return describe(colors);
}

/** Roles (dominant, accent, second) for a list of weighed colours. */
export function describe(colors: Swatch[]): CharacterPalette {
  const list = colors.filter((c) => HEX.test(c.hex));
  const lch = list.map((c) => ({ ...c, ...toLch(c.hex) }));
  const dominant = lch[0]?.hex ?? "#808080";
  // Character: chroma counts most, but a speck of colour should not lead a whole site.
  const score = (c: (typeof lch)[number]) => c.c * Math.sqrt(Math.min(1, c.weight / 0.08)) * (c.l < 0.12 || c.l > 0.97 ? 0.3 : 1);
  const byCharacter = [...lch].sort((a, b) => score(b) - score(a));
  const strong = byCharacter[0];
  const neutral = !strong || strong.c < 0.045;
  const accent = strong?.hex ?? dominant;
  const a = toLch(accent);
  const others = byCharacter.filter((c) => c.hex !== accent);
  const second =
    others.find((c) => c.c > 0.04 && hueGap(c.h, a.h) > 35)?.hex ??
    others.find((c) => Math.abs(c.l - a.l) > 0.25 && c.c > 0.02)?.hex ??
    adjust(accent, (x) => ({ h: (x.h + 40) % 360, l: Math.min(0.85, x.l + 0.12) }));
  const avgL = lch.reduce((s, c) => s + c.l * c.weight, 0) / Math.max(1e-6, lch.reduce((s, c) => s + c.weight, 0));
  return { colors: list, dominant, accent, second, neutral, tone: avgL > 0.72 ? "light" : avgL < 0.38 ? "dark" : "mid" };
}

/** Colour words (the library's tags) to a rough palette, for when no picture can be read. */
const WORDS: Record<string, string> = {
  white: "#f2f2f0", black: "#16161a", grey: "#8a8d93", gray: "#8a8d93", silver: "#c4c7cc", gold: "#d4a537", brass: "#b8913a", copper: "#b8673f",
  red: "#d63b33", orange: "#f08a24", yellow: "#f4c430", green: "#3fa34d", teal: "#1f9e95", cyan: "#29c4d8", blue: "#2f6fe0", navy: "#1e2f66",
  purple: "#7b4bd0", violet: "#8f5bd8", pink: "#f07aa8", magenta: "#d63c9a", brown: "#7a5034", cream: "#efe4cf", beige: "#d8c4a0",
  terracotta: "#c4643f", wood: "#9a6a3e", rainbow: "#b06ad8", lime: "#a8d63c", amber: "#f0a830",
};

export function paletteFromWords(words: string[]): CharacterPalette {
  const hits = words.map((w) => WORDS[w.toLowerCase()]).filter(Boolean);
  const list = (hits.length ? hits : ["#8a8d93"]).map((hex, i, all) => ({ hex, weight: (all.length - i) / ((all.length * (all.length + 1)) / 2) }));
  return describe(list);
}

/** A palette with no character colour gets one: the brand colour asked for, or a hue that suits the trade. */
export function withAccent(p: CharacterPalette, accent: string): CharacterPalette {
  if (!HEX.test(accent)) return p;
  const a = toLch(accent);
  const second = adjust(accent, { h: (a.h + 38) % 360, l: Math.min(0.86, a.l + 0.14), c: a.c * 0.8 });
  return { ...p, accent, second, neutral: false };
}

/** A clean swatch strip for the UI: the colours, then the accent's light and dark ends. */
export function strip(p: CharacterPalette): string[] {
  const a = toLch(p.accent);
  return [...p.colors.slice(0, 5).map((c) => c.hex), fromLch(0.92, a.c * 0.35, a.h), fromLch(0.22, a.c * 0.5, a.h)];
}
