import { anchorBox, clamp, freshTaps, lerp, mix, num, rgba, rng, smooth, type Engine2D } from "../frame";

// Brew: from bean to cup. Beat keys: stage (0 bean, 1 roast, 2 grind, 3 pour, 4 cup), steam,
// fill. The same beans travel through every stage: they fall, darken and crack, break into
// grounds, then the coffee pours into a cup that comes to the front. Steam curls away from the
// cursor (cursor.repel); a tap tumbles the beans (click.transform).

interface Bean {
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  va: number;
  rest: number;
}

export const brew: Engine2D = (g, f, s) => {
  const stage = clamp(num(f.beat, "stage", 0), 0, 4);
  const steam = clamp(num(f.beat, "steam", 0));
  const fill = clamp(num(f.beat, "fill", 0));
  const box = anchorBox(f);
  const { x: cx, y: cy, size } = box;
  // Warm backdrop light behind the object.
  const glow = g.createRadialGradient(cx, cy, 0, cx, cy, size * 1.1);
  glow.addColorStop(0, rgba(mix(f.pal.accent, "#ffb070", 0.5), f.pal.dark ? 0.22 : 0.18));
  glow.addColorStop(1, rgba(f.pal.accent, 0));
  g.fillStyle = glow;
  g.fillRect(cx - size * 1.2, cy - size * 1.2, size * 2.4, size * 2.4);
  g.globalAlpha = box.alpha;

  const roast = smooth(clamp(stage - 0.4));
  const grind = smooth(clamp(stage - 1.5));
  const cup = smooth(clamp(stage - 2.4));
  const n = Math.round(lerp(14, 36, f.energy) * (f.mobile ? 0.6 : 1));
  const beans: Bean[] = (s.beans ??= []);
  const R = rng(9);
  const floor = cy + size * 0.3;
  while (beans.length < n) {
    const i = beans.length;
    beans.push({ x: cx + (R() - 0.5) * size * 0.7, y: cy - size * (0.6 + R()), vx: 0, vy: 0, a: R() * 6, va: (R() - 0.5) * 3, rest: (R() - 0.5) * size * 0.6 + (i % 2 ? 4 : -4) });
  }
  if (beans.length > n) beans.length = n;
  // click.transform: a tap tumbles the beans up again.
  for (const t of freshTaps(f, 300)) if (s.tap !== t.t) {
    s.tap = t.t;
    for (const b of beans) (b.vy = -200 - Math.random() * 260), (b.vx = (Math.random() - 0.5) * 220), (b.va = (Math.random() - 0.5) * 12);
  }
  const beanAlpha = 1 - grind;
  if (beanAlpha > 0.01) {
    const green = "#8a9a5b";
    const brown = mix("#6b3f22", "#2b170c", roast * 0.7);
    g.save();
    g.globalAlpha = box.alpha * beanAlpha;
    for (const [i, b] of beans.entries()) {
      // Beans fall into a pile, with a little bounce.
      const restY = floor - Math.abs(b.rest) * 0.25 - (i % 5) * size * 0.025;
      b.vy += 900 * f.dt;
      b.x += b.vx * f.dt;
      b.y += b.vy * f.dt;
      b.a += b.va * f.dt;
      b.vx *= 0.98;
      if (b.y > restY) (b.y = restY), (b.vy *= -0.25), (b.va *= 0.6), (b.vx = lerp(b.vx, (cx + b.rest - b.x) * 2, 0.2));
      if (f.reduced) (b.y = restY), (b.x = cx + b.rest);
      // Roasting shimmer shakes them a little.
      const shake = roast > 0 && roast < 1 ? Math.sin(f.t * 40 + i) * 0.8 : 0;
      const r = size * 0.07 * (1 - grind * 0.6);
      g.save();
      g.translate(b.x + shake, b.y);
      g.rotate(b.a);
      g.fillStyle = mix(green, brown, roast);
      g.beginPath();
      g.ellipse(0, 0, r, r * 0.68, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = rgba("#1a0d05", 0.55);
      g.lineWidth = Math.max(1, r * 0.15);
      g.beginPath();
      g.moveTo(-r * 0.8, 0);
      g.bezierCurveTo(-r * 0.3, -r * 0.35, r * 0.3, r * 0.35, r * 0.8, 0);
      g.stroke();
      g.restore();
    }
    g.restore();
  }
  if (grind > 0.01 && cup < 0.99) {
    // Grounds: a soft mound of fine particles.
    g.save();
    g.globalAlpha = box.alpha * grind * (1 - cup);
    const r2 = rng(3);
    g.fillStyle = "#3a2112";
    for (let i = 0; i < 260 * (f.mobile ? 0.5 : 1); i++) {
      const u = r2() * 2 - 1;
      const h = (1 - u * u) * size * 0.16 * r2();
      g.fillRect(cx + u * size * 0.32, floor - h, 2, 2);
    }
    g.restore();
  }
  if (cup > 0.01) {
    g.save();
    g.globalAlpha = box.alpha * cup;
    const scale = lerp(0.85, 1.05, smooth(clamp(stage - 3)));
    const w = size * 0.42 * scale;
    const h = size * 0.36 * scale;
    const top = floor - h;
    // Saucer, cup, handle.
    g.fillStyle = f.pal.dark ? "#e9e3dc" : "#fbf8f4";
    g.beginPath();
    g.ellipse(cx, floor + 4, w * 0.95, h * 0.16, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = rgba("#000000", 0.08);
    g.stroke();
    g.beginPath();
    g.moveTo(cx - w / 2, top);
    g.lineTo(cx + w / 2, top);
    g.quadraticCurveTo(cx + w * 0.46, floor, cx + w * 0.2, floor);
    g.lineTo(cx - w * 0.2, floor);
    g.quadraticCurveTo(cx - w * 0.46, floor, cx - w / 2, top);
    g.fill();
    g.stroke();
    g.lineWidth = w * 0.07;
    g.strokeStyle = f.pal.dark ? "#e9e3dc" : "#fbf8f4";
    g.beginPath();
    g.ellipse(cx + w * 0.52, top + h * 0.35, w * 0.13, h * 0.2, 0, -1.3, 1.6);
    g.stroke();
    // The pour: a stream from above while the cup fills.
    const pour = clamp(stage - 2.6) * (1 - clamp(stage - 3.6));
    const level = top + h * 0.12 + (1 - fill) * h * 0.4;
    g.fillStyle = "#4a2614";
    g.beginPath();
    g.ellipse(cx, level, w * 0.46 * (0.86 + 0.14 * (1 - (level - top) / h)), h * 0.08, 0, 0, Math.PI * 2);
    g.fill();
    if (fill > 0.9) {
      // A little latte heart.
      g.fillStyle = rgba("#f1d9bd", 0.85);
      g.beginPath();
      const hx = cx;
      const hy = level;
      const k = w * 0.06;
      g.moveTo(hx, hy + k * 0.8);
      g.bezierCurveTo(hx - k * 2, hy - k * 0.6, hx - k * 0.8, hy - k * 1.4, hx, hy - k * 0.5);
      g.bezierCurveTo(hx + k * 0.8, hy - k * 1.4, hx + k * 2, hy - k * 0.6, hx, hy + k * 0.8);
      g.fill();
    }
    if (pour > 0.02) {
      g.strokeStyle = rgba("#4a2614", pour);
      g.lineWidth = w * 0.06;
      g.beginPath();
      g.moveTo(cx + Math.sin(f.t * 6) * 1.5, cy - size * 0.9);
      g.lineTo(cx, level);
      g.stroke();
    }
    // Steam curls up and bends away from the cursor.
    const st = steam * (f.ch.environment > 0 ? 1 : 0.5);
    if (st > 0.02) {
      g.lineCap = "round";
      for (let i = 0; i < 3; i++) {
        g.strokeStyle = rgba(f.pal.dark ? "#ffffff" : "#8a7a70", 0.28 * st);
        g.lineWidth = w * 0.05;
        g.beginPath();
        for (let k = 0; k <= 12; k++) {
          const u = k / 12;
          let x = cx + (i - 1) * w * 0.18 + Math.sin(f.t * 1.4 + u * 5 + i) * w * 0.08 * u;
          const y = top - u * size * 0.55;
          if (f.pointer) x += clamp((x - f.px) / (size * 0.5), -1, 1) * u * w * 0.3 * (1 - clamp(Math.abs(y - f.py) / size));
          k ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
      }
    }
    g.restore();
  }
  g.globalAlpha = 1;
};
