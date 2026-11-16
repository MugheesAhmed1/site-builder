// The atmosphere renderer: one WebGL canvas, one fragment shader pass and, for the particle
// scenes, one point pass. Original code, no libraries. It pauses off screen and in hidden
// tabs, draws one still frame for reduced motion or low intensity, and renders at a reduced
// resolution (the scenes are soft, so nobody sees it) to stay light on phones.

import { CONSTELLATION_FRAG, CONSTELLATION_VERT, FRAGS, GARDEN_FRAG, GARDEN_VERT, VERT } from "./shaders.js";
import { atmosById } from "./catalog.js";
import { OKAYBABE } from "./vendor/okaybabe.js";

const QUALITY = { summit: 0.55, dust: 0.6, isles: 0.62, meadow: 0.7, chrome: 0.75, noir: 0.7, nocturne: 0.7, horizon: 0.7, studio: 0.6, caustics: 0.6, rainglass: 0.7, topo: 0.8, garden: 0.85, constellation: 0.9 };

function compile(gl, vs, fs) {
  const make = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error("atmos shader: " + gl.getShaderInfoLog(sh));
    return sh;
  };
  const p = gl.createProgram();
  gl.attachShader(p, make(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("atmos link: " + gl.getProgramInfoLog(p));
  const u = {};
  ["uTime", "uRes", "uPointer", "uScroll", "uAccent", "uAmount"].forEach((n) => (u[n] = gl.getUniformLocation(p, n)));
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  const all = {};
  for (let i = 0; i < n; i++) {
    const name = gl.getActiveUniform(p, i).name;
    all[name] = gl.getUniformLocation(p, name);
  }
  return { p, u, all };
}

function rand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// HSL hue at full saturation and half lightness, in linear RGB (as the okaybabe wrappers do).
const hueLinear = (h) => {
  const k = (n) => (n + h / 30) % 12;
  const f = (n) => 0.5 - 0.5 * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map((c) => Math.pow(Math.round(c * 255) / 255, 2.2));
};

const hex = (h) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(h || "").trim());
  if (!m) return [0.6, 0.5, 1];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

// Points for the constellation: a rounded, folded form (two lobes, like a thinking mind) and,
// for each point, where it flies to when the form scatters.
function constellationData(n) {
  const r = rand(7);
  const cols = [[1, 0.74, 0.25], [0.66, 0.5, 1], [0.35, 0.85, 0.85], [1, 0.5, 0.7], [0.95, 0.95, 1]];
  const per = 3 + 3 + 1 + 3;
  const out = new Float32Array(n * per);
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1;
    const th = r() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    let x = s * Math.cos(th), y = u, z = s * Math.sin(th);
    const fold = 1 + 0.07 * Math.sin(x * 9 + y * 7) * Math.cos(z * 8 + y * 5);
    x *= 1.25 * fold;
    y *= 0.95 * fold;
    z *= 1.05 * fold;
    if (y < -0.45) y = -0.45 - (y + 0.45) * 0.4;
    x += Math.sign(x || 1) * 0.06;
    const shell = 0.75 + 0.25 * Math.sqrt(r());
    x *= shell; y *= shell; z *= shell;
    const far = 2.2 + r() * 3.5;
    const o = i * per;
    out[o] = x; out[o + 1] = y; out[o + 2] = z;
    out[o + 3] = x * far + (r() - 0.5) * 2; out[o + 4] = y * far + (r() - 0.5) * 2; out[o + 5] = z * far - 1;
    out[o + 6] = r();
    const c = cols[Math.floor(r() * cols.length)];
    out[o + 7] = c[0]; out[o + 8] = c[1]; out[o + 9] = c[2];
  }
  return { data: out, layout: [["aHome", 3], ["aAway", 3], ["aSeed", 1], ["aColor", 3]], count: n };
}

function gardenData(n) {
  const r = rand(11);
  const cols = [[1, 0.28, 0.24], [1, 0.45, 0.2], [0.55, 0.42, 1], [0.38, 0.5, 1], [1, 0.4, 0.62], [0.95, 0.3, 0.45]];
  const per = 3 + 1 + 3;
  const out = new Float32Array(n * per);
  // Farthest first, so nearer flowers draw over farther ones most of the time.
  const zs = Array.from({ length: n }, () => r() * 28).sort((a, b) => b - a);
  for (let i = 0; i < n; i++) {
    const o = i * per;
    out[o] = (r() - 0.5) * 22;
    out[o + 1] = r() * 0.75;
    out[o + 2] = zs[i];
    out[o + 3] = r();
    const c = cols[Math.floor(r() * cols.length)];
    out[o + 4] = c[0]; out[o + 5] = c[1]; out[o + 6] = c[2];
  }
  return { data: out, layout: [["aPos", 3], ["aSeed", 1], ["aColor", 3]], count: n };
}

function makePoints(gl, kind, small) {
  const prog = kind === "garden" ? compile(gl, GARDEN_VERT, GARDEN_FRAG) : compile(gl, CONSTELLATION_VERT, CONSTELLATION_FRAG);
  const set = kind === "garden" ? gardenData(small ? 1200 : 2400) : constellationData(small ? 2600 : 5200);
  const vb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.bufferData(gl.ARRAY_BUFFER, set.data, gl.STATIC_DRAW);
  const stride = set.layout.reduce((n, l) => n + l[1], 0) * 4;
  const attrs = [];
  let off = 0;
  for (const [name, size] of set.layout) {
    attrs.push({ loc: gl.getAttribLocation(prog.p, name), size, off });
    off += size * 4;
  }
  return { prog, vb, stride, attrs, count: set.count, kind };
}

/**
 * Starts an atmosphere on a canvas. opts: { id, accent, amount (0..1), still, host }.
 * host is the element whose scroll position drives uScroll (the opening section).
 * Returns { update(opts), destroy() }, or null when WebGL is not available.
 */
export function mountAtmos(canvas, opts) {
  let o = { ...opts };
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: "high-performance", preserveDrawingBuffer: !!o.snapshot });
  if (!gl) return null;
  const small = typeof window !== "undefined" && Math.min(window.innerWidth, window.innerHeight) < 700;
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

  let scene = null;
  const build = (id) => {
    const meta = atmosById(id);
    const vendor = OKAYBABE.find((x) => x.id === meta.id);
    const frag = compile(gl, VERT, vendor ? vendor.frag : FRAGS[meta.id]);
    const aPos = gl.getAttribLocation(frag.p, "aPos");
    scene = { id: meta.id, frag, aPos, vendor, points: meta.points ? makePoints(gl, meta.points, small) : null };
  };
  try {
    build(o.id);
  } catch (e) {
    console.warn(e);
    return null;
  }

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let scroll = 0;
  let visible = true;
  let raf = 0;
  let last = performance.now();
  let clock = o.time ?? 6 + Math.random() * 4;
  const accent = () => hex(o.accent);

  const size = () => {
    const q = (QUALITY[scene.id] || 0.7) * (small ? 0.9 : 1);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * q;
    const w = Math.max(2, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(2, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  };

  const uniforms = (u) => {
    gl.uniform1f(u.uTime, clock);
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform2f(u.uPointer, pointer.x, pointer.y);
    gl.uniform1f(u.uScroll, scroll);
    if (u.uAccent) gl.uniform3fv(u.uAccent, accent());
    gl.uniform1f(u.uAmount, Math.max(0, Math.min(1, o.amount ?? 0.8)));
  };

  // The okaybabe shaders take their own uniforms: resolution, mouse (0..1), reduced motion,
  // a linear-RGB brand colour from their hue, and their settings scaled by the dial.
  const vendorUniforms = (f, v) => {
    const a = f.all;
    const amt = Math.max(0, Math.min(1, o.amount ?? 0.8));
    if (a.uTime) gl.uniform1f(a.uTime, clock);
    if (a.uResolution) gl.uniform2f(a.uResolution, canvas.width, canvas.height);
    if (a.uMouse) gl.uniform2f(a.uMouse, 0.5 + pointer.x * 0.5, 0.5 + pointer.y * 0.5);
    if (a.uReducedMotion) gl.uniform1f(a.uReducedMotion, o.still ? 1 : 0);
    if (a.uColor) gl.uniform3fv(a.uColor, hueLinear(v.hue));
    for (const [k, val] of Object.entries(v.uniforms)) {
      if (!a[k]) continue;
      const x = k === "uSpeed" ? val * (0.55 + 0.6 * amt) : k === "uIntensity" ? Math.min(1, val * (0.8 + 0.35 * amt)) : val;
      gl.uniform1f(a[k], x);
    }
  };

  const draw = () => {
    size();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.disable(gl.BLEND);
    gl.useProgram(scene.frag.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(scene.aPos);
    gl.vertexAttribPointer(scene.aPos, 2, gl.FLOAT, false, 0, 0);
    if (scene.vendor) vendorUniforms(scene.frag, scene.vendor);
    else uniforms(scene.frag.u);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disableVertexAttribArray(scene.aPos);
    const pt = scene.points;
    if (pt) {
      gl.enable(gl.BLEND);
      if (pt.kind === "garden") gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      else gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(pt.prog.p);
      gl.bindBuffer(gl.ARRAY_BUFFER, pt.vb);
      for (const a of pt.attrs) {
        if (a.loc < 0) continue;
        gl.enableVertexAttribArray(a.loc);
        gl.vertexAttribPointer(a.loc, a.size, gl.FLOAT, false, pt.stride, a.off);
      }
      uniforms(pt.prog.u);
      gl.drawArrays(gl.POINTS, 0, pt.count);
      for (const a of pt.attrs) if (a.loc >= 0) gl.disableVertexAttribArray(a.loc);
    }
  };

  const readScroll = () => {
    const host = o.host;
    if (!host) return;
    const r = host.getBoundingClientRect();
    scroll = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height)));
  };

  const frame = (now) => {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 2.5);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 2.5);
    readScroll();
    draw();
    loop();
  };
  const loop = () => {
    if (!raf && visible && !o.still && !document.hidden) raf = requestAnimationFrame(frame);
  };

  const onMove = (e) => {
    if (o.still || o.noPointer) return;
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
  };
  const onVis = () => {
    last = performance.now();
    loop();
  };
  const io = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver((es) => {
    visible = es.some((e) => e.isIntersecting);
    last = performance.now();
    loop();
  }) : null;
  if (io) io.observe(canvas);
  window.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("visibilitychange", onVis);
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => o.still && draw()) : null;
  if (ro) ro.observe(canvas);
  const onLost = (e) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    raf = 0;
    canvas.dataset.lost = "1";
  };
  canvas.addEventListener("webglcontextlost", onLost);

  draw();
  loop();

  return {
    gl,
    update(next) {
      const prev = o;
      o = { ...o, ...next };
      if (next.id && atmosById(next.id).id !== scene.id) {
        try {
          build(next.id);
        } catch (e) {
          console.warn(e);
        }
      }
      if (o.still) draw();
      else if (prev.still) loop();
    },
    settle(t) {
      clock = t;
      readScroll();
      draw();
    },
    destroy() {
      cancelAnimationFrame(raf);
      raf = 0;
      if (io) io.disconnect();
      if (ro) ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("webglcontextlost", onLost);
      const lose = gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
    },
  };
}

// Stills for pickers: one hidden renderer draws each atmosphere once and hands back a picture,
// so a grid of eleven tiles costs one WebGL context, not eleven.
const stills = new Map();
export function atmosStill(id, accent, w = 480, h = 300) {
  const key = id + "|" + (accent || "") + "|" + w + "x" + h;
  if (stills.has(key)) return stills.get(key);
  if (typeof document === "undefined") return "";
  const c = document.createElement("canvas");
  c.style.cssText = `position:fixed;left:-9999px;top:0;width:${w}px;height:${h}px`;
  document.body.appendChild(c);
  let url = "";
  const m = mountAtmos(c, { id, accent, amount: 0.8, still: true, snapshot: true, time: 9 });
  if (m) {
    url = c.toDataURL("image/jpeg", 0.82);
    m.destroy();
  }
  c.remove();
  stills.set(key, url);
  return url;
}
