// Colour maths for the character journey (docs/CHARACTER-JOURNEY.md). Palettes are measured and
// mixed in OKLab, so "lighter" and "same strength" mean what an eye sees, and every text colour
// is checked against WCAG contrast before it reaches a site. No dependencies; runs anywhere.

export type RGB = [number, number, number];
export type Lab = [number, number, number];

export const HEX = /^#[0-9a-f]{6}$/i;

export function hexToRgb(hex: string): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

const toLinear = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const toGamma = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(0, v) ** (1 / 2.4) - 0.055);

/** sRGB (0-255) to OKLab. */
export function rgbToLab([r, g, b]: RGB): Lab {
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

/** OKLab to sRGB (0-255), clipped into the gamut. */
export function labToRgb([L, a, b]: Lab): RGB {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

export interface LCH {
  /** Lightness, 0 to 1. */
  l: number;
  /** Chroma (strength), 0 to about 0.37. */
  c: number;
  /** Hue angle in degrees. */
  h: number;
}

export function toLch(hex: string): LCH {
  const [L, a, b] = rgbToLab(hexToRgb(hex));
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return { l: L, c: Math.hypot(a, b), h: h < 0 ? h + 360 : h };
}

function inGamut(lab: Lab) {
  const l = (lab[0] + 0.3963377774 * lab[1] + 0.2158037573 * lab[2]) ** 3;
  const m = (lab[0] - 0.1055613458 * lab[1] - 0.0638541728 * lab[2]) ** 3;
  const s = (lab[0] - 0.0894841775 * lab[1] - 1.291485548 * lab[2]) ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const e = 0.0005;
  return r >= -e && r <= 1 + e && g >= -e && g <= 1 + e && bb >= -e && bb <= 1 + e;
}

/** A colour from lightness, chroma and hue; chroma is reduced until it fits sRGB, keeping the hue. */
export function fromLch(l: number, c: number, h: number): string {
  const L = Math.max(0, Math.min(1, l));
  const rad = (h * Math.PI) / 180;
  let cc = Math.max(0, c);
  for (let i = 0; i < 24 && cc > 0.0005; i++) {
    if (inGamut([L, cc * Math.cos(rad), cc * Math.sin(rad)])) break;
    cc *= 0.92;
  }
  return rgbToHex(labToRgb([L, cc * Math.cos(rad), cc * Math.sin(rad)]));
}

/** The same colour with some of its parts changed. */
export function adjust(hex: string, change: Partial<LCH> | ((c: LCH) => Partial<LCH>)): string {
  const now = toLch(hex);
  const next = { ...now, ...(typeof change === "function" ? change(now) : change) };
  return fromLch(next.l, next.c, next.h);
}

/** A mix of two colours in OKLab; t = 0 is a, t = 1 is b. */
export function mix(a: string, b: string, t: number): string {
  const x = rgbToLab(hexToRgb(a));
  const y = rgbToLab(hexToRgb(b));
  return rgbToHex(labToRgb([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]));
}

/** Perceptual distance between two colours (OKLab, about 0 to 1). */
export function distance(a: string, b: string): number {
  const x = rgbToLab(hexToRgb(a));
  const y = rgbToLab(hexToRgb(b));
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1 to 21. */
export function contrast(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/**
 * The colour moved in lightness (keeping its hue and as much strength as fits) until it reaches
 * the contrast asked for against the background. Goes the way that needs the smaller move.
 */
export function ensureContrast(fg: string, bg: string, ratio: number): string {
  if (contrast(fg, bg) >= ratio) return fg;
  const c = toLch(fg);
  const darkBg = luminance(bg) < 0.18;
  const tryWay = (up: boolean) => {
    for (let i = 1; i <= 40; i++) {
      const l = up ? c.l + ((1 - c.l) * i) / 40 : c.l - (c.l * i) / 40;
      const x = fromLch(l, c.c * (1 - i / 80), c.h);
      if (contrast(x, bg) >= ratio) return { x, i };
    }
    return null;
  };
  const first = tryWay(darkBg);
  const second = tryWay(!darkBg);
  const best = [first, second].filter(Boolean).sort((p, q) => p!.i - q!.i)[0];
  return best ? best.x : darkBg ? "#ffffff" : "#000000";
}

/** Black-ish or white-ish text, whichever reads better on the colour. */
export function onColor(bg: string, dark = "#0b0b10", light = "#ffffff"): string {
  return contrast(dark, bg) >= contrast(light, bg) ? dark : light;
}

/** A hue difference in degrees, 0 to 180. */
export function hueGap(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}
