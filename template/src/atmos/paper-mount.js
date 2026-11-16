// Runs a Paper Shaders scene (Apache License 2.0, https://github.com/paper-design/shaders)
// inside an element. The library is loaded only when a site actually shows one of these
// scenes. Its parameters become uniforms the same way the library's own React wrappers do it.

import { noGpu } from "./engine.js";

let lib = null;

export function loadPaper() {
  if (!lib) lib = import("@paper-design/shaders");
  return lib;
}

const ENUMS = {
  shape: { dithering: "DitheringShapes", dotGrid: "DotGridShapes", grainGradient: "GrainGradientShapes", warp: "WarpPatterns", liquidMetal: "LiquidMetalShapes" },
  type: { dithering: "DitheringTypes" },
  aspectRatio: { pulsingBorder: "PulsingBorderAspectRatios" },
};
const RENAME = { dithering: { size: "pxSize" }, dotGrid: { size: "dotSize" } };
const SIZING = { fit: "contain", scale: 1, rotation: 0, offsetX: 0, offsetY: 0, originX: 0.5, originY: 0.5, worldWidth: 0, worldHeight: 0 };
const PATTERN = new Set(["warp", "grainGradient", "neuroNoise", "simplexNoise", "voronoi", "perlinNoise", "dotOrbit", "swirl", "spiral", "dithering", "staticMeshGradient", "meshGradient", "godRays", "smokeRing", "metaballs", "colorPanels", "pulsingBorder", "liquidMetal", "staticRadialGradient"]);

// Brand tint: every colour keeps its lightness and saturation and takes the accent's hue.
function hexToHsl(hex) {
  const m = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(String(hex || "").trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l, a: m[2] || "" };
}
function hslToHex({ h, s, l, a }) {
  const k = (n) => (n + h / 30) % 12;
  const f = (n) => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return "#" + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("") + (a || "");
}
export function tintColour(hex, accent) {
  const c = hexToHsl(hex), t = hexToHsl(accent);
  if (!c || !t || c.s < 0.08) return hex;
  // Hues spread a little around the accent so a palette keeps some variety.
  return hslToHex({ ...c, h: (t.h + ((c.h - 30) % 60) * 0.4 + 360) % 360 });
}

export function paperUniforms(P, shader, params, tint) {
  const p = { ...SIZING, ...(PATTERN.has(shader) && !params.fit ? { fit: "cover" } : {}), ...params };
  const col = (v) => P.getShaderColorFromString(tint ? tintColour(v, tint) : v);
  const u = {};
  for (const [k, v] of Object.entries(p)) {
    if (k === "speed" || k === "frame" || k === "image") continue;
    if (k === "colors") {
      u.u_colors = v.map(col);
      u.u_colorsCount = v.length;
      continue;
    }
    if (k === "fit") {
      u.u_fit = P.ShaderFitOptions[v] ?? 1;
      continue;
    }
    const en = ENUMS[k] && ENUMS[k][shader];
    if (en) {
      u["u_" + k] = P[en][v];
      continue;
    }
    if (/^color/.test(k) && typeof v === "string") {
      u["u_" + k] = col(v);
      continue;
    }
    u["u_" + ((RENAME[shader] || {})[k] || k)] = v;
  }
  const frag = P[shader + "FragmentShader"];
  if (frag.includes("u_noiseTexture")) u.u_noiseTexture = P.getShaderNoiseTexture();
  if (frag.includes("u_image")) {
    u.u_image = P.emptyPixel;
    u.u_isImage = false;
  }
  return u;
}

/**
 * Mounts a Paper scene into host. opts: { def, amount (0..1), still, tint (accent hex or ""),
 * frame }. Resolves to { update(opts), destroy() } or null when WebGL 2 is not available.
 */
export async function mountPaper(host, opts) {
  const P = await loadPaper();
  let o = { ...opts };
  const speedOf = () => (o.still || (!o.snapshot && noGpu()) ? 0 : (o.def.params.speed ?? 1) * (0.45 + 0.75 * Math.max(0, Math.min(1, o.amount ?? 0.8))));
  const make = () => {
    const u = paperUniforms(P, o.def.shader, o.def.params, o.tint || "");
    // Wait for the noise picture, or the first frame draws without it.
    const tex = u.u_noiseTexture;
    return (tex && !tex.complete ? new Promise((r) => (tex.onload = tex.onerror = r)) : Promise.resolve()).then(() => u);
  };
  let mount = null;
  const start = async () => {
    const u = await make();
    try {
      mount = new P.ShaderMount(host, P[o.def.shader + "FragmentShader"], u, { premultipliedAlpha: false, preserveDrawingBuffer: !!o.snapshot }, speedOf(), o.frame ?? 8000, 1, 1920 * 1080 * 1.2);
    } catch (e) {
      console.warn("paper scene", e);
      mount = null;
    }
  };
  await start();
  if (!mount) return null;
  return {
    canvas: () => mount && mount.canvasElement,
    async update(next) {
      const prev = o;
      o = { ...o, ...next };
      if (!mount) return;
      if (next.def && next.def.id !== prev.def.id) {
        mount.dispose();
        host.querySelectorAll("canvas").forEach((c) => c.remove());
        await start();
        return;
      }
      if (next.tint !== undefined && next.tint !== prev.tint) mount.setUniforms(await make());
      mount.setSpeed(speedOf());
    },
    destroy() {
      if (mount) mount.dispose();
      mount = null;
    },
  };
}
