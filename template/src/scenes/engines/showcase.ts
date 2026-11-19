import { assetUrl as asset } from "../../experiences/assets";
import { anchorBox, clamp, lerp, num, rgba, rng, str, type Engine2D } from "../frame";

// Showcase: the 2D side of the asset stage (docs/ASSETS.md). It draws the still of the resolved
// asset (its rendered preview) where the 3D model would stand, so phones, reduced motion, weak
// devices and the first paint all show the real subject instead of a placeholder. Beat keys are
// the asset stage's own: spin (degrees, read as a gentle turn of the still), lift, shift, zoom,
// light and particles. The cursor leans it a little; reduced motion holds each scene's pose.

export const showcase: Engine2D = (g, f, s) => {
  const src = str(f.params, "image");
  if (src && s.src !== src) {
    s.src = src;
    s.ready = false;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => (s.ready = true);
    img.src = asset(src);
    s.img = img;
  }
  const { x, y, size, alpha } = anchorBox(f);
  const zoom = num(f.beat, "zoom", 1);
  const lift = num(f.beat, "lift", 0);
  const shift = num(f.beat, "shift", 0);
  const light = clamp(num(f.beat, "light", 0.7));
  const motion = f.reduced ? 0 : 1;
  const bob = Math.sin(f.t * 1.1) * size * 0.012 * motion;
  const cx = x + shift * f.w * 0.12 + (f.pointer ? f.nx * size * 0.02 : 0);
  const cy = y - lift * f.h * 0.12 + bob;
  const r = size * 0.62 * zoom;

  // Soft light pool behind and under the object.
  const glow = g.createRadialGradient(cx, cy, 0, cx, cy, r * 1.3);
  glow.addColorStop(0, rgba(f.pal.accent, 0.1 + light * 0.14));
  glow.addColorStop(1, rgba(f.pal.accent, 0));
  g.fillStyle = glow;
  g.fillRect(cx - r * 1.4, cy - r * 1.4, r * 2.8, r * 2.8);
  const shadow = g.createRadialGradient(cx, cy + r * 0.62, 0, cx, cy + r * 0.62, r * 0.6);
  shadow.addColorStop(0, rgba(f.pal.dark ? "#000000" : "#1a1a1a", 0.22 * alpha));
  shadow.addColorStop(1, rgba("#000000", 0));
  g.save();
  g.translate(cx, cy + r * 0.62);
  g.scale(1, 0.18);
  g.translate(-cx, -(cy + r * 0.62));
  g.fillStyle = shadow;
  g.fillRect(cx - r, cy, r * 2, r * 1.3);
  g.restore();

  // Particles: a few motes drifting through the light, within the stage's budget.
  const n = Math.round(clamp(num(f.beat, "particles", 0.5)) * Math.min(60, f.budget.particles));
  if (n > 0) {
    const rand = rng(f.seed + 11);
    g.fillStyle = rgba(f.pal.dark ? "#ffffff" : f.pal.accent, 0.5);
    for (let i = 0; i < n; i++) {
      const px = rand() * f.w;
      const speed = 6 + rand() * 14;
      const py = (rand() * f.h - f.t * speed * motion + f.pos * 40) % f.h;
      const rr = 0.6 + rand() * 1.6;
      g.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(f.t * 0.6 + i));
      g.beginPath();
      g.arc(px, py < 0 ? py + f.h : py, rr, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }

  // The asset itself. A spin reads as a turn: the still narrows and widens around its middle.
  if (s.ready && s.img) {
    const spin = (num(f.beat, "spin", 0) * Math.PI) / 180;
    const turn = lerp(1, Math.abs(Math.cos(spin * 0.5)) * 0.25 + 0.75, motion);
    const lean = f.pointer ? f.nx * 0.04 : 0;
    g.save();
    g.globalAlpha = alpha;
    g.translate(cx, cy);
    g.rotate(lean);
    g.scale(turn, 1);
    g.drawImage(s.img, -r, -r, r * 2, r * 2);
    g.restore();
  }
};
