import { clamp, freshTaps, lerp, mix, num, rgba, type Engine2D, type Frame } from "../frame";

// Depths: a dive with a whale for company. Beat keys: depth (0 surface .. 1 floor), light,
// creatureX (-1 left .. 1 right), bubbles. The whale glides to each scene's side, turns toward
// the cursor (character.look), rolls and blows bubbles when tapped (click.react), and bubbles
// stream away from the cursor (cursor.repel).

interface Bubble {
  x: number;
  y: number;
  r: number;
  v: number;
  wob: number;
}

function water(g: CanvasRenderingContext2D, f: Frame, depth: number, light: number) {
  const top = mix(mix("#3fb7d9", "#0f4f7a", depth), f.pal.accent, 0.08);
  const bot = mix(mix("#0a4a74", "#020b1c", depth), f.pal.accent, 0.05);
  const grd = g.createLinearGradient(0, 0, 0, f.h);
  grd.addColorStop(0, top);
  grd.addColorStop(1, bot);
  g.fillStyle = grd;
  g.fillRect(0, 0, f.w, f.h);
  // Light shafts sway from the surface and narrow with depth.
  g.save();
  g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 6; i++) {
    const x = f.w * (0.1 + i * 0.17) + Math.sin(f.t * 0.3 + i) * 30 + f.nx * 20;
    const a = 0.07 * light * (0.6 + 0.4 * Math.sin(f.t * 0.7 + i * 2));
    const sh = g.createLinearGradient(0, 0, 0, f.h * (0.4 + light * 0.6));
    sh.addColorStop(0, `rgba(200,245,255,${a})`);
    sh.addColorStop(1, "rgba(200,245,255,0)");
    g.fillStyle = sh;
    g.beginPath();
    g.moveTo(x - 20, 0);
    g.lineTo(x + 30, 0);
    g.lineTo(x + 140, f.h);
    g.lineTo(x - 60, f.h);
    g.closePath();
    g.fill();
  }
  g.restore();
  if (depth < 0.35) {
    // Caustics: the surface's ripple pattern near the top.
    g.strokeStyle = `rgba(220,250,255,${0.18 * (1 - depth / 0.35)})`;
    g.lineWidth = 1.5;
    for (let j = 0; j < 5; j++) {
      g.beginPath();
      for (let x = 0; x <= f.w; x += 20) g.lineTo(x, 18 + j * 16 + Math.sin(x * 0.03 + f.t * 1.3 + j) * 5 + Math.sin(x * 0.011 - f.t) * 6);
      g.stroke();
    }
  }
  if (depth > 0.6) {
    // The sea floor rises into view.
    const k = (depth - 0.6) / 0.4;
    const fy = f.h * (1.05 - k * 0.2);
    g.fillStyle = mix("#2a3c4f", "#0b1624", 0.5);
    g.beginPath();
    g.moveTo(0, f.h);
    for (let x = 0; x <= f.w; x += 30) g.lineTo(x, fy + Math.sin(x * 0.01) * 18);
    g.lineTo(f.w, f.h);
    g.fill();
    g.strokeStyle = rgba(mix("#3aa17e", f.pal.accent, 0.3), 0.6);
    g.lineWidth = 4;
    for (let i = 0; i < 9; i++) {
      const x = (i / 9) * f.w + 30;
      g.beginPath();
      g.moveTo(x, fy + 10);
      for (let y = 0; y < 90 * k; y += 10) g.lineTo(x + Math.sin(f.t * 1.2 + y * 0.06 + i) * (y * 0.12), fy - y);
      g.stroke();
    }
  }
}

function whale(g: CanvasRenderingContext2D, f: Frame, s: Record<string, any>, targetX: number) {
  const scale = Math.min(f.w, f.h) * (f.mobile ? 0.0022 : 0.0034);
  const tx = f.w * (0.5 + targetX * (f.mobile ? 0.18 : 0.3));
  const ty = f.h * (f.mobile ? 0.3 : 0.5) + Math.sin(f.t * 0.6) * 14;
  s.wx = lerp(s.wx ?? tx, tx, 0.015);
  s.wy = lerp(s.wy ?? ty, ty, 0.03);
  const vx = tx - s.wx;
  s.dir = lerp(s.dir ?? 1, vx < -4 ? -1 : vx > 4 ? 1 : s.dir ?? 1, 0.04);
  // Roll after a tap on the whale.
  for (const t of freshTaps(f, 1400)) {
    if (s.tapT === t.t) continue;
    if (Math.hypot(t.x - s.wx, t.y - s.wy) < 220 * scale * 1.1) {
      s.tapT = t.t;
      s.roll = f.t;
      s.burst = { x: s.wx, y: s.wy, t: f.t };
    }
  }
  const roll = s.roll !== undefined ? clamp((f.t - s.roll) / 1.4) : 1;
  const look = f.pointer ? clamp((f.py - s.wy) / f.h, -0.3, 0.3) : 0;
  g.save();
  g.translate(s.wx, s.wy);
  g.scale(scale * (s.dir < 0 ? -1 : 1) * (Math.abs(s.dir) * 0.3 + 0.7), scale * Math.cos(roll * Math.PI * 2));
  g.rotate(look * 0.6 + Math.sin(f.t * 0.6) * 0.04);
  const body = mix("#1f3b5c", f.pal.accent, 0.12);
  const belly = mix("#9cc7d8", "#ffffff", 0.2);
  // The body is a spine with a travelling wave; the tail beats.
  const beat = Math.sin(f.t * 1.6) * 14;
  g.fillStyle = body;
  g.beginPath();
  g.moveTo(120, -8);
  g.bezierCurveTo(100, -60, -40, -62, -120, -20 + beat * 0.3);
  g.lineTo(-175, -6 + beat);
  g.lineTo(-215, -38 + beat * 1.6);
  g.quadraticCurveTo(-200, 0 + beat, -215, 34 + beat * 1.6);
  g.lineTo(-175, 6 + beat);
  g.lineTo(-120, 18 + beat * 0.3);
  g.bezierCurveTo(-40, 52, 90, 48, 120, -8);
  g.fill();
  g.fillStyle = belly;
  g.beginPath();
  g.moveTo(112, 6);
  g.bezierCurveTo(70, 40, -40, 44, -110, 16 + beat * 0.3);
  g.bezierCurveTo(-40, 30, 60, 24, 112, 6);
  g.fill();
  // Throat grooves, fin and eye.
  g.strokeStyle = rgba("#ffffff", 0.35);
  g.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.moveTo(100 - i * 4, 10 + i * 5);
    g.quadraticCurveTo(40, 26 + i * 5, -10, 24 + i * 4);
    g.stroke();
  }
  g.fillStyle = body;
  g.beginPath();
  g.moveTo(30, 22);
  g.quadraticCurveTo(-10, 70 + Math.sin(f.t * 1.6) * 8, -30, 74);
  g.quadraticCurveTo(0, 40, 10, 22);
  g.fill();
  g.fillStyle = "#0b1420";
  g.beginPath();
  g.arc(78, -6, 4, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

export const depths: Engine2D = (g, f, s) => {
  const depth = clamp(num(f.beat, "depth", 0));
  const light = clamp(num(f.beat, "light", 1));
  water(g, f, depth, light);
  const bubbles: Bubble[] = (s.b ??= []);
  const want = Math.round(f.budget.particles * 0.5 * clamp(num(f.beat, "bubbles", 0.4) + 0.2));
  while (bubbles.length < want) bubbles.push({ x: Math.random() * f.w, y: f.h + Math.random() * f.h, r: 1 + Math.random() * 4, v: 20 + Math.random() * 50, wob: Math.random() * 6 });
  if (bubbles.length > want) bubbles.length = want;
  if (s.burst && f.t - s.burst.t < 0.05) for (let i = 0; i < 24; i++) bubbles.push({ x: s.burst.x + (Math.random() - 0.5) * 60, y: s.burst.y, r: 2 + Math.random() * 5, v: 60 + Math.random() * 120, wob: Math.random() * 6 });
  if (f.ch.characters > 0) whale(g, f, s, num(f.beat, "creatureX", 0.4));
  g.strokeStyle = "rgba(230,250,255,0.55)";
  g.lineWidth = 1;
  for (const b of bubbles) {
    b.y -= b.v * f.dt * (1 + Math.abs(f.speed) * 0.02);
    b.x += Math.sin(f.t * 2 + b.wob) * 0.3;
    if (f.pointer) {
      const dx = b.x - f.px;
      const dy = b.y - f.py;
      const d = Math.hypot(dx, dy);
      if (d < 120) (b.x += (dx / d) * (120 - d) * 0.06), (b.y += (dy / d) * (120 - d) * 0.06);
    }
    if (b.y < -10) (b.y = f.h + 10), (b.x = Math.random() * f.w);
    g.beginPath();
    g.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    g.stroke();
  }
  // A tap on open water sends up a burst of bubbles too.
  for (const t of freshTaps(f, 200)) if (s.lastOpen !== t.t) (s.lastOpen = t.t), (s.burst = { x: t.x, y: t.y, t: f.t });
};
