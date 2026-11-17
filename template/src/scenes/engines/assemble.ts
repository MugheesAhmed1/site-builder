import { anchorBox, clamp, freshTaps, lerp, mix, num, ramp, rgba, rng, type Engine2D } from "../frame";

// Assemble: a building put together as the page scrolls. Beat keys: build (0 blueprint ..
// 1 finished), lights (windows on), angle (degrees the camera turns). Plan lines draw first,
// then columns and floors rise, walls close and glass goes on. The cursor turns the building
// a little (cursor.tilt); a tap switches a floor of lights.

export const assemble: Engine2D = (g, f, s) => {
  const build = clamp(num(f.beat, "build", 0));
  const lights = clamp(num(f.beat, "lights", 0));
  const angle = (num(f.beat, "angle", 0) + (f.pointer ? f.nx * 8 : 0)) * (Math.PI / 180);
  const box = anchorBox(f);
  const floors = f.mobile ? 6 : 8;
  const bays = 4;
  const W = box.size * 0.62;
  const D = box.size * 0.32;
  const H = box.size * 0.95;
  const x0 = box.x;
  const y0 = box.y + H * 0.5;
  // A simple oblique projection: x across, z into the page turned by the angle.
  const proj = (x: number, y: number, z: number) => {
    const c = Math.cos(angle + 0.5);
    const sn = Math.sin(angle + 0.5);
    const rx = x * c - z * sn;
    const rz = x * sn + z * c;
    return [x0 + rx, y0 - y - rz * 0.35] as const;
  };
  const line = (a: readonly [number, number], b: readonly [number, number]) => {
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
  };
  const blue = f.pal.dark ? "#7fb2ff" : "#2d5fb8";
  g.globalAlpha = box.alpha;
  // Blueprint grid on the ground.
  const plan = ramp(build, 0, 0.2);
  g.strokeStyle = rgba(blue, 0.35 * (1 - ramp(build, 0.6, 1) * 0.7));
  g.lineWidth = 1;
  g.beginPath();
  for (let i = 0; i <= bays; i++) {
    const x = -W / 2 + (W * i) / bays;
    const a = proj(x, 0, -D / 2);
    const b = proj(x, 0, lerp(-D / 2, D / 2, Math.max(0.05, plan)));
    line(a, b);
  }
  for (let k = 0; k <= 2; k++) {
    const z = -D / 2 + (D * k) / 2;
    line(proj(-W / 2, 0, z), proj(lerp(-W / 2, W / 2, Math.max(0.05, plan)), 0, z));
  }
  g.stroke();
  // Columns rise, floor by floor.
  const rise = ramp(build, 0.15, 0.55);
  const top = H * rise;
  g.strokeStyle = mix(f.pal.text, f.pal.bg, 0.35);
  g.lineWidth = Math.max(1.5, box.size * 0.008);
  g.beginPath();
  for (let i = 0; i <= bays; i++)
    for (const z of [-D / 2, D / 2]) {
      const x = -W / 2 + (W * i) / bays;
      line(proj(x, 0, z), proj(x, top, z));
    }
  for (let fl = 1; fl <= floors; fl++) {
    const y = (H * fl) / floors;
    if (y > top + 0.5) break;
    line(proj(-W / 2, y, -D / 2), proj(W / 2, y, -D / 2));
    line(proj(-W / 2, y, D / 2), proj(W / 2, y, D / 2));
    line(proj(-W / 2, y, -D / 2), proj(-W / 2, y, D / 2));
    line(proj(W / 2, y, -D / 2), proj(W / 2, y, D / 2));
  }
  g.stroke();
  // Walls and glass: the front faces fill in, then windows light up.
  const walls = ramp(build, 0.45, 0.85);
  if (walls > 0) {
    const faces: [number, number, number, number][] = [
      [-W / 2, -D / 2, W / 2, -D / 2],
      [W / 2, -D / 2, W / 2, D / 2],
    ];
    const R = rng(4);
    const tap = freshTaps(f, 4000).pop();
    const tapFloor = tap ? Math.floor(R() * floors) : -1;
    for (const [ax, az, bx, bz] of faces) {
      const fh = (H * walls) | 0;
      const a = proj(ax, 0, az);
      const b = proj(bx, 0, bz);
      const c = proj(bx, fh, bz);
      const d = proj(ax, fh, az);
      g.fillStyle = rgba(mix("#c8d4e0", f.pal.accent, 0.15), 0.55 + walls * 0.35);
      g.beginPath();
      g.moveTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
      g.lineTo(c[0], c[1]);
      g.lineTo(d[0], d[1]);
      g.closePath();
      g.fill();
      // Windows.
      const glass = ramp(build, 0.7, 1);
      for (let fl = 0; fl < floors; fl++) {
        const y1 = (H * (fl + 0.25)) / floors;
        const y2 = (H * (fl + 0.8)) / floors;
        if (y2 > fh) break;
        for (let i = 0; i < bays; i++) {
          const u1 = (i + 0.2) / bays;
          const u2 = (i + 0.8) / bays;
          const p1 = proj(lerp(ax, bx, u1), y1, lerp(az, bz, u1));
          const p2 = proj(lerp(ax, bx, u2), y1, lerp(az, bz, u2));
          const p3 = proj(lerp(ax, bx, u2), y2, lerp(az, bz, u2));
          const p4 = proj(lerp(ax, bx, u1), y2, lerp(az, bz, u1));
          const lit = R() < lights || fl === tapFloor;
          g.fillStyle = lit ? rgba("#ffd27a", 0.9 * glass + 0.1) : rgba(mix("#2a3a52", f.pal.accent, 0.2), 0.5 * glass + 0.15);
          g.beginPath();
          g.moveTo(p1[0], p1[1]);
          g.lineTo(p2[0], p2[1]);
          g.lineTo(p3[0], p3[1]);
          g.lineTo(p4[0], p4[1]);
          g.closePath();
          g.fill();
        }
      }
    }
  }
  // A crane while the work is under way.
  const crane = 1 - ramp(build, 0.8, 1);
  if (crane > 0.02 && build > 0.1) {
    const base = proj(W / 2 + W * 0.25, 0, D / 2);
    const mast = H * 0.95;
    g.strokeStyle = rgba(f.pal.accent, crane * 0.7);
    g.lineWidth = Math.max(2, box.size * 0.01);
    g.beginPath();
    g.moveTo(base[0], base[1]);
    g.lineTo(base[0], base[1] - mast);
    g.lineTo(base[0] - W * 0.9, base[1] - mast);
    const sw = Math.sin(f.t * 0.8) * 0.2 + 0.5;
    const hx = base[0] - W * 0.9 * sw;
    g.moveTo(hx, base[1] - mast);
    g.lineTo(hx, base[1] - mast + H * (0.25 + 0.2 * Math.sin(f.t * 0.6)));
    g.stroke();
  }
  g.globalAlpha = 1;
};
