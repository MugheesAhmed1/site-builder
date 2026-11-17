import { anchorBox, clamp, freshTaps, initialsOf, lerp, mix, num, rgba, type Engine2D } from "../frame";

// Orbit: the name or monogram at the centre with the work and skills orbiting it on tilted
// rings. Beat keys: spread (ring size), tilt (how flat the rings look), focus (index of the
// piece brought forward, -1 for none). The cursor tilts the system (cursor.tilt); a tap spins
// it faster for a moment.

export const orbit: Engine2D = (g, f, s) => {
  const spread = num(f.beat, "spread", 0.6);
  const tilt = clamp(num(f.beat, "tilt", 0.3), 0.05, 1);
  const focus = Math.round(num(f.beat, "focus", -1));
  const box = anchorBox(f);
  const cx = box.x;
  const cy = box.y;
  const R = box.size * (0.35 + spread * 0.45);
  const tap = freshTaps(f, 1400).pop();
  s.spin = (s.spin ?? 0) + f.dt * (0.18 + (tap ? (1 - tap.age) * 2.2 : 0) + Math.abs(f.speed) * 0.003) * (f.reduced ? 0 : 1);
  const tiltY = tilt + (f.pointer ? f.ny * 0.2 : 0);
  const rot = f.pointer ? f.nx * 0.25 : 0;
  const own = f.labels.slice(1);
  const labels = (own.length >= 4 ? own : [...own, "Ideas", "Craft", "Strategy", "Research", "Delivery", "Care"].slice(0, 6)).slice(0, f.mobile ? 6 : 9);
  const rings = [1, 0.66, 1.32];
  g.globalAlpha = box.alpha;
  // Rings.
  for (const k of rings) {
    g.strokeStyle = rgba(f.pal.text, 0.1);
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse(cx, cy, R * k, R * k * tiltY, rot, 0, Math.PI * 2);
    g.stroke();
  }
  // Items, sorted by depth so the back ones draw first.
  const items = labels.map((label, i) => {
    const ring = rings[i % rings.length];
    const a = s.spin * (1 / ring) + (i / labels.length) * Math.PI * 2;
    const ex = Math.cos(a) * R * ring;
    const ey = Math.sin(a) * R * ring * tiltY;
    const x = cx + ex * Math.cos(rot) - ey * Math.sin(rot);
    const y = cy + ex * Math.sin(rot) + ey * Math.cos(rot);
    const depth = Math.sin(a);
    return { label, x, y, depth, i };
  });
  const centre = () => {
    const r = box.size * 0.16;
    const glow = g.createRadialGradient(cx, cy, 0, cx, cy, r * 2.4);
    glow.addColorStop(0, rgba(f.pal.accent, 0.35));
    glow.addColorStop(1, rgba(f.pal.accent, 0));
    g.fillStyle = glow;
    g.fillRect(cx - r * 2.5, cy - r * 2.5, r * 5, r * 5);
    g.fillStyle = f.pal.accent;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = f.pal.onAccent;
    g.font = `800 ${Math.round(r * 0.8)}px system-ui, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(initialsOf(f.labels[0] ?? "Me"), cx, cy + 1);
  };
  let centred = false;
  for (const it of items.sort((a, b) => a.depth - b.depth)) {
    if (!centred && it.depth > 0) (centre(), (centred = true));
    const focused = it.i === focus;
    const sc = lerp(0.7, 1.15, (it.depth + 1) / 2) * (focused ? 1.35 : 1);
    const fs = Math.round((f.mobile ? 11 : 13) * sc);
    g.font = `600 ${fs}px system-ui, sans-serif`;
    const tw = g.measureText(it.label).width;
    const pw = tw + fs * 1.4;
    const ph = fs * 2;
    g.globalAlpha = box.alpha * lerp(0.45, 1, (it.depth + 1) / 2);
    g.fillStyle = focused ? f.pal.accent : mix(f.pal.surface, f.pal.bg, 0.2);
    g.strokeStyle = rgba(f.pal.text, 0.12);
    g.beginPath();
    g.roundRect?.(it.x - pw / 2, it.y - ph / 2, pw, ph, ph / 2);
    g.fill();
    g.stroke();
    g.fillStyle = focused ? f.pal.onAccent : f.pal.text;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(it.label, it.x, it.y + 1);
  }
  g.globalAlpha = box.alpha;
  if (!centred) centre();
  g.globalAlpha = 1;
};
