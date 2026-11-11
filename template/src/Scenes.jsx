import { useEffect, useRef, useState } from "react";
import { REAL_SCENES, SCENE_PALETTES, sceneType } from "./scenes.js";
import { asset } from "./real.js";

// Draws the live scenes from scenes.js. Canvas scenes share one loop: it sizes the canvas
// for sharp pixels, tracks the pointer (even when text sits on top), pauses when the
// scene is off screen and draws one still frame for people who prefer reduced motion.
// Photo and glass scenes are plain HTML and CSS driven by the pointer.

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function cssVar(el, name, fb) {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fb;
}

function colorsFor(el, palette) {
  const p = SCENE_PALETTES.find((x) => x.id === palette);
  if (p && p.colors) return p.colors;
  const accent = cssVar(el, "--pf-accent", "#2f5bea");
  const text = cssVar(el, "--pf-text", "#1d1a19");
  const muted = cssVar(el, "--pf-muted", "#6b6560");
  // Your colours: the accent, a light tint of it for highlights, and the quiet text colour.
  return palette === "mono" ? [text, muted, text] : [accent, `color-mix(in srgb, ${accent} 45%, #fff)`, `color-mix(in srgb, ${accent} 30%, ${muted})`];
}

function alpha(c, a) {
  return `color-mix(in srgb, ${c} ${Math.round(a * 100)}%, transparent)`;
}

// Canvas cannot take color-mix, so colours are turned into rgb once.
let probeCtx = null;
function toRgb(el, c) {
  const probe = document.createElement("span");
  probe.style.color = c;
  el.appendChild(probe);
  const v = getComputedStyle(probe).color;
  probe.remove();
  // Browsers report modern colours (oklch, color-mix) in different forms, so paint one
  // pixel and read it back.
  try {
    if (!probeCtx) {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 1;
      probeCtx = cv.getContext("2d", { willReadFrequently: true });
    }
    probeCtx.clearRect(0, 0, 1, 1);
    probeCtx.fillStyle = "#000";
    probeCtx.fillStyle = v;
    probeCtx.fillRect(0, 0, 1, 1);
    const d = probeCtx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  } catch {
    const m = v.match(/[\d.]+/g) || [0, 0, 0];
    return m.slice(0, 3).map(Number);
  }
}
const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;

// ------------------------------------------------------------------ canvas scenes

const IMPL = {
  swarm(env) {
    const pts = [];
    const targets = [];
    const sample = () => {
      targets.length = 0;
      const oc = document.createElement("canvas");
      oc.width = env.w;
      oc.height = env.h;
      const o = oc.getContext("2d");
      const word = (env.text || "Hello").slice(0, 14);
      // On a wide backdrop the word sits on the right, clear of the headline.
      const wide = env.w > 760 && env.w / env.h > 1.3;
      const room = wide ? env.w * 0.46 : env.w * 0.9;
      const fs = Math.min(env.h * (wide ? 0.3 : 0.42), (room * 1.7) / Math.max(3, word.length));
      o.font = `700 ${fs}px ${env.font}`;
      o.textAlign = "center";
      o.textBaseline = "middle";
      o.fillStyle = "#000";
      o.fillText(word, wide ? env.w * 0.72 : env.w / 2, env.h / 2, room);
      const d = o.getImageData(0, 0, env.w, env.h).data;
      const step = Math.max(3, Math.round(fs / 16));
      for (let y = 0; y < env.h; y += step) for (let x = 0; x < env.w; x += step) if (d[(y * env.w + x) * 4 + 3] > 128) targets.push([x, y]);
      while (pts.length < targets.length) pts.push({ x: rnd(0, env.w), y: rnd(0, env.h), vx: 0, vy: 0, c: Math.random() });
      pts.length = targets.length;
    };
    return {
      resize: sample,
      step(dt, p) {
        pts.forEach((q, i) => {
          const [tx, ty] = targets[i];
          q.vx += (tx - q.x) * 0.012 * dt;
          q.vy += (ty - q.y) * 0.012 * dt;
          if (p.in) {
            const dx = q.x - p.x;
            const dy = q.y - p.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 9000) {
              const f = (1 - d2 / 9000) * 2.2 * dt;
              const d = Math.sqrt(d2) || 1;
              q.vx += (dx / d) * f;
              q.vy += (dy / d) * f;
            }
          }
          q.vx *= 0.86;
          q.vy *= 0.86;
          q.x += q.vx * dt;
          q.y += q.vy * dt;
        });
      },
      draw(g) {
        for (const q of pts) {
          g.fillStyle = q.c < 0.7 ? env.c[0] : env.c[1];
          g.beginPath();
          g.arc(q.x, q.y, 1.5, 0, TAU);
          g.fill();
        }
      },
      down(x, y) {
        for (const q of pts) {
          const a = Math.atan2(q.y - y, q.x - x);
          const s = rnd(6, 18);
          q.vx += Math.cos(a) * s;
          q.vy += Math.sin(a) * s;
        }
      },
    };
  },

  constellation(env) {
    const pts = [];
    const add = (x, y) => pts.push({ x: x ?? rnd(0, env.w), y: y ?? rnd(0, env.h), vx: rnd(-0.3, 0.3), vy: rnd(-0.3, 0.3), r: rnd(1, 2.4) });
    return {
      resize() {
        pts.length = 0;
        const n = Math.round(clamp((env.w * env.h) / 9000, 30, 110));
        for (let i = 0; i < n; i++) add();
      },
      step(dt, p) {
        for (const q of pts) {
          if (p.in) {
            const dx = p.x - q.x;
            const dy = p.y - q.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 30000) {
              q.vx += dx * 0.00004 * dt * 60;
              q.vy += dy * 0.00004 * dt * 60;
            }
          }
          q.vx = clamp(q.vx, -1, 1);
          q.vy = clamp(q.vy, -1, 1);
          q.x += q.vx * dt;
          q.y += q.vy * dt;
          if (q.x < 0 || q.x > env.w) q.vx *= -1;
          if (q.y < 0 || q.y > env.h) q.vy *= -1;
        }
      },
      draw(g, p) {
        const all = p.in ? [...pts, { x: p.x, y: p.y, r: 3 }] : pts;
        g.lineWidth = 1;
        for (let i = 0; i < all.length; i++)
          for (let j = i + 1; j < all.length; j++) {
            const dx = all[i].x - all[j].x;
            const dy = all[i].y - all[j].y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 14000) {
              g.strokeStyle = rgba(env.rgb[0], 0.35 * (1 - d2 / 14000));
              g.beginPath();
              g.moveTo(all[i].x, all[i].y);
              g.lineTo(all[j].x, all[j].y);
              g.stroke();
            }
          }
        for (const q of all) {
          g.fillStyle = env.c[0];
          g.beginPath();
          g.arc(q.x, q.y, q.r, 0, TAU);
          g.fill();
        }
      },
      down(x, y) {
        for (let i = 0; i < 4; i++) add(x + rnd(-20, 20), y + rnd(-20, 20));
        if (pts.length > 160) pts.splice(0, pts.length - 160);
      },
    };
  },

  vortex(env) {
    const pts = [];
    let cx = 0;
    let cy = 0;
    return {
      resize() {
        pts.length = 0;
        cx = env.w / 2;
        cy = env.h / 2;
        for (let i = 0; i < 420; i++) pts.push({ a: rnd(0, TAU), r: rnd(10, Math.min(env.w, env.h) * 0.48), s: rnd(0.4, 1.2), c: i % 3 });
      },
      step(dt, p) {
        const tx = p.in ? p.x : env.w / 2;
        const ty = p.in ? p.y : env.h / 2;
        cx += (tx - cx) * 0.06 * dt;
        cy += (ty - cy) * 0.06 * dt;
        for (const q of pts) q.a += (q.s * 0.9 * dt) / Math.max(20, q.r) + p.burst * 0.02;
      },
      draw(g) {
        for (const q of pts) {
          const x = cx + Math.cos(q.a) * q.r;
          const y = cy + Math.sin(q.a) * q.r * 0.82;
          g.strokeStyle = rgba(env.rgb[q.c], 0.75);
          g.lineWidth = 1.4;
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(cx + Math.cos(q.a - 0.06) * q.r, cy + Math.sin(q.a - 0.06) * q.r * 0.82);
          g.stroke();
        }
      },
    };
  },

  flow(env) {
    const pts = [];
    return {
      resize() {
        pts.length = 0;
        for (let i = 0; i < 520; i++) pts.push({ x: rnd(0, env.w), y: rnd(0, env.h), px: 0, py: 0, life: rnd(40, 200), c: i % 3 });
      },
      step(dt, p) {
        const t = env.t * 0.0003;
        for (const q of pts) {
          q.px = q.x;
          q.py = q.y;
          let a = Math.sin(q.x * 0.008 + t) * 1.6 + Math.cos(q.y * 0.01 - t) * 1.6;
          if (p.in) {
            const dx = q.x - p.x;
            const dy = q.y - p.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 16000) a += Math.atan2(dy, dx) + Math.PI / 2;
          }
          q.x += Math.cos(a) * 1.6 * dt;
          q.y += Math.sin(a) * 1.6 * dt;
          q.life -= dt;
          if (q.life < 0 || q.x < 0 || q.x > env.w || q.y < 0 || q.y > env.h) {
            q.x = q.px = rnd(0, env.w);
            q.y = q.py = rnd(0, env.h);
            q.life = rnd(60, 220);
          }
        }
      },
      draw(g) {
        g.lineWidth = 1.5;
        for (const q of pts) {
          g.strokeStyle = rgba(env.rgb[q.c], 0.6);
          g.beginPath();
          g.moveTo(q.px, q.py);
          g.lineTo(q.x, q.y);
          g.stroke();
        }
      },
      trails: 0.12,
    };
  },

  globe(env) {
    const pts = [];
    let rotY = 0;
    let rotX = -0.3;
    let vy = 0.004;
    let vx = 0;
    let last = null;
    for (let i = 0; i < 700; i++) {
      const y = 1 - (i / 699) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = i * 2.399963;
      pts.push([Math.cos(th) * r, y, Math.sin(th) * r]);
    }
    return {
      step(dt, p) {
        if (p.down && p.in) {
          if (last) {
            vy = (p.x - last.x) * 0.0016;
            vx = (p.y - last.y) * 0.0016;
          }
          last = { x: p.x, y: p.y };
        } else {
          last = null;
          vy += (0.004 - vy) * 0.02 * dt;
          vx *= 0.94;
        }
        rotY += vy * dt;
        rotX = clamp(rotX + vx * dt, -1.2, 1.2);
      },
      draw(g) {
        const R = Math.min(env.w, env.h) * 0.4;
        const cx = env.w / 2;
        const cy = env.h / 2;
        const cyR = Math.cos(rotY);
        const syR = Math.sin(rotY);
        const cxR = Math.cos(rotX);
        const sxR = Math.sin(rotX);
        for (const [x0, y0, z0] of pts) {
          const x1 = x0 * cyR + z0 * syR;
          const z1 = -x0 * syR + z0 * cyR;
          const y2 = y0 * cxR - z1 * sxR;
          const z2 = y0 * sxR + z1 * cxR;
          const a = (z2 + 1) / 2;
          g.fillStyle = rgba(z2 > 0 ? env.rgb[0] : env.rgb[2], 0.15 + a * 0.85);
          const s = 0.8 + a * 1.8;
          g.fillRect(cx + x1 * R - s / 2, cy + y2 * R - s / 2, s, s);
        }
      },
    };
  },

  dotgrid(env) {
    const waves = [];
    return {
      step(dt) {
        for (const w of waves) w.r += 6 * dt;
        while (waves.length && waves[0].r > Math.max(env.w, env.h) * 1.4) waves.shift();
      },
      draw(g, p) {
        const gap = 22;
        for (let y = gap / 2; y < env.h; y += gap)
          for (let x = gap / 2; x < env.w; x += gap) {
            let ox = 0;
            let oy = 0;
            let s = 1.9;
            if (p.in) {
              const dx = x - p.x;
              const dy = y - p.y;
              const d = Math.sqrt(dx * dx + dy * dy);
              if (d < 140) {
                const f = (1 - d / 140) * 14;
                ox += (dx / (d || 1)) * f;
                oy += (dy / (d || 1)) * f;
                s += (1 - d / 140) * 2.2;
              }
            }
            for (const w of waves) {
              const d = Math.hypot(x - w.x, y - w.y);
              const k = Math.exp(-((d - w.r) ** 2) / 600);
              s += k * 3;
              oy -= k * 6;
            }
            g.fillStyle = s > 2.4 ? env.c[0] : rgba(env.rgb[2], 0.5);
            g.beginPath();
            g.arc(x + ox, y + oy, s, 0, TAU);
            g.fill();
          }
      },
      down(x, y) {
        waves.push({ x, y, r: 0 });
      },
    };
  },

  fireflies(env) {
    const f = [];
    return {
      resize() {
        f.length = 0;
        for (let i = 0; i < 60; i++) f.push({ x: rnd(0, env.w), y: rnd(0, env.h), vx: 0, vy: 0, ph: rnd(0, TAU), s: rnd(1.5, 3.5) });
      },
      step(dt, p) {
        for (const q of f) {
          q.vx += rnd(-0.08, 0.08) * dt;
          q.vy += rnd(-0.08, 0.08) * dt;
          if (p.in) {
            q.vx += (p.x - q.x) * 0.0006 * dt;
            q.vy += (p.y - q.y) * 0.0006 * dt;
          }
          q.vx *= 0.97;
          q.vy *= 0.97;
          q.x = clamp(q.x + q.vx * dt, 0, env.w);
          q.y = clamp(q.y + q.vy * dt, 0, env.h);
          q.ph += 0.05 * dt;
        }
      },
      draw(g) {
        for (const q of f) {
          const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(q.ph));
          const gr = g.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.s * 6);
          gr.addColorStop(0, rgba(env.rgb[0], a * 0.8));
          gr.addColorStop(1, rgba(env.rgb[0], 0));
          g.fillStyle = gr;
          g.beginPath();
          g.arc(q.x, q.y, q.s * 6, 0, TAU);
          g.fill();
          g.fillStyle = rgba(env.rgb[1], a);
          g.beginPath();
          g.arc(q.x, q.y, q.s * 0.7, 0, TAU);
          g.fill();
        }
      },
      down(x, y) {
        for (const q of f) {
          const a = Math.atan2(q.y - y, q.x - x);
          q.vx += Math.cos(a) * 6;
          q.vy += Math.sin(a) * 6;
        }
      },
    };
  },

  waves(env) {
    const splashes = [];
    return {
      step(dt) {
        for (const s of splashes) {
          s.r += 4 * dt;
          s.a *= 0.985;
        }
        while (splashes.length && splashes[0].a < 0.02) splashes.shift();
      },
      draw(g, p) {
        const layers = 4;
        for (let l = 0; l < layers; l++) {
          const base = env.h * (0.38 + l * 0.15);
          g.fillStyle = rgba(env.rgb[l % 2 === 0 ? 0 : 1], 0.22 + l * 0.14);
          g.beginPath();
          g.moveTo(0, env.h);
          for (let x = 0; x <= env.w + 7; x += 8) {
            let y = base + Math.sin(x * 0.012 + env.t * 0.0012 * (1 + l * 0.3) + l) * (10 + l * 4);
            if (p.in) y -= Math.exp(-((x - p.x) ** 2) / 9000) * 30 * (1 - l * 0.18);
            for (const s of splashes) y -= Math.exp(-((Math.abs(x - s.x) - s.r) ** 2) / 500) * 22 * s.a;
            g.lineTo(Math.min(x, env.w), y);
          }
          g.lineTo(env.w, env.h);
          g.fill();
        }
      },
      down(x) {
        splashes.push({ x, r: 0, a: 1 });
      },
    };
  },

  petals(env) {
    const f = [];
    let wind = 0;
    return {
      resize() {
        f.length = 0;
        for (let i = 0; i < 46; i++) f.push({ x: rnd(0, env.w), y: rnd(-env.h, env.h), r: rnd(0, TAU), s: rnd(5, 10), vy: rnd(0.5, 1.2), c: i % 3 });
      },
      step(dt, p) {
        wind += ((p.in ? p.vx * 0.4 : 0) + Math.sin(env.t * 0.0005) * 0.6 - wind) * 0.05 * dt;
        for (const q of f) {
          q.y += q.vy * dt;
          q.x += (wind + Math.sin(q.y * 0.02 + q.r) * 0.6) * dt;
          q.r += 0.02 * dt;
          if (q.y > env.h + 20) {
            q.y = -20;
            q.x = rnd(0, env.w);
          }
          if (q.x > env.w + 20) q.x = -20;
          if (q.x < -20) q.x = env.w + 20;
        }
      },
      draw(g) {
        for (const q of f) {
          g.save();
          g.translate(q.x, q.y);
          g.rotate(q.r);
          g.scale(1, Math.abs(Math.cos(q.r * 1.3)) * 0.6 + 0.4);
          g.fillStyle = rgba(env.rgb[q.c], 0.85);
          g.beginPath();
          g.ellipse(0, 0, q.s, q.s * 0.55, 0, 0, TAU);
          g.fill();
          g.restore();
        }
      },
      down() {
        wind += rnd(-6, 6);
      },
    };
  },

  snow(env) {
    const f = [];
    return {
      resize() {
        f.length = 0;
        for (let i = 0; i < 160; i++) f.push({ x: rnd(0, env.w), y: rnd(0, env.h), r: rnd(1, 3.2), vx: 0, vy: rnd(0.3, 1) });
      },
      step(dt, p) {
        for (const q of f) {
          q.y += q.vy * dt;
          q.x += (Math.sin(env.t * 0.001 + q.r * 9) * 0.3 + q.vx) * dt;
          q.vx *= 0.95;
          if (p.in) {
            const dx = q.x - p.x;
            const dy = q.y - p.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 6000) {
              const d = Math.sqrt(d2) || 1;
              q.vx += (dx / d) * 0.6;
              q.y += (dy / d) * 0.8;
            }
          }
          if (q.y > env.h + 4) {
            q.y = -4;
            q.x = rnd(0, env.w);
          }
          if (q.x > env.w) q.x = 0;
          if (q.x < 0) q.x = env.w;
        }
      },
      draw(g) {
        for (const q of f) {
          g.fillStyle = rgba(env.rgb[2], 0.9);
          g.beginPath();
          g.arc(q.x, q.y, q.r, 0, TAU);
          g.fill();
        }
      },
      down(x, y) {
        for (const q of f) {
          const a = Math.atan2(q.y - y, q.x - x);
          q.vx += Math.cos(a) * 3;
        }
      },
    };
  },

  meadow(env) {
    const blades = [];
    return {
      resize() {
        blades.length = 0;
        const n = Math.round(env.w / 5);
        for (let i = 0; i < n; i++) blades.push({ x: (i / n) * env.w + rnd(-3, 3), h: rnd(0.18, 0.42) * env.h, bend: 0, flower: Math.random() < 0.08, c: i % 3 });
      },
      step(dt, p) {
        for (const b of blades) {
          let target = Math.sin(env.t * 0.0015 + b.x * 0.02) * 0.12;
          if (p.in && p.y > env.h - b.h - 40) {
            const d = b.x - p.x;
            if (Math.abs(d) < 90) target += (d > 0 ? 1 : -1) * (1 - Math.abs(d) / 90) * 0.9;
          }
          b.bend += (target - b.bend) * 0.12 * dt;
        }
      },
      draw(g) {
        for (const b of blades) {
          const tipX = b.x + Math.sin(b.bend) * b.h;
          const tipY = env.h - Math.cos(b.bend) * b.h;
          g.strokeStyle = rgba(env.rgb[b.c === 2 ? 1 : 0], 0.9);
          g.lineWidth = 2.4;
          g.beginPath();
          g.moveTo(b.x, env.h);
          g.quadraticCurveTo(b.x, env.h - b.h * 0.5, tipX, tipY);
          g.stroke();
          if (b.flower) {
            g.fillStyle = env.c[2];
            for (let k = 0; k < 5; k++) {
              g.beginPath();
              g.arc(tipX + Math.cos((k / 5) * TAU) * 4, tipY + Math.sin((k / 5) * TAU) * 4, 3.2, 0, TAU);
              g.fill();
            }
            g.fillStyle = env.c[1];
            g.beginPath();
            g.arc(tipX, tipY, 2.6, 0, TAU);
            g.fill();
          }
        }
      },
    };
  },

  stars(env) {
    const s = [];
    const shooting = [];
    return {
      resize() {
        s.length = 0;
        for (let i = 0; i < 220; i++) s.push({ x: rnd(0, env.w), y: rnd(0, env.h), z: rnd(0.2, 1), ph: rnd(0, TAU) });
      },
      step(dt) {
        for (const q of s) q.ph += 0.04 * dt * q.z;
        for (const m of shooting) {
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          m.l -= dt;
        }
        while (shooting.length && shooting[0].l < 0) shooting.shift();
        if (Math.random() < 0.002 * dt) shooting.push({ x: rnd(0, env.w), y: rnd(0, env.h * 0.4), vx: 9, vy: 4, l: 50 });
      },
      draw(g, p) {
        const px = p.in ? (p.x / env.w - 0.5) * 30 : 0;
        const py = p.in ? (p.y / env.h - 0.5) * 20 : 0;
        for (const q of s) {
          g.fillStyle = rgba(q.z > 0.8 ? env.rgb[1] : env.rgb[0], (0.4 + 0.6 * Math.abs(Math.sin(q.ph))) * q.z);
          const r = q.z * 1.6;
          g.beginPath();
          g.arc(q.x + px * q.z, q.y + py * q.z, r, 0, TAU);
          g.fill();
        }
        g.lineWidth = 2;
        for (const m of shooting) {
          const gr = g.createLinearGradient(m.x, m.y, m.x - m.vx * 10, m.y - m.vy * 10);
          gr.addColorStop(0, rgba(env.rgb[1], 1));
          gr.addColorStop(1, rgba(env.rgb[1], 0));
          g.strokeStyle = gr;
          g.beginPath();
          g.moveTo(m.x, m.y);
          g.lineTo(m.x - m.vx * 10, m.y - m.vy * 10);
          g.stroke();
        }
      },
      down(x, y) {
        shooting.push({ x, y, vx: rnd(6, 11) * (Math.random() < 0.5 ? -1 : 1), vy: rnd(3, 6), l: 60 });
      },
    };
  },

  rain(env) {
    const d = [];
    const rings = [];
    return {
      resize() {
        d.length = 0;
        for (let i = 0; i < 180; i++) d.push({ x: rnd(0, env.w), y: rnd(0, env.h), v: rnd(8, 14), l: rnd(8, 18) });
      },
      step(dt, p) {
        for (const q of d) {
          q.y += q.v * dt;
          q.x -= 1.2 * dt;
          if (p.in) {
            const dx = q.x - p.x;
            if (Math.abs(dx) < 60 && q.y > p.y - 30 && q.y < p.y) {
              rings.push({ x: q.x, y: p.y - 30 + Math.abs(dx) * 0.4, r: 1, a: 0.6 });
              q.y = rnd(-40, 0);
              q.x = rnd(0, env.w + 60);
            }
          }
          if (q.y > env.h) {
            if (Math.random() < 0.15) rings.push({ x: q.x, y: env.h - rnd(2, 20), r: 1, a: 0.6 });
            q.y = rnd(-40, 0);
            q.x = rnd(0, env.w + 60);
          }
        }
        for (const r of rings) {
          r.r += 0.8 * dt;
          r.a -= 0.02 * dt;
        }
        while (rings.length && rings[0].a <= 0) rings.shift();
      },
      draw(g, p) {
        g.strokeStyle = rgba(env.rgb[0], 0.55);
        g.lineWidth = 1.3;
        for (const q of d) {
          g.beginPath();
          g.moveTo(q.x, q.y);
          g.lineTo(q.x + q.l * 0.12, q.y - q.l);
          g.stroke();
        }
        for (const r of rings) {
          g.strokeStyle = rgba(env.rgb[1], r.a);
          g.beginPath();
          g.ellipse(r.x, r.y, r.r * 2, r.r * 0.7, 0, 0, TAU);
          g.stroke();
        }
        if (p.in) {
          g.strokeStyle = rgba(env.rgb[1], 0.5);
          g.lineWidth = 2;
          g.beginPath();
          g.arc(p.x, p.y, 60, Math.PI * 1.1, Math.PI * 1.9);
          g.stroke();
        }
      },
      down(x, y) {
        for (let i = 0; i < 6; i++) rings.push({ x: x + rnd(-10, 10), y: y + rnd(-6, 6), r: rnd(1, 6), a: 0.9 });
      },
    };
  },

  tree(env) {
    const leaves = [];
    let wind = 0;
    const branch = (g, x, y, len, ang, depth, sway) => {
      const x2 = x + Math.cos(ang) * len;
      const y2 = y + Math.sin(ang) * len;
      g.strokeStyle = rgba(env.trunk, depth > 6 ? 1 : 0.85);
      g.lineWidth = Math.max(1, depth * 1.4);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x2, y2);
      g.stroke();
      if (depth <= 1) {
        g.fillStyle = rgba(env.rgb[(Math.round(x2 + y2) & 1) ? 0 : 1], 0.6);
        g.beginPath();
        g.arc(x2, y2, 2.8, 0, TAU);
        g.fill();
        return;
      }
      const s = sway * (9 - depth) * 0.02;
      branch(g, x2, y2, len * 0.74, ang - 0.42 + s, depth - 1, sway);
      branch(g, x2, y2, len * 0.7, ang + 0.36 + s, depth - 1, sway);
    };
    return {
      step(dt, p) {
        const target = (p.in ? (p.x / env.w - 0.5) * 3 : 0) + Math.sin(env.t * 0.001) * 0.6;
        wind += (target - wind) * 0.04 * dt;
        for (const l of leaves) {
          l.y += l.vy * dt;
          l.x += (wind * 0.6 + Math.sin(l.y * 0.05)) * dt;
          l.r += 0.05 * dt;
        }
        while (leaves.length && leaves[0].y > env.h + 10) leaves.shift();
      },
      draw(g) {
        branch(g, env.w / 2, env.h, env.h * 0.24, -Math.PI / 2, 9, wind);
        for (const l of leaves) {
          g.save();
          g.translate(l.x, l.y);
          g.rotate(l.r);
          g.fillStyle = rgba(env.rgb[0], 0.85);
          g.beginPath();
          g.ellipse(0, 0, 5, 2.6, 0, 0, TAU);
          g.fill();
          g.restore();
        }
      },
      down() {
        for (let i = 0; i < 24; i++) leaves.push({ x: env.w / 2 + rnd(-env.w * 0.3, env.w * 0.3), y: rnd(env.h * 0.1, env.h * 0.5), vy: rnd(0.8, 1.8), r: rnd(0, TAU) });
      },
    };
  },

  aquarium(env) {
    const fish = [];
    const food = [];
    const bubbles = [];
    return {
      resize() {
        fish.length = 0;
        for (let i = 0; i < 14; i++) fish.push({ x: rnd(0, env.w), y: rnd(0, env.h), a: rnd(0, TAU), s: rnd(0.8, 1.6), size: rnd(8, 16), c: i % 3 });
      },
      step(dt, p) {
        for (const f of fish) {
          let tx = f.x + Math.cos(f.a) * 40;
          let ty = f.y + Math.sin(f.a) * 40;
          const near = food.length ? food.reduce((b, q) => (Math.hypot(q.x - f.x, q.y - f.y) < Math.hypot(b.x - f.x, b.y - f.y) ? q : b)) : null;
          if (near) [tx, ty] = [near.x, near.y];
          else if (p.in) [tx, ty] = [p.x, p.y];
          const want = Math.atan2(ty - f.y, tx - f.x);
          let da = want - f.a;
          while (da > Math.PI) da -= TAU;
          while (da < -Math.PI) da += TAU;
          f.a += clamp(da, -0.06, 0.06) * dt + rnd(-0.03, 0.03);
          f.x += Math.cos(f.a) * f.s * dt;
          f.y += Math.sin(f.a) * f.s * dt;
          if (f.x < 10 || f.x > env.w - 10 || f.y < 10 || f.y > env.h - 10) f.a += 0.2;
          f.x = clamp(f.x, 0, env.w);
          f.y = clamp(f.y, 0, env.h);
          if (near && Math.hypot(near.x - f.x, near.y - f.y) < 8) food.splice(food.indexOf(near), 1);
        }
        for (const q of food) q.y = Math.min(env.h - 4, q.y + 0.4 * dt);
        if (Math.random() < 0.05 * dt) bubbles.push({ x: rnd(0, env.w), y: env.h, r: rnd(2, 5) });
        for (const b of bubbles) b.y -= 0.9 * dt;
        while (bubbles.length && bubbles[0].y < -10) bubbles.shift();
      },
      draw(g) {
        for (const b of bubbles) {
          g.strokeStyle = rgba(env.rgb[2], 0.6);
          g.lineWidth = 1;
          g.beginPath();
          g.arc(b.x + Math.sin(b.y * 0.05) * 3, b.y, b.r, 0, TAU);
          g.stroke();
        }
        for (const q of food) {
          g.fillStyle = env.c[1];
          g.beginPath();
          g.arc(q.x, q.y, 2.5, 0, TAU);
          g.fill();
        }
        for (const f of fish) {
          g.save();
          g.translate(f.x, f.y);
          g.rotate(f.a);
          const wag = Math.sin(env.t * 0.012 * f.s + f.size) * 0.4;
          g.fillStyle = rgba(env.rgb[f.c], 0.95);
          g.beginPath();
          g.ellipse(0, 0, f.size, f.size * 0.5, 0, 0, TAU);
          g.fill();
          g.beginPath();
          g.moveTo(-f.size * 0.8, 0);
          g.lineTo(-f.size * 1.6, -f.size * 0.5 + wag * f.size);
          g.lineTo(-f.size * 1.6, f.size * 0.5 + wag * f.size);
          g.fill();
          g.fillStyle = "#fff";
          g.beginPath();
          g.arc(f.size * 0.5, -f.size * 0.12, f.size * 0.14, 0, TAU);
          g.fill();
          g.restore();
        }
      },
      down(x, y) {
        for (let i = 0; i < 6; i++) food.push({ x: x + rnd(-14, 14), y: y + rnd(-6, 6) });
      },
    };
  },

  sky(env) {
    const clouds = [];
    let sx = 0;
    let sy = 0;
    return {
      resize() {
        clouds.length = 0;
        sx = env.w * 0.7;
        sy = env.h * 0.3;
        for (let i = 0; i < 7; i++) clouds.push({ x: rnd(0, env.w), y: rnd(env.h * 0.15, env.h * 0.8), s: rnd(0.6, 1.4), v: rnd(0.15, 0.45) });
      },
      step(dt, p) {
        const tx = p.in ? p.x : env.w * 0.7;
        const ty = p.in ? p.y : env.h * 0.3;
        sx += (tx - sx) * 0.05 * dt;
        sy += (ty - sy) * 0.05 * dt;
        for (const c of clouds) {
          c.x += c.v * c.s * dt + p.vx * 0.02 * c.s;
          if (c.x > env.w + 120) c.x = -120;
          if (c.x < -140) c.x = env.w + 100;
        }
      },
      draw(g) {
        const gr = g.createRadialGradient(sx, sy, 0, sx, sy, 90);
        gr.addColorStop(0, rgba(env.rgb[1], 1));
        gr.addColorStop(0.35, rgba(env.rgb[1], 0.9));
        gr.addColorStop(1, rgba(env.rgb[1], 0));
        g.fillStyle = gr;
        g.beginPath();
        g.arc(sx, sy, 90, 0, TAU);
        g.fill();
        for (const c of clouds) {
          g.fillStyle = rgba(env.rgb[2], 0.92);
          for (const [dx, dy, r] of [[0, 0, 28], [26, -12, 24], [48, 0, 22], [22, 8, 26]]) {
            g.beginPath();
            g.arc(c.x + dx * c.s, c.y + dy * c.s, r * c.s, 0, TAU);
            g.fill();
          }
        }
      },
      down() {
        for (const c of clouds) c.v = rnd(0.15, 1.2);
      },
    };
  },

  orbs(env) {
    const b = [];
    let held = null;
    let last = null;
    return {
      resize() {
        b.length = 0;
        const n = 9;
        for (let i = 0; i < n; i++) {
          const r = rnd(18, 42);
          b.push({ x: rnd(r, env.w - r), y: rnd(r, env.h * 0.5), vx: rnd(-2, 2), vy: 0, r, c: i % 3 });
        }
      },
      step(dt, p) {
        if (p.down && p.in && !held) held = b.find((o) => Math.hypot(o.x - p.x, o.y - p.y) < o.r);
        if (!p.down) held = null;
        for (const o of b) {
          if (o === held) {
            o.vx = (p.x - o.x) * 0.4;
            o.vy = (p.y - o.y) * 0.4;
          } else o.vy += 0.35 * dt;
          o.x += o.vx * dt;
          o.y += o.vy * dt;
          if (o.y > env.h - o.r) {
            o.y = env.h - o.r;
            o.vy *= -0.62;
            o.vx *= 0.98;
          }
          if (o.y < o.r) {
            o.y = o.r;
            o.vy *= -0.6;
          }
          if (o.x < o.r || o.x > env.w - o.r) {
            o.x = clamp(o.x, o.r, env.w - o.r);
            o.vx *= -0.7;
          }
        }
        for (let i = 0; i < b.length; i++)
          for (let j = i + 1; j < b.length; j++) {
            const A = b[i];
            const B = b[j];
            const dx = B.x - A.x;
            const dy = B.y - A.y;
            const d = Math.hypot(dx, dy) || 1;
            const o = A.r + B.r - d;
            if (o > 0) {
              const nx = dx / d;
              const ny = dy / d;
              A.x -= nx * o * 0.5;
              A.y -= ny * o * 0.5;
              B.x += nx * o * 0.5;
              B.y += ny * o * 0.5;
              const rv = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
              if (rv < 0) {
                A.vx += rv * nx * 0.9;
                A.vy += rv * ny * 0.9;
                B.vx -= rv * nx * 0.9;
                B.vy -= rv * ny * 0.9;
              }
            }
          }
        last = p;
      },
      draw(g) {
        for (const o of b) {
          const gr = g.createRadialGradient(o.x - o.r * 0.35, o.y - o.r * 0.4, o.r * 0.1, o.x, o.y, o.r);
          gr.addColorStop(0, "rgba(255,255,255,0.95)");
          gr.addColorStop(0.25, rgba(env.rgb[o.c], 1));
          gr.addColorStop(1, rgba(env.rgb[o.c].map((v) => v * 0.45), 1));
          g.fillStyle = gr;
          g.beginPath();
          g.arc(o.x, o.y, o.r, 0, TAU);
          g.fill();
        }
      },
      down(x, y) {
        for (const o of b) {
          const d = Math.hypot(o.x - x, o.y - y);
          if (d < 160 && d > o.r) {
            o.vx += ((o.x - x) / d) * 9;
            o.vy += ((o.y - y) / d) * 9 - 4;
          }
        }
      },
    };
  },

  bubbles(env) {
    const b = [];
    let held = null;
    return {
      resize() {
        b.length = 0;
        const words = (env.words && env.words.length ? env.words : ["Design", "Build", "Launch", "Grow", "Care", "Craft"]).slice(0, 10);
        const g = env.g;
        words.forEach((w, i) => {
          g.font = `600 15px ${env.font}`;
          const r = Math.max(34, g.measureText(w).width / 2 + 16);
          b.push({ w, x: rnd(r, env.w - r), y: rnd(-env.h, 0), vx: rnd(-1, 1), vy: 0, r, c: i % 3 });
        });
      },
      step(dt, p) {
        IMPL.orbs.stepShared(b, dt, p, env, (h) => (held = h), () => held);
      },
      draw(g) {
        for (const o of b) {
          g.fillStyle = rgba(env.rgb[o.c], 0.92);
          g.beginPath();
          g.arc(o.x, o.y, o.r, 0, TAU);
          g.fill();
          g.fillStyle = o.c === 0 ? env.onAccent : "#fff";
          g.font = `600 15px ${env.font}`;
          g.textAlign = "center";
          g.textBaseline = "middle";
          g.fillText(o.w, o.x, o.y);
        }
      },
      down(x, y) {
        for (const o of b) {
          const d = Math.hypot(o.x - x, o.y - y);
          if (d < 180) {
            o.vx += ((o.x - x) / (d || 1)) * 8;
            o.vy -= 7;
          }
        }
      },
    };
  },
};

// Gravity and collisions shared by orbs and word bubbles.
IMPL.orbs.stepShared = (b, dt, p, env, setHeld, getHeld) => {
  let held = getHeld();
  if (p.down && p.in && !held) held = setHeld(b.find((o) => Math.hypot(o.x - p.x, o.y - p.y) < o.r) || null);
  if (!p.down) held = setHeld(null);
  for (const o of b) {
    if (o === held) {
      o.vx = (p.x - o.x) * 0.4;
      o.vy = (p.y - o.y) * 0.4;
    } else o.vy += 0.35 * dt;
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    if (o.y > env.h - o.r) {
      o.y = env.h - o.r;
      o.vy *= -0.5;
      o.vx *= 0.97;
    }
    if (o.x < o.r || o.x > env.w - o.r) {
      o.x = clamp(o.x, o.r, env.w - o.r);
      o.vx *= -0.6;
    }
  }
  for (let i = 0; i < b.length; i++)
    for (let j = i + 1; j < b.length; j++) {
      const A = b[i];
      const B = b[j];
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const d = Math.hypot(dx, dy) || 1;
      const ov = A.r + B.r - d;
      if (ov > 0) {
        const nx = dx / d;
        const ny = dy / d;
        A.x -= nx * ov * 0.5;
        A.y -= ny * ov * 0.5;
        B.x += nx * ov * 0.5;
        B.y += ny * ov * 0.5;
        const rv = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
        if (rv < 0) {
          A.vx += rv * nx * 0.8;
          A.vy += rv * ny * 0.8;
          B.vx -= rv * nx * 0.8;
          B.vy -= rv * ny * 0.8;
        }
      }
    }
};

// Photo particles need the image, so they get their own maker.
function pixelsImpl(env) {
  const pts = [];
  return {
    resize() {
      pts.length = 0;
      if (!env.img) return;
      const oc = document.createElement("canvas");
      const s = Math.min(env.w / env.img.width, env.h / env.img.height);
      const w = Math.round(env.img.width * s);
      const h = Math.round(env.img.height * s);
      oc.width = w;
      oc.height = h;
      const o = oc.getContext("2d");
      o.drawImage(env.img, 0, 0, w, h);
      let data;
      try {
        data = o.getImageData(0, 0, w, h).data;
      } catch {
        return;
      }
      const step = Math.max(4, Math.round(Math.sqrt((w * h) / 4500)));
      const ox = (env.w - w) / 2;
      const oy = (env.h - h) / 2;
      for (let y = 0; y < h; y += step)
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          if (data[i + 3] < 100) continue;
          pts.push({ tx: ox + x, ty: oy + y, x: rnd(0, env.w), y: rnd(0, env.h), vx: 0, vy: 0, s: step, col: `rgb(${data[i]},${data[i + 1]},${data[i + 2]})` });
        }
    },
    step: (dt, p) => IMPL.swarm.prototypeStep(pts, dt, p),
    draw(g) {
      for (const q of pts) {
        g.fillStyle = q.col;
        g.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s * 0.9, q.s * 0.9);
      }
    },
    down(x, y) {
      for (const q of pts) {
        const a = Math.atan2(q.y - y, q.x - x);
        const s = rnd(5, 16);
        q.vx += Math.cos(a) * s;
        q.vy += Math.sin(a) * s;
      }
    },
  };
}
IMPL.swarm.prototypeStep = (pts, dt, p) => {
  for (const q of pts) {
    q.vx += (q.tx - q.x) * 0.012 * dt;
    q.vy += (q.ty - q.y) * 0.012 * dt;
    if (p.in) {
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 7000) {
        const d = Math.sqrt(d2) || 1;
        const f = (1 - d2 / 7000) * 2 * dt;
        q.vx += (dx / d) * f;
        q.vy += (dy / d) * f;
      }
    }
    q.vx *= 0.86;
    q.vy *= 0.86;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
  }
};
IMPL.pixels = pixelsImpl;

// Charms on chains, simulated with verlet rope physics: still at rest, pushed by the
// pointer, and they can be grabbed. They float up on arrival, then drop and swing.
function charmsImpl(env) {
  const chains = [];
  let held = null;
  let born = 0;
  const KINDS = ["letter", "beads", "ring", "star", "key"];
  const steel = (g, x, y, r) => {
    const gr = g.createLinearGradient(x - r, y - r, x + r, y + r);
    gr.addColorStop(0, "#f4f6f9");
    gr.addColorStop(0.5, "#9aa1ad");
    gr.addColorStop(1, "#dfe3e8");
    return gr;
  };
  const build = () => {
    chains.length = 0;
    const cx = env.w / 2;
    const top = Math.max(-8, env.h * 0.02);
    const R = Math.min(env.w, env.h) * 0.07;
    const S = Math.min(env.w, env.h);
    const angles = [-50, -18, 14, 40, 84];
    KINDS.forEach((kind, ci) => {
      const a = ((angles[ci] - 90) * Math.PI) / 180;
      const ax = cx + Math.cos(a) * R;
      const ay = top + R + Math.sin(a) * R;
      const n = kind === "beads" ? 11 : 8 + (ci % 3);
      const len = (S * (0.34 + (ci % 2) * 0.06)) / n;
      const pts = [];
      for (let i = 0; i <= n; i++) pts.push({ x: ax, y: ay + i * len, px: ax, py: ay + i * len });
      const fan = ((angles[ci] - 14) / 90) * 0.06;
      chains.push({ kind, ax, ay, pts, len, size: S * (kind === "beads" ? 0.035 : kind === "key" ? 0.11 : 0.085), fan, c: ci % 3 });
    });
    born = env.t;
  };
  return {
    resize: build,
    step(dt, p) {
      const life = (env.t - born) / 1000;
      const grav = life < 0.7 ? -0.12 : 0.55;
      if (p.down && p.in && !held) {
        let best = null;
        let bd = 1e9;
        for (const ch of chains) {
          const e = ch.pts[ch.pts.length - 1];
          const d = Math.hypot(e.x - p.x, e.y - p.y);
          if (d < ch.size * 1.1 && d < bd) (best = ch), (bd = d);
        }
        held = best;
      }
      if (!p.down) held = null;
      const R = Math.min(env.w, env.h) * 0.28;
      for (const ch of chains) {
        ch.pts.forEach((q, i) => {
          if (i === 0) return;
          let vx = (q.x - q.px) * 0.965;
          let vy = (q.y - q.py) * 0.965;
          q.px = q.x;
          q.py = q.y;
          vx += ch.fan * dt * (i / ch.pts.length);
          vy += grav * dt * 0.6;
          if (p.in && !p.down) {
            const dx = q.x - p.x;
            const dy = q.y - p.y;
            const d = Math.hypot(dx, dy) || 1;
            if (d < R) {
              const f = (1 - d / R) ** 2 * 2.6 * dt * (i / ch.pts.length + 0.3);
              vx += (dx / d) * f + p.vx * 0.02 * (1 - d / R);
              vy += (dy / d) * f;
            }
          }
          q.x += vx;
          q.y += vy;
        });
        if (ch === held) {
          const e = ch.pts[ch.pts.length - 1];
          e.x += (p.x - e.x) * 0.5;
          e.y += (p.y - e.y) * 0.5;
        }
        for (let it = 0; it < 8; it++) {
          ch.pts[0].x = ch.ax;
          ch.pts[0].y = ch.ay;
          for (let i = 1; i < ch.pts.length; i++) {
            const a = ch.pts[i - 1];
            const b = ch.pts[i];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d = Math.hypot(dx, dy) || 1;
            const diff = (d - ch.len) / d;
            if (i === 1) {
              b.x -= dx * diff;
              b.y -= dy * diff;
            } else {
              a.x += dx * diff * 0.5;
              a.y += dy * diff * 0.5;
              b.x -= dx * diff * 0.5;
              b.y -= dy * diff * 0.5;
            }
          }
        }
        // Charms bump each other instead of overlapping.
      }
      for (let i = 0; i < chains.length; i++)
        for (let j = i + 1; j < chains.length; j++) {
          const A = chains[i].pts[chains[i].pts.length - 1];
          const B = chains[j].pts[chains[j].pts.length - 1];
          const min = (chains[i].size + chains[j].size) * 0.5;
          const dx = B.x - A.x;
          const dy = B.y - A.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < min) {
            const o = ((min - d) / d) * 0.5;
            A.x -= dx * o;
            A.y -= dy * o;
            B.x += dx * o;
            B.y += dy * o;
          }
        }
    },
    draw(g) {
      // Key ring
      const cx = env.w / 2;
      const R = Math.min(env.w, env.h) * 0.07;
      const top = Math.max(-8, env.h * 0.02);
      g.lineWidth = Math.max(3, R * 0.14);
      g.strokeStyle = steel(g, cx, top + R, R);
      g.beginPath();
      g.arc(cx, top + R, R, 0, TAU);
      g.stroke();
      for (const ch of chains) {
        const P = ch.pts;
        // Links
        for (let i = 1; i < P.length; i++) {
          const a = P[i - 1];
          const b = P[i];
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          const ang = Math.atan2(b.y - a.y, b.x - a.x);
          g.save();
          g.translate(mx, my);
          g.rotate(ang);
          if (ch.kind === "beads") {
            const r = ch.len * 0.48;
            const gr = g.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
            gr.addColorStop(0, "#fff");
            gr.addColorStop(0.3, rgba(env.rgb[0], 1));
            gr.addColorStop(1, rgba(env.rgb[0].map((v) => v * 0.45), 1));
            g.fillStyle = gr;
            g.beginPath();
            g.arc(0, 0, r, 0, TAU);
            g.fill();
          } else {
            g.strokeStyle = steel(g, 0, 0, ch.len);
            g.lineWidth = Math.max(1.4, ch.len * 0.16);
            g.beginPath();
            if (i % 2) g.ellipse(0, 0, ch.len * 0.62, ch.len * 0.26, 0, 0, TAU);
            else {
              g.moveTo(-ch.len * 0.62, 0);
              g.lineTo(ch.len * 0.62, 0);
            }
            g.stroke();
          }
          g.restore();
        }
        // Charm
        const e = P[P.length - 1];
        const pe = P[P.length - 2];
        const ang = Math.atan2(e.y - pe.y, e.x - pe.x) - Math.PI / 2;
        const s = ch.size;
        g.save();
        g.translate(e.x, e.y);
        g.rotate(ang);
        g.translate(0, s * 0.55);
        g.shadowColor = "rgba(0,0,0,0.22)";
        g.shadowBlur = s * 0.35;
        g.shadowOffsetY = s * 0.12;
        if (ch.kind === "letter") {
          const ch0 = (env.text || "A").trim().charAt(0).toUpperCase() || "A";
          g.font = `800 ${s * 1.25}px ${env.font}`;
          g.textAlign = "center";
          g.textBaseline = "middle";
          const gr = g.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
          gr.addColorStop(0, rgba(env.rgb[1], 1));
          gr.addColorStop(0.45, rgba(env.rgb[0], 1));
          gr.addColorStop(1, rgba(env.rgb[0].map((v) => v * 0.55), 1));
          g.fillStyle = gr;
          g.fillText(ch0, 0, 0);
          g.shadowColor = "transparent";
          g.strokeStyle = "rgba(255,255,255,0.55)";
          g.lineWidth = Math.max(1, s * 0.025);
          g.strokeText(ch0, -s * 0.02, -s * 0.03);
        } else if (ch.kind === "beads") {
          const gr = g.createRadialGradient(-s * 0.3, -s * 0.4, s * 0.1, 0, 0, s);
          gr.addColorStop(0, "#fff");
          gr.addColorStop(0.3, rgba(env.rgb[0], 1));
          gr.addColorStop(1, rgba(env.rgb[0].map((v) => v * 0.4), 1));
          g.fillStyle = gr;
          g.beginPath();
          g.arc(0, 0, s, 0, TAU);
          g.fill();
        } else if (ch.kind === "ring") {
          const gr = g.createRadialGradient(-s * 0.3, -s * 0.3, s * 0.1, 0, 0, s * 0.8);
          gr.addColorStop(0, "#fffdfa");
          gr.addColorStop(0.6, "#efe6ea");
          gr.addColorStop(1, "#cbbfc6");
          g.strokeStyle = gr;
          g.lineWidth = s * 0.3;
          g.beginPath();
          g.arc(0, 0, s * 0.42, 0, TAU);
          g.stroke();
          g.shadowColor = "transparent";
          g.strokeStyle = "rgba(255,255,255,0.8)";
          g.lineWidth = s * 0.06;
          g.beginPath();
          g.arc(0, 0, s * 0.42, Math.PI * 1.1, Math.PI * 1.5);
          g.stroke();
        } else if (ch.kind === "star") {
          const gr = g.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
          gr.addColorStop(0, rgba(env.rgb[1], 1));
          gr.addColorStop(1, rgba(env.rgb[0], 1));
          g.fillStyle = gr;
          g.beginPath();
          for (let k = 0; k < 10; k++) {
            const r = k % 2 ? s * 0.24 : s * 0.55;
            const a = (k / 10) * TAU - Math.PI / 2;
            g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          g.closePath();
          g.fill();
        } else {
          g.fillStyle = steel(g, 0, 0, s * 0.5);
          g.beginPath();
          g.arc(0, -s * 0.28, s * 0.2, 0, TAU);
          g.rect(-s * 0.05, -s * 0.12, s * 0.1, s * 0.6);
          g.rect(0.04 * s, s * 0.22, s * 0.1, s * 0.05);
          g.rect(0.04 * s, s * 0.34, s * 0.07, s * 0.05);
          g.fill();
          g.shadowColor = "transparent";
          g.fillStyle = env.bg;
          g.beginPath();
          g.arc(0, -s * 0.31, s * 0.06, 0, TAU);
          g.fill();
        }
        g.restore();
      }
    },
    down(x, y) {
      for (const ch of chains)
        for (const q of ch.pts) {
          const d = Math.hypot(q.x - x, q.y - y);
          if (d < 160 && d > 1) {
            q.px -= ((q.x - x) / d) * 6;
            q.py -= ((q.y - y) / d) * 6;
          }
        }
    },
  };
}
IMPL.charms = charmsImpl;


// ------------------------------------------------------------------ Real-life sprites

// One engine for every real-life scene. A scene is an optional background photo (it shifts
// a little with the pointer for depth) plus layers of cut-out pictures. Each layer moves in
// one way: fall, rise, fly, swim, drift (across the screen), float (bob in place) or sway
// (rooted at the bottom). Every layer pushes away from the pointer and reacts to taps.
function loadImg(src, env) {
  const im = new Image();
  im.decoding = "async";
  im.onload = () => env.redraw && env.redraw();
  im.src = asset(src);
  return im;
}

function spriteLayer(env, cfg, shared) {
  const imgs = cfg.sprites.map((src) => loadImg(src, env));
  const ps = [];
  const sp = cfg.speed || 1;
  const mode = cfg.mode;
  const make = (anywhere, i = 0) => {
    const z = rnd(0.55, 1.15);
    // Sizes are set for a wide hero; small previews and phones scale them down.
    const size = rnd(cfg.size[0], cfg.size[1]) * z * clamp(Math.min(env.w / 1100, env.h / 560), 0.42, 1.15);
    const p = { k: Math.floor(Math.random() * imgs.length), z, size, x: rnd(0, env.w), y: anywhere ? rnd(0, env.h) : 0, vx: 0, vy: 0, r: rnd(0, TAU), vr: rnd(-0.03, 0.03), ph: rnd(0, TAU), a: rnd(0, TAU), s: rnd(0.7, 1.3), dir: Math.random() < 0.5 ? -1 : 1 };
    if (mode === "rise" && !anywhere) p.y = env.h + size;
    else if (mode === "fall" && !anywhere) p.y = -size;
    else if (mode === "drift") {
      p.dir = cfg.dir || 1;
      p.y = rnd(env.h * (cfg.band ? cfg.band[0] : 0.05), env.h * (cfg.band ? cfg.band[1] : 0.6));
      if (!anywhere) p.x = p.dir > 0 ? -size : env.w + size;
      p.r = 0;
    } else if (mode === "sway") {
      const n = Math.max(1, cfg.count);
      p.x = ((i + 0.5) / n) * env.w + rnd(-env.w / n / 3, env.w / n / 3);
      p.y = env.h + 2;
      p.r = 0;
    } else if (mode === "float") {
      p.y = rnd(env.h * 0.1, env.h * 0.9);
      p.hx = p.x;
      p.hy = p.y;
      p.r = rnd(-0.3, 0.3);
    }
    return p;
  };
  const push = (p, dt, ptr, radius, force) => {
    if (!ptr.in) return;
    const dx = p.x - ptr.x;
    const dy = p.y - ptr.y;
    const d = Math.hypot(dx, dy);
    if (d < radius && d > 0.1) {
      const f = ((radius - d) / radius) * force * dt;
      p.vx += (dx / d) * f;
      p.vy += (dy / d) * f;
    }
  };
  return {
    resize() {
      ps.length = 0;
      const n = mode === "sway" ? cfg.count : Math.max(1, Math.round(cfg.count * clamp((env.w * env.h) / (1100 * 640), 0.45, 1.3)));
      for (let i = 0; i < n; i++) ps.push(make(true, i));
      ps.sort((a, b) => a.z - b.z);
    },
    step(dt, ptr) {
      const wind = shared.wind;
      for (const p of ps) {
        if (mode === "fall" || mode === "rise") {
          const dir = mode === "rise" ? -1 : 1;
          push(p, dt, ptr, 120, 0.35);
          p.vx *= 0.94;
          p.vy *= 0.94;
          p.x += (wind * p.z + Math.sin(env.t * 0.0012 * p.s + p.ph) * 0.7 + p.vx) * dt;
          p.y += (dir * (0.45 + p.z * 0.75) * sp * p.s + p.vy) * dt;
          p.r += (p.vr + p.vx * 0.01) * dt;
          if (dir > 0 ? p.y > env.h + p.size : p.y < -p.size) Object.assign(p, make(false), { k: p.k, z: p.z, size: p.size });
          if (p.x > env.w + p.size) p.x = -p.size;
          if (p.x < -p.size) p.x = env.w + p.size;
        } else if (mode === "drift") {
          push(p, dt, ptr, 140, 0.25);
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.x += (p.dir * 0.35 * sp * p.s * p.z + wind * 0.3 * p.z + p.vx) * dt;
          p.y += (Math.sin(env.t * 0.0011 * p.s + p.ph) * 0.25 * (cfg.bob || 1) + p.vy) * dt;
          if (p.dir > 0 ? p.x > env.w + p.size : p.x < -p.size) Object.assign(p, make(false), { k: p.k, z: p.z, size: p.size });
        } else if (mode === "float") {
          push(p, dt, ptr, 150, 0.6);
          p.vx += (p.hx - p.x) * 0.002 * dt;
          p.vy += (p.hy - p.y) * 0.002 * dt;
          p.vx *= 0.94;
          p.vy *= 0.94;
          p.x += p.vx * dt;
          p.y += (p.vy + Math.sin(env.t * 0.0014 * p.s + p.ph) * 0.3) * dt;
          p.r += (p.vr * 0.2 + p.vx * 0.004) * dt;
          p.r *= 0.995;
        } else if (mode === "sway") {
          let lean = Math.sin(env.t * 0.0011 * p.s + p.ph) * 0.06 + wind * 0.02;
          if (ptr.in && Math.abs(ptr.x - p.x) < 120 && ptr.y > env.h - p.size * 1.6) lean += clamp(ptr.vx, -8, 8) * 0.02 * ((120 - Math.abs(ptr.x - p.x)) / 120);
          p.vr += (lean - p.r) * 0.06 * dt;
          p.vr *= 0.88;
          p.r += p.vr * dt;
        } else if (mode === "fly") {
          const tx = ptr.in ? ptr.x + Math.cos(p.ph + env.t * 0.0007) * 90 : env.w * (0.5 + 0.4 * Math.cos(p.ph + env.t * 0.00013 * p.s));
          const ty = ptr.in ? ptr.y + Math.sin(p.ph * 1.7 + env.t * 0.0009) * 70 : env.h * (0.5 + 0.38 * Math.sin(p.ph * 2 + env.t * 0.00017 * p.s));
          const want = Math.atan2(ty - p.y, tx - p.x) + Math.sin(env.t * 0.003 * p.s + p.ph) * 0.9;
          let da = want - p.a;
          while (da > Math.PI) da -= TAU;
          while (da < -Math.PI) da += TAU;
          p.a += clamp(da, -0.05, 0.05) * dt;
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.x += (Math.cos(p.a) * 1.3 * p.s * p.z + p.vx) * dt;
          p.y += (Math.sin(p.a) * 1.3 * p.s * p.z + p.vy + Math.sin(env.t * 0.01 * p.s + p.ph) * 0.4) * dt;
          p.x = clamp(p.x, -40, env.w + 40);
          p.y = clamp(p.y, -40, env.h + 40);
        } else {
          // swim
          const food = shared.food;
          let tx = p.x + Math.cos(p.a) * 60;
          let ty = p.y + Math.sin(p.a) * 20;
          const near = food.length ? food.reduce((b, q) => (Math.hypot(q.x - p.x, q.y - p.y) < Math.hypot(b.x - p.x, b.y - p.y) ? q : b)) : null;
          if (near) [tx, ty] = [near.x, near.y];
          else if (ptr.in && p.k % 2 === 0) [tx, ty] = [ptr.x + Math.cos(p.ph) * 80, ptr.y + Math.sin(p.ph) * 50];
          const want = Math.atan2(ty - p.y, tx - p.x);
          let da = want - p.a;
          while (da > Math.PI) da -= TAU;
          while (da < -Math.PI) da += TAU;
          p.a += clamp(da, -0.035, 0.035) * dt + rnd(-0.015, 0.015);
          const v = (near ? 1.6 : 0.8) * p.s * p.z * sp;
          p.x += Math.cos(p.a) * v * dt;
          p.y += Math.sin(p.a) * v * 0.6 * dt;
          const m = p.size * 0.5;
          if (p.x < m || p.x > env.w - m) p.a = Math.PI - p.a;
          if (p.y < m || p.y > env.h * 0.88 - m) p.a = -p.a;
          p.x = clamp(p.x, m, env.w - m);
          p.y = clamp(p.y, m, env.h * 0.88 - m);
          if (near && Math.hypot(near.x - p.x, near.y - p.y) < p.size * 0.4) food.splice(food.indexOf(near), 1);
        }
      }
    },
    draw(g) {
      for (const p of ps) {
        const im = imgs[p.k];
        if (!im || !im.complete || !im.naturalWidth) continue;
        const w = p.size;
        const h = (w * im.naturalHeight) / im.naturalWidth;
        g.save();
        g.translate(p.x, p.y);
        g.globalAlpha = (mode === "sway" || mode === "float" ? 1 : clamp(0.45 + p.z * 0.5, 0, 1)) * (cfg.shimmer ? 0.65 + 0.35 * Math.sin(env.t * 0.006 + p.ph) : 1) * (cfg.alpha || 1);
        if (mode === "swim") {
          const left = Math.cos(p.a) < 0;
          g.rotate(clamp(Math.sin(p.a) * (left ? -1 : 1), -0.5, 0.5) * 0.6);
          g.scale((left ? -1 : 1) * (1 + Math.sin(env.t * 0.01 * p.s + p.ph) * 0.03), 1);
        } else if (mode === "fly") {
          g.rotate(p.a + Math.PI / 2);
          g.scale(0.35 + 0.65 * Math.abs(Math.sin(env.t * 0.02 * p.s + p.ph)), 1);
        } else if (mode === "drift") {
          if (cfg.flap) g.scale(p.dir, 0.82 + 0.18 * Math.abs(Math.sin(env.t * 0.012 * p.s + p.ph)));
          else if (cfg.facing) g.scale(p.dir * cfg.facing, 1);
          g.rotate(Math.sin(env.t * 0.0009 + p.ph) * 0.05);
        } else if (mode === "sway") {
          g.rotate(p.r);
          g.drawImage(im, -w / 2, -h, w, h);
          g.restore();
          continue;
        } else if (mode === "float") {
          g.rotate(p.r);
        } else {
          g.rotate(p.r);
          g.scale(1, 0.45 + 0.55 * Math.abs(Math.cos(p.r * 1.4 + p.ph)));
        }
        g.drawImage(im, -w / 2, -h / 2, w, h);
        g.restore();
      }
    },
    down(x, y) {
      if (mode === "swim" || mode === "sway") return;
      for (const p of ps) {
        const dx = p.x - x;
        const dy = p.y - y;
        const d = Math.max(20, Math.hypot(dx, dy));
        const f = Math.min(9, 2600 / (d * d) + 1.2) * (mode === "fly" ? 2.4 : 1);
        p.vx += (dx / d) * f;
        p.vy += (dy / d) * f - (mode === "fall" && p.y > y - 60 && Math.abs(dx) < 140 ? 3 : 0);
        p.vr += rnd(-0.08, 0.08);
      }
    },
  };
}

function realImpl(env, type) {
  const cfg = REAL_SCENES[type];
  const shared = { wind: 0, food: [] };
  const layers = (cfg.layers || [cfg]).map((l) => spriteLayer(env, l, shared));
  const plate = cfg.plate ? loadImg(cfg.plate, env) : null;
  const swims = (cfg.layers || [cfg]).some((l) => l.mode === "swim");
  const bubbles = [];
  let px = 0;
  let py = 0;
  return {
    resize() {
      for (const l of layers) l.resize();
    },
    step(dt, ptr) {
      shared.wind += ((ptr.in ? ptr.vx * 0.25 : 0) + Math.sin(env.t * 0.0004) * 0.5 - shared.wind) * 0.04 * dt;
      px += ((ptr.in ? ptr.x / env.w - 0.5 : 0) - px) * 0.04 * dt;
      py += ((ptr.in ? ptr.y / env.h - 0.5 : 0) - py) * 0.04 * dt;
      for (const l of layers) l.step(dt, ptr);
      if (swims) {
        for (const q of shared.food) q.y = Math.min(env.h - 4, q.y + 0.35 * dt);
        if (Math.random() < 0.04 * dt) bubbles.push({ x: rnd(0, env.w), y: env.h + 6, r: rnd(2, 6) });
        for (const b of bubbles) b.y -= (0.6 + b.r * 0.12) * dt;
        while (bubbles.length && bubbles[0].y < -12) bubbles.shift();
      }
    },
    draw(g) {
      if (plate && plate.complete && plate.naturalWidth) {
        // Cover the scene, a little larger than needed so the pointer can shift it.
        const s = Math.max(env.w / plate.naturalWidth, env.h / plate.naturalHeight) * 1.08;
        const w = plate.naturalWidth * s;
        const h = plate.naturalHeight * s;
        g.drawImage(plate, (env.w - w) / 2 - px * (w - env.w) * 0.8, (env.h - h) / 2 - py * (h - env.h) * 0.8, w, h);
        // A soft veil in the page colour keeps the words on top readable.
        g.fillStyle = env.bg;
        g.globalAlpha = cfg.veil ?? 0.28;
        g.fillRect(0, 0, env.w, env.h);
        g.globalAlpha = 1;
      } else if (swims) {
        const water = g.createLinearGradient(0, 0, 0, env.h);
        water.addColorStop(0, "rgba(64,170,210,0.10)");
        water.addColorStop(1, "rgba(12,70,120,0.26)");
        g.fillStyle = water;
        g.fillRect(0, 0, env.w, env.h);
      }
      if (swims) {
        g.lineWidth = 1;
        g.strokeStyle = "rgba(255,255,255,0.55)";
        for (const b of bubbles) {
          g.beginPath();
          g.arc(b.x + Math.sin(b.y * 0.05) * 3, b.y, b.r, 0, TAU);
          g.stroke();
        }
        g.fillStyle = "#c98a4b";
        for (const q of shared.food) {
          g.beginPath();
          g.arc(q.x, q.y, 2.5, 0, TAU);
          g.fill();
        }
      }
      for (const l of layers) l.draw(g);
    },
    down(x, y) {
      if (swims) for (let i = 0; i < 7; i++) shared.food.push({ x: x + rnd(-16, 16), y: y + rnd(-6, 6) });
      shared.wind += rnd(-4, 4);
      for (const l of layers) l.down(x, y);
    },
  };
}

function CanvasScene({ type, palette, text, words, image }) {
  const wrap = useRef(null);
  const cv = useRef(null);
  useEffect(() => {
    const el = wrap.current;
    const canvas = cv.current;
    if (!el || !canvas) return;
    const g = canvas.getContext("2d");
    if (!g) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rgb = colorsFor(el, palette).map((x) => toRgb(el, x));
    const env = {
      w: 0,
      h: 0,
      t: 0,
      c: rgb.map((x) => rgba(x, 1)),
      rgb,
      onAccent: cssVar(el, "--pf-on-accent", "#fff"),
      bg: cssVar(el, "--pf-bg", "#fff"),
      trunk: toRgb(el, (SCENE_PALETTES.find((x) => x.id === palette) || {}).colors ? "#5b4636" : cssVar(el, "--pf-text", "#333")),
      font: cssVar(el, "--pf-font-display", "system-ui, sans-serif"),
      text,
      words,
      g,
      img: null,
    };
    const scene = REAL_SCENES[type] ? realImpl(env, type) : (IMPL[type] || IMPL.constellation)(env);
    const p = { x: 0, y: 0, in: false, down: false, vx: 0, burst: 0 };
    let raf = 0;
    let visible = true;
    let last = performance.now();
    const size = () => {
      const r = el.getBoundingClientRect();
      env.w = Math.max(10, Math.round(r.width));
      env.h = Math.max(10, Math.round(r.height));
      canvas.width = env.w * dpr;
      canvas.height = env.h * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      scene.resize && scene.resize();
    };
    const frame = (now) => {
      const dt = Math.min(3, (now - last) / 16.7);
      last = now;
      env.t = now;
      p.burst *= 0.9;
      scene.step && scene.step(dt, p);
      if (scene.trails) {
        g.save();
        g.globalCompositeOperation = "destination-out";
        g.fillStyle = `rgba(0,0,0,${scene.trails})`;
        g.fillRect(0, 0, env.w, env.h);
        g.restore();
      } else g.clearRect(0, 0, env.w, env.h);
      scene.draw(g, p);
      if (visible && !reduce) raf = requestAnimationFrame(frame);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      if (reduce) {
        for (let i = 0; i < 60; i++) scene.step && scene.step(1, p);
        g.clearRect(0, 0, env.w, env.h);
        scene.draw(g, p);
      } else raf = requestAnimationFrame(frame);
    };
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const nx = e.clientX - r.left;
      const ny = e.clientY - r.top;
      p.vx = nx - p.x;
      p.x = nx;
      p.y = ny;
      p.in = nx >= 0 && ny >= 0 && nx <= r.width && ny <= r.height;
    };
    const down = (e) => {
      move(e);
      if (!p.in || e.target.closest("a, button, input, textarea, select, label")) return;
      p.down = true;
      p.burst = 1;
      scene.down && scene.down(p.x, p.y);
      if (reduce) start();
    };
    const up = () => (p.down = false);
    const leave = () => (p.in = false);
    const ro = new ResizeObserver(() => {
      size();
      if (reduce) start();
    });
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
      else cancelAnimationFrame(raf);
    });
    io.observe(el);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    document.addEventListener("pointerleave", leave);
    size();
    if (type === "pixels" && image) {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => {
        env.img = im;
        scene.resize();
        if (reduce) start();
      };
      im.src = image;
    }
    env.redraw = () => reduce && start();
    start();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.removeEventListener("pointerleave", leave);
    };
  }, [type, palette, text, image, (words || []).join("|")]);
  return (
    <div ref={wrap} className={"sc-canvas sc-" + type}>
      <canvas ref={cv} aria-hidden="true" />
    </div>
  );
}

// ------------------------------------------------------------------ HTML scenes

function usePointerVars(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const on = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = clamp((e.clientX - r.left) / r.width, -0.2, 1.2);
        const y = clamp((e.clientY - r.top) / r.height, -0.2, 1.2);
        el.style.setProperty("--px", x.toFixed(3));
        el.style.setProperty("--py", y.toFixed(3));
        el.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
        el.style.setProperty("--my", (y * 100).toFixed(1) + "%");
      });
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", on);
    };
  }, [ref]);
}

function Placeholder({ preview, label }) {
  return (
    <div className="sc-ph" data-img-slot="">
      <span>{preview ? "Add a photo to bring this to life" : label}</span>
    </div>
  );
}

function PhotoScene({ type, image, alt, preview, imgPath }) {
  const ref = useRef(null);
  usePointerVars(ref);
  const [seed] = useState(() => "sc" + Math.random().toString(36).slice(2, 8));
  const [speed, setSpeed] = useState(0);
  useEffect(() => {
    if (type !== "ripple") return;
    let last = null;
    let raf = 0;
    let v = 0;
    const on = (e) => {
      if (last) v = Math.min(60, v + Math.hypot(e.clientX - last[0], e.clientY - last[1]) * 0.4);
      last = [e.clientX, e.clientY];
    };
    const tick = () => {
      v *= 0.93;
      setSpeed(v);
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", on, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", on);
    };
  }, [type]);
  if (!image) return <Placeholder preview={preview} label="" />;
  const img = <img src={image} alt={alt || ""} draggable={false} data-img={imgPath} />;
  if (type === "slices")
    return (
      <div ref={ref} className="sc-photo sc-slices">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="sc-slice" style={{ "--i": i, backgroundImage: `url("${image}")` }} />
        ))}
      </div>
    );
  if (type === "ripple")
    return (
      <div ref={ref} className="sc-photo sc-ripple">
        <svg width="0" height="0" aria-hidden="true">
          <filter id={seed}>
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="2" seed="3" />
            <feDisplacementMap in="SourceGraphic" scale={4 + speed} />
          </filter>
        </svg>
        <div className="sc-ripple-img" style={{ filter: `url(#${seed})` }}>
          {img}
        </div>
      </div>
    );
  return (
    <div ref={ref} className={"sc-photo sc-" + type}>
      <div className="sc-photo-card">
        {img}
        {type === "reveal" && <div className="sc-reveal-color" style={{ backgroundImage: `url("${image}")` }} />}
        {type === "tilt" && <span className="sc-glare" />}
      </div>
    </div>
  );
}

function GlassScene() {
  const ref = useRef(null);
  usePointerVars(ref);
  return (
    <div ref={ref} className="sc-glass">
      <span className="sc-g sc-g1" />
      <span className="sc-g sc-g2" />
      <span className="sc-g sc-g3" />
      <span className="sc-g sc-g4" />
    </div>
  );
}

function LiquidScene() {
  const ref = useRef(null);
  usePointerVars(ref);
  const [id] = useState(() => "goo" + Math.random().toString(36).slice(2, 8));
  return (
    <div ref={ref} className="sc-liquid">
      <svg width="0" height="0" aria-hidden="true">
        <filter id={id}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="14" />
          <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -11" />
        </filter>
      </svg>
      <div className="sc-liquid-inner" style={{ filter: `url(#${id})` }}>
        <span className="sc-blob sc-b1" />
        <span className="sc-blob sc-b2" />
        <span className="sc-blob sc-b3" />
        <span className="sc-blob sc-b4" />
        <span className="sc-blob sc-follow" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ public

/** @param {{ def: any, text?: string, words?: string[], image?: string, alt?: string, preview?: boolean, imgPath?: string, className?: string }} props */
export function Scene({ def, text = "", words = [], image = "", alt = "", preview = false, imgPath = "", className = "" }) {
  if (!def) return null;
  const t = sceneType(def.type);
  let body;
  if (t.group === "photo" && def.type !== "pixels") body = <PhotoScene type={def.type} image={image} alt={alt} preview={preview} imgPath={imgPath} />;
  else if (def.type === "glass") body = <GlassScene />;
  else if (def.type === "liquid") body = <LiquidScene />;
  else if (def.type === "pixels" && !image) body = <Placeholder preview={preview} label="" />;
  else body = <CanvasScene type={def.type} palette={def.palette} text={text} words={words} image={image} />;
  const pal = SCENE_PALETTES.find((p) => p.id === def.palette);
  const style = pal && pal.colors ? { "--sc-a": pal.colors[0], "--sc-b": pal.colors[1], "--sc-c": pal.colors[2] } : undefined;
  return (
    <div className={`sc sc-group-${t.group} sc-pal-${def.palette} ${className}`} style={style} data-scene={def.type}>
      {body}
    </div>
  );
}
