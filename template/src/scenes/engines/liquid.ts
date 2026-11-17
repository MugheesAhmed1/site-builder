import { clamp, freshTaps, hexRgb, hsl, hueOf, lerp, num, str, type Engine2D } from "../frame";

// Liquid: soft blobs that merge and split (metaballs), drawn into a small field and scaled
// up so the edges stay soft. Materials: liquid, silk, glass, chrome, fluid. Beat keys: merge
// (0 apart .. 1 one drop), hue (shift in degrees), flow (speed), scale. The cursor draws the
// liquid in (cursor.attract); a tap splashes it apart.

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  ph: number;
}

export const liquid: Engine2D = (g, f, s) => {
  const material = str(f.params, "material", "liquid");
  const merge = clamp(num(f.beat, "merge", 0.3));
  const flow = num(f.beat, "flow", 0.5);
  const scale = num(f.beat, "scale", 1);
  const hue = (hueOf(f.pal.accent) + num(f.beat, "hue", 0)) % 360;
  const W = f.mobile ? 96 : 168;
  const H = Math.round((W * f.h) / f.w);
  if (!s.cv || s.cv.width !== W || s.cv.height !== H) {
    s.cv = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(W, H) : Object.assign(document.createElement("canvas"), { width: W, height: H });
    s.img = null;
  }
  const n = f.mobile ? 4 : 7;
  const balls: Ball[] = (s.balls ??= []);
  while (balls.length < n) balls.push({ x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0, r: (0.06 + Math.random() * 0.05) * W, ph: Math.random() * 6 });
  if (balls.length > n) balls.length = n;
  const cx = (f.mobile ? 0.5 : lerp(0.3, 0.7, f.side)) * W;
  const cy = (f.mobile ? 0.32 : 0.5) * H;
  for (const t of freshTaps(f, 300)) if (s.tap !== t.t) {
    s.tap = t.t;
    const tx = (t.x / f.w) * W;
    const ty = (t.y / f.h) * H;
    for (const b of balls) {
      const dx = b.x - tx;
      const dy = b.y - ty;
      const d = Math.hypot(dx, dy) || 1;
      (b.vx += (dx / d) * 40), (b.vy += (dy / d) * 40);
    }
  }
  for (const b of balls) {
    // Orbit the centre; merge pulls them in; the cursor draws them close.
    const ox = cx + Math.cos(f.t * 0.3 * (0.5 + flow) + b.ph) * W * 0.22 * (1 - merge * 0.85);
    const oy = cy + Math.sin(f.t * 0.37 * (0.5 + flow) + b.ph * 1.3) * H * 0.25 * (1 - merge * 0.85);
    let gx = ox;
    let gy = oy;
    if (f.pointer) {
      const px = (f.px / f.w) * W;
      const py = (f.py / f.h) * H;
      gx = lerp(ox, px, 0.35);
      gy = lerp(oy, py, 0.35);
    }
    b.vx += (gx - b.x) * 0.9 * f.dt * 3;
    b.vy += (gy - b.y) * 0.9 * f.dt * 3;
    b.vx *= 0.92;
    b.vy *= 0.92;
    b.x += b.vx * f.dt * 3;
    b.y += b.vy * f.dt * 3;
    if (f.reduced) (b.x = ox), (b.y = oy);
  }
  const c = s.cv.getContext("2d") as CanvasRenderingContext2D;
  if (!s.img) s.img = c.createImageData(W, H);
  const data: Uint8ClampedArray = s.img.data;
  // A colour ramp per material, indexed by field strength.
  const ramp: [number, number, number][] = [];
  for (let i = 0; i < 32; i++) {
    const k = i / 31;
    let hex: string;
    if (material === "chrome") hex = hsl(hue, 8, 20 + ((Math.sin(k * 14) + 1) / 2) * 70);
    else if (material === "glass") hex = hsl(hue, 45, 70 + k * 25);
    else if (material === "silk") hex = hsl(hue + k * 30, 55, 45 + Math.sin(k * 9) * 15);
    else hex = hsl(hue + k * 40 - 20, 75, 48 + k * 22);
    ramp.push(hexRgb(hex));
  }
  const rs = balls.map((b) => (b.r * scale) ** 2);
  let p = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v = 0;
      for (let i = 0; i < balls.length; i++) {
        const dx = x - balls[i].x;
        const dy = y - balls[i].y;
        v += rs[i] / (dx * dx + dy * dy + 1);
      }
      if (v > 0.6) {
        const a = clamp((v - 0.6) / 0.08);
        const col = ramp[Math.min(31, Math.floor(clamp((v - 0.6) / 3) * 31))];
        data[p] = col[0];
        data[p + 1] = col[1];
        data[p + 2] = col[2];
        data[p + 3] = a * (material === "glass" ? 170 : 235);
      } else data[p + 3] = 0;
      p += 4;
    }
  c.putImageData(s.img, 0, 0);
  g.imageSmoothingEnabled = true;
  g.globalAlpha = f.mobile ? 0.7 : 0.55 + f.presence * 0.4;
  g.drawImage(s.cv, 0, 0, f.w, f.h);
  g.globalAlpha = 1;
};
