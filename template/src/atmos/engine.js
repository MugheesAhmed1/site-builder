// The atmosphere renderer: one WebGL canvas, one fragment shader pass and, for the particle
// scenes, one point pass. Original code, no libraries. It pauses off screen and in hidden
// tabs, draws one still frame for reduced motion or low intensity, and renders at a reduced
// resolution (the scenes are soft, so nobody sees it) to stay light on phones.

import { FRAGS, PLATE_FRAG, VERT } from "./shaders.js";
import { atmosById, plateSrc } from "./catalog.js";
import { OKAYBABE } from "./vendor/okaybabe.js";
import { MOTION_PRIMITIVES } from "./vendor/motion-primitives.js";
import { STUDIO_FRAGS } from "./studio.js";
import { SHADER_CONTROLS } from "./controls.js";

const QUALITY = { dust: 0.6, chrome: 0.75, noir: 0.7, nocturne: 0.7, caustics: 0.6, rainglass: 0.7, topo: 0.8 };

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
  ["uTime", "uRes", "uPointer", "uScroll", "uAccent", "uAmount", "uKnob"].forEach((n) => (u[n] = gl.getUniformLocation(p, n)));
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  const all = {};
  for (let i = 0; i < n; i++) {
    const name = gl.getActiveUniform(p, i).name;
    all[name] = gl.getUniformLocation(p, name);
  }
  return { p, u, all };
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

/**
 * Starts an atmosphere on a canvas. opts: { id, accent, amount (0..1), still, host }.
 * host is the element whose scroll position drives uScroll (the opening section).
 * Returns { update(opts), destroy() }, or null when WebGL is not available.
 */
// A machine drawing WebGL without a graphics card (SwiftShader, llvmpipe) would spend its whole
// processor on the background and make the page itself stutter, so it gets one still frame.
export function softwareGL(gl) {
  try {
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
  } catch {
    return false;
  }
}

// Probed once per page on a throwaway canvas.
let cpuOnly = null;
export function noGpu() {
  if (cpuOnly === null) {
    // The scene lab (?gpu=1) draws live even on software WebGL, to render the scene pictures.
    if (typeof location !== "undefined" && /[?&]gpu=1/.test(location.search)) return (cpuOnly = false);
    try {
      const c = document.createElement("canvas");
      const g = c.getContext("webgl");
      cpuOnly = !!g && softwareGL(g);
      const lose = g && g.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
    } catch {
      cpuOnly = false;
    }
  }
  return cpuOnly;
}

export function mountAtmos(canvas, opts) {
  let o = { ...opts };
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: "high-performance", preserveDrawingBuffer: !!o.snapshot });
  if (!gl) return null;
  // Still on software rendering; a snapshot (thumbnails) still animates to its frame.
  const cpu = !o.snapshot && softwareGL(gl);
  const isStill = () => o.still || cpu || slow;
  let slow = false;
  const small = typeof window !== "undefined" && Math.min(window.innerWidth, window.innerHeight) < 700;
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

  let scene = null;
  const build = (id) => {
    const meta = atmosById(id);
    const vendor = OKAYBABE.find((x) => x.id === meta.id) || MOTION_PRIMITIVES.find((x) => x.id === meta.id);
    const isPlate = meta.family === "plate";
    const frag = compile(gl, VERT, isPlate ? PLATE_FRAG : vendor ? vendor.frag : FRAGS[meta.id] || STUDIO_FRAGS[meta.id]);
    const aPos = gl.getAttribLocation(frag.p, "aPos");
    if (scene && scene.tex) gl.deleteTexture(scene.tex);
    scene = { id: meta.id, frag, aPos, vendor, plate: isPlate ? meta.plate : null, flat: meta.flat, tex: null, img: [1, 1], ready: !isPlate };
    if (isPlate) loadPlate(scene);
  };
  // A living plate's picture becomes a texture; until it arrives the scene's flat colour shows.
  function loadPlate(sc) {
    const tex = gl.createTexture();
    sc.tex = tex;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    const f = hex(sc.flat);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([f[0] * 255, f[1] * 255, f[2] * 255, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (scene !== sc || dead) return;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      sc.img = [img.naturalWidth, img.naturalHeight];
      sc.ready = true;
      draw();
      if (o.onReady) o.onReady();
    };
    img.onerror = () => {
      sc.ready = true;
      if (o.onReady) o.onReady();
    };
    img.src = plateSrc(sc.id);
  }
  const plateUniforms = (sc) => {
    const a = sc.frag.all, pl = sc.plate;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sc.tex);
    if (a.uTex) gl.uniform1i(a.uTex, 0);
    if (a.uImg) gl.uniform2f(a.uImg, sc.img[0], sc.img[1]);
    const set1 = (n, v) => a[n] && gl.uniform1f(a[n], v);
    set1("uHorizon", pl.horizon ?? 0.5);
    set1("uSway", pl.sway || 0);
    set1("uWater", pl.water || 0);
    set1("uSky", pl.sky || 0);
    set1("uFog", pl.fog || 0);
    set1("uMotes", (pl.motes || 0) * (0.5 + 0.7 * (o.amount ?? 0.8)));
    set1("uMoteKind", pl.moteKind || 0);
    set1("uRays", pl.rays || 0);
    set1("uDrift", o.still ? 0 : 1);
    if (a.uFogCol) gl.uniform3fv(a.uFogCol, hex(pl.fogCol || "#ffffff"));
    if (a.uMoteCol) gl.uniform3fv(a.uMoteCol, hex(pl.moteCol || "#ffffff"));
    if (a.uRayPos) gl.uniform2fv(a.uRayPos, pl.rayPos || [0.5, 0]);
  };
  let dead = false;

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
    const q = (scene.plate ? 1 : QUALITY[scene.id] || 0.7) * (small ? 0.9 : 1);
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
    // Studio shaders: up to four settings from the Scenes panel, as one vec4.
    if (u.uKnob) {
      const c = SHADER_CONTROLS[scene.id] || [];
      const own = o.settings || {};
      gl.uniform4fv(u.uKnob, [0, 1, 2, 3].map((i) => (c[i] ? Number(own[c[i].key] ?? c[i].def) : 0)));
    }
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
    const own = o.settings || {};
    for (const [k, def] of Object.entries(v.uniforms)) {
      if (!a[k]) continue;
      const val = own[k] ?? def;
      if (typeof val === "string") {
        // A colour setting (Motion Primitives); "my brand colour" swaps the first one.
        gl.uniform3fv(a[k], hex(o.tint && /1$|^uBlobColor$|^uBaseColor$/.test(k) ? o.tint : val));
        continue;
      }
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
    if (scene.plate) plateUniforms(scene);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disableVertexAttribArray(scene.aPos);
  };

  const readScroll = () => {
    const host = o.host;
    if (!host) return;
    const r = host.getBoundingClientRect();
    scroll = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height)));
  };

  const frame = (now) => {
    raf = 0;
    const gap = now - last;
    const dt = Math.min(0.05, gap / 1000);
    last = now;
    clock += dt;
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 2.5);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 2.5);
    readScroll();
    draw();
    // Governor: when frames keep arriving slower than about 22 a second, the device cannot
    // afford the motion; it settles on a still frame instead of making the page stutter.
    if (gap < 200) cost = cost * 0.95 + gap * 0.05;
    if (++frames > 90 && cost > 45) slow = true;
    loop();
  };
  let cost = 16, frames = 0;
  const loop = () => {
    if (!raf && visible && !isStill() && !document.hidden) raf = requestAnimationFrame(frame);
  };

  const onMove = (e) => {
    if (isStill() || o.noPointer) return;
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
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => isStill() && draw()) : null;
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
      if (isStill()) draw();
      else if (prev.still) loop();
    },
    settle(t) {
      clock = t;
      readScroll();
      draw();
    },
    ready: () => scene.ready,
    destroy() {
      dead = true;
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
