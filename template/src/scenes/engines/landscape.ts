import { clamp, freshTaps, lerp, mix, num, ramp3, rgba, rng, str, wave, type Engine2D, type Frame } from "../frame";

// Landscape: a world of layered ridges the camera travels through (mountains, forest, desert,
// coast, city, river, falls, clouds, sky). Beat keys: cam (0 far .. 1 arrived), time (0 dawn,
// 0.5 day, 0.75 dusk, 1 night), fog, focus (none, cabin, tower), birds.
// Scroll moves the camera, the cursor moves the light and parts the fog, a tap sends birds off.

const SKY: Record<string, string[]> = {
  top: ["#5b6fa8", "#3f86d6", "#2f7fd8", "#4a3f8f", "#0d1430"],
  mid: ["#f2a98a", "#8cc4f0", "#9fd0f5", "#e8775a", "#1c2550"],
  low: ["#ffd7b0", "#dcefff", "#e6f4ff", "#ffb36b", "#2e3462"],
};

interface Bird {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ph: number;
  life: number;
}

function sky(g: CanvasRenderingContext2D, f: Frame, time: number, accent: string) {
  const k = time;
  const top = mix(ramp3(SKY.top, k), accent, 0.12);
  const midc = mix(ramp3(SKY.mid, k), accent, 0.1);
  const low = ramp3(SKY.low, k);
  const grd = g.createLinearGradient(0, 0, 0, f.h);
  grd.addColorStop(0, top);
  grd.addColorStop(0.55, midc);
  grd.addColorStop(1, low);
  g.fillStyle = grd;
  g.fillRect(0, 0, f.w, f.h);
}

function sun(g: CanvasRenderingContext2D, f: Frame, time: number, s: Record<string, any>) {
  // The sun arcs over the day; the cursor pulls it (cursor.light).
  const night = clamp((time - 0.8) / 0.2);
  const arc = clamp(time / 0.85);
  let x = lerp(f.w * 0.15, f.w * 0.85, arc);
  let y = f.h * (0.62 - Math.sin(arc * Math.PI) * 0.42);
  if (f.pointer && f.ch.cursor > 0) {
    s.sx = lerp(s.sx ?? x, f.px, 0.04);
    s.sy = lerp(s.sy ?? y, Math.min(f.py, f.h * 0.55), 0.04);
  } else {
    s.sx = lerp(s.sx ?? x, x, 0.03);
    s.sy = lerp(s.sy ?? y, y, 0.03);
  }
  x = s.sx;
  y = s.sy;
  const r = Math.min(f.w, f.h) * (night ? 0.035 : 0.05);
  const glow = g.createRadialGradient(x, y, 0, x, y, r * 7);
  glow.addColorStop(0, night ? "rgba(220,230,255,0.35)" : "rgba(255,240,200,0.55)");
  glow.addColorStop(1, "rgba(255,240,200,0)");
  g.fillStyle = glow;
  g.fillRect(x - r * 7, y - r * 7, r * 14, r * 14);
  g.fillStyle = night ? "#e9eefc" : "#fff6dc";
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  if (night > 0) {
    // Stars come out at night.
    const R = rng(7);
    g.fillStyle = `rgba(255,255,255,${0.7 * night})`;
    for (let i = 0; i < 70; i++) {
      const sx = R() * f.w;
      const sy = R() * f.h * 0.5;
      const tw = 0.5 + 0.5 * Math.sin(f.t * 2 + i);
      g.fillRect(sx, sy, 1.2 * tw + 0.3, 1.2 * tw + 0.3);
    }
  }
  return { x, y };
}

function ridge(g: CanvasRenderingContext2D, f: Frame, opts: { seed: number; base: number; amp: number; z: number; color: string; kind: string; cam: number; drift: number; lit: number }) {
  const { w, h } = f;
  const n = wave(opts.seed);
  const scale = 1 + opts.cam * (opts.z * 1.6);
  const cy = h * 0.55;
  // Near layers rise past the viewer as the camera moves forward.
  const y0 = cy + (opts.base * h - cy) * scale + opts.cam * opts.z * h * 0.35;
  const px = f.nx * opts.z * 28 * (f.ch.cursor > 0 ? 1 : 0);
  const step = Math.max(6, w / 90);
  g.fillStyle = opts.color;
  g.beginPath();
  g.moveTo(-10, h + 10);
  const xs: [number, number][] = [];
  for (let x = -10; x <= w + 10; x += step) {
    const u = (x - w / 2) / (w * scale) + opts.drift + px / w;
    let v: number;
    if (opts.kind === "mountains") v = -Math.abs(n(u * 2.2)) * 1.3 - n(u * 7) * 0.12;
    else if (opts.kind === "desert") v = -(Math.sin(u * 3.1 + opts.seed) * 0.5 + 0.5) * 0.8 - n(u * 1.3) * 0.2;
    else if (opts.kind === "coast") v = -0.2 - n(u * 1.5) * 0.25;
    else v = -n(u * 3) * 0.6 - 0.3;
    const y = y0 + v * opts.amp * h * scale;
    xs.push([x, y]);
    g.lineTo(x, y);
  }
  g.lineTo(w + 10, h + 10);
  g.closePath();
  g.fill();
  if (opts.kind === "forest") {
    // A treeline of firs along the ridge.
    g.beginPath();
    const tree = Math.max(5, 18 * scale * opts.z + 4);
    for (let i = 0; i < xs.length; i++) {
      const [x, y] = xs[i];
      const hh = tree * (1.4 + Math.abs(n(i * 0.7)) * 1.8);
      g.moveTo(x - tree * 0.45, y + 2);
      g.lineTo(x, y - hh);
      g.lineTo(x + tree * 0.45, y + 2);
    }
    g.fill();
  }
  if (opts.kind === "mountains" && opts.z < 0.4 && opts.lit > 0) {
    // Snow catches the light on the far peaks.
    g.save();
    g.clip();
    g.fillStyle = rgba("#ffffff", 0.5 * opts.lit);
    const top = Math.min(...xs.map((p) => p[1]));
    g.fillRect(0, top, w, (y0 - top) * 0.28);
    g.restore();
  }
  return xs;
}

function city(g: CanvasRenderingContext2D, f: Frame, layer: number, cam: number, time: number, neon: boolean, s: Record<string, any>) {
  const z = [0.15, 0.4, 0.75][layer];
  const R = rng(31 + layer * 17);
  const scale = 1 + cam * z * 1.8;
  const ground = f.h * (0.66 + cam * z * 0.32);
  const lit = clamp((time - 0.55) / 0.35) * (0.4 + 0.6 * cam);
  const col = mix(layer === 0 ? "#5a6787" : layer === 1 ? "#2c3550" : "#141a2c", f.pal.accent, 0.08);
  const px = f.nx * z * 30;
  let x = -40 + ((f.t * 4 * z) % 40);
  const boost = s.boost ?? 0;
  while (x < f.w + 40) {
    const bw = (30 + R() * 60) * scale;
    const bh = (80 + R() * 260) * scale * (layer === 0 ? 0.7 : 1);
    const bx = (x - f.w / 2) * scale + f.w / 2 + px;
    g.fillStyle = col;
    g.fillRect(bx, ground - bh, bw, bh + 4);
    if (layer > 0) {
      const cw = Math.max(3, 5 * scale);
      for (let wy = ground - bh + cw * 2; wy < ground - cw; wy += cw * 2.4)
        for (let wx = bx + cw; wx < bx + bw - cw; wx += cw * 2) {
          const on = R() < lit + boost * 0.3;
          if (!on) continue;
          g.fillStyle = neon && R() < 0.2 ? rgba(f.pal.accent, 0.95) : `rgba(255,${200 + R() * 40},${120 + R() * 60},${0.75})`;
          g.fillRect(wx, wy, cw, cw * 1.2);
        }
    }
    x += bw / scale + 4 + R() * 14;
  }
}

function road(g: CanvasRenderingContext2D, f: Frame, cam: number, time: number) {
  const hy = f.h * 0.6;
  const vx = f.w * 0.5 + f.nx * 12;
  g.fillStyle = mix("#2c2b33", "#14131a", clamp(time));
  g.beginPath();
  g.moveTo(vx - 6, hy);
  g.lineTo(vx + 6, hy);
  g.lineTo(f.w * 0.92, f.h);
  g.lineTo(f.w * 0.08, f.h);
  g.closePath();
  g.fill();
  // Centre dashes rush toward the viewer with the camera.
  g.fillStyle = "rgba(255,236,170,0.85)";
  const run = cam * 18 + f.t * 0.6 * (0.3 + f.energy);
  for (let i = 0; i < 14; i++) {
    const u = (((i + run) % 14) / 14) ** 2;
    const y = lerp(hy, f.h, u);
    const wid = lerp(1, 10, u);
    const len = lerp(2, 50, u);
    g.fillRect(vx - wid / 2 + (f.w * 0.5 - vx) * u, y, wid, len);
  }
}

function landmark(g: CanvasRenderingContext2D, f: Frame, kind: string, cam: number, time: number, show: number) {
  if (kind === "none" || show <= 0) return;
  const s = (0.25 + cam * 0.9) * Math.min(f.w, f.h) * 0.12;
  const x = f.w * (f.mobile ? 0.5 : 0.5 + (f.side - 0.5) * 0.55);
  const y = f.h * (0.62 + cam * 0.06);
  g.globalAlpha = clamp(show);
  const night = clamp((time - 0.6) / 0.3);
  if (kind === "cabin") {
    g.fillStyle = "#3b2a22";
    g.fillRect(x - s, y - s * 0.9, s * 2, s * 0.9);
    g.beginPath();
    g.moveTo(x - s * 1.2, y - s * 0.85);
    g.lineTo(x, y - s * 1.7);
    g.lineTo(x + s * 1.2, y - s * 0.85);
    g.closePath();
    g.fillStyle = "#24170f";
    g.fill();
    g.fillStyle = `rgba(255,200,110,${0.5 + night * 0.5})`;
    g.fillRect(x - s * 0.6, y - s * 0.6, s * 0.4, s * 0.35);
    g.fillRect(x + s * 0.2, y - s * 0.6, s * 0.4, s * 0.35);
  } else {
    g.fillStyle = "#1c2030";
    g.fillRect(x - s * 0.35, y - s * 3.2, s * 0.7, s * 3.2);
    g.fillStyle = `rgba(255,210,140,${0.3 + night * 0.7})`;
    for (let i = 0; i < 9; i++) g.fillRect(x - s * 0.22, y - s * 3 + i * s * 0.33, s * 0.44, s * 0.12);
    g.fillStyle = f.pal.accent;
    g.fillRect(x - s * 0.04, y - s * 3.6, s * 0.08, s * 0.4);
  }
  g.globalAlpha = 1;
}

function birds(g: CanvasRenderingContext2D, f: Frame, s: Record<string, any>, amount: number) {
  const list: Bird[] = (s.birds ??= []);
  const want = Math.round(amount * 9);
  while (list.filter((b) => b.life > 50).length < want) list.push({ x: -20 - Math.random() * 200, y: f.h * (0.15 + Math.random() * 0.25), vx: 30 + Math.random() * 30, vy: 0, ph: Math.random() * 6, life: 999 });
  for (const t of freshTaps(f, 300)) {
    if (s.lastTap === t.t) continue;
    s.lastTap = t.t;
    for (let i = 0; i < 9; i++) list.push({ x: t.x, y: t.y, vx: (Math.random() - 0.3) * 160, vy: -60 - Math.random() * 120, ph: Math.random() * 6, life: 4 });
  }
  g.strokeStyle = "rgba(25,25,40,0.75)";
  g.lineWidth = 1.6;
  g.beginPath();
  for (const b of list) {
    b.x += b.vx * f.dt;
    b.y += b.vy * f.dt + Math.sin(f.t * 2 + b.ph) * 0.2;
    b.vy *= 0.99;
    b.life -= f.dt;
    const flap = Math.sin(f.t * 9 + b.ph) * 4;
    g.moveTo(b.x - 6, b.y - flap);
    g.quadraticCurveTo(b.x - 2, b.y - 2, b.x, b.y);
    g.quadraticCurveTo(b.x + 2, b.y - 2, b.x + 6, b.y - flap);
  }
  g.stroke();
  s.birds = list.filter((b) => b.life > 0 && b.x < f.w + 40 && b.y > -40);
}

function water(g: CanvasRenderingContext2D, f: Frame, time: number, sunX: number, cam: number) {
  const top = f.h * (0.6 + cam * 0.04);
  const grd = g.createLinearGradient(0, top, 0, f.h);
  grd.addColorStop(0, mix(ramp3(SKY.mid, time), "#1e5f8a", 0.55));
  grd.addColorStop(1, mix("#0e3a5a", f.pal.accent, 0.1));
  g.fillStyle = grd;
  g.fillRect(0, top, f.w, f.h - top);
  // Rolling wave lines and the sun's path on the water.
  for (let i = 0; i < 16; i++) {
    const u = i / 16;
    const y = top + (f.h - top) * u * u + 4;
    g.strokeStyle = `rgba(255,255,255,${0.06 + u * 0.12})`;
    g.lineWidth = 1 + u * 2;
    g.beginPath();
    for (let x = 0; x <= f.w; x += 24) g.lineTo(x, y + Math.sin(x * 0.02 + f.t * (1 + u) + i) * (2 + u * 6));
    g.stroke();
    const glint = 0.25 * (1 - Math.abs(time - 0.6));
    g.fillStyle = `rgba(255,240,200,${glint * (1 - u)})`;
    g.fillRect(sunX - 40 * (1 + u * 3) + Math.sin(f.t * 3 + i) * 8, y, 80 * (1 + u * 3), 2 + u * 2);
  }
}

function fog(g: CanvasRenderingContext2D, f: Frame, amount: number, time: number) {
  if (amount <= 0.02) return;
  const col = mix(ramp3(SKY.low, time), "#ffffff", 0.3);
  const y = f.h * 0.5;
  const band = f.h * 0.35;
  if (!f.pointer) {
    // One band when nothing parts it (phones, or the cursor away): far cheaper to fill.
    const grd = g.createLinearGradient(0, y - band / 2, 0, y + band / 2);
    const a = amount * 0.55 * (0.8 + 0.2 * Math.sin(f.t * 0.4));
    grd.addColorStop(0, rgba(col, 0));
    grd.addColorStop(0.5, rgba(col, a));
    grd.addColorStop(1, rgba(col, 0));
    g.fillStyle = grd;
    g.fillRect(0, y - band / 2, f.w, band);
    return;
  }
  const strips = 16;
  for (let i = 0; i < strips; i++) {
    const x = (i / strips) * f.w;
    // environment.fog: the fog thins around the cursor.
    const d = f.pointer ? Math.abs(x + f.w / strips / 2 - f.px) / (f.w * 0.18) : 9;
    const a = amount * 0.55 * (d < 1 ? d * d : 1) * (0.8 + 0.2 * Math.sin(f.t * 0.4 + i));
    const grd = g.createLinearGradient(0, y - band / 2, 0, y + band / 2);
    grd.addColorStop(0, rgba(col, 0));
    grd.addColorStop(0.5, rgba(col, a));
    grd.addColorStop(1, rgba(col, 0));
    g.fillStyle = grd;
    g.fillRect(x, y - band / 2, f.w / strips + 1, band);
  }
}

export const landscape: Engine2D = (g, f, s) => {
  const world = str(f.params, "world", "mountains");
  const cam = clamp(num(f.beat, "cam", 0));
  const time = clamp(num(f.beat, "time", 0.4));
  const fogA = num(f.beat, "fog", 0.3) * (f.ch.environment > 0 ? 1 : 0.4);
  const focus = str(f.beat, "focus", "none");
  sky(g, f, time, f.pal.accent);
  const sp = sun(g, f, time, s);
  const drift = f.t * 0.004 * f.energy;
  if (world === "city") {
    for (let i = 0; i < 3; i++) city(g, f, i, cam, time, !!f.params.neon, s);
    if (f.params.road) road(g, f, cam, time);
  } else {
    const kind = world === "desert" ? "desert" : world === "coast" ? "coast" : world === "forest" ? "forest" : world === "clouds" || world === "sky" ? "hills" : "mountains";
    const far = mix(ramp3(SKY.mid, time), "#3c4a6b", 0.35);
    const near = world === "desert" ? mix("#c98a4b", "#3a2416", clamp(time - 0.4)) : world === "forest" ? mix("#2f5a3f", "#0d1a14", clamp(time - 0.3)) : mix("#36465e", "#0e1422", clamp(time - 0.3));
    const layers = f.mobile ? 3 : 5;
    const lit = 1 - clamp((time - 0.7) / 0.3);
    for (let i = 0; i < layers; i++) {
      const u = i / (layers - 1);
      ridge(g, f, { seed: 11 + i * 13, base: 0.52 + u * 0.22, amp: world === "coast" ? 0.06 : 0.16 - u * 0.05, z: 0.12 + u * 0.8, color: mix(far, near, u), kind: world === "coast" && i < 2 ? "mountains" : kind, cam, drift: drift * (1 + u), lit });
      if (i === layers - 2) fog(g, f, fogA, time);
    }
    if (world === "coast" || world === "river" || world === "falls") water(g, f, time, sp.x, cam);
    if (f.params.road && world !== "coast") road(g, f, cam, time);
  }
  landmark(g, f, focus, cam, time, clamp(cam * 2 - 0.6));
  if (f.ch.environment > 0) birds(g, f, s, num(f.beat, "birds", 0.2));
  // A soft floor so the words below the stage always sit on calm colour.
  const veil = g.createLinearGradient(0, f.h * 0.75, 0, f.h);
  veil.addColorStop(0, rgba(f.pal.bg, 0));
  veil.addColorStop(1, rgba(f.pal.bg, 0.35));
  g.fillStyle = veil;
  g.fillRect(0, f.h * 0.75, f.w, f.h * 0.25);
};
