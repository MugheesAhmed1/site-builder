// Draws the scene concepts from concepts.js on a canvas. One engine, four looks:
//  - real life: a photo backdrop, cut-out actors and layers of cut-outs,
//  - particles: each actor rebuilt from its own picture as dots that part around the pointer,
//  - nature: painted skies and hills with the actors as silhouettes,
//  - cartoon: bright painted backdrops with cartoon actors.
// Actors follow a choreography (fly in and land, cross, walk, leap, swing, rise, soar,
// hover). Walk scenes slide layers past at different depths, faster while the page scrolls.
// Original code: plain Canvas 2D, no libraries.
import { CONCEPTS } from "./concepts.js";

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const ready = (im) => im && (im.width || im.naturalWidth) && (im.complete === undefined || im.complete);
const iw = (im) => im.naturalWidth || im.width;
const ih = (im) => im.naturalHeight || im.height;

// Painted backdrops: sky colours, the silhouette colour and whether the scene is dark.
const PAINTS = {
  dusk: { sky: ["#272a5c", "#8a4f7d", "#f08a5d", "#f9c784"], sun: [0.7, 0.6, "#ffe3a8"], ridges: ["#8d4f6e", "#5a3358", "#2c1c3c"], sil: "#1b1029", stars: true },
  dawn: { sky: ["#f7c6d9", "#ffc8a8", "#ffe2b8"], sun: [0.32, 0.58, "#fff3d6"], water: 0.66, ridges: ["#d79db1"], sil: "#5b2a45" },
  nightsea: { sky: ["#070d26", "#13244d", "#1d3566"], moon: [0.78, 0.2], sea: 0.46, sil: "#020713", stars: true, dark: true },
  savanna: { sky: ["#ffd27a", "#ff9a4d", "#f0603c"], sun: [0.52, 0.7, "#fff1c2", 0.2], ground: 0.86, trees: true, sil: "#2a130e" },
  ridges: { sky: ["#c9def3", "#e9eef4", "#f8efe4"], ridges: ["#a9c1da", "#87a6c6", "#6386aa", "#3e5f84", "#22395a"], sil: "#1a2b44" },
  jungle: { sky: ["#b9e3a8", "#5fae6e", "#1f5f3d", "#0c2c1d"], rays: true, sil: "#06180f", dark: true },
  toonsky: { sky: ["#6fcbff", "#b5e9ff", "#e8f9ff"], toonSun: true, clouds: true, hills: ["#8ee26b", "#5cc23f"] },
  toonsea: { sky: ["#43c6f2", "#1b8fd6", "#0f5fae"], rays: true, sand: true, weeds: true, bubbles: true },
  toonspace: { sky: ["#140f3d", "#2b1863", "#46207a"], stars: true, planet: true, dark: true },
  toonmeadow: { sky: ["#7fd2ff", "#c9f1ff"], toonSun: true, clouds: true, hills: ["#9be27a", "#6fcd4c"], flowers: true },
  toonjungle: { sky: ["#c8f5a4", "#7fd27f", "#3fae66"], leaves: true, hills: ["#3b9b55"] },
};

export function conceptImpl(env, type, H) {
  const { loadImg, spriteLayer } = H;
  const c = CONCEPTS[type];
  const bg = c.bg || {};
  const paint = bg.paint ? PAINTS[bg.paint] : null;
  const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const shared = { wind: 0, food: [] };
  const imgs = new Map();
  const img = (src) => {
    if (!imgs.has(src)) imgs.set(src, loadImg(src, env));
    return imgs.get(src);
  };
  const plate = bg.plate ? img(bg.plate) : null;
  const silColor = paint ? paint.sil : "#0b0f1a";

  // Cached versions of pictures: silhouettes and blurred foreground pieces.
  const cache = new Map();
  const variant = (im, key, make) => {
    if (!ready(im)) return null;
    const k = im.src + "|" + key;
    if (!cache.has(k)) {
      try {
        const cv = document.createElement("canvas");
        const sc = Math.min(1, 700 / Math.max(iw(im), ih(im)));
        cv.width = Math.max(1, Math.round(iw(im) * sc));
        cv.height = Math.max(1, Math.round(ih(im) * sc));
        make(cv.getContext("2d"), cv, im);
        cache.set(k, cv);
      } catch {
        cache.set(k, im);
      }
    }
    return cache.get(k);
  };
  const silhouette = (im, color) =>
    variant(im, "sil" + color, (g, cv, src) => {
      g.drawImage(src, 0, 0, cv.width, cv.height);
      g.globalCompositeOperation = "source-in";
      g.fillStyle = color;
      g.fillRect(0, 0, cv.width, cv.height);
    });
  const blurred = (im, px) =>
    variant(im, "blur" + px, (g, cv, src) => {
      g.filter = `blur(${px}px)`;
      g.drawImage(src, 0, 0, cv.width, cv.height);
    });

  // Dots: each actor picture sampled into a grid of coloured points (once per picture).
  const dotSets = new Map();
  const dotsFor = (im) => {
    if (!ready(im)) return null;
    if (dotSets.has(im.src)) return dotSets.get(im.src);
    let set = null;
    try {
      const cols = 104;
      const rows = Math.max(8, Math.round((cols * ih(im)) / iw(im)));
      const cv = document.createElement("canvas");
      cv.width = cols;
      cv.height = rows;
      const g = cv.getContext("2d", { willReadFrequently: true });
      g.drawImage(im, 0, 0, cols, rows);
      const data = g.getImageData(0, 0, cols, rows).data;
      const u = [];
      const v = [];
      const buckets = new Map();
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const o = (y * cols + x) * 4;
          if (data[o + 3] < 150) continue;
          // Brighter, slightly simplified colours read better as light.
          const q = (n) => Math.min(255, (n >> 5) * 32 + 40);
          const key = `rgb(${q(data[o])},${q(data[o + 1])},${q(data[o + 2])})`;
          if (!buckets.has(key)) buckets.set(key, []);
          buckets.get(key).push(u.length);
          u.push((x + 0.5) / cols - 0.5);
          v.push((y + 0.5) / rows - 0.5);
        }
      set = { u: Float32Array.from(u), v: Float32Array.from(v), cols, aspect: rows / cols, groups: [...buckets.entries()].map(([color, idx]) => ({ color, idx })) };
    } catch {
      set = null;
    }
    dotSets.set(im.src, set);
    return set;
  };

  // ---------------------------------------------------------------- layers
  const passLayer = (cfg) => {
    const pics = cfg.sprites.map(img);
    const items = [];
    const fill = (startX) => {
      let x = startX;
      while (x < env.w * 1.4) {
        items.push(make(x));
        x += env.w * rnd(cfg.gap[0], cfg.gap[1]);
      }
    };
    const make = (x) => ({ k: Math.floor(Math.random() * pics.length), x, hh: rnd(cfg.size[0], cfg.size[1]), flip: Math.random() < 0.5 ? -1 : 1, ph: rnd(0, TAU) });
    return {
      front: !!cfg.front,
      walks: true,
      resize() {
        items.length = 0;
        fill(rnd(-0.1, 0.2) * env.w);
      },
      step(dt, walk) {
        for (const it of items) it.x -= walk * cfg.depth * dt;
        while (items.length && items[0].x < -env.w * 0.6) items.shift();
        const last = items[items.length - 1];
        if (!last || last.x < env.w * 1.05) items.push(make((last ? last.x : env.w) + env.w * rnd(cfg.gap[0], cfg.gap[1])));
      },
      draw(g, px, py) {
        for (const it of items) {
          let im = pics[it.k];
          if (!ready(im)) continue;
          if (cfg.silhouette) im = silhouette(im, cfg.depth > 1 ? silColor : mix(silColor, paint ? paint.sky[1] : "#335", 0.45)) || im;
          else if (cfg.blur) im = blurred(im, cfg.blur) || im;
          const h = it.hh * env.h * (cfg.depth > 1 ? 1.1 : 1);
          const w = (h * iw(im)) / ih(im);
          const x = it.x - px * cfg.depth * 28;
          const sway = Math.sin(env.t * 0.0012 + it.ph) * 0.025;
          g.save();
          g.globalAlpha = cfg.alpha || 1;
          if (cfg.anchor === "top") {
            g.translate(x, -env.h * 0.04 - py * cfg.depth * 10);
            g.rotate(sway);
            g.scale(it.flip, 1);
            g.drawImage(im, -w / 2, 0, w, h);
          } else {
            g.translate(x, env.h + h * (cfg.depth > 1 ? 0.12 : 0.02) - py * cfg.depth * 10);
            g.rotate(sway * 0.6);
            g.scale(it.flip, 1);
            g.drawImage(im, -w / 2, -h, w, h);
          }
          g.restore();
        }
      },
      down() {},
    };
  };
  const layers = (c.layers || []).map((l) => {
    if (l.mode === "pass") return passLayer(l);
    const s = spriteLayer(env, l, shared);
    s.front = false;
    return s;
  });

  // ---------------------------------------------------------------- actors
  const actors = [];
  for (const a of c.actors || []) for (let i = 0; i < (a.count || 1); i++) actors.push({ cfg: a, i, im: img(a.src), x: 0, y: 0, r: 0, s: 1, sx: 1, sy: 1, flip: a.dir || 1, alpha: 1, ph: rnd(0, TAU), state: "", t0: 0, disp: null });
  const fx = [];
  const base = () => Math.max(env.w, env.h * 1.15);
  const widthOf = (a) => {
    const im = a.im;
    let W = a.cfg.size * base();
    if (ready(im)) {
      const hh = (W * ih(im)) / iw(im);
      const max = env.h * (a.cfg.how === "walk" ? 0.75 : 0.62);
      if (hh > max) W *= max / hh;
    }
    return W;
  };
  const secs = () => env.t / 1000;

  const startCross = (a, first) => {
    const W = widthOf(a);
    if (!(a.cfg.how === "walk" || a.cfg.how === "cross" || a.cfg.how === "leap")) return;
    const dir = a.cfg.dir || 1;
    a.flip = dir;
    const lag = a.i * W * (a.cfg.how === "leap" ? 2.4 : 1.25);
    a.x = first ? (dir > 0 ? env.w * (a.cfg.how === "leap" ? 0.05 : 0.3) - lag : env.w * 0.7 + lag) : dir > 0 ? -W * 0.6 - lag : env.w + W * 0.6 + lag;
    a.yj = a.cfg.how === "walk" || a.cfg.how === "leap" ? 0 : rnd(-0.06, 0.06) + (a.i % 2 ? 0.05 : -0.03) * Math.min(1, a.i);
    a.state = "go";
    a.boost = 0;
  };
  const startFlyIn = (a) => {
    a.state = "in";
    a.t0 = secs();
    a.from = Math.random() < 0.6 ? -1 : 1;
  };
  const startRise = (a, first) => {
    a.x = env.w * (a.cfg.launch ? rnd(0.35, 0.75) : rnd(0.06, 0.94));
    a.y = first && !a.cfg.launch ? rnd(env.h * 0.2, env.h * 1.05) : env.h + widthOf(a) * 1.4;
    a.v = a.cfg.launch ? 0.4 : rnd(0.35, 0.7);
    a.state = "go";
  };
  const reset = () => {
    for (const a of actors) {
      const how = a.cfg.how;
      a.W = widthOf(a);
      if (how === "cross" || how === "walk" || how === "leap") startCross(a, true);
      else if (how === "flyin") {
        if (reduce) {
          a.state = "perch";
          a.t0 = -1e9;
        } else {
          startFlyIn(a);
          a.t0 = secs() - 0.6;
        }
      } else if (how === "rise") startRise(a, true);
      else if (how === "soar") a.th = rnd(0, TAU);
      else if (how === "hover") {
        a.x = env.w * 0.7;
        a.y = env.h * 0.45;
      } else if (how === "swing") {
        a.amp = 0.55;
      }
    }
  };

  let walkV = 0;
  let scrollY = typeof window !== "undefined" ? window.scrollY : 0;
  let scrollBoost = 0;
  let walkDist = 0;
  let px = 0;
  let py = 0;
  let ptrLocal = null;

  // Pushes an actor's dots away from the pointer, then springs them home.
  const stepDots = (a, dt, ptr, W, Hh) => {
    const set = dotsFor(a.im);
    if (!set) return;
    const n = set.u.length;
    if (!a.disp || a.disp.n !== n) a.disp = { n, dx: new Float32Array(n), dy: new Float32Array(n), vx: new Float32Array(n), vy: new Float32Array(n) };
    const d = a.disp;
    let lx = 1e9;
    let ly = 1e9;
    if (ptr.in) {
      const cx = ptr.x - a.x;
      const cy = ptr.y - a.y;
      const cr = Math.cos(-a.r);
      const sr = Math.sin(-a.r);
      lx = (cx * cr - cy * sr) / (a.flip * a.sx * a.s);
      ly = (cx * sr + cy * cr) / (a.sy * a.s);
    }
    const R = Math.max(40, W * 0.16);
    for (let i = 0; i < n; i++) {
      const x = set.u[i] * W + d.dx[i];
      const y = set.v[i] * Hh + d.dy[i];
      const ex = x - lx;
      const ey = y - ly;
      const dd = ex * ex + ey * ey;
      if (dd < R * R) {
        const dist = Math.sqrt(dd) || 1;
        const f = ((R - dist) / R) * 2.2;
        d.vx[i] += (ex / dist) * f * dt;
        d.vy[i] += (ey / dist) * f * dt;
      }
      d.vx[i] = (d.vx[i] - d.dx[i] * 0.045 * dt) * 0.88;
      d.vy[i] = (d.vy[i] - d.dy[i] * 0.045 * dt) * 0.88;
      d.dx[i] += d.vx[i] * dt;
      d.dy[i] += d.vy[i] * dt;
    }
  };
  const burstDots = (a, x, y) => {
    const set = dotsFor(a.im);
    if (!set || !a.disp) return;
    const W = a.W;
    const Hh = W * set.aspect;
    const cx = (x - a.x) / (a.flip * a.s);
    const cy = (y - a.y) / a.s;
    for (let i = 0; i < set.u.length; i++) {
      const ex = set.u[i] * W - cx;
      const ey = set.v[i] * Hh - cy;
      const dist = Math.hypot(ex, ey) || 1;
      const f = rnd(4, 14) * clamp(300 / dist, 0.3, 1.6);
      a.disp.vx[i] += (ex / dist) * f;
      a.disp.vy[i] += (ey / dist) * f;
    }
  };

  const stepActor = (a, dt, ptr) => {
    const how = a.cfg.how;
    const W = (a.W = widthOf(a));
    const sp = a.cfg.speed || 1;
    const t = env.t;
    a.r = 0;
    a.sx = 1;
    a.sy = 1;
    a.s = 1;
    a.alpha = a.cfg.far ? 0.85 : 1;
    if (how === "cross" || how === "walk") {
      if (a.state === "wait") {
        if (secs() > a.t0) startCross(a, false);
        else return;
      }
      a.boost *= 0.97;
      const v = sp * base() * 0.0019 * (1 + a.boost);
      a.x += a.flip * v * dt;
      if (how === "walk") {
        a.gp = (a.gp || 0) + dt * (a.cfg.gallop ? 0.22 : 0.11) * sp ** 0.5;
        const bob = Math.abs(Math.sin(a.gp));
        a.y = env.h * a.cfg.y - bob * W * (a.cfg.gallop ? 0.05 : 0.015);
        a.r = Math.sin(a.gp * 2) * (a.cfg.gallop ? 0.04 : 0.012);
      } else {
        a.y = env.h * (a.cfg.y + a.yj) + Math.sin(t * 0.0011 + a.ph) * env.h * 0.025;
        if (a.cfg.swim) {
          a.r = Math.sin(t * 0.0013 + a.ph) * 0.045;
          a.sx = 1 + Math.sin(t * 0.004 + a.ph) * 0.015;
          // Curious: tilts toward the pointer when it comes close.
          if (ptr.in && Math.abs(ptr.x - a.x) < W * 0.7) a.r += clamp((ptr.y - a.y) / env.h, -0.5, 0.5) * 0.25 * a.flip;
          if (Math.random() < 0.02 * dt) fx.push({ k: "bubble", x: a.x + a.flip * W * 0.42, y: a.y - W * 0.05, vx: 0, vy: -rnd(0.5, 1.2), r: rnd(2, 6), life: 1 });
        }
        if (a.cfg.flap) {
          const f = Math.sin(t * 0.016 * (0.8 + sp * 0.2) + a.ph);
          a.sy = 0.8 + 0.2 * Math.abs(f);
          a.y += f * W * 0.03;
        }
        if (a.cfg.bob) {
          a.r = Math.sin(t * 0.0016 + a.ph) * 0.05;
          a.y += Math.sin(t * 0.0021 + a.ph) * 4;
        }
      }
      const out = a.flip > 0 ? a.x > env.w + W * 0.7 : a.x < -W * 0.7;
      if (out) {
        a.state = "wait";
        a.t0 = secs() + (a.cfg.delay || 2) * rnd(0.6, 1.4);
      }
    } else if (how === "leap") {
      a.boost = (a.boost || 0) * 0.97;
      a.x += a.flip * sp * base() * 0.0016 * dt * (1 + a.boost);
      const period = W * 2.6;
      const u = (((a.x + a.i * W * 0.9) % period) + period) % period / period;
      const water = env.h * a.cfg.y;
      if (u < 0.62) {
        const k = u / 0.62;
        const lift = Math.sin(Math.PI * k);
        a.y = water - lift * env.h * 0.32 + W * 0.12;
        a.r = -Math.cos(Math.PI * k) * 0.9;
        a.alpha = clamp(lift * 4, 0, 1);
        if ((k < 0.05 || k > 0.95) && Math.random() < 0.5 * dt) for (let i = 0; i < 3; i++) fx.push({ k: "splash", x: a.x + rnd(-W * 0.2, W * 0.2), y: water + W * 0.1, vx: rnd(-1.5, 1.5), vy: -rnd(2, 5), r: rnd(2, 4), life: 1 });
      } else a.alpha = 0;
      if (a.flip > 0 ? a.x > env.w + W * 1.5 : a.x < -W * 1.5) startCross(a, false);
    } else if (how === "flyin") {
      // On a tall phone screen the words fill the top, so the actor lands lower down.
      const narrow = env.w < 640 && env.h > env.w * 1.1;
      const perch = narrow ? { x: env.w * 0.66, y: env.h * 0.76 } : { x: env.w * a.cfg.perch[0], y: env.h * a.cfg.perch[1] };
      const k = secs() - a.t0;
      if (a.state === "wait") {
        a.alpha = 0;
        if (k > 0) startFlyIn(a);
        return;
      }
      if (a.state === "in") {
        const u = clamp(k / 2.8, 0, 1);
        const e = ease(u);
        const sx0 = a.from < 0 ? -W : env.w + W;
        const p0 = { x: sx0, y: -env.h * 0.15 };
        const p1 = { x: a.from < 0 ? env.w * 0.25 : env.w * 0.8, y: env.h * 0.75 };
        const p2 = perch;
        const m = 1 - e;
        a.x = m * m * p0.x + 2 * m * e * p1.x + e * e * p2.x;
        a.y = m * m * p0.y + 2 * m * e * p1.y + e * e * p2.y;
        a.s = 0.45 + 0.55 * e;
        a.flip = perch.x >= sx0 ? 1 : -1;
        a.r = (1 - e) * 0.35 * a.flip;
        a.sy = 0.6 + 0.4 * Math.abs(Math.sin(t * 0.03 + a.ph));
        if (u >= 1) {
          a.state = "perch";
          a.t0 = secs();
          a.hx = perch.x;
          a.hy = perch.y;
        }
      } else if (a.state === "perch") {
        const tx = perch.x + (ptr.in ? (ptr.x - perch.x) * 0.12 : 0);
        const ty = perch.y + (ptr.in ? (ptr.y - perch.y) * 0.1 : 0);
        a.hx = a.hx ?? perch.x;
        a.hy = a.hy ?? perch.y;
        a.hx += (tx - a.hx) * 0.04 * dt;
        a.hy += (ty - a.hy) * 0.04 * dt;
        a.x = a.hx;
        a.y = a.hy + Math.sin(t * 0.004 + a.ph) * W * 0.03;
        if (ptr.in && Math.abs(ptr.x - a.x) > W * 0.4) a.flip = ptr.x > a.x ? 1 : -1;
        a.sy = 0.86 + 0.14 * Math.abs(Math.sin(t * 0.009 + a.ph));
        a.r = Math.sin(t * 0.002 + a.ph) * 0.04;
        if (!reduce && k > 14) {
          a.state = "out";
          a.t0 = secs();
        }
      } else if (a.state === "out") {
        const u = clamp(k / 1.8, 0, 1);
        const e = u * u;
        a.x = a.hx + a.flip * e * (env.w * 0.9);
        a.y = a.hy - e * env.h * 0.8;
        a.s = 1 + e * 0.6;
        a.r = -0.3 * a.flip * e;
        a.sy = 0.6 + 0.4 * Math.abs(Math.sin(t * 0.03 + a.ph));
        if (u >= 1) {
          a.state = "wait";
          a.t0 = secs() + rnd(1.5, 3);
        }
      }
    } else if (how === "rise") {
      if (a.state === "wait") {
        if (secs() > a.t0) startRise(a, false);
        else return;
      }
      a.y -= a.v * (a.cfg.launch ? 1 + (env.h - a.y) / env.h * 6 : 1) * dt * (env.h / 560);
      a.x += Math.sin(t * 0.0012 + a.ph) * (a.cfg.launch ? 0.1 : 0.35) * dt;
      if (a.cfg.pulse) {
        const p = Math.sin(t * 0.004 + a.ph);
        a.sy = 1 + p * 0.08;
        a.sx = 1 - p * 0.06;
      }
      if (!a.cfg.launch) a.r = Math.sin(t * 0.001 + a.ph) * 0.06;
      if (a.cfg.trail && Math.random() < 0.9 * dt) fx.push({ k: "spark", x: a.x + rnd(-W * 0.08, W * 0.08), y: a.y + W * 0.9, vx: rnd(-0.6, 0.6), vy: rnd(1.2, 2.6), r: rnd(2, 5), life: 1 });
      if (a.y < -W * 2) {
        if (a.cfg.launch) {
          a.state = "wait";
          a.t0 = secs() + 1.5;
          a.y = -1e5;
        } else startRise(a, false);
      }
    } else if (how === "soar") {
      a.cx = a.cx ?? env.w * 0.55;
      a.cy = a.cy ?? env.h * a.cfg.y;
      if (ptr.in) {
        a.cx += (clamp(ptr.x, env.w * 0.25, env.w * 0.75) - a.cx) * 0.003 * dt;
        a.cy += (clamp(ptr.y, env.h * 0.2, env.h * 0.6) - a.cy) * 0.003 * dt;
      }
      a.boost = (a.boost || 0) * 0.97;
      a.th += 0.0055 * dt * (a.cfg.speed || 1) * (1 + a.boost);
      const rx = env.w * 0.3;
      const ry = env.h * 0.14;
      a.x = a.cx + Math.cos(a.th) * rx;
      a.y = a.cy + Math.sin(a.th) * ry;
      a.flip = -Math.sin(a.th) >= 0 ? 1 : -1;
      a.s = 0.78 + 0.22 * Math.sin(a.th);
      a.r = Math.cos(a.th) * 0.18 * a.flip;
      a.sy = 0.9 + 0.1 * Math.sin(t * 0.006 + a.ph);
    } else if (how === "hover") {
      const tx = ptr.in ? ptr.x + W * 0.7 * (a.flip > 0 ? -1 : 1) : env.w * (0.62 + 0.22 * Math.cos(t * 0.00031 + a.ph));
      const ty = ptr.in ? ptr.y - W * 0.3 : env.h * (0.42 + 0.18 * Math.sin(t * 0.00047 + a.ph));
      const vx = (tx - a.x) * 0.035 * dt;
      a.x += vx;
      a.y += (ty - a.y) * 0.035 * dt;
      if (Math.abs(vx) > 0.4) a.flip = vx > 0 ? 1 : -1;
      const jitter = a.cfg.kite ? 0 : Math.sin(t * 0.05 + a.ph) * 1.2;
      a.y += jitter;
      a.r = a.cfg.kite ? Math.sin(t * 0.002 + a.ph) * 0.25 : clamp(vx * 0.05, -0.3, 0.3);
      if (!a.cfg.kite && a.cfg.render !== "dots") a.sy = 0.85 + 0.15 * Math.abs(Math.sin(t * 0.06 + a.ph));
    } else if (how === "swing") {
      a.amp = Math.max(0.42, (a.amp || 0.55) * 0.999);
      a.th = Math.sin(t * 0.0019 + a.ph) * a.amp;
      const L = env.h * 0.5;
      a.ax = env.w * a.cfg.anchor;
      a.x = a.ax + Math.sin(a.th) * L;
      a.y = -env.h * 0.03 + Math.cos(a.th) * L;
      a.r = -a.th;
      a.flip = Math.cos(t * 0.0019 + a.ph) >= 0 ? 1 : -1;
    }
    if (a.cfg.render === "dots") {
      const set = dotsFor(a.im);
      if (set) stepDots(a, dt, ptr, W, W * set.aspect);
    }
  };

  const drawActor = (g, a) => {
    const im = a.im;
    if (!ready(im) || a.alpha <= 0 || a.state === "wait") return;
    const how = a.cfg.how;
    const W = a.W;
    const Hh = (W * ih(im)) / iw(im);
    const sil = a.cfg.render === "silhouette";
    if (how === "swing") {
      g.save();
      g.strokeStyle = sil ? silColor : "#4d6b2a";
      g.lineWidth = Math.max(2, W * 0.03);
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(a.ax, -10);
      g.quadraticCurveTo((a.ax + a.x) / 2 + Math.sin(env.t * 0.002) * 8, (a.y - 10) / 2, a.x, a.y + 4);
      g.stroke();
      g.restore();
    }
    if (a.cfg.kite) {
      g.save();
      g.strokeStyle = "rgba(255,255,255,0.75)";
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(env.w * 0.18, env.h + 4);
      g.quadraticCurveTo(env.w * 0.3, a.y + (env.h - a.y) * 0.4, a.x, a.y + Hh * 0.3);
      g.stroke();
      g.restore();
    }
    if (a.cfg.banner && env.text) {
      g.save();
      const fs = Math.max(11, W * 0.11);
      g.font = `600 ${fs}px ${env.font || "system-ui"}`;
      const label = String(env.text).slice(0, 28);
      const tw = g.measureText(label).width + fs * 1.4;
      const bx = a.x - a.flip * (W * 0.55 + tw / 2 + 30);
      const by = a.y + Math.sin(env.t * 0.004) * 4;
      g.strokeStyle = "rgba(60,40,30,0.6)";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(a.x - a.flip * W * 0.45, a.y);
      g.lineTo(bx + (a.flip * tw) / 2, by);
      g.stroke();
      g.fillStyle = "rgba(255,250,240,0.95)";
      g.beginPath();
      if (g.roundRect) g.roundRect(bx - tw / 2, by - fs * 0.85, tw, fs * 1.7, 4);
      else g.rect(bx - tw / 2, by - fs * 0.85, tw, fs * 1.7);
      g.fill();
      g.fillStyle = "#3a2a22";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(label, bx, by + 1);
      g.restore();
    }
    g.save();
    g.translate(a.x, a.y);
    g.rotate(a.r);
    g.scale(a.flip * a.sx * a.s, a.sy * a.s);
    g.globalAlpha = a.alpha;
    // Walkers stand on their line; swingers hang from the vine; everything else is centred.
    const top = how === "walk" ? -Hh : how === "swing" ? 0 : -Hh / 2;
    if (bg.dark && !sil && (a.cfg.how === "rise" || a.cfg.pulse)) {
      const glow = g.createRadialGradient(0, top + Hh / 2, 0, 0, top + Hh / 2, W * 1.1);
      glow.addColorStop(0, "rgba(255,200,140,0.35)");
      glow.addColorStop(1, "rgba(255,200,140,0)");
      g.fillStyle = glow;
      g.fillRect(-W * 1.2, top + Hh / 2 - W * 1.2, W * 2.4, W * 2.4);
    }
    if (a.cfg.render === "dots") {
      const set = dotsFor(im);
      if (set && a.disp) {
        const H2 = W * set.aspect;
        const sz = Math.max(1.3, (W / set.cols) * 0.66);
        const off = how === "walk" ? -H2 / 2 : how === "swing" ? H2 / 2 : 0;
        const tw = env.t * 0.002;
        for (const grp of set.groups) {
          g.fillStyle = grp.color;
          for (const i of grp.idx) {
            const x = set.u[i] * W + a.disp.dx[i] + Math.sin(tw + i) * 0.5;
            const y = set.v[i] * H2 + a.disp.dy[i] + off;
            g.fillRect(x - sz / 2, y - sz / 2, sz, sz);
          }
        }
      } else g.drawImage(im, -W / 2, top, W, Hh);
    } else {
      const src = sil ? silhouette(im, silColor) || im : im;
      g.drawImage(src, -W / 2, top, W, Hh);
    }
    g.restore();
  };

  // ---------------------------------------------------------------- painted backdrops
  const stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random() * 0.6, r: rnd(0.4, 1.4), ph: rnd(0, TAU) }));
  const puffs = Array.from({ length: 5 }, (_, i) => ({ x: Math.random(), y: rnd(0.08, 0.38), s: rnd(0.7, 1.3), v: rnd(0.6, 1.2), i }));
  const weeds = Array.from({ length: 9 }, () => ({ x: Math.random(), h: rnd(0.18, 0.36), ph: rnd(0, TAU), c: Math.random() < 0.5 ? "#2fbf71" : "#1fa35c" }));
  const flowers = Array.from({ length: 14 }, () => ({ x: Math.random(), y: rnd(0.84, 0.97), ph: rnd(0, TAU), c: ["#ff6b8b", "#ffd447", "#ffffff", "#b388ff"][Math.floor(Math.random() * 4)] }));
  const ridge = (g, y0, amp, seed, color, shift) => {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, env.h);
    for (let x = 0; x <= env.w + 20; x += 20) {
      const X = (x + shift) / env.w;
      const y = y0 - amp * (0.55 * Math.sin(X * 5.1 + seed) + 0.3 * Math.sin(X * 11.3 + seed * 2.1) + 0.15 * Math.sin(X * 23.7 + seed * 0.7));
      g.lineTo(x, y);
    }
    g.lineTo(env.w, env.h);
    g.closePath();
    g.fill();
  };
  const drawPaint = (g) => {
    const p = paint;
    const W = env.w;
    const Hh = env.h;
    const sky = g.createLinearGradient(0, 0, 0, Hh);
    p.sky.forEach((col, i) => sky.addColorStop(i / (p.sky.length - 1), col));
    g.fillStyle = sky;
    g.fillRect(0, 0, W, Hh);
    if (p.stars) {
      g.fillStyle = "#fff";
      for (const s of stars) {
        g.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(env.t * 0.0012 + s.ph));
        g.beginPath();
        g.arc(s.x * W, s.y * Hh, s.r, 0, TAU);
        g.fill();
      }
      g.globalAlpha = 1;
    }
    if (p.sun) {
      const [sx, sy, col, rr] = p.sun;
      const R = Math.min(W, Hh) * (rr || 0.1);
      const x = sx * W - px * 14;
      const y = sy * Hh - py * 8;
      const glow = g.createRadialGradient(x, y, R * 0.6, x, y, R * 3.2);
      glow.addColorStop(0, col);
      glow.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = glow;
      g.fillRect(0, 0, W, Hh);
      g.fillStyle = col;
      g.beginPath();
      g.arc(x, y, R, 0, TAU);
      g.fill();
    }
    if (p.moon) {
      const R = Math.min(W, Hh) * 0.06;
      const x = p.moon[0] * W - px * 10;
      const y = p.moon[1] * Hh;
      const glow = g.createRadialGradient(x, y, R, x, y, R * 5);
      glow.addColorStop(0, "rgba(220,230,255,0.35)");
      glow.addColorStop(1, "rgba(220,230,255,0)");
      g.fillStyle = glow;
      g.fillRect(0, 0, W, Hh);
      g.fillStyle = "#f3f1e4";
      g.beginPath();
      g.arc(x, y, R, 0, TAU);
      g.fill();
    }
    if (p.toonSun) {
      const x = W * 0.86;
      const y = Hh * 0.17;
      const R = Math.min(W, Hh) * 0.07;
      g.save();
      g.translate(x, y);
      g.rotate(env.t * 0.0002);
      g.fillStyle = "rgba(255,226,92,0.55)";
      for (let i = 0; i < 12; i++) {
        g.rotate(TAU / 12);
        g.beginPath();
        g.moveTo(R * 1.15, -R * 0.12);
        g.lineTo(R * 1.75, 0);
        g.lineTo(R * 1.15, R * 0.12);
        g.fill();
      }
      g.fillStyle = "#ffd93b";
      g.beginPath();
      g.arc(0, 0, R, 0, TAU);
      g.fill();
      g.restore();
    }
    if (p.planet) {
      const x = W * 0.8 - px * 20;
      const y = Hh * 0.28 - py * 10;
      const R = Math.min(W, Hh) * 0.1;
      g.fillStyle = "#ff9f68";
      g.beginPath();
      g.arc(x, y, R, 0, TAU);
      g.fill();
      g.strokeStyle = "#ffd6a0";
      g.lineWidth = R * 0.14;
      g.beginPath();
      g.ellipse(x, y, R * 1.8, R * 0.45, -0.35, 0, TAU);
      g.stroke();
      g.fillStyle = "#7bdcff";
      g.beginPath();
      g.arc(W * 0.16 - px * 30, Hh * 0.7, R * 0.4, 0, TAU);
      g.fill();
    }
    if (p.rays) {
      g.save();
      g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 5; i++) {
        const x = W * (0.15 + i * 0.2) + Math.sin(env.t * 0.0003 + i) * 30;
        g.fillStyle = `rgba(255,255,230,${0.05 + 0.03 * Math.sin(env.t * 0.0007 + i * 2)})`;
        g.beginPath();
        g.moveTo(x - 20, 0);
        g.lineTo(x + 40, 0);
        g.lineTo(x + 160, Hh);
        g.lineTo(x + 40, Hh);
        g.fill();
      }
      g.restore();
    }
    if (p.clouds) {
      g.fillStyle = "#ffffff";
      for (const c2 of puffs) {
        const span = W + 300;
        const x = ((((c2.x * span + env.t * 0.012 * c2.v) % span) + span) % span) - 150;
        const y = c2.y * Hh;
        const r = Math.min(W, Hh) * 0.05 * c2.s;
        g.beginPath();
        g.arc(x, y, r, 0, TAU);
        g.arc(x + r * 1.1, y - r * 0.5, r * 1.25, 0, TAU);
        g.arc(x + r * 2.3, y, r * 0.95, 0, TAU);
        g.fill();
        g.fillRect(x, y, r * 2.3, r * 0.9);
      }
    }
    const shift = walkDist;
    if (p.ridges)
      p.ridges.forEach((col, i) => {
        const n = p.ridges.length;
        const depth = (i + 1) / n;
        ridge(g, Hh * (0.58 + 0.32 * (i / Math.max(1, n - 1)) * (p.water ? 0.3 : 1)), Hh * (0.12 - 0.05 * depth), i * 1.7 + 0.4, col, shift * depth * 0.4 + px * depth * 50);
      });
    if (p.water) {
      const y0 = Hh * p.water;
      const wg = g.createLinearGradient(0, y0, 0, Hh);
      wg.addColorStop(0, "#f6c2cf");
      wg.addColorStop(1, "#e3a0b4");
      g.fillStyle = wg;
      g.fillRect(0, y0, W, Hh - y0);
      g.strokeStyle = "rgba(255,255,255,0.45)";
      for (let i = 0; i < 9; i++) {
        const y = y0 + (Hh - y0) * ((i + 0.5) / 9);
        const x = (Math.sin(env.t * 0.0008 + i * 1.3) * 0.5 + 0.5) * W * 0.6;
        g.lineWidth = 1 + i * 0.2;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + W * (0.1 + i * 0.02), y);
        g.stroke();
      }
    }
    if (p.sea) {
      const y0 = Hh * p.sea;
      const sg = g.createLinearGradient(0, y0, 0, Hh);
      sg.addColorStop(0, "#123a6b");
      sg.addColorStop(1, "#041226");
      g.fillStyle = sg;
      g.beginPath();
      g.moveTo(0, Hh);
      for (let x = 0; x <= W + 20; x += 20) g.lineTo(x, y0 + Math.sin(x * 0.012 + env.t * 0.0012) * 5 + Math.sin(x * 0.031 - env.t * 0.0009) * 3);
      g.lineTo(W, Hh);
      g.fill();
      g.fillStyle = "rgba(240,240,220,0.25)";
      for (let i = 0; i < 7; i++) {
        const y = y0 + 12 + i * 10;
        const w = (40 - i * 4) * (1 + 0.3 * Math.sin(env.t * 0.002 + i));
        g.fillRect(p.moon[0] * W - w / 2 - px * 10, y, w, 2);
      }
    }
    if (p.ground) {
      g.fillStyle = p.sil;
      g.fillRect(0, Hh * p.ground, W, Hh);
      if (p.trees)
        [
          [0.14, 0.26],
          [0.86, 0.2],
        ].forEach(([tx, sz]) => {
          const x = tx * W - px * 18;
          const y = Hh * p.ground;
          const s = Hh * sz;
          g.strokeStyle = p.sil;
          g.lineWidth = s * 0.06;
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x - s * 0.05, y - s * 0.75);
          g.moveTo(x - s * 0.03, y - s * 0.45);
          g.lineTo(x + s * 0.3, y - s * 0.8);
          g.stroke();
          g.fillStyle = p.sil;
          g.beginPath();
          g.ellipse(x + s * 0.05, y - s * 0.85, s * 0.6, s * 0.1, 0, 0, TAU);
          g.fill();
        });
    }
    if (p.sand) {
      g.fillStyle = "#f6d58e";
      g.beginPath();
      g.moveTo(0, Hh);
      for (let x = 0; x <= W + 20; x += 20) g.lineTo(x, Hh * 0.9 + Math.sin(x * 0.01) * 10);
      g.lineTo(W, Hh);
      g.fill();
    }
    if (p.weeds) {
      g.lineCap = "round";
      for (const wd of weeds) {
        const x = wd.x * W;
        const h = wd.h * Hh;
        const sw = Math.sin(env.t * 0.0015 + wd.ph) * 18;
        g.strokeStyle = wd.c;
        g.lineWidth = Math.max(4, W * 0.008);
        g.beginPath();
        g.moveTo(x, Hh);
        g.bezierCurveTo(x + sw, Hh - h * 0.35, x - sw, Hh - h * 0.7, x + sw * 1.4, Hh - h);
        g.stroke();
      }
    }
    if (p.bubbles) {
      g.strokeStyle = "rgba(255,255,255,0.6)";
      g.lineWidth = 1.5;
      for (let i = 0; i < 14; i++) {
        const sp2 = 0.03 + (i % 5) * 0.008;
        const y = Hh - ((env.t * sp2 + i * 137) % (Hh + 40));
        const x = ((i * 97) % 100) / 100 * W + Math.sin(env.t * 0.002 + i) * 8;
        g.beginPath();
        g.arc(x, y, 3 + (i % 4) * 2, 0, TAU);
        g.stroke();
      }
    }
    if (p.hills)
      p.hills.forEach((col, i) => {
        g.fillStyle = col;
        g.beginPath();
        const y0 = Hh * (0.78 + i * 0.08);
        g.moveTo(0, Hh);
        for (let x = 0; x <= W + 20; x += 20) g.lineTo(x, y0 - Math.sin((x + i * 300 - px * 30 * (i + 1)) / (W * 0.35)) * Hh * 0.05);
        g.lineTo(W, Hh);
        g.fill();
      });
    if (p.flowers)
      for (const f of flowers) {
        const x = f.x * W;
        const y = f.y * Hh;
        const sw = Math.sin(env.t * 0.002 + f.ph) * 4;
        const r = Math.max(3, Math.min(W, Hh) * 0.012);
        g.strokeStyle = "#3f9d2f";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x, y + r * 4);
        g.lineTo(x + sw, y);
        g.stroke();
        g.fillStyle = f.c;
        for (let k = 0; k < 5; k++) {
          g.beginPath();
          g.arc(x + sw + Math.cos((k * TAU) / 5) * r, y + Math.sin((k * TAU) / 5) * r, r * 0.8, 0, TAU);
          g.fill();
        }
        g.fillStyle = "#ffcf33";
        g.beginPath();
        g.arc(x + sw, y, r * 0.6, 0, TAU);
        g.fill();
      }
    if (p.leaves) {
      const L = Math.min(W, Hh);
      [
        [0.02, 0.2, 0.9, "#2e9e4f"],
        [0.08, 0.75, 0.4, "#24854a"],
        [0.95, 0.15, -0.9, "#2e9e4f"],
        [0.9, 0.7, -0.5, "#24854a"],
        [0.5, -0.02, 1.57, "#3cb35e"],
      ].forEach(([lx, ly, rot, col], i) => {
        g.save();
        g.translate(lx * W - px * 20, ly * Hh);
        g.rotate(rot + Math.sin(env.t * 0.0012 + i) * 0.06);
        g.fillStyle = col;
        g.beginPath();
        g.ellipse(L * 0.18, 0, L * 0.2, L * 0.07, 0, 0, TAU);
        g.fill();
        g.strokeStyle = "rgba(255,255,255,0.35)";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(L * 0.36, 0);
        g.stroke();
        g.restore();
      });
    }
  };

  const drawPlate = (g, zoom, alpha) => {
    const s = Math.max(env.w / iw(plate), env.h / ih(plate)) * zoom;
    const w = iw(plate) * s;
    const h = ih(plate) * s;
    g.globalAlpha = alpha;
    g.drawImage(plate, (env.w - w) / 2 - px * (w - env.w) * 0.6, (env.h - h) / 2 - py * (h - env.h) * 0.6, w, h);
    g.globalAlpha = 1;
  };

  return {
    resize() {
      for (const l of layers) l.resize();
      reset();
    },
    step(dt, ptr) {
      shared.wind += ((ptr.in ? ptr.vx * 0.25 : 0) + Math.sin(env.t * 0.0004) * 0.5 - shared.wind) * 0.04 * dt;
      px += ((ptr.in ? ptr.x / env.w - 0.5 : 0) - px) * 0.04 * dt;
      py += ((ptr.in ? ptr.y / env.h - 0.5 : 0) - py) * 0.04 * dt;
      // Walking speed: steady, faster while the page scrolls.
      const sy = typeof window !== "undefined" ? window.scrollY : 0;
      scrollBoost = Math.max(scrollBoost * 0.92, Math.min(40, Math.abs(sy - scrollY)) * 0.6);
      scrollY = sy;
      walkV = env.w * 0.0013 + scrollBoost;
      walkDist += (bg.walk ? walkV : env.w * 0.0002) * dt;
      for (const l of layers) l.walks ? l.step(dt, walkV) : l.step(dt, ptr);
      for (const a of actors) stepActor(a, dt, ptr);
      for (const q of shared.food) q.y = Math.min(env.h - 4, q.y + 0.35 * dt);
      for (const f of fx) {
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.k === "splash") f.vy += 0.25 * dt;
        f.life -= (f.k === "bubble" ? 0.006 : 0.025) * dt;
      }
      for (let i = fx.length - 1; i >= 0; i--) if (fx[i].life <= 0) fx.splice(i, 1);
      if (fx.length > 400) fx.splice(0, fx.length - 400);
    },
    draw(g) {
      if (plate && ready(plate)) {
        if (bg.walk) {
          // Walking forward: the photo slowly pushes in, then fades into a fresh copy.
          const P = env.w * 9;
          const f = (walkDist % P) / P;
          drawPlate(g, 1.05 + 0.14 * f, 1);
          if (f > 0.8) drawPlate(g, 1.05 + 0.14 * (f - 1), (f - 0.8) / 0.2);
        } else drawPlate(g, 1.06, 1);
        g.fillStyle = env.bg;
        g.globalAlpha = bg.veil ?? 0.2;
        g.fillRect(0, 0, env.w, env.h);
        g.globalAlpha = 1;
      } else if (paint) drawPaint(g);
      for (const l of layers) if (!l.front) l.draw(g, px, py);
      for (const a of actors) drawActor(g, a);
      for (const l of layers) if (l.front) l.draw(g, px, py);
      for (const f of fx) {
        g.globalAlpha = clamp(f.life, 0, 1);
        if (f.k === "bubble") {
          g.strokeStyle = "rgba(255,255,255,0.8)";
          g.lineWidth = 1;
          g.beginPath();
          g.arc(f.x + Math.sin(f.y * 0.05) * 3, f.y, f.r, 0, TAU);
          g.stroke();
        } else {
          g.fillStyle = f.k === "spark" ? (f.life > 0.6 ? "#fff3b0" : "#ff8a3d") : "rgba(255,255,255,0.9)";
          g.beginPath();
          g.arc(f.x, f.y, f.r * (f.k === "spark" ? f.life : 1), 0, TAU);
          g.fill();
        }
      }
      g.globalAlpha = 1;
    },
    down(x, y) {
      shared.wind += rnd(-4, 4);
      for (const l of layers) l.down(x, y);
      for (const a of actors) {
        const near = Math.hypot(a.x - x, a.y - y) < Math.max(80, a.W * 0.6);
        if (a.cfg.render === "dots") burstDots(a, x, y);
        if (a.cfg.how === "flyin" && a.state === "perch") {
          a.state = "out";
          a.t0 = secs();
          a.flip = x < a.x ? 1 : -1;
        } else if (a.cfg.how === "swing") a.amp = Math.min(1.1, (a.amp || 0.5) + 0.25);
        else if (a.cfg.how === "rise" && a.cfg.launch && (a.state === "wait" || a.y < env.h * 0.3)) startRise(a, false);
        else if (a.cfg.how === "cross" || a.cfg.how === "walk" || a.cfg.how === "leap" || a.cfg.how === "soar") a.boost = near ? 2.2 : 0.8;
        if (a.cfg.swim && near) for (let i = 0; i < 14; i++) fx.push({ k: "bubble", x: x + rnd(-20, 20), y: y + rnd(-10, 10), vx: rnd(-0.3, 0.3), vy: -rnd(0.6, 1.6), r: rnd(2, 7), life: 1 });
      }
      if (paint && paint.bubbles) for (let i = 0; i < 10; i++) fx.push({ k: "bubble", x: x + rnd(-24, 24), y, vx: 0, vy: -rnd(0.6, 1.6), r: rnd(3, 8), life: 1 });
    },
  };
}

function mix(a, b, k) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  try {
    const x = p(a);
    const y = p(b);
    return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, "0")).join("");
  } catch {
    return a;
  }
}
