import { anchorBox, clamp, freshTaps, hsl, hueOf, lerp, mix, num, rgba, rng, smooth, type Engine2D } from "../frame";

// Grow: seed to bloom to bouquet. Beat keys: growth (stem length), bloom (petals open),
// bouquet (stems gather and are wrapped). Stems sway and lean toward the cursor
// (cursor.attract); a tap opens the nearest flower and petals drift down.

interface Petal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  c: string;
  life: number;
}

export const grow: Engine2D = (g, f, s) => {
  const growth = clamp(num(f.beat, "growth", 0.1));
  const bloom = clamp(num(f.beat, "bloom", 0));
  const bouquet = smooth(clamp(num(f.beat, "bouquet", 0)));
  const box = anchorBox(f);
  const base = box.y + box.size * 0.48;
  const stems = f.mobile ? 5 : 7;
  const R = rng(21);
  const hue = hueOf(f.pal.accent);
  const colours = [f.pal.accent, hsl((hue + 330) % 360, 70, 70), hsl((hue + 40) % 360, 80, 72), hsl((hue + 300) % 360, 55, 80), "#fff4f0"];
  g.globalAlpha = box.alpha;
  // Soil, then a wrap for the bouquet.
  g.fillStyle = mix("#5a3d2b", f.pal.bg, 0.25 + bouquet * 0.75);
  g.beginPath();
  g.ellipse(box.x, base, box.size * 0.42 * (1 - bouquet * 0.6), box.size * 0.06, 0, 0, Math.PI * 2);
  g.fill();
  const tips: { x: number; y: number; c: string; i: number }[] = [];
  const opened: number[] = (s.open ??= []);
  for (const t of freshTaps(f, 300)) if (s.tap !== t.t) {
    s.tap = t.t;
    let best = -1;
    let bd = 1e9;
    (s.tips ?? []).forEach((p: { x: number; y: number; i: number }) => {
      const d = Math.hypot(p.x - t.x, p.y - t.y);
      if (d < bd) (bd = d), (best = p.i);
    });
    if (best >= 0 && bd < box.size * 0.4) opened[best] = f.t;
  }
  g.lineCap = "round";
  for (let i = 0; i < stems; i++) {
    const u = stems > 1 ? i / (stems - 1) - 0.5 : 0;
    const len = box.size * (0.55 + R() * 0.4) * smooth(clamp(growth * 1.3 - Math.abs(u) * 0.3));
    if (len < 2) continue;
    const spread = lerp(u * box.size * 0.7, u * box.size * 0.22, bouquet);
    const rootX = box.x + lerp(u * box.size * 0.5, 0, bouquet);
    const sway = Math.sin(f.t * 1.1 + i) * 10 * (1 - bouquet * 0.6);
    let lean = 0;
    if (f.pointer) lean = clamp((f.px - rootX) / (box.size * 1.5), -1, 1) * 30 * (1 - clamp(Math.abs(f.py - (base - len)) / box.size));
    const tx = rootX + spread + sway + lean;
    const ty = base - len;
    g.strokeStyle = mix("#4c7a3d", "#2f5a2a", R());
    g.lineWidth = Math.max(2, box.size * 0.012);
    g.beginPath();
    g.moveTo(rootX, base);
    g.quadraticCurveTo(rootX + spread * 0.2, base - len * 0.55, tx, ty);
    g.stroke();
    // A leaf part way up.
    if (growth > 0.25) {
      const lx = lerp(rootX, tx, 0.45);
      const ly = lerp(base, ty, 0.45);
      g.fillStyle = "#5d9448";
      g.beginPath();
      g.ellipse(lx + (u > 0 ? 10 : -10), ly, box.size * 0.05, box.size * 0.018, u > 0 ? -0.6 : 0.6, 0, Math.PI * 2);
      g.fill();
    }
    const c = colours[i % colours.length];
    tips.push({ x: tx, y: ty, c, i });
    const tapped = opened[i] !== undefined ? smooth(clamp((f.t - opened[i]) / 0.8)) : 0;
    const open = clamp(Math.max(bloom, tapped) * (0.7 + R() * 0.3));
    const bud = box.size * 0.03;
    if (open < 0.05) {
      g.fillStyle = mix("#6f9e4f", c, clamp(growth - 0.6) * 2);
      g.beginPath();
      g.ellipse(tx, ty, bud * 0.7, bud, 0, 0, Math.PI * 2);
      g.fill();
    } else {
      const petals = 5 + (i % 3);
      const pr = box.size * 0.06 * open * (1 + 0.04 * Math.sin(f.t * 2 + i));
      g.fillStyle = c;
      for (let k = 0; k < petals; k++) {
        const a = (k / petals) * Math.PI * 2 + f.t * 0.05 + i;
        g.beginPath();
        g.ellipse(tx + Math.cos(a) * pr * 0.75, ty + Math.sin(a) * pr * 0.75, pr * 0.7, pr * 0.42, a, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = mix("#f5c542", c, 0.2);
      g.beginPath();
      g.arc(tx, ty, pr * 0.32, 0, Math.PI * 2);
      g.fill();
    }
  }
  s.tips = tips;
  if (bouquet > 0.05) {
    // The wrap: paper in the brand colour, tied with a ribbon.
    const wy = base - box.size * 0.05;
    g.fillStyle = rgba(mix(f.pal.accent, "#ffffff", 0.55), bouquet);
    g.beginPath();
    g.moveTo(box.x - box.size * 0.22, wy - box.size * 0.32);
    g.lineTo(box.x + box.size * 0.22, wy - box.size * 0.32);
    g.lineTo(box.x + box.size * 0.05, wy + box.size * 0.05);
    g.lineTo(box.x - box.size * 0.05, wy + box.size * 0.05);
    g.closePath();
    g.fill();
    g.fillStyle = rgba(f.pal.accent, bouquet);
    g.fillRect(box.x - box.size * 0.08, wy - box.size * 0.1, box.size * 0.16, box.size * 0.03);
  }
  // Petals drift down after a bloom.
  const petals: Petal[] = (s.petals ??= []);
  if (!f.reduced && bloom > 0.6 && Math.random() < 0.05 * f.energy) {
    const t = tips[Math.floor(Math.random() * tips.length)];
    if (t) petals.push({ x: t.x, y: t.y, vx: (Math.random() - 0.5) * 20, vy: 10, a: Math.random() * 6, c: t.c, life: 6 });
  }
  for (const p of petals) {
    p.x += (p.vx + Math.sin(f.t + p.a) * 14) * f.dt;
    p.y += p.vy * f.dt;
    p.a += f.dt;
    p.life -= f.dt;
    g.fillStyle = rgba(p.c, clamp(p.life / 2));
    g.beginPath();
    g.ellipse(p.x, p.y, 5, 3, p.a, 0, Math.PI * 2);
    g.fill();
  }
  s.petals = petals.filter((p) => p.life > 0 && p.y < f.h + 10);
  g.globalAlpha = 1;
};
