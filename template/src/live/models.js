// The cast of the living scenes, modelled in code from smooth surfaces (see mesh.js): no
// model files, no pictures. Each model is about two units long with its nose at +x. `kind`
// picks the animation in the vertex shader, `wave` its default settings (see shaders.js).
import { Builder, curve, hex, mixc, sstep, vnoise, lerp, hash } from "./mesh.js";

const cache = new Map();
/** Build a model once and share it. */
export function model(name) {
  if (!cache.has(name)) cache.set(name, MODELS[name]());
  return cache.get(name);
}

const shade = (c, k) => [Math.min(1, c[0] * k), Math.min(1, c[1] * k), Math.min(1, c[2] * k)];
const PI = Math.PI;

/**
 * A fin or simple wing: a tapered plate from a root point along dir. chordDir is where the
 * trailing edge lies (default: toward the tail). sweep bends the tip back.
 */
function fin(B, { root, dir, len, chord, taper = 0.7, pow = 0.8, sweep = 0.15, lead = 0.2, chordDir = [-1, 0, 0], up = [0, 1, 0], top, under, part = 0, nu = 12, nv = 6, bulge = 0.012, edge }) {
  const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  const d = [dir[0] / l, dir[1] / l, dir[2] / l];
  return B.plate(nu, nv, (u, v) => {
    const c = chord * Math.pow(1 - u * taper, pow) * (edge ? edge(u, v) : 1);
    const k = (v - lead) * c;
    const sw = sweep * len * u * u;
    return [root[0] + d[0] * len * u + chordDir[0] * (k + sw), root[1] + d[1] * len * u + chordDir[1] * (k + sw), root[2] + d[2] * len * u + chordDir[2] * (k + sw)];
  }, { top, under, rig: part ? (u) => [u, part, root] : undefined, bulge, up });
}

// ---------------------------------------------------------------- whales and dolphins
function cetacean(o) {
  const B = new Builder();
  const L = o.len ?? 1.82;
  const X = (u) => 1 - u * L;
  B.loft({ nu: o.nu ?? 72, nv: o.nv ?? 36, x: X, hw: o.hw, ht: o.ht, hb: o.hb, exp: o.exp ?? 0.92, cy: o.cy || ((u) => 0.02 * Math.sin(u * PI)), col: o.col });
  const tailX = 1 - L;
  const fk = o.fluke;
  B.mirror((b) =>
    b.plate(14, 10, (u, v) => {
      const xl = tailX + 0.03 - fk.sweep * Math.pow(u, 1.25);
      const xc = tailX - fk.chord + 0.02 - fk.notch * Math.sin((Math.min(u, 0.75) / 0.75) * PI * 0.5);
      const xt = lerp(xc, xl - 0.012, sstep(0.72, 1, u));
      return [lerp(xl, xt, v), (o.cy ? o.cy(1) : 0) + 0.01 + u * 0.012, u * fk.span];
    }, { top: fk.top, under: fk.under, bulge: 0.02 }),
  );
  const p = o.pec;
  B.mirror((b) => {
    b.plate(18, 8, (u, v) => {
      const ch = p.chord * Math.pow(1 - u, p.pow ?? 0.55) + 0.012;
      const knob = (p.knob ?? 0) * Math.sin(u * 34) * (1 - v);
      return [p.root[0] + p.dir[0] * p.len * u - p.sweep * u * u + (v - 0.25) * -ch + knob, p.root[1] + p.dir[1] * p.len * u, p.root[2] + p.dir[2] * p.len * u];
    }, { top: p.top, under: p.under, rig: (u) => [u, 1, p.root], bulge: 0.018, up: [0, 1, 0.3] });
  });
  const dr = o.dorsal;
  B.plate(8, 6, (u, v) => [dr.x - v * dr.chord * (1 - u * 0.7) - Math.pow(u, dr.pow ?? 1) * dr.sweep, dr.y + u * dr.h, 0], { top: dr.col, bulge: 0.014, up: [0, 0, 1] });
  B.mirror((b) => b.ball(o.eye, o.eyeR ?? 0.017, [0.02, 0.03, 0.04], { nu: 6, nv: 8 }));
  return { ...B.build({ head: 1, tail: -1, points: o.points ?? 9000 }), kind: 1, wave: o.wave, tempo: o.tempo };
}

function whale() {
  const top = hex("#1d2c3a"), flank = hex("#3a5268"), belly = hex("#f1f4f2");
  return cetacean({
    hw: curve([[0, 0], [0.012, 0.05], [0.05, 0.105], [0.14, 0.165], [0.3, 0.205], [0.48, 0.185], [0.68, 0.115], [0.86, 0.045], [1, 0.026]]),
    ht: curve([[0, 0], [0.012, 0.03], [0.06, 0.07], [0.16, 0.115], [0.34, 0.17], [0.52, 0.175], [0.7, 0.125], [0.86, 0.06], [1, 0.034]]),
    hb: curve([[0, 0], [0.012, 0.045], [0.05, 0.1], [0.14, 0.17], [0.3, 0.215], [0.46, 0.2], [0.64, 0.13], [0.84, 0.055], [1, 0.034]]),
    col: (u, v) => {
      const a = v * PI * 2, s = Math.sin(a);
      const t = sstep(-0.5, -0.02, s + 0.14 * (vnoise(u * 14, v * 9) - 0.5) + (u > 0.5 ? (u - 0.5) * 1.1 : 0));
      let c = mixc(belly, mixc(flank, top, sstep(-0.1, 0.7, s)), t);
      // Throat grooves run from the chin to the middle of the body.
      if (u < 0.5 && s < -0.05) {
        const g = 0.5 + 0.5 * Math.cos(Math.cos(a) * 30);
        c = shade(c, 1 - 0.34 * sstep(0.4, 0.9, g) * sstep(0.5, 0.36, u) * sstep(0.01, 0.06, u));
      }
      if (u < 0.3) c = shade(c, 1 - 0.5 * sstep(0.05, 0, Math.abs(s + 0.12 - u * 0.5)) * sstep(0.3, 0.2, u));
      return shade(c, 0.9 + 0.2 * vnoise(u * 40, v * 30));
    },
    fluke: { span: 0.46, sweep: 0.17, chord: 0.13, notch: 0.085, top: () => top, under: (u, v) => mixc(belly, top, sstep(0.3, 0.9, v + u * 0.4)) },
    pec: { root: [0.4, -0.12, 0.175], dir: [-0.3, -0.34, 0.86], len: 0.62, chord: 0.15, sweep: 0.1, knob: 0.009, top: (u) => mixc(top, flank, u * 0.5), under: () => belly },
    dorsal: { x: -0.3, y: 0.125, h: 0.065, chord: 0.17, sweep: 0.085, col: () => top },
    eye: [0.6, -0.055, 0.148],
    wave: [0.012, 0.16, 2.6, 0.32], tempo: 1.5,
  });
}

function orca() {
  const black = hex("#0d1218"), white = hex("#f4f6f5"), grey = hex("#7b8891");
  return cetacean({
    len: 1.8,
    hw: curve([[0, 0], [0.012, 0.04], [0.06, 0.1], [0.18, 0.17], [0.34, 0.2], [0.52, 0.17], [0.72, 0.1], [0.88, 0.04], [1, 0.024]]),
    ht: curve([[0, 0], [0.012, 0.03], [0.06, 0.09], [0.16, 0.15], [0.34, 0.2], [0.52, 0.185], [0.72, 0.12], [0.88, 0.055], [1, 0.03]]),
    hb: curve([[0, 0], [0.012, 0.035], [0.06, 0.09], [0.18, 0.16], [0.34, 0.2], [0.5, 0.18], [0.7, 0.11], [0.88, 0.05], [1, 0.03]]),
    exp: 1,
    col: (u, v, p) => {
      const a = v * PI * 2, s = Math.sin(a);
      let w = sstep(-0.5, -0.62, s - (u < 0.3 ? (0.3 - u) * 1.2 : 0) + (u > 0.62 ? (u - 0.62) * 0.2 : 0));
      // The white flank patch sweeps up behind the belly.
      w = Math.max(w, sstep(0.08, 0.02, Math.hypot((u - 0.66) * 1.1, (s + 0.42) * 0.55)) * (s < 0.1 ? 1 : 0));
      // Eye patch.
      w = Math.max(w, sstep(0.036, 0.024, Math.hypot((u - 0.115) * 0.5, s - 0.3)) * (Math.abs(Math.cos(a)) > 0.5 ? 1 : 0));
      let c = mixc(black, white, w);
      // The grey saddle behind the dorsal fin.
      c = mixc(c, grey, 0.75 * sstep(0.1, 0.03, Math.hypot((u - 0.56) * 0.9, (s - 0.86) * 0.9)) * (1 - w));
      void p;
      return c;
    },
    fluke: { span: 0.42, sweep: 0.15, chord: 0.14, notch: 0.07, top: () => black, under: (u, v) => mixc(white, black, sstep(0.45, 0.95, v + u * 0.5)) },
    pec: { root: [0.38, -0.13, 0.17], dir: [-0.35, -0.3, 0.8], len: 0.3, chord: 0.2, pow: 0.4, sweep: 0.06, top: () => black, under: () => black },
    dorsal: { x: 0.06, y: 0.185, h: 0.34, chord: 0.2, sweep: 0.06, pow: 1.6, col: () => black },
    eye: [0.66, 0.03, 0.118], eyeR: 0.012,
    wave: [0.012, 0.15, 2.8, 0.3], tempo: 2.2,
  });
}

function dolphin() {
  const top = hex("#3f5566"), flank = hex("#8aa0ad"), belly = hex("#f0f1ee");
  return cetacean({
    len: 1.8, nu: 56, nv: 28, points: 5000,
    hw: curve([[0, 0], [0.01, 0.022], [0.09, 0.034], [0.13, 0.085], [0.24, 0.14], [0.4, 0.155], [0.6, 0.11], [0.84, 0.035], [1, 0.02]]),
    ht: curve([[0, 0], [0.01, 0.018], [0.09, 0.026], [0.125, 0.1], [0.22, 0.15], [0.4, 0.17], [0.6, 0.125], [0.84, 0.05], [1, 0.026]]),
    hb: curve([[0, 0], [0.01, 0.02], [0.09, 0.03], [0.14, 0.07], [0.26, 0.13], [0.42, 0.15], [0.62, 0.1], [0.84, 0.045], [1, 0.026]]),
    exp: 1,
    col: (u, v) => {
      const s = Math.sin(v * PI * 2);
      const c = mixc(belly, mixc(flank, top, sstep(-0.05, 0.6, s + (u - 0.4) * 0.5)), sstep(-0.75, -0.2, s + (u > 0.6 ? (u - 0.6) * 1.2 : 0)));
      return shade(c, 0.95 + 0.1 * vnoise(u * 30, v * 20));
    },
    fluke: { span: 0.36, sweep: 0.14, chord: 0.12, notch: 0.06, top: () => top, under: () => flank },
    pec: { root: [0.42, -0.11, 0.13], dir: [-0.5, -0.4, 0.75], len: 0.3, chord: 0.13, sweep: 0.08, top: () => top, under: () => flank },
    dorsal: { x: 0.02, y: 0.165, h: 0.2, chord: 0.2, sweep: 0.17, pow: 1.5, col: () => top },
    eye: [0.71, 0.01, 0.092], eyeR: 0.012,
    wave: [0.014, 0.17, 3.0, 0.25], tempo: 3.4,
  });
}

// ---------------------------------------------------------------- fish and sharks
function fishlike(o) {
  const B = new Builder();
  const L = o.len ?? 1.7;
  const X = (u) => 1 - u * L;
  B.loft({ nu: o.nu ?? 56, nv: o.nv ?? 28, x: X, hw: o.hw, ht: o.ht, hb: o.hb || o.ht, exp: o.exp ?? 1, cy: o.cy, col: o.col });
  const tx = 1 - L + 0.04;
  for (const lobe of o.tail) fin(B, { root: [tx, lobe.y ?? 0, 0], dir: lobe.dir, len: lobe.len, chord: lobe.chord, taper: lobe.taper ?? 0.75, sweep: lobe.sweep ?? 0.3, lead: 0.1, up: [0, 0, 1], top: lobe.col, nu: 10, nv: 6, bulge: 0.01, edge: lobe.edge });
  for (const f of o.dorsals || []) fin(B, { root: f.root, dir: f.dir || [-0.5, 1, 0], len: f.len, chord: f.chord, taper: f.taper ?? 0.8, sweep: f.sweep ?? 0.4, up: [0, 0, 1], top: f.col, nu: 8, nv: 6, edge: f.edge });
  for (const f of o.sides || [])
    B.mirror((b) => fin(b, { root: f.root, dir: f.dir, len: f.len, chord: f.chord, taper: f.taper ?? 0.75, sweep: f.sweep ?? 0.25, up: [0, 1, 0.2], top: f.col, under: f.under, part: f.part ?? 1, nu: 10, nv: 6, edge: f.edge }));
  if (o.eye) B.mirror((b) => b.ball(o.eye, o.eyeR ?? 0.02, o.eyeCol || [0.02, 0.02, 0.03], { nu: 6, nv: 8 }));
  return { ...B.build({ head: 1, tail: -1, points: o.points ?? 7000 }), kind: 2, wave: o.wave, tempo: o.tempo };
}

function shark() {
  // A whale shark: broad flat head, pale spots in rows, white belly.
  const top = hex("#34495a"), belly = hex("#eef1ee"), spot = hex("#dfeaf0");
  const col = (u, v) => {
    const a = v * PI * 2, s = Math.sin(a);
    let c = mixc(belly, top, sstep(-0.55, -0.2, s));
    if (s > -0.3 && u > 0.05) {
      const gx = u * 46, gy = a * 5.2;
      const d = Math.hypot((gx % 1) - 0.5, (gy % 1) - 0.5);
      const on = hash(Math.floor(gx), Math.floor(gy)) > 0.25 ? 1 : 0;
      c = mixc(c, spot, 0.85 * sstep(0.26, 0.14, d) * on * sstep(-0.3, 0, s));
      c = mixc(c, spot, 0.3 * sstep(0.12, 0.02, Math.abs((gx % 3) - 1.5)) * sstep(0.0, 0.3, s));
    }
    return c;
  };
  const f = () => top;
  return fishlike({
    len: 1.72, nu: 72, nv: 36,
    hw: curve([[0, 0], [0.008, 0.14], [0.05, 0.19], [0.16, 0.21], [0.34, 0.19], [0.55, 0.13], [0.78, 0.06], [1, 0.025]]),
    ht: curve([[0, 0], [0.008, 0.035], [0.06, 0.08], [0.2, 0.14], [0.36, 0.165], [0.56, 0.13], [0.78, 0.07], [1, 0.04]]),
    hb: curve([[0, 0], [0.008, 0.04], [0.06, 0.085], [0.2, 0.13], [0.36, 0.14], [0.56, 0.1], [0.78, 0.055], [1, 0.035]]),
    exp: 0.85, col,
    tail: [
      { dir: [-0.62, 0.8, 0], len: 0.48, chord: 0.2, col: f, sweep: 0.35 },
      { dir: [-0.6, -0.8, 0], len: 0.26, chord: 0.16, col: f, sweep: 0.3 },
    ],
    dorsals: [
      { root: [-0.12, 0.14, 0], len: 0.24, chord: 0.24, col: f },
      { root: [-0.5, 0.07, 0], len: 0.1, chord: 0.11, col: f },
      { root: [-0.48, -0.06, 0], dir: [-0.5, -1, 0], len: 0.09, chord: 0.1, col: () => belly },
    ],
    sides: [{ root: [0.36, -0.08, 0.17], dir: [-0.5, -0.32, 0.8], len: 0.42, chord: 0.24, col: f, under: () => belly, sweep: 0.3 }],
    eye: [0.9, 0.0, 0.165], eyeR: 0.011,
    wave: [0.012, 0.2, 3.4, 0.14], tempo: 1.9,
  });
}

function koiOf(seed, a, b, base = "#f7f3ea") {
  return () => {
    const white = hex(base), ca = hex(a), cb = hex(b);
    const col = (u, v) => {
      const ang = v * PI * 2, s = Math.sin(ang);
      const n = vnoise(u * 5 + seed * 7, Math.cos(ang) * 1.6 + seed * 3);
      const n2 = vnoise(u * 7 + seed * 13 + 4, Math.cos(ang) * 2.2 + 9);
      let c = white;
      if (s > -0.5) {
        c = mixc(c, ca, sstep(0.5, 0.58, n) * sstep(-0.5, -0.1, s));
        c = mixc(c, cb, sstep(0.66, 0.72, n2) * sstep(-0.3, 0.2, s));
      }
      return shade(c, 0.94 + 0.12 * (0.5 + 0.5 * Math.cos(u * 90)) * (s > 0 ? 1 : 0.3));
    };
    const veil = (u, v) => [lerp(1, 0.96, u) , 1][0] * 1;
    void veil;
    const fan = (c0) => (u, v) => mixc(hex(c0), white, 0.35 + 0.5 * u + 0.1 * Math.sin(v * 40));
    return fishlike({
      len: 1.5, nu: 44, nv: 22, points: 5200,
      hw: curve([[0, 0], [0.02, 0.06], [0.1, 0.125], [0.3, 0.165], [0.5, 0.15], [0.75, 0.08], [1, 0.03]]),
      ht: curve([[0, 0], [0.02, 0.05], [0.1, 0.11], [0.3, 0.15], [0.5, 0.135], [0.75, 0.075], [1, 0.045]]),
      col,
      tail: [
        { dir: [-0.8, 0.6, 0], len: 0.5, chord: 0.3, col: fan(a), sweep: 0.2, taper: 0.5 },
        { dir: [-0.8, -0.6, 0], len: 0.5, chord: 0.3, col: fan(a), sweep: 0.2, taper: 0.5 },
      ],
      dorsals: [{ root: [0.05, 0.13, 0], dir: [-0.9, 0.5, 0], len: 0.2, chord: 0.5, col: fan(a), taper: 0.6, sweep: 0.3 }],
      sides: [
        { root: [0.45, -0.05, 0.12], dir: [-0.45, -0.1, 0.9], len: 0.34, chord: 0.24, col: fan(base), taper: 0.35, sweep: 0.25 },
        { root: [-0.05, -0.08, 0.1], dir: [-0.6, -0.2, 0.75], len: 0.2, chord: 0.16, col: fan(base), taper: 0.4, part: 3 },
      ],
      eye: [0.82, 0.03, 0.085], eyeR: 0.017,
      wave: [0.03, 0.34, 4.2, 0.5], tempo: 3.2,
    });
  };
}

function reefFish() {
  // A small simple fish for schools; its colour comes from the scene's tint.
  const body = hex("#e9eef2"), dark = hex("#56616b");
  return fishlike({
    len: 1.55, nu: 16, nv: 10, points: 500,
    hw: curve([[0, 0], [0.05, 0.07], [0.3, 0.11], [0.6, 0.08], [1, 0.02]]),
    ht: curve([[0, 0], [0.05, 0.14], [0.3, 0.27], [0.6, 0.2], [1, 0.05]]),
    col: (u, v) => mixc(mixc(body, dark, sstep(0.2, 0.9, Math.sin(v * PI * 2)) * 0.6), dark, 0.5 * sstep(0.06, 0.02, Math.abs(u - 0.3)) + 0.5 * sstep(0.05, 0.02, Math.abs(u - 0.62))),
    tail: [
      { dir: [-0.7, 0.7, 0], len: 0.36, chord: 0.2, col: () => body, taper: 0.6 },
      { dir: [-0.7, -0.7, 0], len: 0.36, chord: 0.2, col: () => body, taper: 0.6 },
    ],
    dorsals: [{ root: [0.2, 0.24, 0], dir: [-0.8, 0.6, 0], len: 0.14, chord: 0.5, col: () => dark, taper: 0.5 }, { root: [0.1, -0.24, 0], dir: [-0.8, -0.6, 0], len: 0.1, chord: 0.4, col: () => dark, taper: 0.5 }],
    wave: [0.03, 0.3, 4.5, 0.4], tempo: 6,
  });
}

// ---------------------------------------------------------------- manta ray
function manta() {
  const B = new Builder();
  const top = hex("#141c27"), mark = hex("#8fa3b3"), belly = hex("#f2f4f1");
  // The body and wings are one lens-shaped surface: x along the spine, z out to the tips.
  const span = curve([[0, 0.12], [0.1, 0.26], [0.3, 0.72], [0.46, 1.0], [0.58, 0.8], [0.76, 0.34], [0.92, 0.1], [1, 0.02]]);
  const thick = curve([[0, 0.03], [0.15, 0.085], [0.4, 0.11], [0.7, 0.07], [1, 0.012]]);
  const X = (u) => 0.62 - u * 1.12;
  B.surface(40, 48, (u, v) => {
    const a = v * PI * 2, c = Math.cos(a), s = Math.sin(a);
    const w = span(u);
    const z = w * c;
    // Tips sweep back; the body is thick in the middle and paper thin at the tips.
    const lens = Math.pow(Math.max(0, 1 - Math.abs(c)), 0.75);
    const core = Math.exp(-Math.pow(z / 0.2, 2));
    return [X(u) - Math.pow(Math.abs(z), 1.6) * 0.3 * (1 - u * 0.5), s * (thick(u) * (0.25 * lens + 0.9 * core * Math.abs(s)) + 0.006), z];
  }, {
    wrapV: true, flip: true,
    col: (u, v, p) => {
      const s = Math.sin(v * PI * 2);
      if (s < 0) {
        // Underside: white with gill slits and a dark trailing edge.
        let c = mixc(belly, top, 0.5 * sstep(0.7, 1, u));
        const gz = Math.abs(p[2]);
        if (u > 0.2 && u < 0.5 && gz > 0.06 && gz < 0.2) c = shade(c, 1 - 0.5 * sstep(0.6, 0.95, 0.5 + 0.5 * Math.cos(u * 130)));
        return c;
      }
      // Top: dark with pale shoulder patches.
      const m = sstep(0.16, 0.05, Math.hypot((u - 0.3) * 1.3, Math.abs(p[2]) - 0.3) * 0.9) * 0.75;
      return mixc(shade(top, 0.9 + 0.3 * vnoise(u * 20, p[2] * 9)), mark, m);
    },
  });
  // Head fins that funnel plankton, and the long tail.
  B.mirror((b) => fin(b, { root: [0.56, -0.01, 0.1], dir: [1, -0.25, 0.12], len: 0.2, chord: 0.09, chordDir: [0, 0, -1], up: [0, 1, 0], top: () => top, under: () => belly, taper: 0.6, sweep: 0, nu: 6, nv: 4, bulge: 0.016 }));
  B.loft({ nu: 20, nv: 6, x: (u) => -0.46 - u * 1.0, hw: (u) => 0.016 * (1 - u) + 0.003, ht: (u) => 0.016 * (1 - u) + 0.003, col: () => top });
  B.mirror((b) => b.ball([0.5, 0.02, 0.17], 0.014, [0.02, 0.02, 0.03], { nu: 5, nv: 6 }));
  return { ...B.build({ head: 0.76, tail: -1.46, points: 9000 }), kind: 4, wave: [0.42, 0.05, 2.3, 0], tempo: 1.9 };
}

// ---------------------------------------------------------------- sea turtle
function turtle() {
  const B = new Builder();
  const shell = hex("#5a4a2c"), amber = hex("#c79a4b"), skin = hex("#e8dfb6"), scale = hex("#3f4a36"), under = hex("#efe6bf");
  const X = (u) => 0.5 - u * 1.05;
  const hw = curve([[0, 0], [0.02, 0.16], [0.14, 0.34], [0.4, 0.44], [0.66, 0.38], [0.9, 0.18], [1, 0]]);
  const ht = curve([[0, 0], [0.03, 0.06], [0.2, 0.15], [0.45, 0.19], [0.75, 0.13], [1, 0]]);
  B.loft({
    nu: 40, nv: 32, x: X, hw, ht, hb: (u) => ht(u) * 0.42, exp: 0.9,
    col: (u, v) => {
      const a = v * PI * 2, s = Math.sin(a), c = Math.cos(a);
      if (s < -0.05) return under;
      // Scutes: a row down the middle and plates either side, with pale seams.
      const gx = u * 5.2, gz = c * 2.3 + (Math.floor(gx) % 2) * 0.5;
      const ex = Math.abs((gx % 1) - 0.5), ez = Math.abs((((gz % 1) + 1) % 1) - 0.5);
      const seam = sstep(0.4, 0.5, Math.max(ex, ez));
      const ring = 0.5 + 0.5 * Math.cos(Math.max(ex, ez) * 34);
      return mixc(mixc(shell, amber, 0.35 * ring + 0.25 * vnoise(u * 20, v * 20)), shade(amber, 1.25), seam * 0.8);
    },
  });
  const skinCol = (k = 9) => (u, v) => mixc(skin, scale, sstep(0.35, 0.6, vnoise(u * k * 2.2 + 3, v * k)) * 0.9);
  // Neck and head turn toward the pointer.
  const neck = [0.46, 0.02, 0];
  B.loft({ nu: 16, nv: 14, x: (u) => 0.86 - u * 0.46, cy: () => 0.03, hw: curve([[0, 0], [0.1, 0.07], [0.4, 0.1], [0.7, 0.08], [1, 0.09]]), ht: curve([[0, 0], [0.1, 0.06], [0.4, 0.085], [0.7, 0.07], [1, 0.07]]), col: skinCol(8), rig: () => [0, 5, neck] });
  B.mirror((b) => b.ball([0.77, 0.06, 0.068], 0.02, [0.02, 0.02, 0.02], { nu: 5, nv: 6, rig: () => [0, 5, neck] }));
  // Front flippers: long and curved back. Rear flippers: short paddles.
  B.mirror((b) => fin(b, { root: [0.3, -0.02, 0.26], dir: [0.1, -0.08, 1], len: 0.78, chord: 0.24, taper: 0.8, pow: 0.7, sweep: 0.5, part: 1, top: skinCol(7), under: () => under, nu: 14, nv: 6, bulge: 0.02 }));
  B.mirror((b) => fin(b, { root: [-0.4, -0.03, 0.2], dir: [-0.75, -0.05, 0.65], len: 0.34, chord: 0.2, taper: 0.5, sweep: 0.1, part: 3, top: skinCol(7), under: () => under, nu: 8, nv: 5, bulge: 0.018 }));
  B.loft({ nu: 6, nv: 6, x: (u) => -0.52 - u * 0.14, hw: (u) => 0.03 * (1 - u), ht: (u) => 0.02 * (1 - u), col: () => skin });
  return { ...B.build({ head: 0.86, tail: -0.66, points: 9000 }), kind: 6, wave: [0.6, 0.25, 0, 0], tempo: 1.7 };
}

// ---------------------------------------------------------------- jellyfish
function jelly() {
  const B = new Builder();
  const glow = hex("#ffd9f2"), bell = hex("#d78be8"), deep = hex("#6a54c9");
  // The bell is a dome around the x axis (it travels nose first), with a soft rim.
  const R = curve([[0, 0], [0.12, 0.2], [0.35, 0.36], [0.62, 0.44], [0.85, 0.42], [1, 0.36]]);
  const XX = (u) => 0.5 - 0.5 * Math.pow(u, 1.5);
  B.surface(22, 28, (u, v) => {
    const a = v * PI * 2;
    const r = R(u) * (1 + 0.035 * Math.cos(a * 8) * u);
    return [XX(u), r * Math.sin(a), r * Math.cos(a)];
  }, { wrapV: true, flip: true, col: (u, v) => mixc(mixc(glow, bell, sstep(0, 0.7, u)), deep, 0.35 * (0.5 + 0.5 * Math.cos(v * PI * 16)) * u) });
  // The underside of the bell, a little inside the rim.
  B.surface(8, 28, (u, v) => {
    const a = v * PI * 2, r = lerp(0.36, 0.02, u);
    return [lerp(0, 0.2, Math.sin(u * PI * 0.5)), r * Math.sin(a), r * Math.cos(a)];
  }, { wrapV: true, col: (u) => mixc(deep, glow, u * 0.8) });
  // Frilly arms in the middle and long thin tentacles around the rim.
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * PI * 2 + 0.3, r0 = 0.07;
    const root = [0.05, r0 * Math.sin(a), r0 * Math.cos(a)];
    B.loft({ nu: 22, nv: 6, x: (u) => 0.05 - u * (0.95 + 0.2 * hash(i, 3)), cy: () => root[1], cz: () => root[2], hw: (u) => 0.04 * (1 - u * 0.7) * (1 + 0.5 * Math.sin(u * 30 + i)), ht: (u) => 0.022 * (1 - u * 0.6), col: (u) => mixc(glow, bell, u * 0.7), rig: (u) => [u, 4, root] });
  }
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * PI * 2, r0 = 0.34;
    const root = [0, r0 * Math.sin(a), r0 * Math.cos(a)];
    const len = 1.1 + 0.6 * hash(i, 9);
    B.loft({ nu: 16, nv: 4, x: (u) => -u * len, cy: () => root[1], cz: () => root[2], hw: (u) => 0.008 * (1 - u * 0.5), ht: (u) => 0.008 * (1 - u * 0.5), col: (u) => mixc(bell, deep, u), rig: (u) => [u, 4, root] });
  }
  return { ...B.build({ head: 0.5, tail: -0.9, points: 9000 }), kind: 5, wave: [0.16, 0.07, 4.5, 0], tempo: 2.1 };
}

// ---------------------------------------------------------------- birds
/**
 * A bird from parts: torso, neck and head (which turn to look), beak, two wings of
 * feathers, a tail fan. Wings lie flat along z; the shader flaps and folds them.
 */
function bird(o) {
  const B = new Builder();
  const neckP = [o.neckX ?? 0.3, o.neckY ?? 0.03, 0];
  // Torso: breast forward, tapering to the tail.
  B.loft({ nu: 28, nv: 20, x: (u) => 0.42 - u * (o.torso ?? 0.9), hw: o.hw, ht: o.ht, hb: o.hb || o.ht, col: o.body });
  // Neck and head as one piece.
  const nl = o.neck ?? 0.2, hr = o.head ?? 0.1;
  B.loft({
    nu: 18, nv: 16, x: (u) => neckP[0] + nl + hr * 0.9 - u * (nl + hr * 1.9), cy: (u) => neckP[1] + (o.headY ?? 0.05) * (1 - u),
    hw: (u) => (u < 0.55 ? hr * Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.28) / 0.29, 2))) * (o.headW ?? 1) + (o.neckR ?? 0.05) * sstep(0.3, 0.6, u) : lerp(o.neckR ?? 0.05, o.hw(0.12), sstep(0.55, 1, u))),
    ht: (u) => (u < 0.55 ? hr * Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.28) / 0.29, 2))) + (o.neckR ?? 0.05) * sstep(0.3, 0.6, u) : lerp(o.neckR ?? 0.05, o.ht(0.12), sstep(0.55, 1, u))),
    col: o.headCol, rig: () => [0, 5, neckP],
  });
  const hx = neckP[0] + nl + hr * 0.35, hy = neckP[1] + (o.headY ?? 0.05) * 0.75;
  // Beak: upper part hooks down for parrots and raptors.
  const bk = o.beak;
  B.loft({ nu: 10, nv: 10, x: (u) => hx + hr * 0.45 + bk.len * (1 - u), cy: (u) => hy + (bk.y ?? 0) - bk.hook * Math.pow(1 - u, 2), hw: (u) => bk.w * Math.pow(u, 0.7), ht: (u) => bk.h * Math.pow(u, 0.6), hb: (u) => bk.h * 0.25 * u, col: bk.col, rig: () => [0, 5, neckP] });
  if (bk.lower) B.loft({ nu: 6, nv: 8, x: (u) => hx + hr * 0.45 + bk.len * 0.6 * (1 - u), cy: () => hy + (bk.y ?? 0) - bk.h * 0.5, hw: (u) => bk.w * 0.8 * Math.pow(u, 0.7), ht: (u) => bk.h * 0.2 * u, hb: (u) => bk.h * 0.5 * u, col: bk.lower, rig: () => [0, 5, neckP] });
  B.mirror((b) => {
    if (o.eyeRing) b.ball([hx + hr * 0.3, hy + hr * 0.2, hr * 0.78 * (o.headW ?? 1)], hr * 0.34, o.eyeRing, { nu: 6, nv: 8, sz: 0.4, rig: () => [0, 5, neckP] });
    b.ball([hx + hr * 0.32, hy + hr * 0.22, hr * 0.84 * (o.headW ?? 1)], hr * (o.eyeR ?? 0.17), o.eyeCol || [0.03, 0.03, 0.03], { nu: 6, nv: 8, rig: () => [0, 5, neckP] });
  });
  // Wings.
  const w = o.wing;
  const sh = [w.x ?? 0.22, w.y ?? 0.06, w.z ?? 0.07];
  B.mirror((b) =>
    b.plate(w.nu ?? 44, 12, (u, v) => {
      const lead = sh[0] + (w.fwd ?? 0.06) * Math.sin(u * PI * 0.6) - w.sweep * Math.pow(u, 1.8);
      // Each flight feather ends in a rounded tip; near the wing tip they spread like fingers.
      const fz = u * w.feathers;
      const f = Math.abs(Math.sin(fz * PI));
      const tipF = sstep(w.fingers ?? 2, 1, u);
      const feather = 1 - (0.1 + 0.35 * (1 - tipF)) * Math.pow(f, 0.6) * v;
      const ch = w.chord(u) * feather;
      return [lead - v * ch, sh[1] + 0.015 * Math.sin(u * PI) * (1 - v), sh[2] + u * w.span + (w.tipBack ?? 0) * v * u];
    }, { top: w.top, under: w.under || w.top, rig: (u) => [u, 2, sh], bulge: 0.01 }),
  );
  // Tail fan.
  const t = o.tail;
  const tp = [0.42 - (o.torso ?? 0.9) + 0.06, 0, 0];
  B.mirror((b) =>
    b.plate(8, 10, (u, v) => {
      const z = u * t.width * (0.25 + 0.75 * v);
      const len = t.len * (1 - (t.fork ?? 0) * (1 - u) - (t.round ?? 0.25) * u * u) * (1 - 0.06 * Math.abs(Math.sin(u * t.feathers * PI)) * v);
      return [tp[0] - v * len, tp[1] + 0.01 - v * (t.drop ?? 0), z];
    }, { top: t.top, under: t.under || t.top, rig: () => [0, 3, tp], bulge: 0.006 }),
  );
  // Legs, tucked back in flight (or trailing for long-legged birds).
  if (o.legs) {
    const lg = o.legs;
    B.mirror((b) => b.loft({ nu: 10, nv: 6, x: (u) => lg.x - u * lg.len, cy: (u) => lg.y - 0.02 * Math.sin(u * PI), cz: () => lg.z, hw: (u) => lg.r * (1 + (u > 0.9 ? 1.6 : 0)), ht: (u) => lg.r * (1 + (u > 0.9 ? 0.6 : 0)), col: lg.col }));
  }
  return { ...B.build({ points: o.points ?? 8000 }), kind: 3, wave: o.wave, tempo: o.tempo };
}

const feathered = (cols, n) => (u, v) => {
  // cols: [[upto v, colour], ...] bands from the leading edge back, with feather lines.
  let c = cols[cols.length - 1][1];
  for (const [lim, cc, tipTo] of cols) {
    if (v <= lim) {
      c = tipTo ? mixc(cc, tipTo, sstep(0.5, 1, u)) : cc;
      break;
    }
  }
  const line = 1 - 0.2 * Math.pow(Math.abs(Math.cos(u * n * PI)), 8) * sstep(0.2, 0.5, v);
  const row = 1 - 0.14 * sstep(0.06, 0, Math.abs(v - 0.34)) - 0.1 * sstep(0.05, 0, Math.abs(v - 0.56));
  return shade(c, line * row);
};

function macaw() {
  const red = hex("#d8232a"), yellow = hex("#ffc531"), blue = hex("#1f55c9"), dkblue = hex("#12327e"), face = hex("#f6efe6"), beakU = hex("#efe6d2"), beakL = hex("#231f1e");
  return bird({
    hw: curve([[0, 0.03], [0.12, 0.1], [0.4, 0.125], [0.75, 0.08], [1, 0.03]]),
    ht: curve([[0, 0.03], [0.12, 0.1], [0.4, 0.12], [0.75, 0.075], [1, 0.025]]),
    hb: curve([[0, 0.03], [0.12, 0.11], [0.4, 0.13], [0.75, 0.07], [1, 0.02]]),
    body: (u, v) => shade(mixc(red, mixc(red, blue, 0.55), sstep(0.7, 1, u)), 0.92 + 0.14 * vnoise(u * 30, v * 22)),
    neck: 0.1, head: 0.115, neckR: 0.085, headY: 0.06,
    headCol: (u, v) => {
      const a = v * PI * 2;
      // The bare white cheek around the eye.
      const cheek = sstep(0.5, 0.36, Math.hypot((u - 0.16) * 2.2, Math.sin(a) - 0.1) ) * (Math.abs(Math.cos(a)) > 0.35 ? 1 : 0);
      return mixc(shade(red, 0.95 + 0.1 * vnoise(u * 20, v * 20)), face, cheek * (u < 0.34 ? 1 : 0));
    },
    beak: { len: 0.13, w: 0.055, h: 0.075, hook: 0.1, y: 0.0, col: (u) => mixc(beakL, beakU, sstep(0.1, 0.45, u)), lower: () => beakL },
    eyeCol: [0.05, 0.04, 0.03], eyeR: 0.13,
    wing: {
      span: 0.98, sweep: 0.3, fwd: 0.07, feathers: 13, fingers: 0.72,
      chord: (u) => 0.36 * Math.pow(Math.max(0, 1 - Math.pow(u, 2.6)), 0.6) * (0.75 + 0.25 * sstep(0, 0.25, u)) + 0.02,
      top: feathered([[0.3, red], [0.52, yellow, mixc(yellow, blue, 0.5)], [1, blue, dkblue]], 13),
      under: feathered([[0.36, red], [1, hex("#e8662a"), hex("#b3301c")]], 13),
    },
    tail: { len: 0.95, width: 0.14, feathers: 3, round: 0.5, drop: 0.02, top: (u, v) => mixc(red, blue, sstep(0.15, 0.75, v + u * 0.3)), under: (u, v) => mixc(red, hex("#e8662a"), v) },
    legs: { x: -0.05, y: -0.11, z: 0.05, len: 0.16, r: 0.014, col: () => hex("#3a3532") },
    wave: [0.72, 0.38, 0.1, 0.12], tempo: 7.5,
  });
}

function eagle() {
  const brown = hex("#4a3424"), dark = hex("#2c1e15"), white = hex("#f5f2ea"), yellow = hex("#f2b21b");
  return bird({
    hw: curve([[0, 0.04], [0.12, 0.11], [0.4, 0.13], [0.75, 0.085], [1, 0.035]]),
    ht: curve([[0, 0.04], [0.12, 0.1], [0.4, 0.115], [0.75, 0.07], [1, 0.03]]),
    body: (u, v) => shade(mixc(brown, white, sstep(0.86, 0.96, u)), 0.9 + 0.2 * vnoise(u * 26, v * 20)),
    neck: 0.1, head: 0.095, neckR: 0.075, headY: 0.02,
    headCol: (u) => mixc(white, brown, sstep(0.8, 1, u)),
    beak: { len: 0.12, w: 0.04, h: 0.05, hook: 0.07, col: () => yellow, lower: () => shade(yellow, 0.85) },
    eyeCol: [0.1, 0.07, 0.02], eyeR: 0.15,
    wing: {
      span: 1.18, sweep: 0.12, fwd: 0.08, feathers: 16, fingers: 0.74, nu: 56,
      chord: (u) => 0.38 * Math.pow(Math.max(0, 1 - Math.pow(u, 5)), 0.5) * (0.8 + 0.2 * sstep(0, 0.2, u)) + 0.02,
      top: feathered([[0.34, brown], [1, dark]], 16),
      under: feathered([[0.36, shade(brown, 1.15)], [1, shade(dark, 1.3)]], 16),
    },
    tail: { len: 0.36, width: 0.3, feathers: 5, round: 0.2, top: () => white, under: () => white },
    legs: { x: -0.08, y: -0.1, z: 0.05, len: 0.2, r: 0.016, col: () => yellow },
    wave: [0.12, 0.1, 0.05, 0.14], tempo: 3.2,
  });
}

function owl() {
  const cream = hex("#f6efe0"), tan = hex("#cf9c58"), grey = hex("#8d8478");
  return bird({
    hw: curve([[0, 0.05], [0.12, 0.12], [0.4, 0.13], [0.75, 0.08], [1, 0.03]]),
    ht: curve([[0, 0.05], [0.12, 0.11], [0.4, 0.12], [0.75, 0.07], [1, 0.03]]),
    body: (u, v) => mixc(cream, shade(tan, 0.9 + 0.3 * vnoise(u * 30, v * 30)), sstep(-0.2, 0.4, Math.sin(v * PI * 2))),
    neck: 0.02, head: 0.15, neckR: 0.11, headY: 0.02, headW: 1.05, torso: 0.8,
    headCol: (u, v) => {
      const a = v * PI * 2;
      // The pale heart-shaped face.
      const facing = sstep(0.42, 0.3, u) * (Math.sin(a) < 0.75 ? 1 : 0);
      return mixc(shade(tan, 0.9 + 0.3 * vnoise(u * 30, v * 30)), cream, facing);
    },
    beak: { len: 0.04, w: 0.022, h: 0.03, hook: 0.04, y: -0.03, col: () => hex("#d9c9a6") },
    eyeCol: [0.03, 0.02, 0.02], eyeR: 0.2,
    wing: {
      span: 1.0, sweep: 0.05, fwd: 0.06, feathers: 12, fingers: 0.8,
      chord: (u) => 0.4 * Math.pow(Math.max(0, 1 - Math.pow(u, 3.4)), 0.5) + 0.02,
      top: feathered([[0.34, tan], [1, mixc(tan, grey, 0.5), grey]], 12),
      under: feathered([[1, cream]], 12),
    },
    tail: { len: 0.26, width: 0.2, feathers: 4, round: 0.3, top: () => tan, under: () => cream },
    wave: [0.55, 0.3, 0.06, 0.1], tempo: 4.4,
  });
}

function flamingo() {
  const pink = hex("#ff8fa3"), deep = hex("#f2546e"), black = hex("#181416"), pale = hex("#ffd9dd");
  return bird({
    hw: curve([[0, 0.03], [0.12, 0.08], [0.4, 0.105], [0.75, 0.07], [1, 0.02]]),
    ht: curve([[0, 0.03], [0.12, 0.08], [0.4, 0.105], [0.75, 0.06], [1, 0.02]]),
    body: (u, v) => shade(mixc(pink, pale, 0.3 * vnoise(u * 12, v * 9)), 1),
    neck: 0.62, head: 0.055, neckR: 0.026, headY: -0.02, neckX: 0.36,
    headCol: () => pink,
    beak: { len: 0.1, w: 0.024, h: 0.03, hook: 0.07, col: (u) => mixc(black, pale, sstep(0.3, 0.6, u)) },
    eyeCol: [0.9, 0.8, 0.3], eyeR: 0.16,
    wing: {
      span: 0.95, sweep: 0.2, fwd: 0.05, feathers: 12, fingers: 0.8,
      chord: (u) => 0.27 * Math.pow(Math.max(0, 1 - Math.pow(u, 3)), 0.6) + 0.02,
      top: feathered([[0.45, deep], [1, black]], 12),
      under: feathered([[0.45, deep], [1, black]], 12),
    },
    tail: { len: 0.14, width: 0.1, feathers: 3, top: () => pink },
    legs: { x: -0.3, y: -0.04, z: 0.03, len: 0.85, r: 0.011, col: () => deep },
    wave: [0.6, 0.3, 0.04, 0.1], tempo: 5.2,
  });
}

function hummingbird() {
  const green = hex("#1fa56b"), teal = hex("#127d8a"), ruby = hex("#d81e5b"), white = hex("#f2f4ee"), dark = hex("#23302c");
  return bird({
    hw: curve([[0, 0.04], [0.14, 0.1], [0.4, 0.11], [0.75, 0.06], [1, 0.02]]),
    ht: curve([[0, 0.04], [0.14, 0.1], [0.4, 0.105], [0.75, 0.06], [1, 0.02]]),
    body: (u, v) => {
      const s = Math.sin(v * PI * 2);
      return mixc(mixc(white, ruby, sstep(0.3, 0.1, u)), shade(mixc(green, teal, vnoise(u * 18, v * 16)), 1.1), sstep(-0.4, 0.1, s));
    },
    neck: 0.05, head: 0.095, neckR: 0.07, headY: 0.04, torso: 0.72,
    headCol: (u, v) => mixc(mixc(green, teal, 0.3), ruby, sstep(-0.1, -0.4, Math.sin(v * PI * 2)) * sstep(0.3, 0.6, u)),
    beak: { len: 0.34, w: 0.012, h: 0.012, hook: 0.03, col: () => dark },
    wing: {
      span: 0.62, sweep: 0.5, fwd: 0.02, feathers: 9, fingers: 2, x: 0.16,
      chord: (u) => 0.2 * Math.pow(Math.max(0, 1 - Math.pow(u, 2.2)), 0.7) + 0.012,
      top: feathered([[0.3, teal], [1, dark]], 9),
    },
    tail: { len: 0.24, width: 0.14, feathers: 4, round: 0.1, top: (u, v) => mixc(teal, dark, v) },
    wave: [1.05, 0.2, 0.08, 0.05], tempo: 46,
  });
}

// ---------------------------------------------------------------- butterfly
function butterflyOf(main, edge, spot) {
  return () => {
    const B = new Builder();
    const cm = hex(main), ce = hex(edge), cs = hex(spot);
    const wingCol = (hind) => (u, v) => {
      // Dark veins and a dark border with pale spots.
      const border = sstep(0.72, 0.86, u) + sstep(0.82, 0.96, v) * 0.9 + sstep(0.14, 0.03, v) * (hind ? 0.2 : 0.8);
      const vein = Math.pow(Math.abs(Math.cos((v * 5 + u * 0.4) * PI)), 14) * 0.9;
      let c = mixc(shade(cm, 0.95 + 0.15 * u), ce, Math.min(1, border + vein));
      const sp = sstep(0.3, 0.12, Math.hypot(((u * 14) % 1) - 0.5, ((v * 9) % 1) - 0.5));
      if (u > 0.8 || v > 0.9) c = mixc(c, cs, sp);
      return c;
    };
    const piv = [0, 0.01, 0.02];
    B.mirror((b) => {
      // Fore wing.
      b.plate(16, 12, (u, v) => {
        const a = lerp(1.25, -0.2, v);
        const r = u * (0.95 - 0.25 * Math.pow(v, 1.5)) * (0.6 + 0.4 * Math.sin((0.15 + v * 0.85) * PI));
        return [0.1 + r * Math.sin(a) * 0.8, 0.01, 0.02 + r * Math.cos(a)];
      }, { top: wingCol(false), rig: (u) => [u, 2, piv], bulge: 0.003 });
      // Hind wing.
      b.plate(14, 12, (u, v) => {
        const a = lerp(-0.1, -1.5, v);
        const r = u * 0.68 * (0.72 + 0.28 * Math.sin((0.1 + v * 0.8) * PI));
        return [-0.02 + r * Math.sin(a) * 0.95, 0.008, 0.02 + r * Math.cos(a)];
      }, { top: wingCol(true), rig: (u) => [u, 2, piv], bulge: 0.003 });
    });
    B.loft({ nu: 14, nv: 8, x: (u) => 0.3 - u * 0.7, hw: (u) => 0.035 * Math.sin(Math.min(1, u * 1.1 + 0.08) * PI) + 0.006, ht: (u) => 0.035 * Math.sin(Math.min(1, u * 1.1 + 0.08) * PI) + 0.006, col: (u) => mixc(ce, cs, 0.25 * (0.5 + 0.5 * Math.cos(u * 60))) });
    B.mirror((b) => b.loft({ nu: 6, nv: 4, x: (u) => 0.28 + u * 0.22, cy: (u) => 0.02 + u * 0.1, cz: (u) => 0.01 + u * 0.08, hw: () => 0.004, ht: () => 0.004, col: () => ce }));
    return { ...B.build({ points: 2600 }), kind: 3, wave: [1.05, 0.0, 0, 0.25], tempo: 11 };
  };
}

// ---------------------------------------------------------------- things on the wind
function plane() {
  const B = new Builder();
  const paper = hex("#fbfaf6"), fold = hex("#d9dde4");
  // A folded dart: two wings meeting at a keel.
  B.mirror((b) => {
    b.plate(6, 6, (u, v) => [lerp(0.9, -0.7, v), 0.02 + 0.03 * u, u * 0.55 * v], { top: (u) => mixc(paper, fold, u * 0.35), under: () => fold, bulge: 0.001 });
    b.plate(4, 6, (u, v) => [lerp(0.9, -0.7, v), 0.02 - u * 0.2 * v, 0.004], { top: () => fold, bulge: 0.001, up: [0, 0, 1] });
  });
  return { ...B.build({ points: 2600 }), kind: 0, wave: [0, 0, 0, 0], tempo: 1 };
}

function balloonOf(palette) {
  return () => {
    const B = new Builder();
    const cols = palette.map(hex);
    const R = curve([[0, 0], [0.08, 0.3], [0.3, 0.62], [0.5, 0.68], [0.72, 0.52], [0.9, 0.24], [1, 0.14]]);
    B.surface(28, 32, (u, v) => {
      const a = v * PI * 2, r = R(u) * (1 + 0.03 * Math.abs(Math.cos(a * 8)));
      return [r * Math.cos(a), 1.0 - u * 1.25, r * Math.sin(a)];
    }, { wrapV: true, col: (u, v) => {
      const g = Math.floor(v * 16 + 0.5) % cols.length;
      const band = u > 0.44 && u < 0.56 ? cols[(g + 1) % cols.length] : cols[g];
      return shade(band, 0.92 + 0.12 * Math.abs(Math.cos(v * PI * 16)));
    } });
    const piv = [0, -0.25, 0];
    // Basket and ropes hang below and sway.
    B.surface(4, 10, (u, v) => {
      const a = v * PI * 2 + PI / 4, r = 0.13 * (u < 0.1 || u > 0.9 ? 0.6 : 1);
      return [r * Math.cos(a) * 1.2, -0.56 - u * 0.17, r * Math.sin(a) * 1.2];
    }, { wrapV: true, col: (u) => shade(hex("#8a5a2b"), 0.8 + 0.4 * (Math.floor(u * 6) % 2)), rig: () => [1, 1, piv] });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2 + PI / 4;
      B.surface(2, 4, (u, v) => {
        const b2 = v * PI * 2;
        return [lerp(0.15, 0.13, u) * Math.cos(a) + 0.005 * Math.cos(b2), lerp(-0.25, -0.58, u), lerp(0.15, 0.13, u) * Math.sin(a) + 0.005 * Math.sin(b2)];
      }, { wrapV: true, col: () => hex("#3a2a1c"), rig: (u) => [u, 1, piv] });
    }
    return { ...B.build({ points: 5200 }), kind: 7, wave: [0.03, 0, 0, 0], tempo: 1 };
  };
}

function lantern() {
  const B = new Builder();
  const warm = hex("#ffb347"), hot = hex("#fff1c4"), frame = hex("#b3492a");
  const R = curve([[0, 0.3], [0.2, 0.42], [0.6, 0.46], [0.9, 0.36], [1, 0.3]]);
  B.surface(12, 20, (u, v) => {
    const a = v * PI * 2;
    return [R(u) * Math.cos(a), 0.55 - u * 1.1, R(u) * Math.sin(a)];
  }, { wrapV: true, col: (u, v) => mixc(mixc(hot, warm, Math.abs(u - 0.62) * 1.7), frame, 0.5 * Math.pow(Math.abs(Math.cos(v * PI * 6)), 20) + (u < 0.04 || u > 0.96 ? 0.8 : 0)) });
  B.surface(2, 20, (u, v) => { const a = v * PI * 2, r = 0.3 * (1 - u); return [r * Math.cos(a), 0.55, r * Math.sin(a)]; }, { wrapV: true, col: () => warm });
  return { ...B.build({ points: 2200 }), kind: 7, wave: [0, 0, 0, 0], tempo: 1 };
}

function branch() {
  // The perch: a mossy branch reaching in from the right with a few leaves.
  const B = new Builder();
  const bark = hex("#4a3626"), moss = hex("#5d7a35"), leafA = hex("#2f8f4e"), leafB = hex("#8fd06a");
  B.loft({
    nu: 30, nv: 12, x: (u) => -1 + u * 4.2, cy: (u) => 0.06 * Math.sin(u * 4) + u * u * 0.12, cz: (u) => -u * 0.5,
    hw: (u) => 0.035 + 0.05 * u, ht: (u) => 0.035 + 0.05 * u,
    col: (u, v) => mixc(shade(bark, 0.8 + 0.5 * vnoise(u * 60, v * 8)), moss, sstep(0.2, 0.8, Math.sin(v * PI * 2)) * vnoise(u * 9, 3) * 0.9),
  });
  const leaf = (root, dir, len, up) => fin(B, { root, dir, len, chord: len * 0.42, taper: 1, pow: 0.9, lead: 0.5, sweep: 0, chordDir: up, up: [0, 1, 0.2], top: (u, v) => shade(mixc(leafA, leafB, u * 0.8), 1 - 0.3 * sstep(0.08, 0, Math.abs(v - 0.5))), nu: 8, nv: 6, bulge: 0.004, edge: (u) => Math.sin(Math.min(1, u * 1.6 + 0.1) * PI * 0.5) * 1.4 });
  leaf([-0.6, 0.04, 0], [-0.7, 0.5, 0.3], 0.34, [0.5, 0.6, -0.6]);
  leaf([-0.85, 0.0, 0.02], [-0.9, -0.2, 0.4], 0.3, [0.2, 0.6, -0.7]);
  leaf([0.5, 0.09, -0.02], [0.2, 0.8, 0.5], 0.3, [-0.8, 0.2, 0.3]);
  leaf([-0.2, 0.02, 0.03], [-0.3, -0.6, 0.6], 0.26, [-0.8, -0.2, -0.3]);
  return { ...B.build({ points: 3000 }), kind: 0, wave: [0, 0, 0, 0], tempo: 1 };
}

function lily() {
  // A lily pad seen from above, with a notch, and a flower bud.
  const B = new Builder();
  const g1 = hex("#2f7d4f"), g2 = hex("#7fc46a");
  B.plate(10, 40, (u, v) => {
    const a = 0.25 + v * (PI * 2 - 0.5);
    return [u * Math.cos(a), u * Math.sin(a), 0.01 * Math.sin(a * 5) * u];
  }, { top: (u, v) => shade(mixc(g2, g1, u * 0.8), 1 - 0.25 * Math.pow(Math.abs(Math.cos(v * PI * 9)), 16)), up: [0, 0, 1], bulge: 0.004 });
  return { ...B.build({ points: 1500 }), kind: 0, wave: [0, 0, 0, 0], tempo: 1 };
}

const MODELS = {
  whale, orca, dolphin, shark, manta, turtle, jelly, reefFish,
  koi1: koiOf(1, "#f26a1b", "#1b1b1f"), koi2: koiOf(2.4, "#e23a1e", "#f6b01a"), koi3: koiOf(4.1, "#f6b01a", "#e8662a", "#fffaf0"),
  macaw, eagle, owl, flamingo, hummingbird,
  monarch: butterflyOf("#f28a1e", "#17120f", "#fff7e6"), morpho: butterflyOf("#2f7df0", "#0e1630", "#cfe6ff"),
  plane, balloonA: balloonOf(["#e8503a", "#fff3d6", "#f2a33a", "#fff3d6"]), balloonB: balloonOf(["#2f7dd1", "#fdf6e3", "#27b3a2", "#fdf6e3"]), balloonC: balloonOf(["#7a4fd0", "#ffe9a8", "#f25f8b", "#ffe9a8"]),
  lantern, branch, lily,
};
export const MODEL_NAMES = Object.keys(MODELS);
