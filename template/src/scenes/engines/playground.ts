import { clamp, freshTaps, hsl, hueOf, lerp, mix, num, rgba, rng, roundRect, str, type Engine2D } from "../frame";

// Playground: shapes with simple physics. Styles: "stickers" (soft rounded shapes with the
// site's words on them) and "retro" (pixel blocks with a score). Beat keys: gravity (0 float
// .. 1 full), count (share of shapes on screen), scatter (sideways tilt). Drag and throw a
// shape with the cursor (touch.drag), tap to burst them apart (click.burst); scrolling fast
// tips the world. Our own light physics: circles, walls and pairwise pushes, no library.

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  c: string;
  label: string;
  a: number;
  va: number;
  shape: number;
}

export const playground: Engine2D = (g, f, s) => {
  const retro = str(f.params, "style", "stickers") === "retro";
  const gravity = num(f.beat, "gravity", 1);
  const count = clamp(num(f.beat, "count", 0.6));
  const scatter = num(f.beat, "scatter", 0);
  const max = Math.round((f.mobile ? 12 : 22) * (0.6 + f.energy * 0.4));
  const n = Math.max(4, Math.round(max * count));
  const bodies: Body[] = (s.bodies ??= []);
  const R = rng(f.seed || 3);
  const hue = hueOf(f.pal.accent);
  const unit = Math.min(f.w, f.h) * (f.mobile ? 0.055 : 0.045);
  const toy = ["#ff8fab", "#7bdff2", "#b8f2a1", "#ffd166", "#c3a6ff", "#ffb38a"];
  while (bodies.length < n) {
    const i = bodies.length;
    const words = f.labels.length ? f.labels : ["Hello", "Play", "Fun", "Go"];
    bodies.push({
      x: f.w * (0.15 + R() * 0.7),
      y: -unit * (2 + R() * 6),
      vx: (R() - 0.5) * 60,
      vy: 0,
      r: unit * (0.8 + R() * 0.9),
      c: retro ? hsl((hue + 60 * (i % 6)) % 360, 85, 55) : toy[i % toy.length],
      label: i % 2 === 0 ? words[(i / 2) % words.length].slice(0, 12) : "",
      a: R() * 6,
      va: 0,
      shape: i % 3,
    });
  }
  if (bodies.length > n) bodies.length = n;
  // Taps burst the shapes away from the tap.
  for (const t of freshTaps(f, 300)) if (s.tap !== t.t) {
    s.tap = t.t;
    for (const b of bodies) {
      const dx = b.x - t.x;
      const dy = b.y - t.y;
      const d = Math.hypot(dx, dy) || 1;
      const k = clamp(1 - d / (unit * 12)) * 900;
      (b.vx += (dx / d) * k), (b.vy += (dy / d) * k - 200 * clamp(1 - d / (unit * 12))), (b.va += (Math.random() - 0.5) * 8);
    }
  }
  // Drag: the shape under a still-moving cursor follows it; release throws it.
  const pv = s.pv ?? { x: f.px, y: f.py };
  const pvx = (f.px - pv.x) / Math.max(f.dt, 0.008);
  const pvy = (f.py - pv.y) / Math.max(f.dt, 0.008);
  s.pv = { x: f.px, y: f.py };
  const floor = f.h - (f.mobile ? f.h * 0.05 : unit * 0.6);
  const tilt = clamp(scatter * 0.6 + clamp(f.speed * 0.01, -0.5, 0.5), -1, 1);
  const gx = tilt * 600 * gravity;
  const gy = 1400 * gravity;
  const steps = 2;
  const dt = f.dt / steps;
  for (let k = 0; k < steps; k++) {
    for (const b of bodies) {
      if (f.pointer && Math.hypot(b.x - f.px, b.y - f.py) < b.r * 1.1) {
        // cursor.push: the cursor shoves shapes it moves through.
        b.vx = lerp(b.vx, pvx * 0.8, 0.3);
        b.vy = lerp(b.vy, pvy * 0.8, 0.3);
      }
      b.vx += gx * dt;
      b.vy += gy * dt;
      if (gravity < 0.1) (b.vx += Math.sin(f.t * 0.6 + b.a) * 20 * dt), (b.vy += Math.cos(f.t * 0.5 + b.a) * 20 * dt);
      b.vx *= 1 - 0.4 * dt;
      b.vy *= 1 - 0.4 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.a += b.va * dt;
      b.va *= 1 - 1.5 * dt;
      if (b.y > floor - b.r) (b.y = floor - b.r), (b.vy *= -0.35), (b.vx *= 0.92), (b.va = b.vx / b.r);
      if (gravity < 0.1 && b.y < b.r) (b.y = b.r), (b.vy = Math.abs(b.vy) * 0.5);
      if (b.x < b.r) (b.x = b.r), (b.vx = Math.abs(b.vx) * 0.5);
      if (b.x > f.w - b.r) (b.x = f.w - b.r), (b.vx = -Math.abs(b.vx) * 0.5);
    }
    for (let i = 0; i < bodies.length; i++)
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i];
        const b = bodies[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const min = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 < min * min && d2 > 0.0001) {
          const d = Math.sqrt(d2);
          const push = (min - d) / 2;
          const ux = dx / d;
          const uy = dy / d;
          (a.x -= ux * push), (a.y -= uy * push), (b.x += ux * push), (b.y += uy * push);
          const rel = (b.vx - a.vx) * ux + (b.vy - a.vy) * uy;
          if (rel < 0) {
            const imp = -rel * 0.6;
            (a.vx -= ux * imp), (a.vy -= uy * imp), (b.vx += ux * imp), (b.vy += uy * imp);
          }
        }
      }
  }
  if (f.reduced) for (const [i, b] of bodies.entries()) (b.x = f.w * (0.1 + ((i * 0.13) % 0.8))), (b.y = floor - b.r - (i % 3) * b.r * 2);
  // Floor line.
  g.strokeStyle = rgba(f.pal.text, 0.12);
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, floor);
  g.lineTo(f.w, floor);
  g.stroke();
  for (const b of bodies) {
    g.save();
    g.translate(b.x, b.y);
    g.rotate(b.a);
    if (retro) {
      const k = b.r * 1.7;
      g.fillStyle = b.c;
      g.fillRect(-k / 2, -k / 2, k, k);
      g.fillStyle = rgba("#ffffff", 0.35);
      g.fillRect(-k / 2, -k / 2, k, k * 0.18);
      g.fillStyle = rgba("#000000", 0.25);
      g.fillRect(-k / 2, k * 0.32, k, k * 0.18);
    } else {
      g.fillStyle = b.c;
      g.shadowColor = rgba("#000000", 0.15);
      g.shadowBlur = 10;
      g.shadowOffsetY = 4;
      if (b.shape === 0) (g.beginPath(), g.arc(0, 0, b.r, 0, Math.PI * 2));
      else if (b.shape === 1) roundRect(g, -b.r, -b.r * 0.8, b.r * 2, b.r * 1.6, b.r * 0.45);
      else {
        g.beginPath();
        for (let k = 0; k < 10; k++) {
          const rr = k % 2 ? b.r * 0.55 : b.r;
          const ang = (k / 10) * Math.PI * 2 - Math.PI / 2;
          k ? g.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr) : g.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
        }
        g.closePath();
      }
      g.fill();
      g.shadowColor = "transparent";
    }
    if (b.label && b.shape !== 2) {
      g.fillStyle = mix(b.c, "#000000", 0.6);
      const fs = Math.max(10, b.r * 0.42);
      g.font = `700 ${fs}px ${retro ? "ui-monospace, monospace" : "system-ui, sans-serif"}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(b.label.length > 7 ? b.label.slice(0, 7) : b.label, 0, 0, b.r * 1.8);
    }
    g.restore();
  }
  if (retro) {
    s.score = (s.score ?? 0) + Math.round(Math.abs(f.speed)) + (f.taps.length && s.lastTap !== f.taps[f.taps.length - 1].t ? 100 : 0);
    if (f.taps.length) s.lastTap = f.taps[f.taps.length - 1].t;
    g.fillStyle = f.pal.accent;
    g.font = `700 ${f.mobile ? 12 : 14}px ui-monospace, monospace`;
    g.textAlign = "right";
    g.fillText("SCORE " + String(s.score % 1000000).padStart(6, "0"), f.w - 18, f.mobile ? 76 : 92);
  }
};
