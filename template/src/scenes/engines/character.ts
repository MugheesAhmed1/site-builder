import { clamp, freshTaps, hsl, hueOf, lerp, mix, num, rgba, rng, str, type Engine2D, type Frame } from "../frame";

// Character: an original companion that lives on the page. Creatures: "buddy" (a round
// friend that blinks, watches the cursor, waves, walks, points and jumps) and "parrot" (a
// bird that perches, flies and hops through jungle leaves). Beat keys: x and y (offset from
// the centre, -1..1), pose, size, mood, leaves. The eyes follow the cursor (character.look);
// a tap makes it jump or fly to the tap (click.react).

function eyes(g: CanvasRenderingContext2D, f: Frame, x: number, y: number, r: number, gap: number, blink: number, lx: number, ly: number) {
  for (const side of [-1, 1]) {
    const ex = x + side * gap;
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.ellipse(ex, y, r, r * Math.max(0.08, 1 - blink), 0, 0, Math.PI * 2);
    g.fill();
    if (blink < 0.7) {
      g.fillStyle = "#1d1b26";
      g.beginPath();
      g.arc(ex + lx * r * 0.42, y + ly * r * 0.42, r * 0.52, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.arc(ex + lx * r * 0.42 - r * 0.18, y + ly * r * 0.42 - r * 0.2, r * 0.16, 0, Math.PI * 2);
      g.fill();
    }
  }
  void f;
}

function leaves(g: CanvasRenderingContext2D, f: Frame, amount: number) {
  if (amount <= 0.02) return;
  const R = rng(77);
  const n = Math.round((f.mobile ? 10 : 18) * amount);
  for (let i = 0; i < n; i++) {
    const top = R() < 0.5;
    const x = R() * f.w;
    const y = top ? R() * f.h * 0.22 : f.h - R() * f.h * 0.2;
    const r = Math.min(f.w, f.h) * (0.05 + R() * 0.07);
    let a = R() * 6 + Math.sin(f.t * 0.8 + i) * 0.06;
    if (f.pointer) {
      const d = Math.hypot(x - f.px, y - f.py);
      if (d < r * 2.5) a += ((f.px - x) / (r * 2.5)) * 0.3;
    }
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.fillStyle = rgba(mix("#2f7a3b", "#1c4f2a", R()), 0.85);
    g.beginPath();
    g.ellipse(r * 0.5, 0, r * 0.6, r * 0.2, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = rgba("#a4d39c", 0.4);
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(r, 0);
    g.stroke();
    g.restore();
  }
}

export const character: Engine2D = (g, f, s) => {
  const creature = str(f.params, "creature", "buddy");
  const pose = str(f.beat, "pose", creature === "parrot" ? "perch" : "wave");
  const size = num(f.beat, "size", 1);
  const mood = clamp(num(f.beat, "mood", 1));
  const unit = Math.min(f.w, f.h) * (f.mobile ? 0.13 : 0.15) * size;
  const span = f.mobile ? 0.25 : 0.62;
  // Where the beat wants it, eased so it walks or flies rather than jumps.
  let tx = f.w * (0.5 + clamp(num(f.beat, "x", 0.5), -1, 1) * span);
  let ty = f.h * (f.mobile ? 0.3 : 0.6 + num(f.beat, "y", 0) * 0.5);
  const tap = freshTaps(f, 1600).pop();
  if (tap && creature === "parrot") (tx = tap.x), (ty = tap.y - unit * 0.6);
  const pos = (s.pos ??= { x: tx, y: ty, vx: 0 });
  const follow = f.reduced ? 1 : creature === "parrot" ? 0.05 : 0.035;
  const ox = pos.x;
  pos.x = lerp(pos.x, tx, follow);
  pos.y = lerp(pos.y, ty, follow);
  pos.vx = (pos.x - ox) / Math.max(f.dt, 0.008);
  const moving = Math.abs(pos.vx) > 30;
  // Blink every few seconds.
  const bt = (f.t + 0.7) % 3.6;
  const blink = f.reduced ? 0 : bt < 0.14 ? Math.sin((bt / 0.14) * Math.PI) : 0;
  const lx = f.pointer ? clamp((f.px - pos.x) / (f.w * 0.3), -1, 1) : tap ? clamp((tap.x - pos.x) / 200, -1, 1) : Math.sin(f.t * 0.4) * 0.3;
  const ly = f.pointer ? clamp((f.py - pos.y) / (f.h * 0.3), -1, 1) : 0.1;
  const face = pos.vx < -30 ? -1 : pos.vx > 30 ? 1 : (s.face ?? 1);
  s.face = face;
  const hue = hueOf(f.pal.accent);
  if (creature === "parrot") {
    leaves(g, f, num(f.beat, "leaves", 0.6));
    const flying = pose === "fly" || moving || !!tap;
    const flap = f.reduced ? 0.4 : Math.sin(f.t * (flying ? 16 : 3)) * (flying ? 1 : 0.15);
    const hop = pose === "hop" && !f.reduced ? Math.abs(Math.sin(f.t * 5)) * unit * 0.3 : 0;
    const x = pos.x;
    const y = pos.y - hop + (flying ? Math.sin(f.t * 3) * unit * 0.1 : 0);
    if (!flying) {
      // The branch it perches on.
      g.strokeStyle = "#6b4a2f";
      g.lineWidth = unit * 0.14;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(x - unit * 1.6, y + unit * 0.95);
      g.quadraticCurveTo(x, y + unit * 1.1, x + unit * 1.8, y + unit * 0.85);
      g.stroke();
    }
    g.save();
    g.translate(x, y);
    g.scale(face, 1);
    // Tail.
    g.fillStyle = hsl(210, 80, 45);
    g.beginPath();
    g.moveTo(-unit * 0.3, unit * 0.3);
    g.lineTo(-unit * 1.3, unit * 1.2);
    g.lineTo(-unit * 0.9, unit * 1.3);
    g.closePath();
    g.fill();
    // Body.
    g.fillStyle = hsl(hue < 40 || hue > 330 ? hue : 2, 82, 52);
    g.beginPath();
    g.ellipse(0, 0, unit * 0.55, unit * 0.75, -0.35, 0, Math.PI * 2);
    g.fill();
    // Wing.
    g.save();
    g.translate(-unit * 0.1, -unit * 0.1);
    g.rotate(-0.4 - flap * 0.9);
    g.fillStyle = hsl(140, 60, 40);
    g.beginPath();
    g.ellipse(-unit * 0.3, unit * 0.1, unit * 0.65, unit * 0.3, 0.6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = hsl(210, 80, 50);
    g.beginPath();
    g.ellipse(-unit * 0.6, unit * 0.32, unit * 0.4, unit * 0.16, 0.7, 0, Math.PI * 2);
    g.fill();
    g.restore();
    // Head, beak, eye.
    g.fillStyle = hsl(hue < 40 || hue > 330 ? hue : 2, 85, 56);
    g.beginPath();
    g.arc(unit * 0.25, -unit * 0.72, unit * 0.36, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#f4e3b2";
    g.beginPath();
    g.ellipse(unit * 0.38, -unit * 0.72, unit * 0.18, unit * 0.22, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#2b2622";
    g.beginPath();
    g.moveTo(unit * 0.56, -unit * 0.8);
    g.quadraticCurveTo(unit * 0.95, -unit * 0.7, unit * 0.62, -unit * 0.42);
    g.lineTo(unit * 0.52, -unit * 0.56);
    g.closePath();
    g.fill();
    g.fillStyle = "#1d1b26";
    g.beginPath();
    g.arc(unit * 0.38 + lx * face * unit * 0.04, -unit * 0.76 + ly * unit * 0.04, unit * 0.07 * (1 - blink * 0.9), 0, Math.PI * 2);
    g.fill();
    g.restore();
    return;
  }
  // The buddy.
  const jumpTap = tap ? Math.sin(clamp(tap.age) * Math.PI) : 0;
  const walk = (pose === "walk" || moving) && !f.reduced;
  const jump = pose === "jump" && !f.reduced ? Math.abs(Math.sin(f.t * 3.2)) : 0;
  const lift = Math.max(jump, jumpTap) * unit * 0.9 + (walk ? Math.abs(Math.sin(f.t * 8)) * unit * 0.12 : 0);
  const squash = 1 + (walk ? Math.sin(f.t * 16) * 0.04 : Math.sin(f.t * 2) * 0.025);
  const x = pos.x;
  const ground = pos.y + unit;
  const y = pos.y - lift;
  const body = tap ? hsl((hue + 140 * jumpTap) % 360, 70, 62) : mix(f.pal.accent, "#ffffff", 0.08);
  // Shadow.
  g.fillStyle = rgba("#000000", 0.14 * (1 - lift / (unit * 1.5)));
  g.beginPath();
  g.ellipse(x, ground + unit * 0.05, unit * 0.8 * (1 - lift / (unit * 3)), unit * 0.14, 0, 0, Math.PI * 2);
  g.fill();
  // Feet.
  g.fillStyle = mix(body, "#000000", 0.25);
  for (const k of [-1, 1]) {
    const step = walk ? Math.sin(f.t * 8 + (k > 0 ? Math.PI : 0)) * unit * 0.18 : 0;
    g.beginPath();
    g.ellipse(x + k * unit * 0.35 + step, y + unit * 0.92, unit * 0.22, unit * 0.12, 0, 0, Math.PI * 2);
    g.fill();
  }
  // Arms: wave, point, or swing.
  g.strokeStyle = mix(body, "#000000", 0.12);
  g.lineWidth = unit * 0.18;
  g.lineCap = "round";
  for (const k of [-1, 1]) {
    const isLead = k === face;
    let ang = Math.PI / 2 + k * 0.9;
    if (pose === "wave" && isLead) ang = -Math.PI / 2 + k * (0.6 + Math.sin(f.t * 7) * 0.35);
    else if (pose === "point" && isLead) ang = k > 0 ? -0.15 : Math.PI + 0.15;
    else if (walk) ang += Math.sin(f.t * 8 + k) * 0.4;
    const sx = x + k * unit * 0.72;
    const sy = y + unit * 0.05;
    g.beginPath();
    g.moveTo(sx, sy);
    g.lineTo(sx + Math.cos(ang) * unit * 0.55, sy + Math.sin(ang) * unit * 0.55);
    g.stroke();
  }
  // Body.
  g.fillStyle = body;
  g.beginPath();
  g.ellipse(x, y, unit * 0.85 / squash, unit * 0.88 * squash, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = rgba("#ffffff", 0.18);
  g.beginPath();
  g.ellipse(x - unit * 0.3, y - unit * 0.42, unit * 0.26, unit * 0.16, -0.5, 0, Math.PI * 2);
  g.fill();
  // Face.
  eyes(g, f, x + lx * unit * 0.08, y - unit * 0.15 + ly * unit * 0.05, unit * 0.2, unit * 0.3, blink, lx, ly);
  g.strokeStyle = "#1d1b26";
  g.lineWidth = unit * 0.07;
  g.beginPath();
  const smile = 0.25 + mood * 0.45 + jumpTap * 0.3;
  g.arc(x + lx * unit * 0.08, y + unit * 0.18, unit * 0.22, Math.PI * (0.5 - smile * 0.5), Math.PI * (0.5 + smile * 0.5));
  g.stroke();
  // Cheeks.
  g.fillStyle = rgba("#ff7a8a", 0.35 * mood);
  for (const k of [-1, 1]) {
    g.beginPath();
    g.ellipse(x + k * unit * 0.52, y + unit * 0.12, unit * 0.12, unit * 0.07, 0, 0, Math.PI * 2);
    g.fill();
  }
};
