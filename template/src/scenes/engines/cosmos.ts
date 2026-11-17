import { clamp, freshTaps, hsl, hueOf, lerp, mix, num, rgba, rng, smooth, str, type Engine2D, type Frame } from "../frame";

// Cosmos: a field of points in depth. Styles: "stars" and "planets" (a flight past worlds,
// beat keys cam, warp, planet), "data" (noise that becomes structure, beat key order) and
// "ship". Scroll speeds the flight and warps between planets; the cursor bends the field;
// a tap jumps (warp) or connects the data.

interface Star {
  x: number;
  y: number;
  z: number;
  pz: number;
}

/** k: -1 gone to the left, 0 in place, 1 still off to the right. */
function planet(g: CanvasRenderingContext2D, f: Frame, index: number, k: number, hue: number) {
  // Each scene's planet slides in from the right and leaves to the left.
  const R = rng(100 + Math.floor(index) * 37);
  const r = Math.min(f.w, f.h) * (f.mobile ? 0.22 : 0.3) * (0.7 + R() * 0.5);
  const home = f.mobile ? 0.5 : f.side < 0.5 ? 0.28 : f.side > 0.55 ? 0.72 : 0.5;
  const x = f.w * (k >= 0 ? lerp(home, 1.4, smooth(clamp(k))) : lerp(home, -0.4, smooth(clamp(-k)))) + f.nx * 14;
  const y = f.h * (f.mobile ? 0.28 : 0.52) + f.ny * 10;
  const h = (hue + Math.floor(index) * 57) % 360;
  const grd = g.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r);
  grd.addColorStop(0, hsl(h, 60, 72));
  grd.addColorStop(0.6, hsl(h, 55, 42));
  grd.addColorStop(1, hsl(h, 60, 12));
  g.fillStyle = grd;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.save();
  g.clip();
  g.globalAlpha = 0.18;
  for (let i = 0; i < 6; i++) {
    g.fillStyle = i % 2 ? hsl(h + 20, 50, 70) : hsl(h - 20, 40, 25);
    const by = y - r + (i + 0.5) * ((2 * r) / 6) + Math.sin(f.t * 0.2 + i) * 4;
    g.fillRect(x - r, by, r * 2, r * 0.12 + R() * r * 0.1);
  }
  g.restore();
  g.globalAlpha = 1;
  if (R() > 0.45) {
    g.strokeStyle = rgba(hsl(h + 40, 60, 80), 0.6);
    g.lineWidth = r * 0.05;
    g.beginPath();
    g.ellipse(x, y, r * 1.7, r * 0.35, -0.3, Math.PI * 0.05, Math.PI * 0.95, true);
    g.stroke();
  }
  // Atmosphere glow.
  const glow = g.createRadialGradient(x, y, r * 0.95, x, y, r * 1.25);
  glow.addColorStop(0, rgba(hsl(h, 70, 70), 0.35));
  glow.addColorStop(1, rgba(hsl(h, 70, 70), 0));
  g.fillStyle = glow;
  g.fillRect(x - r * 1.3, y - r * 1.3, r * 2.6, r * 2.6);
}

function field(g: CanvasRenderingContext2D, f: Frame, s: Record<string, any>, speed: number, warp: number) {
  const n = Math.max(60, f.budget.particles * 2);
  const stars: Star[] = (s.st ??= []);
  while (stars.length < n) stars.push({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: Math.random(), pz: 1 });
  if (stars.length > n) stars.length = n;
  const cx = f.w / 2 + f.nx * 40;
  const cy = f.h / 2 + f.ny * 30;
  const fov = Math.max(f.w, f.h) * 0.5;
  g.lineCap = "round";
  for (const st of stars) {
    st.pz = st.z;
    st.z -= speed * f.dt;
    if (st.z <= 0.02) (st.z = 1), (st.pz = 1), (st.x = (Math.random() - 0.5) * 2), (st.y = (Math.random() - 0.5) * 2);
    let sx = cx + (st.x / st.z) * fov;
    let sy = cy + (st.y / st.z) * fov;
    if (f.pointer) {
      // cursor.particles: the field bends around the cursor.
      const dx = sx - f.px;
      const dy = sy - f.py;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 140) (sx += (dx / d) * (140 - d) * 0.35), (sy += (dy / d) * (140 - d) * 0.35);
    }
    const px = cx + (st.x / st.pz) * fov;
    const py = cy + (st.y / st.pz) * fov;
    const a = clamp(1 - st.z) * 0.9;
    g.strokeStyle = `rgba(235,240,255,${a})`;
    g.lineWidth = Math.max(0.6, (1 - st.z) * 2.4);
    g.beginPath();
    g.moveTo(sx, sy);
    g.lineTo(warp > 0.15 ? lerp(sx, px, 1 + warp * 6) : sx + 0.1, warp > 0.15 ? lerp(sy, py, 1 + warp * 6) : sy + 0.1);
    g.stroke();
  }
}

function data(g: CanvasRenderingContext2D, f: Frame, s: Record<string, any>, order: number) {
  const n = Math.max(40, Math.min(160, f.budget.particles));
  const pts: { x: number; y: number; ox: number; oy: number; c: number; ph: number }[] = (s.pts ??= []);
  const R = rng(f.seed || 5);
  while (pts.length < n) pts.push({ x: R(), y: R(), ox: R(), oy: R(), c: Math.floor(R() * 4), ph: R() * 6 });
  const accent = f.pal.accent;
  const ink = f.pal.dark ? "#cfd8ff" : "#29324d";
  const left = f.mobile ? 0.08 : f.side < 0.5 ? 0.06 : 0.5;
  const width = f.mobile ? 0.84 : 0.44;
  const pos: [number, number][] = [];
  pts.forEach((p, i) => {
    // Noise, then four clusters, then a rising trend line.
    const nx = p.ox + Math.sin(f.t * 0.3 + p.ph) * 0.03;
    const ny = p.oy + Math.cos(f.t * 0.27 + p.ph) * 0.03;
    const ang = p.ph;
    const cxs = [0.2, 0.45, 0.65, 0.85][p.c];
    const cys = [0.7, 0.55, 0.45, 0.3][p.c];
    const kx = cxs + Math.cos(ang) * 0.06;
    const ky = cys + Math.sin(ang) * 0.06;
    const lx = i / n;
    const ly = 0.8 - lx * 0.55 - Math.sin(lx * 9) * 0.03;
    const a = smooth(clamp(order / 0.5));
    const b = smooth(clamp((order - 0.6) / 0.4));
    let x = lerp(lerp(nx, kx, a), lx, b);
    let y = lerp(lerp(ny, ky, a), ly, b);
    x = f.w * (left + x * width);
    y = f.h * (f.mobile ? 0.05 + y * 0.45 : 0.1 + y * 0.8);
    if (f.pointer) {
      const dx = x - f.px;
      const dy = y - f.py;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 110) (x += (dx / d) * (110 - d) * 0.5), (y += (dy / d) * (110 - d) * 0.5);
    }
    p.x = x;
    p.y = y;
    pos.push([x, y]);
  });
  const taps = freshTaps(f, 1500);
  const link = clamp((order - 0.3) / 0.4) + (taps.length ? 0.6 * (1 - taps[taps.length - 1].age) : 0);
  if (link > 0) {
    g.strokeStyle = rgba(accent, 0.25 * clamp(link));
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i < pos.length; i++)
      for (let j = i + 1; j < Math.min(pos.length, i + 6); j++) {
        const d = Math.hypot(pos[i][0] - pos[j][0], pos[i][1] - pos[j][1]);
        if (d < 90) (g.moveTo(pos[i][0], pos[i][1]), g.lineTo(pos[j][0], pos[j][1]));
      }
    g.stroke();
  }
  if (order > 0.75) {
    g.strokeStyle = accent;
    g.lineWidth = 3;
    g.beginPath();
    const k = smooth((order - 0.75) / 0.25);
    pos.slice(0, Math.max(2, Math.round(pos.length * k))).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();
  }
  for (const [i, [x, y]] of pos.entries()) {
    g.fillStyle = i % 7 === 0 ? accent : rgba(ink, 0.7);
    g.beginPath();
    g.arc(x, y, i % 7 === 0 ? 3.2 : 2, 0, Math.PI * 2);
    g.fill();
  }
}

export const cosmos: Engine2D = (g, f, s) => {
  const style = str(f.params, "style", "stars");
  const dark = style !== "data" || f.pal.dark;
  const bg = g.createRadialGradient(f.w * 0.5, f.h * 0.4, 0, f.w * 0.5, f.h * 0.5, Math.max(f.w, f.h) * 0.8);
  if (dark) {
    bg.addColorStop(0, mix("#1a1f45", f.pal.accent, 0.18));
    bg.addColorStop(1, "#04050d");
  } else {
    bg.addColorStop(0, mix(f.pal.bg, f.pal.accent, 0.06));
    bg.addColorStop(1, f.pal.bg);
  }
  g.fillStyle = bg;
  g.fillRect(0, 0, f.w, f.h);
  if (style === "data") {
    const order = clamp(num(f.beat, "order", 0));
    data(g, f, s, order);
    return;
  }
  // A tap is a warp jump.
  const tap = freshTaps(f, 900).pop();
  const warp = clamp(num(f.beat, "warp", 0) + (tap ? 1 - tap.age : 0) + Math.abs(f.speed) * 0.01);
  const speed = 0.05 + f.energy * 0.12 + warp * 1.4;
  // Nebula haze.
  const neb = g.createRadialGradient(f.w * 0.3, f.h * 0.3, 0, f.w * 0.3, f.h * 0.3, f.w * 0.6);
  neb.addColorStop(0, rgba(f.pal.accent, 0.12));
  neb.addColorStop(1, rgba(f.pal.accent, 0));
  g.fillStyle = neb;
  g.fillRect(0, 0, f.w, f.h);
  field(g, f, s, speed, warp);
  if (style === "planets" || style === "stars") {
    const p = num(f.beat, "planet", 0);
    const i = Math.floor(p);
    const k = p - i;
    const hue = hueOf(f.pal.accent);
    // The current planet leaves as the next arrives.
    if (k > 0.02) planet(g, f, i + 1, 1 - k, hue);
    planet(g, f, i, -k, hue);
  }
};
