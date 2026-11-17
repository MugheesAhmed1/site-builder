import { anchorBox, clamp, freshTaps, lerp, mix, num, rgba, smooth, str, type Engine2D, type Frame } from "../frame";

// Morph: one object that transforms from scene to scene. Subjects: "dough" (ball, kneaded,
// proved, baked, sliced), "tooth" (clean, problem, scan, restored, gleaming) and "product"
// (a device the camera walks around). Beat keys: shape (stage index), spin (degrees), scale,
// flour or shine. The object leans toward the cursor; a tap dusts flour or runs a sparkle.

function blob(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, wob: number, t: number, flat = 0) {
  g.beginPath();
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + Math.sin(a * 3 + t) * wob + Math.sin(a * 5 - t * 1.3) * wob * 0.5;
    let yy = Math.sin(a) * ry * k;
    if (yy > 0) yy *= 1 - flat; // a flat bottom where it rests
    const xx = Math.cos(a) * rx * k;
    i ? g.lineTo(x + xx, y + yy) : g.moveTo(x + xx, y + yy);
  }
  g.closePath();
}

function dough(g: CanvasRenderingContext2D, f: Frame, s: Record<string, any>, x: number, y: number, size: number, shape: number) {
  const knead = smooth(clamp(shape - 0.5) * (1 - clamp(shape - 1.5)));
  const proof = smooth(clamp(shape - 1.4));
  const bake = smooth(clamp(shape - 2.5));
  const slice = smooth(clamp(shape - 3.5));
  const breathe = Math.sin(f.t * 1.2) * 0.02 * (1 - bake);
  const rx = size * (0.34 + knead * 0.1 + proof * 0.08 + bake * 0.12) * (1 + breathe);
  const ry = size * (0.24 - knead * 0.07 + proof * 0.06 - bake * 0.02) * (1 - breathe);
  const col = mix(mix("#f3e6cf", "#f7e9d2", proof), "#b8702e", bake);
  const dark = mix("#e2cfae", "#7a4416", bake);
  // Shadow
  g.fillStyle = "rgba(0,0,0,0.16)";
  g.beginPath();
  g.ellipse(x, y + ry * 0.95, rx * 1.05, ry * 0.22, 0, 0, Math.PI * 2);
  g.fill();
  const parts = slice > 0.02 ? 4 : 1;
  for (let p = 0; p < parts; p++) {
    const off = parts > 1 ? (p - 1.5) * slice * size * 0.07 : 0;
    g.save();
    if (parts > 1) {
      g.beginPath();
      g.rect(x - rx * 1.2 + ((p * 2 * rx * 1.2) / parts), y - ry * 2, (2 * rx * 1.2) / parts - slice * 3, ry * 4);
      g.clip();
    }
    g.translate(off, 0);
    const grd = g.createRadialGradient(x - rx * 0.3, y - ry * 0.6, rx * 0.1, x, y, rx * 1.1);
    grd.addColorStop(0, mix(col, "#ffffff", 0.35));
    grd.addColorStop(1, dark);
    g.fillStyle = grd;
    blob(g, x, y, rx, ry, 0.012 + knead * 0.03, f.t * 0.8, 0.35);
    g.fill();
    if (bake > 0.2) {
      // Score marks open in the crust.
      g.strokeStyle = rgba("#f4d9a6", bake);
      g.lineWidth = size * 0.018;
      g.lineCap = "round";
      for (let i = -1; i <= 1; i++) {
        g.beginPath();
        g.moveTo(x + i * rx * 0.45 - rx * 0.12, y - ry * 0.55);
        g.quadraticCurveTo(x + i * rx * 0.45, y - ry * 0.78, x + i * rx * 0.45 + rx * 0.14, y - ry * 0.5);
        g.stroke();
      }
    }
    if (knead > 0.1) {
      g.strokeStyle = rgba("#c9b38e", knead * 0.8);
      g.lineWidth = size * 0.01;
      g.beginPath();
      g.arc(x, y - ry * 0.1, rx * 0.55, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
    }
    if (slice > 0.3 && p === parts - 1) {
      // The crumb of the cut face.
      g.fillStyle = rgba("#f6e7c8", slice);
      g.beginPath();
      g.ellipse(x + rx * 0.62, y - ry * 0.05, rx * 0.26, ry * 0.7, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
  // Flour: a puff on tap, dusting otherwise.
  const flour = num(f.beat, "flour", 0.2);
  const motes: { x: number; y: number; vx: number; vy: number; life: number }[] = (s.flour ??= []);
  for (const t of freshTaps(f, 300)) if (s.tap !== t.t) {
    s.tap = t.t;
    for (let i = 0; i < 40; i++) motes.push({ x: x + (Math.random() - 0.5) * rx, y: y - ry * 0.6, vx: (Math.random() - 0.5) * 160, vy: -40 - Math.random() * 120, life: 1.6 });
  }
  if (!f.reduced && Math.random() < flour * 0.4) motes.push({ x: x + (Math.random() - 0.5) * rx * 2, y: y - size * 0.6, vx: (Math.random() - 0.5) * 10, vy: 20, life: 3 });
  g.fillStyle = "rgba(255,255,255,0.8)";
  for (const m of motes) {
    m.x += m.vx * f.dt;
    m.y += m.vy * f.dt;
    m.vy += 30 * f.dt;
    m.vx *= 0.98;
    m.life -= f.dt;
    g.globalAlpha = clamp(m.life) * 0.8;
    g.fillRect(m.x, m.y, 2.2, 2.2);
  }
  g.globalAlpha = 1;
  s.flour = motes.filter((m) => m.life > 0).slice(-160);
}

function toothPath(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, squash: number) {
  const W = w * squash;
  g.beginPath();
  g.moveTo(x - W * 0.5, y - h * 0.25);
  g.bezierCurveTo(x - W * 0.55, y - h * 0.62, x - W * 0.2, y - h * 0.6, x, y - h * 0.5);
  g.bezierCurveTo(x + W * 0.2, y - h * 0.6, x + W * 0.55, y - h * 0.62, x + W * 0.5, y - h * 0.25);
  g.bezierCurveTo(x + W * 0.48, y + h * 0.05, x + W * 0.36, y + h * 0.1, x + W * 0.3, y + h * 0.48);
  g.quadraticCurveTo(x + W * 0.2, y + h * 0.56, x + W * 0.12, y + h * 0.3);
  g.quadraticCurveTo(x, y + h * 0.05, x - W * 0.12, y + h * 0.3);
  g.quadraticCurveTo(x - W * 0.2, y + h * 0.56, x - W * 0.3, y + h * 0.48);
  g.bezierCurveTo(x - W * 0.36, y + h * 0.1, x - W * 0.48, y + h * 0.05, x - W * 0.5, y - h * 0.25);
  g.closePath();
}

function tooth(g: CanvasRenderingContext2D, f: Frame, s: Record<string, any>, x: number, y: number, size: number, shape: number, spin: number) {
  const squash = 0.55 + 0.45 * Math.abs(Math.cos((spin * Math.PI) / 180));
  const w = size * 0.62;
  const h = size * 0.82;
  const problem = smooth(clamp(shape - 0.5)) * (1 - smooth(clamp(shape - 2.6)));
  const scan = clamp(shape - 1.5) * (1 - clamp(shape - 2.5));
  const shine = clamp(num(f.beat, "shine", 0.6));
  const glow = g.createRadialGradient(x, y, 0, x, y, size);
  glow.addColorStop(0, rgba(f.pal.accent, 0.18 + shine * 0.12));
  glow.addColorStop(1, rgba(f.pal.accent, 0));
  g.fillStyle = glow;
  g.fillRect(x - size, y - size, size * 2, size * 2);
  toothPath(g, x, y, w, h, squash);
  const grd = g.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
  grd.addColorStop(0, "#ffffff");
  grd.addColorStop(0.55, mix("#f3f1ec", f.pal.accent, 0.05));
  grd.addColorStop(1, "#cfd6de");
  g.fillStyle = grd;
  g.fill();
  g.strokeStyle = rgba("#8a96a6", 0.4);
  g.lineWidth = 1.5;
  g.stroke();
  g.save();
  g.clip();
  if (problem > 0.02) {
    g.fillStyle = rgba("#6a5440", 0.7 * problem);
    g.beginPath();
    g.ellipse(x + w * 0.12 * squash, y - h * 0.32, w * 0.09, h * 0.06, 0.4, 0, Math.PI * 2);
    g.fill();
  }
  if (scan > 0.01) {
    const sy = y - h / 2 + ((f.t * 0.6) % 1) * h;
    g.fillStyle = rgba(f.pal.accent, 0.35 * scan);
    g.fillRect(x - w, sy, w * 2, 6);
  }
  // Enamel highlight sweeps as it turns.
  const hl = g.createLinearGradient(x - w, y, x + w, y);
  const k = (Math.sin((spin * Math.PI) / 180) + 1) / 2;
  hl.addColorStop(clamp(k - 0.15), "rgba(255,255,255,0)");
  hl.addColorStop(clamp(k), `rgba(255,255,255,${0.5 * shine})`);
  hl.addColorStop(clamp(k + 0.15), "rgba(255,255,255,0)");
  g.fillStyle = hl;
  g.fillRect(x - w, y - h, w * 2, h * 2);
  g.restore();
  const sparkle = freshTaps(f, 900).pop();
  const sp = (sparkle ? 1 - sparkle.age : 0) + clamp(shape - 3.4) * (0.5 + 0.5 * Math.sin(f.t * 3));
  if (sp > 0.02) star(g, x - w * 0.22 * squash, y - h * 0.36, size * 0.07 * sp, rgba("#ffffff", clamp(sp)));
}

function star(g: CanvasRenderingContext2D, x: number, y: number, r: number, c: string) {
  g.fillStyle = c;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rr = i % 2 ? r * 0.25 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.fill();
}

function product(g: CanvasRenderingContext2D, f: Frame, x: number, y: number, size: number, shape: number, spin: number) {
  // A sleek device: a rounded column with a screen face, seen from the turning camera.
  const a = (spin * Math.PI) / 180;
  const face = Math.cos(a);
  const w = size * 0.34;
  const h = size * 0.74;
  const shine = clamp(num(f.beat, "shine", 0.7));
  g.fillStyle = "rgba(0,0,0,0.18)";
  g.beginPath();
  g.ellipse(x, y + h * 0.55, w * 1.1, w * 0.18, 0, 0, Math.PI * 2);
  g.fill();
  const W = w * (0.55 + 0.45 * Math.abs(face));
  const body = mix(f.pal.accent, "#111318", 0.55);
  const grd = g.createLinearGradient(x - W, 0, x + W, 0);
  grd.addColorStop(0, mix(body, "#000000", 0.4));
  grd.addColorStop(clamp(0.5 + Math.sin(a) * 0.35), mix(body, "#ffffff", 0.35 * shine));
  grd.addColorStop(1, mix(body, "#000000", 0.45));
  g.fillStyle = grd;
  const r = W * 0.35;
  g.beginPath();
  g.roundRect ? g.roundRect(x - W, y - h / 2, W * 2, h, r) : g.rect(x - W, y - h / 2, W * 2, h);
  g.fill();
  if (face > 0.1) {
    // The screen faces the camera for half the turn.
    g.globalAlpha *= face;
    const sg = g.createLinearGradient(x, y - h / 2, x, y + h / 2);
    sg.addColorStop(0, mix(f.pal.accent, "#ffffff", 0.2));
    sg.addColorStop(1, mix(f.pal.accent, "#000000", 0.5));
    g.fillStyle = sg;
    g.beginPath();
    g.roundRect ? g.roundRect(x - W * 0.82, y - h * 0.44, W * 1.64, h * 0.88, r * 0.7) : g.rect(x - W * 0.82, y - h * 0.44, W * 1.64, h * 0.88);
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.75)";
    for (let i = 0; i < 4; i++) g.fillRect(x - W * 0.6, y - h * 0.3 + i * h * 0.12, W * (0.9 - i * 0.15), h * 0.03);
    g.globalAlpha = 1;
  }
  const detail = smooth(clamp(shape - 0.5));
  if (detail > 0.02) {
    // Callout rings around the details.
    g.strokeStyle = rgba(f.pal.accent, 0.7 * detail);
    g.lineWidth = 1.5;
    for (const [dx, dy] of [[-0.9, -0.3], [0.9, 0.15]]) {
      g.beginPath();
      g.arc(x + dx * W, y + dy * h, size * 0.05 * (1 + 0.1 * Math.sin(f.t * 2)), 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.moveTo(x + dx * W * 1.1, y + dy * h);
      g.lineTo(x + dx * W * 1.9, y + dy * h - size * 0.08);
      g.stroke();
    }
  }
}

export const morph: Engine2D = (g, f, s) => {
  const subject = str(f.params, "subject", "dough");
  const box = anchorBox(f);
  const shape = clamp(num(f.beat, "shape", 0), 0, 4);
  // spin is driven by scroll; the cursor adds a lean (cursor.tilt) and a drag-like turn.
  s.lean = lerp(s.lean ?? 0, f.pointer ? f.nx : 0, 0.05);
  const spin = num(f.beat, "spin", 0) + s.lean * 40 + (f.reduced ? 0 : Math.sin(f.t * 0.5) * 6);
  const scale = num(f.beat, "scale", 1);
  g.save();
  g.globalAlpha = box.alpha;
  g.translate(box.x, box.y);
  g.rotate(s.lean * 0.08);
  g.translate(-box.x, -box.y);
  const size = box.size * scale;
  if (subject === "tooth") tooth(g, f, s, box.x, box.y, size, shape, spin);
  else if (subject === "product") product(g, f, box.x, box.y, size, shape, spin);
  else dough(g, f, s, box.x, box.y + size * 0.1, size, shape);
  g.restore();
};
