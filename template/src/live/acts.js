// Choreography for the cast of the living scenes. An act owns one actor (or a group) and,
// every frame, decides where each body is, where it points and how hard it swims or flaps.
// The stage draws act.items. All motion is springs and slow waves, so nothing ever snaps.
import { mat4 } from "./gl.js";

const CAM = 7;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
const easeIO = (u) => {
  u = clamp(u, 0, 1);
  return u * u * (3 - 2 * u);
};
const lerp = (a, b, t) => a + (b - a) * t;
const wrap = (v, a, b) => a + ((((v - a) % (b - a)) + (b - a)) % (b - a));
const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/** A damped spring toward a target. */
function spring(v = 0, k = 30, d = 9) {
  return {
    v, vel: 0, k, d,
    to(target, dt) {
      this.vel += ((target - this.v) * this.k - this.vel * this.d) * dt;
      this.v += this.vel * dt;
      return this.v;
    },
  };
}

function item(m) {
  return { m: mat4.identity(), phase: Math.random() * 6, wave: m.wave.slice(), bendX: 0, bendY: 0, fold: 0, lookX: 0, lookY: 0, burst: 0, alpha: 1, glow: 0, seed: Math.random() };
}
/** Half the model's length in world units (size is a share of the scene's width). */
const sized = (d, S) => (S.tall ? d.sizeTall ?? d.size * 1.7 : d.size) * S.W;
const spotOf = (d, S) => S.place(S.tall ? d.spotTall ?? [0.5, 0.72] : d.spot ?? [0.68, 0.52]);
const tapNear = (S, x, y, r) => S.taps.find((t) => Math.hypot(t.x - x, t.y - y) < r);
/** How much wider the view is at depth z than at z = 0. */
const widen = (z) => (CAM - z) / CAM;
const yawOf = (dx, dz) => Math.atan2(-dz, dx);

/**
 * Cruise: the swimmer (or a bird on the wing) holds its place beside the headline,
 * wandering a little and turning its body toward the pointer. It arrives out of the
 * distance, rolls when tapped and dives or climbs away as the page scrolls.
 */
function cruise(d, S, m) {
  const it = item(m);
  const yaw = spring(0, 14, 7), pitch = spring(0, 14, 7), roll = spring(0, 9, 5.2);
  const face = d.face || [-1, 0, 0.42];
  const baseYaw = yawOf(face[0], face[2]);
  let rollT = 0, boost = 0, t0 = null;
  const seed = d.seed ?? Math.random() * 10;
  const off = d.offset || [0, 0, 0];
  return {
    items: [it],
    update() {
      const { t, dt } = S;
      if (t0 === null) t0 = t;
      const [hx, hy] = spotOf(d, S);
      const sc = sized(d, S);
      const intro = ease((t - t0 - (d.delay ?? 0)) / (d.intro ?? 3.6));
      const wa = d.wander ?? 1;
      let x = hx + off[0] * sc + Math.sin(t * 0.13 + seed) * 0.1 * S.W * wa;
      let y = hy + off[1] * sc + Math.sin(t * 0.19 + seed * 2) * 0.07 * S.H * wa;
      let z = off[2] * sc + Math.sin(t * 0.11 + seed * 3) * 0.5 * wa;
      // Arrive from far away, along the way it faces.
      const far = (1 - intro) * (d.introFar ?? 16);
      x -= face[0] * far * 0.9;
      z -= far * 0.75 + face[2] * far * 0.3;
      y += (1 - intro) * (d.introRise ?? 0.6);
      // Leave with the scroll.
      const sdir = d.exit === "climb" ? 1 : -1;
      const s = S.scroll;
      y += sdir * Math.pow(s, 1.25) * S.H * 2.1;
      x += face[0] * s * S.W * 0.5;
      z -= s * 2.5;
      // Look toward the pointer: the whole body turns, and bends into the turn.
      let ty = Math.sin(t * 0.16 + seed) * 0.2 * wa;
      let tp = Math.sin(t * 0.23 + seed) * 0.07 * wa + sdir * s * 0.75 + (d.pitch ?? 0);
      if (S.ptr.in) {
        ty += clamp((S.ptr.wx - x) / S.W, -1, 1) * 0.32;
        tp += clamp((S.ptr.wy - y) / S.H, -1, 1) * 0.3;
      }
      yaw.to(ty, dt);
      pitch.to(tp, dt);
      it.bendX = clamp(-yaw.vel * 0.5, -0.3, 0.3) * (d.bend ?? 1) * Math.sign(face[0] || 1) * -1;
      it.bendY = clamp(-pitch.vel * 0.4, -0.25, 0.25) * (d.bend ?? 1);
      // A tap: a slow roll, a burst of speed and bubbles.
      const tap = tapNear(S, x, y, sc * 1.4);
      if (tap) {
        if (d.roll !== false) rollT += Math.PI * 2;
        boost = 1;
        S.spark(x + face[0] * sc * 0.6, y + sc * 0.15, z, 22, { spread: sc * 0.3, speed: 0.5, up: 0.5, size: 22 });
        if (S.scene.style === "points") it.burst = 1;
      }
      roll.to(rollT, dt);
      boost *= Math.exp(-dt * 0.9);
      it.phase += dt * (m.tempo ?? 1.6) * (d.tempo ?? 1) * (1 + boost * 1.6);
      const w = m.wave, g = (d.effort ?? 1) * (1 + boost * 0.5);
      it.wave[0] = w[0] * g; it.wave[1] = w[1] * g; it.wave[2] = w[2]; it.wave[3] = w[3];
      it.burst = Math.max(0, it.burst - dt * 0.8);
      it.lookX = clamp(yaw.v * 0.6, -0.5, 0.5);
      it.lookY = clamp(pitch.v * 0.6, -0.4, 0.4);
      it.m = mat4.pose(x, y, z, baseYaw + yaw.v, pitch.v, roll.v - yaw.vel * 0.3 + (d.bank ?? 0), sc);
    },
  };
}

/**
 * Drift: a loose group rising (or sinking) slowly through the scene: jellyfish pulsing
 * upward, lanterns and balloons on the air. The pointer nudges them aside; a tap nearby
 * gives one a kick.
 */
function drift(d, S, m) {
  const n = Math.max(1, Math.round((d.count ?? 6) * (S.scene.amount ?? 1)));
  const list = [];
  for (let i = 0; i < n; i++) {
    const it = item(m);
    Object.assign(it, { fx: (i + 0.5 + rnd(-0.35, 0.35)) / n, y0: rnd(), z: lerp(d.zFar ?? -7, d.zNear ?? 1, Math.pow(rnd(), 1.3)), k: rnd(0.75, 1.25), sp: rnd(0.7, 1.3), ox: spring(0, 10, 4), oy: spring(0, 10, 4), kick: 0, spin: rnd(0, 6) });
    list.push(it);
  }
  // Shuffle left-to-right so depth and position are not linked, then draw far ones first.
  list.sort((a, b) => a.z - b.z);
  const range = d.spread || [0.04, 0.96];
  let travel = 0;
  return {
    items: list,
    update() {
      const { t, dt } = S;
      travel += dt * (d.rise ?? 0.12) * (1 + S.scroll * 1.5);
      for (const it of list) {
        const wz = widen(it.z);
        const sc = sized(d, S) * it.k;
        const top = S.H * wz + sc * 2.2;
        const pulse = d.pulse ? 0.5 + 0.5 * Math.sin(it.phase - 1.3) : 0;
        const y = wrap((it.y0 * 2 - 1) * top + travel * it.sp * (d.far ? wz : 1) + S.scroll * S.H * 1.2, -top, top);
        const x = (lerp(range[0], range[1], it.fx) * 2 - 1) * S.W * wz + Math.sin(t * 0.2 * it.sp + it.spin) * 0.25 * (d.sway ?? 1);
        // The pointer pushes them away gently.
        let px = 0, py = 0;
        if (S.ptr.in) {
          const dx = x + it.ox.v - S.ptr.wx * wz, dy = y + it.oy.v - S.ptr.wy * wz;
          const dist = Math.hypot(dx, dy), r = S.H * 0.7;
          if (dist < r) {
            const f = (1 - dist / r) * 0.9;
            px = (dx / (dist || 1)) * f;
            py = (dy / (dist || 1)) * f;
          }
        }
        it.ox.to(px, dt);
        it.oy.to(py, dt);
        if (tapNear(S, (x + it.ox.v) / wz, (y + it.oy.v) / wz, sc * 1.6 + 0.4)) {
          it.kick = 1;
          S.spark(x, y, it.z, d.pulse ? 10 : 14, { spread: sc * 0.5, speed: 0.4, up: 0.4, size: 18 });
        }
        it.kick *= Math.exp(-dt * 1.1);
        it.y0 += (it.kick * dt * 0.5) / top;
        it.phase += dt * (m.tempo ?? 1) * it.sp * (1 + it.kick * 1.5);
        it.glow = it.kick * 0.8 + (d.flicker ? 0.12 * Math.sin(t * 3 * it.sp + it.spin) : 0);
        it.bendX = clamp(-it.ox.vel * 0.3, -0.4, 0.4);
        it.bendY = clamp(-it.oy.vel * 0.3, -0.4, 0.4);
        const tilt = Math.sin(t * 0.3 * it.sp + it.spin) * (d.tilt ?? 0.12) + it.ox.vel * 0.2;
        const surge = d.pulse ? pulse * sc * 0.12 : 0;
        if (d.pulse) it.m = mat4.pose(x + it.ox.v, y + it.oy.v + surge, it.z, 0, Math.PI / 2 - tilt, it.spin, sc);
        else it.m = mat4.pose(x + it.ox.v, y + it.oy.v, it.z, it.spin + t * 0.05 * it.sp, 0, tilt, sc);
      }
    },
  };
}

/**
 * School: many small fish moving as one along a looping path. They open around the pointer
 * and scatter from a tap, then gather again.
 */
function school(d, S, m) {
  const n = Math.max(3, Math.round((d.count ?? 40) * (S.scene.amount ?? 1)));
  const list = [];
  for (let i = 0; i < n; i++) {
    const it = item(m);
    const a = rnd(0, 6.283), r = Math.pow(rnd(), 0.6);
    Object.assign(it, { o: [Math.cos(a) * r * 1.5, rnd(-0.6, 0.6), Math.sin(a) * r], lag: rnd(0, 0.9), k: rnd(0.8, 1.2), px: spring(0, 26, 6), py: spring(0, 26, 6), tint: i % (d.tints ?? 3) });
    list.push(it);
  }
  const open = spring(1, 12, 3.2);
  const path = (t, home) => [home[0] + Math.sin(t * 0.23) * 0.42 * S.W, home[1] + Math.sin(t * 0.37 + 1) * 0.3 * S.H, Math.sin(t * 0.17 + 2) * 1.6 - 0.5];
  return {
    items: list,
    update() {
      const { t, dt } = S;
      const home = spotOf(d, S);
      const sc = sized(d, S);
      if (S.taps.length) open.vel += 9;
      open.to(1, dt);
      const s = S.scroll;
      for (const it of list) {
        const tt = t * (d.pace ?? 1) - it.lag;
        const c = path(tt, home), c2 = path(tt + 0.08, home);
        const R = (d.radius ?? 0.5) * S.H * open.v;
        let x = c[0] + it.o[0] * R, y = c[1] + it.o[1] * R, z = c[2] + it.o[2] * R;
        y -= Math.pow(s, 1.2) * S.H * 2;
        let ax = 0, ay = 0;
        if (S.ptr.in) {
          const dx = x - S.ptr.wx, dy = y - S.ptr.wy, dist = Math.hypot(dx, dy), r = S.H * 0.55;
          if (dist < r) {
            ax = (dx / (dist || 1)) * (1 - dist / r) * 0.9;
            ay = (dy / (dist || 1)) * (1 - dist / r) * 0.9;
          }
        }
        it.px.to(ax, dt);
        it.py.to(ay, dt);
        const dx = c2[0] - c[0] + it.px.vel * 0.02, dy = c2[1] - c[1] + it.py.vel * 0.02, dz = c2[2] - c[2];
        const sp = Math.hypot(dx, dy, dz) / 0.08;
        it.phase += dt * (m.tempo ?? 5) * it.k * (0.6 + sp * 0.5 + Math.abs(open.vel) * 0.2);
        it.bendX = clamp(it.px.vel * 0.2, -0.3, 0.3);
        it.m = mat4.pose(x + it.px.v, y + it.py.v, z, yawOf(dx, dz), Math.asin(clamp(dy / (Math.hypot(dx, dy, dz) || 1), -0.8, 0.8)), 0, sc * it.k);
      }
    },
  };
}

/**
 * Pond: koi seen from above. They wander, come to the pointer as if it had food, and dart
 * away from a tap while rings spread over the water.
 */
function pond(d, S, m) {
  const it = item(m);
  let x = null, y = 0, a = rnd(0, 6.28), v = 0.4, tx = 0, ty = 0, next = 0, flee = 0, turn = 0;
  const seed = d.seed ?? rnd(0, 10);
  return {
    items: [it],
    update() {
      const { t, dt } = S;
      const sc = sized(d, S);
      const bx = S.W * 0.92, by = S.H * 0.86;
      if (x === null) {
        x = rnd(-bx, bx) * 0.8;
        y = rnd(-by, by) * 0.8;
      }
      if (t > next) {
        tx = rnd(-bx, bx) * 0.85;
        ty = rnd(-by, by) * 0.85;
        next = t + rnd(3, 7);
      }
      let gx = tx, gy = ty, hungry = false;
      if (S.ptr.in) {
        // Gather in a ring around the pointer rather than on top of each other.
        gx = S.ptr.wx + Math.cos(seed * 2.4 + t * 0.2) * sc * 0.9;
        gy = S.ptr.wy + Math.sin(seed * 2.4 + t * 0.2) * sc * 0.9;
        hungry = true;
      }
      const tap = S.taps[0];
      if (tap && Math.hypot(tap.x - x, tap.y - y) < S.H * 1.1) {
        flee = 1.3;
        tx = clamp(x + (x - tap.x) * 3, -bx, bx);
        ty = clamp(y + (y - tap.y) * 3, -by, by);
        next = t + 2.5;
      }
      if (flee > 0) {
        flee -= dt;
        gx = tx;
        gy = ty;
      }
      const dist = Math.hypot(gx - x, gy - y);
      const want = Math.atan2(gy - y, gx - x);
      const rate = clamp(angDiff(want, a) * 2.4, -2.6, 2.6) * (flee > 0 ? 2.2 : 1);
      turn += (rate - turn) * (1 - Math.exp(-dt * 5));
      a += turn * dt;
      const goal = flee > 0 ? 2.6 : hungry ? clamp(dist * 0.9, 0.12, 1.5) : 0.42;
      v += (goal - v) * (1 - Math.exp(-dt * 2));
      x += Math.cos(a) * v * dt * (d.pace ?? 1);
      y += Math.sin(a) * v * dt * (d.pace ?? 1);
      it.phase += dt * (m.tempo ?? 3) * (0.45 + v * 0.9);
      it.bendX = clamp(-turn * 0.16, -0.4, 0.4);
      const g = 0.6 + v * 0.5;
      it.wave[0] = m.wave[0] * g;
      it.wave[1] = m.wave[1] * g;
      const s = S.scroll;
      it.m = mat4.pose(x, y - s * S.H * 0.6, (d.depth ?? 0) - s * 2, 0, a, Math.PI / 2, sc);
    },
  };
}

/** Still: things that stay put (the perch, lily pads) and only breathe. */
function still(d, S, m) {
  const places = d.places || [{ spot: d.spot, spotTall: d.spotTall, size: d.size, sizeTall: d.sizeTall }];
  const list = places.map((p, i) => Object.assign(item(m), { p, i }));
  return {
    items: list,
    update() {
      const { t } = S;
      for (const it of list) {
        const p = it.p;
        const [x, y] = S.place(S.tall ? p.spotTall ?? p.spot : p.spot);
        const sc = (S.tall ? p.sizeTall ?? p.size * 1.7 : p.size) * S.W;
        const bob = Math.sin(t * 0.6 + it.i * 2.1) * (d.bob ?? 0.01);
        const age = t - S.ripple.t;
        const push = d.float && age < 3 ? Math.sin(age * 7) * 0.03 * (1 - age / 3) : 0;
        it.m = mat4.pose(x + push, y + bob * sc - S.scroll * S.H * (d.scroll ?? 0.5), p.z ?? d.z ?? 0, d.yaw ?? 0, (p.rot ?? 0) + (d.float ? Math.sin(t * 0.2 + it.i) * 0.08 : bob * 0.5), d.roll ?? 0, sc);
      }
    },
  };
}

// A point and direction along a smooth path through control points (Catmull-Rom).
function along(pts, u) {
  const n = pts.length - 1;
  const f = clamp(u, 0, 0.9999) * n;
  const i = Math.floor(f), tt = f - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
  const out = [0, 0, 0], der = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const a = 2 * p1[k], b = p2[k] - p0[k], c = 2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k], e = -p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k];
    out[k] = 0.5 * (a + b * tt + c * tt * tt + e * tt * tt * tt);
    der[k] = 0.5 * (b + 2 * c * tt + 3 * e * tt * tt);
  }
  return [out, der];
}

/**
 * Perch: the parrot's act. It flies in from far off, flares and lands on the branch, folds
 * its wings and watches the pointer. Tap and it takes off on a lap around the headline and
 * lands again. Scroll away and it leaves; scroll back and it returns.
 */
function perch(d, S, m) {
  const it = item(m);
  let state = "in", u = 0, t0 = null, path = null, dur = 3.4, shrug = 6;
  const fold = spring(0, 40, 9), pitch = spring(0, 30, 9), yaw = spring(0, 20, 8), roll = spring(0, 20, 7);
  const lookX = spring(0, 40, 9), lookY = spring(0, 40, 9);
  const sitYaw = d.sitYaw ?? -2.45, sitPitch = d.sitPitch ?? 0.95;
  const P = () => {
    const [x, y] = spotOf(d, S);
    const sc = sized(d, S);
    return [x + (d.foot?.[0] ?? 0) * sc, y + (d.foot?.[1] ?? 0.2) * sc, d.z ?? 0];
  };
  const routeIn = () => {
    const p = P();
    return [[-S.W * 1.7, S.H * 1.0, -11], [-S.W * 0.9, S.H * 0.75, -6.5], [p[0] - S.W * 0.55, p[1] + S.H * 0.42, -1.5], [p[0] - S.W * 0.12, p[1] + S.H * 0.16, -0.2], p];
  };
  const routeLap = () => {
    const p = P();
    const cx = S.tall ? 0 : -S.W * 0.2;
    return [p, [p[0] - S.W * 0.2, p[1] + S.H * 0.5, 0.6], [cx - S.W * 0.55, S.H * 0.45, -1.5], [cx - S.W * 0.5, -S.H * 0.45, -4], [cx + S.W * 0.2, -S.H * 0.55, -5], [p[0] + S.W * 0.35, p[1] + S.H * 0.2, -3.5], [p[0] - S.W * 0.1, p[1] + S.H * 0.4, -0.8], [p[0] - S.W * 0.08, p[1] + S.H * 0.13, -0.1], p];
  };
  const routeOut = () => {
    const p = P();
    return [p, [p[0] - S.W * 0.25, p[1] + S.H * 0.5, 0], [-S.W * 0.4, S.H * 1.5, -3], [-S.W * 1.4, S.H * 2.6, -9]];
  };
  const fly = (route, time) => {
    path = route;
    dur = time;
    u = 0;
    state = "fly";
  };
  return {
    items: [it],
    update() {
      const { t, dt } = S;
      const sc = sized(d, S);
      if (t0 === null) {
        t0 = t;
        fly(routeIn(), 3.6);
      }
      const away = S.scroll > 0.3;
      let pos = P();
      if (state === "fly") {
        u += dt / dur;
        // Slow down into the landing.
        const e = path.out ? u * u : u < 0.75 ? u * 1.12 : 0.84 + (1 - Math.pow(1 - (u - 0.75) / 0.25, 2)) * 0.16;
        const [p, der] = along(path, e);
        pos = p;
        const len = Math.hypot(der[0], der[1], der[2]) || 1;
        const landing = path.out ? 0 : sstep(0.8, 1, u);
        yaw.to(lerpAngle(yawOf(der[0], der[2]), sitYaw, landing), dt);
        pitch.to(lerp(Math.asin(clamp(der[1] / len, -0.9, 0.9)) * 0.7, sitPitch * 0.9, landing), dt);
        roll.to(clamp(-yaw.vel * 0.35, -0.7, 0.7) * (1 - landing), dt);
        fold.to(0, dt);
        it.phase += dt * m.tempo * (1 + landing * 0.5);
        const g = 1 + landing * 0.25;
        it.wave[0] = m.wave[0] * g;
        it.wave[1] = m.wave[1] * g;
        lookX.to(0, dt);
        lookY.to(-landing * 0.3, dt);
        if (u >= 1) {
          if (path.out) state = "gone";
          else {
            state = "sit";
            shrug = t + rnd(4, 8);
            S.spark(pos[0], pos[1] - sc * 0.15, pos[2], 6, { spread: sc * 0.2, speed: 0.3, up: -0.2, size: 12 });
          }
        }
      } else if (state === "sit") {
        yaw.to(sitYaw, dt);
        pitch.to(sitPitch, dt);
        roll.to(0, dt);
        // Now and then it stretches its wings.
        const stretch = t > shrug && t < shrug + 1.1;
        if (t > shrug + 1.1) shrug = t + rnd(6, 11);
        fold.to(stretch ? 0.35 : 1, dt);
        it.wave[0] = m.wave[0] * (stretch ? 0.25 : 0.0);
        it.wave[1] = m.wave[1] * (stretch ? 0.2 : 0.0);
        it.phase += dt * m.tempo * 0.6;
        // The head follows the pointer.
        let lx = Math.sin(t * 0.5) * 0.25, ly = Math.sin(t * 0.37) * 0.08 - 0.75;
        if (S.ptr.in) {
          lx = clamp((S.ptr.wx - pos[0]) / S.W, -1, 1) * -0.9;
          ly = clamp((S.ptr.wy - pos[1]) / S.H, -1, 1) * 0.5 - 0.7;
        }
        lookX.to(lx, dt);
        lookY.to(ly, dt);
        pos = [pos[0], pos[1] + Math.sin(t * 1.3) * 0.008 * sc, pos[2]];
        if (away) {
          const r = routeOut();
          r.out = true;
          fly(r, 2.6);
        } else if (S.taps.length) fly(routeLap(), 5.2);
      } else if (state === "gone") {
        it.hidden = true;
        if (S.scroll < 0.15) {
          it.hidden = false;
          fly(routeIn(), 3.2);
        }
        return;
      }
      it.hidden = false;
      it.fold = clamp(fold.v, 0, 1);
      it.lookX = lookX.v;
      it.lookY = lookY.v;
      it.burst = Math.max(0, it.burst - dt * 0.8);
      it.m = mat4.pose(pos[0], pos[1], pos[2], yaw.v, pitch.v, roll.v, sc);
    },
  };
}
const sstep = (a, b, x) => easeIO((x - a) / (b - a));
const lerpAngle = (a, b, t) => a + angDiff(b, a) * t;

/**
 * Soar: wide banked circles through the depth of the scene (an eagle, a paper plane). The
 * circle leans toward the pointer; a tap brings a few strong wingbeats and a faster lap.
 */
function soar(d, S, m) {
  const it = item(m);
  let th = d.start ?? 2.2, boost = 0, t0 = null;
  const cx = spring(0, 3, 3), cy = spring(0, 3, 3), roll = spring(0, 10, 6);
  return {
    items: [it],
    update() {
      const { t, dt } = S;
      if (t0 === null) t0 = t;
      const [hx, hy] = spotOf(d, S);
      const sc = sized(d, S);
      cx.to(S.ptr.in ? (S.ptr.wx - hx) * 0.3 : 0, dt);
      cy.to(S.ptr.in ? (S.ptr.wy - hy) * 0.3 : 0, dt);
      if (S.taps.length) boost = 1;
      boost *= Math.exp(-dt * 0.5);
      const intro = ease((t - t0) / 3);
      th += dt * (d.pace ?? 0.32) * (1 + boost * 1.4);
      const rx = (d.rx ?? 0.5) * S.W * (S.tall ? 1.3 : 1), rz = d.rz ?? 4, ry = (d.ry ?? 0.16) * S.H;
      const at = (a) => [hx + cx.v + Math.cos(a) * rx, hy + cy.v + Math.sin(a * 2 + 0.6) * ry + Math.sin(a) * ry * 0.8, Math.sin(a) * rz - rz * 0.72];
      const p = at(th), q = at(th + 0.03);
      const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2];
      const len = Math.hypot(dx, dy, dz) || 1;
      const s = S.scroll;
      const y = p[1] + (1 - intro) * S.H * 1.6 + Math.pow(s, 1.2) * S.H * 2.2 * (d.exit === "dive" ? -1 : 1);
      roll.to((d.bank ?? 0.5) + boost * 0.2, dt);
      // Mostly gliding; a few beats now and then, and after a tap.
      const beat = Math.max(boost, Math.pow(Math.max(0, Math.sin(t * 0.35 + 1)), 6));
      it.wave[0] = m.wave[0] * (0.25 + beat * 4.2);
      it.wave[1] = m.wave[1] * (0.4 + beat * 2.5);
      it.phase += dt * m.tempo * (0.5 + beat * 1.2);
      it.lookX = clamp(cx.vel * 0.4, -0.4, 0.4);
      it.burst = Math.max(0, it.burst - dt * 0.8);
      if (S.taps.length && S.scene.style === "points") it.burst = 1;
      it.m = mat4.pose(p[0], y, p[2] - s * 2, yawOf(dx, dz), Math.asin(clamp(dy / len, -0.8, 0.8)) + s * 0.5, -roll.v, sc);
    },
  };
}

/**
 * Swarm: fluttering things (butterflies, a hummingbird) that wander on their own paths,
 * come to the pointer and scatter from a tap.
 */
function swarm(d, S, m) {
  const n = Math.max(1, Math.round((d.count ?? 12) * (d.count > 1 ? (S.scene.amount ?? 1) : 1)));
  const list = [];
  for (let i = 0; i < n; i++) {
    const it = item(m);
    Object.assign(it, { a: rnd(0, 6.28), b: rnd(0, 6.28), k: rnd(0.7, 1.25), sp: rnd(0.6, 1.3), z: lerp(d.zFar ?? -4, d.zNear ?? 1.2, rnd()), x: null, y: 0, vx: 0, vy: 0, ring: rnd(0.3, 1.2), yaw: spring(0, 16, 7), home: [rnd(0.08, 0.92), rnd(0.12, 0.88)] });
    list.push(it);
  }
  list.sort((a, b) => a.z - b.z);
  const solo = n === 1;
  return {
    items: list,
    update() {
      const { t, dt } = S;
      const sc0 = sized(d, S);
      for (const it of list) {
        const wz = widen(it.z);
        const sc = sc0 * it.k;
        const home = solo ? spotOf(d, S) : S.place(it.home);
        let gx = home[0] * wz + Math.sin(t * 0.21 * it.sp + it.a) * S.W * (solo ? 0.12 : 0.3);
        let gy = home[1] * wz + Math.sin(t * 0.29 * it.sp + it.b) * S.H * (solo ? 0.12 : 0.3);
        if (S.ptr.in) {
          const w = solo ? 1 : d.follow ?? 0.55;
          const ox = Math.cos(it.a + t * 0.3) * sc * (solo ? 1.6 : 3) * it.ring, oy = Math.sin(it.a + t * 0.3) * sc * (solo ? 0.8 : 3) * it.ring;
          gx = lerp(gx, S.ptr.wx * wz + ox, w);
          gy = lerp(gy, S.ptr.wy * wz + oy, w);
        }
        if (it.x === null) {
          it.x = gx + rnd(-1, 1) * S.W;
          it.y = gy + S.H * 1.5;
        }
        const k = d.snap ?? 2.2, damp = d.damp ?? 2.4;
        it.vx += ((gx - it.x) * k - it.vx * damp) * dt;
        it.vy += ((gy - it.y) * k - it.vy * damp) * dt;
        for (const tap of S.taps) {
          const dx = it.x - tap.x * wz, dy = it.y - tap.y * wz, dist = Math.hypot(dx, dy) || 1;
          if (dist < S.H * 1.2) {
            it.vx += (dx / dist) * 5 * (1 - dist / (S.H * 1.2));
            it.vy += (dy / dist) * 5 * (1 - dist / (S.H * 1.2)) + 1;
          }
        }
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        const sp = Math.hypot(it.vx, it.vy);
        it.phase += dt * m.tempo * it.sp * (0.8 + Math.min(1.2, sp * 0.4));
        // Face the way it moves; when hovering, face the pointer (or the camera side).
        const dir = sp > 0.25 ? Math.sign(it.vx) : S.ptr.in ? Math.sign(S.ptr.wx * wz - it.x) || 1 : it.yaw.v > Math.PI / 2 ? -1 : 1;
        it.yaw.to(dir < 0 ? Math.PI - 0.5 : 0.5, dt);
        const flut = d.flutter ?? 0;
        const y = it.y + Math.sin(it.phase) * flut * sc - Math.pow(S.scroll, 1.2) * S.H * -1.8;
        it.lookX = 0;
        it.lookY = solo && S.ptr.in ? clamp((S.ptr.wy * wz - it.y) / S.H, -0.5, 0.5) : 0;
        it.burst = Math.max(0, it.burst - dt * 0.8);
        it.m = mat4.pose(it.x, y, it.z, -it.yaw.v, (d.pitch ?? 0.35) + clamp(it.vy * 0.15, -0.4, 0.5), clamp(-it.vx * 0.12, -0.5, 0.5) * (dir < 0 ? -1 : 1), sc);
      }
    },
  };
}

export const ACTS = { cruise, drift, school, pond, still, perch, soar, swarm };
