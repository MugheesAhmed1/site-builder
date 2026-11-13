// The stage for the living scenes: one WebGL canvas that draws an environment, the cast
// and drifting motes, and keeps them alive. It listens to the pointer (the camera shifts
// in depth, the cast looks at you, particles part), to taps (rolls, bursts, take-offs) and
// to the page scroll (the cast dives or flies off as the hero leaves). Original code.
import { program, buffer, bind, mat4, texture } from "./gl.js";
import { LAYOUT } from "./mesh.js";
import { model } from "./models.js";
import { ACTS } from "./acts.js";
import { CREATURE_VS, CREATURE_FS, POINT_FS, DUST_VS, DUST_FS, SPARK_VS, SPARK_FS, LAYER_VS, LAYER_FS, ENV_VS, ENVS } from "./shaders.js";

const FOV = (32 * Math.PI) / 180;
const CAM = 7;
const MAX_LIVE = 6;
let liveCount = 0;

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Can this browser run a living scene right now? */
export function canMount() {
  return typeof window !== "undefined" && liveCount < MAX_LIVE;
}

/**
 * Start a scene inside el. `scene` is a resolved definition from catalog.js. Returns
 * { destroy, frame(t) } or null when WebGL is not available (the caller shows a still).
 */
export function mountLive(el, scene, { still = false, onFail } = {}) {
  if (!canMount()) return null;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  let gl = null;
  try {
    const o = { antialias: true, alpha: false, depth: true, powerPreference: "high-performance", preserveDrawingBuffer: !!still };
    gl = canvas.getContext("webgl", o) || canvas.getContext("experimental-webgl", o);
  } catch {
    gl = null;
  }
  if (!gl) return null;
  liveCount++;
  el.appendChild(canvas);

  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const S = {
    gl, el, scene, w: 1, h: 1, W: 1, H: 1, aspect: 1, tall: false, t: 0, dt: 0.016,
    ptr: { x: 0, y: 0, tx: 0, ty: 0, in: false, wx: 0, wy: 0, speed: 0 },
    scroll: 0, scrollT: 0, sparks: [], ripple: { x: 0.5, y: 0.5, t: -99 }, eye: [0, 0, CAM], taps: [],
    place: (spot) => [(spot[0] * 2 - 1) * S.W, (1 - spot[1] * 2) * S.H],
    spark: (x, y, z, n, o = {}) => {
      for (let i = 0; i < n && S.sparks.length < 220; i++) {
        const a = Math.random() * 6.283, r = Math.random();
        S.sparks.push({ x: x + Math.cos(a) * r * (o.spread ?? 0.25), y: y + (Math.random() - 0.5) * (o.spread ?? 0.25), z: z + Math.sin(a) * r * (o.spread ?? 0.25), vx: Math.cos(a) * r * (o.speed ?? 0.5), vy: (o.up ?? 0.6) * (0.4 + Math.random()), vz: Math.sin(a) * r * (o.speed ?? 0.5), size: (o.size ?? 26) * (0.4 + Math.random()), life: 1, rate: 0.3 + Math.random() * 0.5 });
      }
    },
  };

  let progs;
  let dead = false;
  try {
    progs = {
      env: program(gl, ENV_VS, ENVS[scene.env] || ENVS.deep),
      mesh: program(gl, CREATURE_VS, CREATURE_FS),
      pts: program(gl, CREATURE_VS, POINT_FS),
      dust: program(gl, DUST_VS, DUST_FS),
      spark: program(gl, SPARK_VS, SPARK_FS),
      layer: scene.layers ? program(gl, LAYER_VS, LAYER_FS) : null,
    };
  } catch (e) {
    if (typeof console !== "undefined") console.warn("Living scene could not start:", e && e.message);
    canvas.remove();
    liveCount--;
    onFail && onFail();
    return null;
  }
  const ext32 = gl.getExtension("OES_element_index_uint");
  const quad = buffer(gl, new Float32Array([-1, -1, 3, -1, -1, 3]), [["aPos", 2]]);
  const unit = buffer(gl, new Float32Array([-0.5, 0, 0, 0, 1, 0.5, 0, 0, 1, 1, -0.5, 1, 0, 0, 0, 0.5, 1, 0, 1, 0]), [["aPos", 3], ["aUv", 2]], new Uint16Array([0, 1, 2, 2, 1, 3]));

  // Buffers per model, made on first use.
  const meshes = new Map();
  const meshOf = (name) => {
    if (!meshes.has(name)) {
      const m = model(name);
      meshes.set(name, {
        m,
        tri: m.index instanceof Uint32Array && !ext32 ? null : buffer(gl, m.data, LAYOUT, m.index),
        pts: buffer(gl, m.points, LAYOUT),
        u32: m.index instanceof Uint32Array,
      });
    }
    return meshes.get(name);
  };

  const actors = (scene.actors || []).map((d) => ({ d, mesh: meshOf(d.model), act: (ACTS[d.act] || ACTS.cruise)(d, S, model(d.model)) }));

  const dust = (scene.dust || []).map((d) => {
    const n = Math.round(d.count * (scene.amount ?? 1));
    const a = new Float32Array(n * 4);
    for (let i = 0; i < a.length; i++) a[i] = Math.random();
    return { d, buf: buffer(gl, a, [["aSeed", 4]]), n };
  });
  const sparkData = new Float32Array(220 * 5);
  const sparkBuf = gl.createBuffer();

  const layers = (scene.layers || []).map((l) => ({ l, tex: texture(gl, l.canvas) }));

  // ---------------------------------------------------------------- frame
  let scale = 1;
  let slow = 0;
  const resize = () => {
    const r = el.getBoundingClientRect();
    S.w = Math.max(8, r.width);
    S.h = Math.max(8, r.height);
    const dpr = Math.min(window.devicePixelRatio || 1, S.w < 700 ? 1.6 : 1.5) * scale;
    canvas.width = Math.max(8, Math.round(S.w * dpr));
    canvas.height = Math.max(8, Math.round(S.h * dpr));
    S.aspect = S.w / S.h;
    S.tall = S.aspect < 0.9;
    S.H = Math.tan(FOV / 2) * CAM;
    S.W = S.H * S.aspect;
    S.px = canvas.height / S.h;
  };

  const set3 = (loc, c) => loc && gl.uniform3f(loc, c[0], c[1], c[2]);
  const L = scene.light;

  const draw = () => {
    const { ptr } = S;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    const E = progs.env;
    gl.useProgram(E.p);
    bind(gl, E, quad);
    gl.uniform2f(E.u.uRes, canvas.width, canvas.height);
    gl.uniform1f(E.u.uTime, S.t % 3600);
    gl.uniform1f(E.u.uScroll, S.scroll);
    gl.uniform2f(E.u.uPtr, ptr.x, ptr.y);
    const ec = scene.envColors;
    set3(E.u.uC0, ec[0]); set3(E.u.uC1, ec[1]); set3(E.u.uC2, ec[2]); set3(E.u.uC3, ec[3]); set3(E.u.uC4, ec[4] || ec[3]);
    E.u.uA && gl.uniform1f(E.u.uA, scene.envA ?? 1);
    E.u.uB && gl.uniform1f(E.u.uB, scene.envB ?? 0);
    const ep = scene.envP || [0, 0, 0, 0];
    E.u.uP && gl.uniform4f(E.u.uP, ep[0], ep[1], ep[2], ep[3]);
    E.u.uGo && gl.uniform1f(E.u.uGo, scene.go ?? 0);
    E.u.uTap && gl.uniform3f(E.u.uTap, S.ripple.x, S.ripple.y, S.t - S.ripple.t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Camera: shifts with the pointer for real depth, and with the scroll.
    const cam = scene.camera || {};
    S.eye = [ptr.x * (cam.px ?? 0.4), ptr.y * (cam.py ?? 0.22) + S.scroll * (cam.sy ?? 0), CAM - S.scroll * (cam.sz ?? 0)];
    const view = mat4.lookAt(S.eye, [0, S.scroll * (cam.ay ?? 0), -S.scroll * (cam.sz ?? 0)]);
    const proj = mat4.perspective(FOV, S.aspect, 0.2, 60);
    const vp = mat4.mul(proj, view);
    const ptrU = [ptr.x, ptr.y, scene.ptrRadius ?? 0.3, ptr.in ? (scene.ptrPush ?? 0.12) * (1 + Math.min(1.5, ptr.speed * 8)) : 0];

    // Far layers first (behind the cast).
    const drawLayers = (front) => {
      if (!layers.length) return;
      const P = progs.layer;
      gl.useProgram(P.p);
      bind(gl, P, unit);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.DEPTH_TEST);
      gl.uniformMatrix4fv(P.u.uVP, false, vp);
      gl.uniform1f(P.u.uTime, S.t);
      gl.uniform1i(P.u.uTex, 0);
      for (const { l, tex } of layers) {
        for (const q of l.quads(S)) {
          if (q.z > 0 !== front) continue;
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.uniform4f(P.u.uRect, q.x, q.y, q.w, q.h);
          gl.uniform1f(P.u.uZ, q.z);
          gl.uniform1f(P.u.uSway, q.sway ?? 0);
          set3(P.u.uFogCol, q.fogCol || L.fogTop);
          gl.uniform1f(P.u.uFogAmt, q.fog ?? 0);
          set3(P.u.uInk, L.ink || [0, 0, 0]);
          gl.uniform1f(P.u.uInkAmt, q.ink ?? 0);
          gl.uniform1f(P.u.uAlpha, q.alpha ?? 1);
          gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
        }
      }
    };
    drawLayers(false);

    // The cast.
    const points = scene.style === "points";
    const P = points ? progs.pts : progs.mesh;
    gl.useProgram(P.p);
    gl.uniformMatrix4fv(P.u.uVP, false, vp);
    gl.uniform1f(P.u.uTime, S.t % 3600);
    gl.uniform1f(P.u.uAspect, S.aspect);
    gl.uniform4f(P.u.uPtr, ptrU[0], ptrU[1], ptrU[2], points ? ptrU[3] : 0);
    set3(P.u.uEye, S.eye);
    set3(P.u.uTint, L.tint || [1, 1, 1]);
    set3(P.u.uInk, L.ink || [0.05, 0.06, 0.1]);
    gl.uniform1f(P.u.uFog, L.fog ?? 0.05);
    if (points) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.DEPTH_TEST);
    } else {
      gl.disable(gl.BLEND);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.disable(gl.CULL_FACE);
      set3(P.u.uLight, L.dir); set3(P.u.uSun, L.sun); set3(P.u.uAmbTop, L.ambTop); set3(P.u.uAmbBot, L.ambBot);
      set3(P.u.uRim, L.rim); set3(P.u.uFogTop, L.fogTop); set3(P.u.uFogBot, L.fogBot);
      gl.uniform1f(P.u.uStyle, scene.style === "toon" ? 1 : scene.style === "ink" ? 2 : 0);
      gl.uniform1f(P.u.uCaustic, L.caustic ?? 0);
      gl.uniform2f(P.u.uRes, canvas.width, canvas.height);
    }
    for (const a of actors) {
      const buf = points ? a.mesh.pts : a.mesh.tri;
      if (!buf) continue;
      bind(gl, P, buf);
      gl.uniform1f(P.u.uKind, a.d.kind ?? a.mesh.m.kind);
      gl.uniform1f(P.u.uPoint, points ? (a.d.point ?? scene.point ?? 5) * S.px * (S.tall ? 0.8 : 1) : 0);
      for (const it of a.act.items) {
        if (it.hidden) continue;
        gl.uniformMatrix4fv(P.u.uModel, false, it.m);
        gl.uniform1f(P.u.uPhase, it.phase % 6283.18);
        gl.uniform4f(P.u.uWave, it.wave[0], it.wave[1], it.wave[2], it.wave[3]);
        gl.uniform4f(P.u.uPose, it.bendX || 0, it.bendY || 0, it.fold || 0, 0);
        gl.uniform2f(P.u.uLook, it.lookX || 0, it.lookY || 0);
        gl.uniform1f(P.u.uBurst, it.burst || 0);
        gl.uniform1f(P.u.uSeed, it.seed || 0);
        gl.uniform1f(P.u.uAlpha, it.alpha ?? 1);
        gl.uniform1f(P.u.uGlow, (a.d.glow ?? L.glow ?? 0) + (it.glow || 0));
        gl.uniform1f(P.u.uTintAmt, a.d.tintAmt ?? L.tintAmt ?? 0);
        if (points) gl.drawArrays(gl.POINTS, 0, buf.count);
        else gl.drawElements(gl.TRIANGLES, buf.count, a.mesh.u32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0);
      }
    }

    // Motes and sparks.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false);
    if (dust.length) {
      const D = progs.dust;
      gl.useProgram(D.p);
      gl.uniformMatrix4fv(D.u.uVP, false, vp);
      gl.uniform1f(D.u.uTime, S.t % 3600);
      gl.uniform1f(D.u.uAspect, S.aspect);
      for (const { d, buf, n } of dust) {
        bind(gl, D, buf);
        gl.uniform3f(D.u.uBox, S.W * 2 * (d.box?.[0] ?? 1.5), S.H * 2 * (d.box?.[1] ?? 1.5), d.box?.[2] ?? 9);
        gl.uniform3f(D.u.uDrift, d.drift[0], d.drift[1], d.drift[2]);
        gl.uniform1f(D.u.uSize, d.size * S.px);
        gl.uniform1f(D.u.uWobble, d.wobble ?? 0.01);
        gl.uniform1f(D.u.uShift, S.scroll * (d.shift ?? 0.3));
        gl.uniform4f(D.u.uPtr, ptrU[0], ptrU[1], 0.22, ptr.in ? (d.push ?? 0.05) : 0);
        set3(D.u.uCol, d.col);
        gl.uniform1f(D.u.uAlpha, d.alpha ?? 0.6);
        gl.uniform1f(D.u.uRing, d.ring ?? 0);
        gl.uniform1f(D.u.uAdd, d.add ?? 1);
        gl.drawArrays(gl.POINTS, 0, n);
      }
    }
    if (S.sparks.length) {
      const K = progs.spark;
      const sp = scene.sparks || {};
      gl.useProgram(K.p);
      let i = 0;
      for (const s of S.sparks) {
        sparkData[i++] = s.x; sparkData[i++] = s.y; sparkData[i++] = s.z; sparkData[i++] = s.size * S.px; sparkData[i++] = s.life;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, sparkBuf);
      gl.bufferData(gl.ARRAY_BUFFER, sparkData.subarray(0, i), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(K.a.aP);
      gl.vertexAttribPointer(K.a.aP, 4, gl.FLOAT, false, 20, 0);
      gl.enableVertexAttribArray(K.a.aLife);
      gl.vertexAttribPointer(K.a.aLife, 1, gl.FLOAT, false, 20, 16);
      gl.uniformMatrix4fv(K.u.uVP, false, vp);
      set3(K.u.uCol, sp.col || [1, 1, 1]);
      gl.uniform1f(K.u.uRing, sp.ring ?? 0);
      gl.uniform1f(K.u.uAdd, sp.add ?? 1);
      gl.drawArrays(gl.POINTS, 0, S.sparks.length);
      gl.disableVertexAttribArray(K.a.aLife);
    }
    drawLayers(true);
  };

  const step = (dt) => {
    S.dt = dt;
    S.t += dt;
    const p = S.ptr;
    const k = 1 - Math.exp(-dt * 5);
    const ox = p.x, oy = p.y;
    p.x += ((p.in ? p.tx : 0) - p.x) * k;
    p.y += ((p.in ? p.ty : 0) - p.y) * k;
    p.speed += (Math.hypot(p.x - ox, p.y - oy) / Math.max(dt, 0.001) / 10 - p.speed) * k;
    p.wx = p.x * S.W;
    p.wy = p.y * S.H;
    S.scroll += (S.scrollT - S.scroll) * (1 - Math.exp(-dt * 6));
    for (const a of actors) a.act.update(S);
    S.taps.length = 0;
    const sp = scene.sparks || {};
    for (let i = S.sparks.length - 1; i >= 0; i--) {
      const s = S.sparks[i];
      s.life -= dt * s.rate * (sp.fade ?? 1);
      if (s.life <= 0) {
        S.sparks.splice(i, 1);
        continue;
      }
      const drag = Math.exp(-dt * 2);
      s.vx *= drag; s.vz *= drag;
      s.vy += (sp.rise ?? 0.6) * dt;
      s.x += s.vx * dt + Math.sin(S.t * 3 + s.size) * 0.004;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
    }
  };

  let raf = 0, last = 0, visible = true;
  const frame = (now) => {
    if (dead) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    // If frames run slow for a while, draw at a lower resolution.
    if (last && now - last > 30) slow++;
    else slow = Math.max(0, slow - 1);
    if (slow > 40 && scale > 0.55) {
      scale *= 0.8;
      slow = 0;
      resize();
    }
    last = now;
    step(dt * (scene.speed ?? 1));
    draw();
    if (visible && !reduce && !still) raf = requestAnimationFrame(frame);
  };
  const settle = (t = 6) => {
    // A finished-looking still: run the scene forward without drawing.
    for (let i = 0; i < t * 30; i++) step(1 / 30);
    draw();
  };
  const start = () => {
    cancelAnimationFrame(raf);
    last = 0;
    if (reduce || still) settle(still ? 7 : 6);
    else raf = requestAnimationFrame(frame);
  };

  // ---------------------------------------------------------------- input
  const move = (e) => {
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
    S.ptr.in = nx >= 0 && ny >= 0 && nx <= 1 && ny <= 1 && (e.pointerType !== "touch" || e.type === "pointerdown");
    S.ptr.tx = clamp(nx * 2 - 1, -1.2, 1.2);
    S.ptr.ty = clamp(1 - ny * 2, -1.2, 1.2);
  };
  const down = (e) => {
    move(e);
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
    if (nx < 0 || ny < 0 || nx > 1 || ny > 1) return;
    if (e.target && e.target.closest && e.target.closest("a, button, input, textarea, select, label, [contenteditable]")) return;
    S.taps.push({ x: (nx * 2 - 1) * S.W, y: (1 - ny * 2) * S.H });
    S.ripple = { x: nx, y: 1 - ny, t: S.t };
    if (reduce) settle(0.5);
  };
  const leave = () => (S.ptr.in = false);
  const onScroll = () => {
    const r = el.getBoundingClientRect();
    S.scrollT = clamp(-r.top / Math.max(1, r.height), 0, 1);
  };
  const ro = new ResizeObserver(() => {
    resize();
    onScroll();
    if (reduce || still) draw();
  });
  ro.observe(el);
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) start();
    else cancelAnimationFrame(raf);
  });
  io.observe(el);
  window.addEventListener("pointermove", move, { passive: true });
  window.addEventListener("pointerdown", down, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true, capture: true });
  document.addEventListener("pointerleave", leave);
  window.addEventListener("blur", leave);
  const lost = (e) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    onFail && onFail();
  };
  canvas.addEventListener("webglcontextlost", lost);
  resize();
  onScroll();
  S.scroll = S.scrollT;
  start();

  return {
    canvas,
    settle,
    destroy() {
      if (dead) return;
      dead = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("scroll", onScroll, { capture: true });
      document.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", leave);
      canvas.removeEventListener("webglcontextlost", lost);
      const lose = gl.getExtension("WEBGL_lose_context");
      lose && lose.loseContext();
      canvas.remove();
      liveCount = Math.max(0, liveCount - 1);
    },
  };
}
