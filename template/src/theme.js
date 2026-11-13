// Colour system for the portfolio.
// You pick two things: a neutral hue (the slight tint in the background, text and lines)
// and one accent colour. Everything else is derived in OKLCH so every theme stays
// readable (WCAG AA) in both light and dark mode.

function clamp(v, a, b) {
  return Math.min(b, Math.max(a, v));
}

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return [0.5, 0.5, 0.5];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
}

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const fromLinear = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

export function hexToOklch(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.sqrt(A * A + B * B);
  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;
  return [L, C, H];
}

export function oklchToHex(L, C, H) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => Math.round(clamp(fromLinear(c), 0, 1) * 255));
  return "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Nudges the accent's lightness until it reads on the background (3:1 for large UI,
// which buttons and links are), keeping its hue and character.
function fitAccent(accentHex, bgHex, dark) {
  let [L, C, H] = hexToOklch(accentHex);
  let hex = oklchToHex(L, C, H);
  for (let i = 0; i < 40 && contrast(hex, bgHex) < 4.5; i++) {
    L = clamp(L + (dark ? 0.015 : -0.015), 0.2, 0.92);
    hex = oklchToHex(L, C, H);
  }
  return hex;
}

export function palette(design, scheme) {
  const hue = Number(design.hue) || 0;
  const tint = clamp(Number(design.tint ?? 0.012), 0, 0.04);
  const dark = scheme === "dark";
  const bg = dark ? oklchToHex(0.19, tint * 1.6, hue) : oklchToHex(0.982, tint * 0.35, hue);
  const surface = dark ? oklchToHex(0.235, tint * 1.6, hue) : oklchToHex(0.955, tint * 0.6, hue);
  const text = dark ? oklchToHex(0.95, tint * 0.6, hue) : oklchToHex(0.22, tint * 1.4, hue);
  const muted = dark ? oklchToHex(0.74, tint * 1.2, hue) : oklchToHex(0.48, tint * 1.4, hue);
  const border = dark ? oklchToHex(0.31, tint * 1.6, hue) : oklchToHex(0.885, tint * 0.7, hue);
  const accent = fitAccent(design.accent, bg, dark);
  const onAccent = contrast("#FFFFFF", accent) >= contrast(bg, accent) ? oklchToHex(0.99, 0.005, hue) : dark ? bg : oklchToHex(0.18, 0.01, hue);
  const pal = { bg, surface, text, muted, border, accent, onAccent };
  // Exact colours the person set by hand in the builder win over the derived ones.
  const own = design.colors && design.colors[dark ? "dark" : "light"];
  if (own && typeof own === "object") {
    for (const k of Object.keys(pal)) if (typeof own[k] === "string" && /^#[0-9a-f]{6}$/i.test(own[k])) pal[k] = own[k].toUpperCase();
    // A hand-picked accent or background still needs readable button text.
    if ((own.accent || own.bg) && !own.onAccent) pal.onAccent = contrast("#FFFFFF", pal.accent) >= contrast("#111111", pal.accent) ? "#FFFFFF" : "#111111";
  }
  return pal;
}

export function resolveScheme(design, systemDark) {
  if (design.mode === "light" || design.mode === "dark") return design.mode;
  return systemDark ? "dark" : "light";
}
