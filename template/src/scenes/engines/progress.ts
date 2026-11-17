import { clamp, freshTaps, lerp, mix, num, rgba, smooth, type Engine2D } from "../frame";

// Progress: a line that runs from the start mark to the finish as the page scrolls, with
// rings that fill. Beat keys: progress (0..1 along the track), pace (speed of the stride
// lines), rings (how full the rings are). The cursor pulls the track's curve (cursor.attract);
// a tap sends a sprint pulse along the line.

export const progress: Engine2D = (g, f, s) => {
  const p = clamp(num(f.beat, "progress", 0.05));
  const pace = clamp(num(f.beat, "pace", 0.3));
  const rings = clamp(num(f.beat, "rings", 0));
  const m = f.mobile;
  const left = m ? f.w * 0.08 : f.w * 0.06;
  const right = m ? f.w * 0.92 : f.w * 0.94;
  const baseY = m ? f.h * 0.86 : f.h * 0.78;
  const accent = f.pal.accent;
  const ink = f.pal.text;
  // The track: a gentle S across the screen.
  const pt = (u: number) => {
    let x = lerp(left, right, u);
    let y = baseY - Math.sin(u * Math.PI * 1.4) * f.h * (m ? 0.08 : 0.16) - u * f.h * 0.1;
    if (f.pointer) {
      const d = Math.hypot(x - f.px, y - f.py);
      const k = clamp(1 - d / 260);
      (x += (f.px - x) * k * 0.15), (y += (f.py - y) * k * 0.3);
    }
    return [x, y] as const;
  };
  const N = 90;
  g.lineCap = "round";
  // Lane lines.
  for (const off of [-14, 14]) {
    g.strokeStyle = rgba(ink, 0.08);
    g.lineWidth = 2;
    g.setLineDash([10, 14]);
    g.lineDashOffset = -f.t * 60 * (0.3 + pace);
    g.beginPath();
    for (let i = 0; i <= N; i++) {
      const [x, y] = pt(i / N);
      i ? g.lineTo(x, y + off) : g.moveTo(x, y + off);
    }
    g.stroke();
  }
  g.setLineDash([]);
  g.strokeStyle = rgba(ink, 0.14);
  g.lineWidth = 6;
  g.beginPath();
  for (let i = 0; i <= N; i++) {
    const [x, y] = pt(i / N);
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.stroke();
  // The run so far.
  const shown = s.shown = lerp(s.shown ?? p, p, f.reduced ? 1 : 0.08);
  const grd = g.createLinearGradient(left, 0, right, 0);
  grd.addColorStop(0, mix(accent, f.pal.bg, 0.5));
  grd.addColorStop(1, accent);
  g.strokeStyle = grd;
  g.lineWidth = 6;
  g.beginPath();
  const end = Math.max(1, Math.round(N * shown));
  for (let i = 0; i <= end; i++) {
    const [x, y] = pt(i / N);
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.stroke();
  // Sprint pulse from a tap.
  const tap = freshTaps(f, 900).pop();
  if (tap) {
    const u = smooth(tap.age) * shown;
    const [x, y] = pt(u);
    g.fillStyle = rgba(accent, 1 - tap.age);
    g.beginPath();
    g.arc(x, y, 14 + tap.age * 20, 0, Math.PI * 2);
    g.fill();
  }
  // Start and finish marks, then the runner dot with stride trails.
  const [sx, sy] = pt(0);
  const [fx, fy] = pt(1);
  g.fillStyle = rgba(ink, 0.5);
  g.fillRect(sx - 2, sy - 18, 4, 36);
  for (let i = 0; i < 6; i++) {
    g.fillStyle = i % 2 ? ink : f.pal.bg;
    g.fillRect(fx - 6, fy - 18 + i * 6, 6, 6);
    g.fillStyle = i % 2 ? f.pal.bg : ink;
    g.fillRect(fx, fy - 18 + i * 6, 6, 6);
  }
  const [rx, ry] = pt(shown);
  for (let k = 1; k <= 4; k++) {
    const [tx, ty] = pt(Math.max(0, shown - k * 0.012 * (0.4 + pace)));
    g.fillStyle = rgba(accent, 0.25 / k);
    g.beginPath();
    g.arc(tx, ty, 10 - k, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = accent;
  g.beginPath();
  g.arc(rx, ry, 10 + Math.sin(f.t * 8 * (0.3 + pace)) * 1.5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = f.pal.onAccent;
  g.beginPath();
  g.arc(rx, ry, 3.5, 0, Math.PI * 2);
  g.fill();
  // Rings, on the object side.
  if (rings > 0.01) {
    const cx = m ? f.w * 0.5 : lerp(f.w * 0.26, f.w * 0.74, (f.side - 0.26) / 0.48);
    const cy = m ? f.h * 0.3 : f.h * 0.4;
    const R0 = Math.min(f.w, f.h) * (m ? 0.14 : 0.17);
    const fill = (s.rings = lerp(s.rings ?? rings, rings, f.reduced ? 1 : 0.06));
    [1, 0.78, 0.56].forEach((k, i) => {
      const r = R0 * k;
      const v = clamp(fill * (1.15 - i * 0.12));
      g.strokeStyle = rgba(ink, 0.08);
      g.lineWidth = R0 * 0.12;
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = i === 0 ? accent : mix(accent, i === 1 ? "#ffffff" : "#000000", 0.3);
      g.beginPath();
      g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + v * Math.PI * 2);
      g.stroke();
    });
    g.fillStyle = ink;
    g.font = `800 ${Math.round(R0 * 0.36)}px system-ui, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(Math.round(fill * 100) + "%", cx, cy);
  }
};
