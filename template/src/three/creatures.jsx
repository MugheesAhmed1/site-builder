import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, CapsuleGeometry, ExtrudeGeometry, Color, ConeGeometry, DoubleSide, LatheGeometry, MathUtils, Shape, ShapeGeometry, SphereGeometry, Vector2, Vector3 } from "three";
import { damp } from "./kit.jsx";

// Characters modelled in code (no picture or model files) and a small brain that decides
// what they do. The brain is a state machine fed by the page:
//
//   IDLE ──pointer near──▶ LOOK ──tap──▶ REACT ──(1.4 s)──▶ LOOK / IDLE
//     ▲                                                          │
//     └────────── scroll back to the top ◀── AWAY ◀── scroll down ┘
//   any state ──loud sound (when listening)──▶ DANCE ──quiet──▶ IDLE
//
// Every state blends into the next (nothing snaps), so the creature always looks alive.

export const STATES = ["IDLE", "LOOK", "REACT", "DANCE", "AWAY"];

/** The brain: call step() once per frame with what the page is doing. */
export function makeBrain() {
  return {
    state: "IDLE",
    since: 0,
    reacts: 0,
    look: new Vector2(),
    blink: 0,
    nextBlink: 2,
    fidget: 0,
    nextFidget: 4,
    step(dt, s) {
      // s: { near, x, y, tapped, away, loud }
      this.since += dt;
      const prev = this.state;
      if (s.away) this.state = "AWAY";
      else if (this.state === "AWAY" && !s.away) this.state = "IDLE";
      else if (s.tapped) this.state = "REACT";
      else if (this.state === "REACT" && this.since < 1.4) this.state = "REACT";
      else if (s.loud) this.state = "DANCE";
      else if (this.state === "DANCE" && this.since < 0.9) this.state = "DANCE";
      else this.state = s.near ? "LOOK" : "IDLE";
      if (this.state !== prev || (s.tapped && this.state === "REACT")) {
        if (this.state === "REACT") this.reacts += 1;
        this.since = 0;
      }
      // Eyes follow the pointer while looking, drift back to the front otherwise.
      const tx = this.state === "LOOK" || this.state === "REACT" ? s.x : 0;
      const ty = this.state === "LOOK" || this.state === "REACT" ? s.y : 0;
      this.look.x = damp(this.look.x, tx, 6, dt);
      this.look.y = damp(this.look.y, ty, 6, dt);
      // Blinks and small idle moves at random moments.
      this.nextBlink -= dt;
      if (this.nextBlink <= 0) {
        this.blink = 1;
        this.nextBlink = 1.8 + Math.random() * 3.5;
      }
      this.blink = Math.max(0, this.blink - dt * 7);
      this.nextFidget -= dt;
      if (this.nextFidget <= 0) {
        this.fidget = 1;
        this.nextFidget = 3 + Math.random() * 5;
      }
      this.fidget = Math.max(0, this.fidget - dt * 0.8);
    },
  };
}

// ------------------------------------------------------------------ sounds
// Short synthesised calls with the Web Audio API: no sound files, nothing to license.
let ctx = null;
function audio() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function squawk() {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  [0, 0.16].forEach((off, i) => {
    const o = a.createOscillator();
    const f = a.createBiquadFilter();
    const g = a.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(1500 + i * 300, t + off);
    o.frequency.exponentialRampToValueAtTime(700, t + off + 0.14);
    f.type = "bandpass";
    f.frequency.value = 1900;
    f.Q.value = 3;
    g.gain.setValueAtTime(0.0001, t + off);
    g.gain.exponentialRampToValueAtTime(0.18, t + off + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.15);
    o.connect(f).connect(g).connect(a.destination);
    o.start(t + off);
    o.stop(t + off + 0.17);
  });
}

export function whaleCall() {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator();
  const o2 = a.createOscillator();
  const f = a.createBiquadFilter();
  const g = a.createGain();
  o.type = "sine";
  o2.type = "triangle";
  o.frequency.setValueAtTime(180, t);
  o.frequency.exponentialRampToValueAtTime(320, t + 0.6);
  o.frequency.exponentialRampToValueAtTime(140, t + 1.6);
  o2.frequency.setValueAtTime(90, t);
  o2.frequency.exponentialRampToValueAtTime(160, t + 0.6);
  o2.frequency.exponentialRampToValueAtTime(70, t + 1.6);
  f.type = "lowpass";
  f.frequency.value = 900;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
  o.connect(f);
  o2.connect(f);
  f.connect(g).connect(a.destination);
  o.start(t);
  o2.start(t);
  o.stop(t + 1.9);
  o2.stop(t + 1.9);
}

// ------------------------------------------------------------------ shared bits
// A material that bends its mesh along x with a travelling wave (swimming).
function swimMaterial(color, opts = {}) {
  return {
    uniforms: { uTime: { value: 0 }, uAmp: { value: opts.amp ?? 0.18 }, uLen: { value: opts.len ?? 4 } },
    patch(shader, u) {
      shader.uniforms.uTime = u.uTime;
      shader.uniforms.uAmp = u.uAmp;
      shader.uniforms.uLen = u.uLen;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uTime; uniform float uAmp; uniform float uLen;")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          float k = clamp(transformed.x / uLen + 0.35, 0.0, 1.5);
          transformed.y += sin(transformed.x * 1.6 - uTime * 2.6) * uAmp * k * k;`
        );
    },
    color,
  };
}

function useSwim(color, opts) {
  const m = useMemo(() => swimMaterial(color, opts), [color, opts]);
  return m;
}

// Belly lighter than back: colour each vertex by its height.
function shade(geo, top, belly) {
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const c = new Color();
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < min) min = y;
    if (y > max) max = y;
  }
  for (let i = 0; i < pos.count; i++) {
    const k = MathUtils.smoothstep(pos.getY(i), min + (max - min) * 0.25, min + (max - min) * 0.6);
    c.copy(belly).lerp(top, k);
    cols.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new BufferAttribute(cols, 3));
  return geo;
}

// ------------------------------------------------------------------ whale
function whaleBody() {
  // A humpback-ish profile turned on a lathe: blunt head, long tapering tail stock.
  const pts = [];
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const r = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.9) * 0.62 * (1 - t * 0.35) + 0.02;
    pts.push(new Vector2(r, (t - 0.38) * 4.4));
  }
  const g = new LatheGeometry(pts, 40);
  g.rotateZ(-Math.PI / 2); // lathe runs along y; the head ends up at -x, the tail at +x
  g.scale(1, 0.82, 1); // a little flatter than round
  return shade(g, new Color("#3d6a99"), new Color("#e3edf5"));
}

function fluke() {
  const s = new Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.35, 0.25, 0.75, 0.75, 1.0, 0.9);
  s.bezierCurveTo(0.8, 0.45, 0.65, 0.2, 0.7, 0.0);
  s.bezierCurveTo(0.65, -0.2, 0.8, -0.45, 1.0, -0.9);
  s.bezierCurveTo(0.75, -0.75, 0.35, -0.25, 0, 0);
  const g = new ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 3, curveSegments: 16 });
  g.translate(0, 0, -0.025);
  g.rotateX(Math.PI / 2);
  return g;
}

function fin() {
  const s = new Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.2, 0.1, 0.9, 0.2, 1.4, 0.05);
  s.bezierCurveTo(1.0, -0.1, 0.4, -0.2, 0, -0.1);
  const g = new ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, curveSegments: 12 });
  g.rotateX(Math.PI / 2);
  return g;
}

/** A whale that swims in place, watches the pointer, rolls and calls when tapped, and swims off on scroll. */
export function Whale({ brain, scale = 1, color = "#2c4a6e", glow = false }) {
  const root = useRef(null);
  const body = useRef(null);
  const tail = useRef(null);
  const finL = useRef(null);
  const finR = useRef(null);
  const eyeL = useRef(null);
  const eyeR = useRef(null);
  const geo = useMemo(() => ({ body: whaleBody(), fluke: fluke(), fin: fin(), eye: new SphereGeometry(0.06, 12, 8) }), []);
  const swim = useSwim(color, { amp: 0.22, len: 4 });
  const t = useRef(0);
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05);
    t.current += dt;
    const st = brain.state;
    const k = brain.since;
    swim.uniforms.uTime.value = t.current * (st === "AWAY" ? 1.8 : st === "DANCE" ? 2.2 : 1);
    if (tail.current) {
      // The flukes ride the same wave as the body, then beat a little further.
      const ut = swim.uniforms.uTime.value;
      const kk = Math.min(1.5, 2.45 / 4 + 0.35);
      tail.current.position.y = 0.04 + Math.sin(2.45 * 1.6 - ut * 2.6) * 0.22 * kk * kk;
      tail.current.rotation.z = Math.cos(2.45 * 1.6 - ut * 2.6) * 0.5;
    }
    const flap = Math.sin(t.current * 1.4) * 0.25;
    if (finL.current) finL.current.rotation.x = 0.5 + flap;
    if (finR.current) finR.current.rotation.x = -0.5 - flap;
    const g = root.current;
    if (!g) return;
    // Look: the whole head end turns toward the pointer.
    g.rotation.y = damp(g.rotation.y, brain.look.x * 0.5 + (st === "AWAY" ? -0.25 : 0), 4, dt);
    g.rotation.z = damp(g.rotation.z, brain.look.y * 0.25 + Math.sin(t.current * 0.6) * 0.05, 4, dt);
    // React: a full roll and a lift, then settle.
    const roll = st === "REACT" ? Math.min(1, k / 1.1) : 0;
    g.rotation.x = st === "REACT" ? MathUtils.lerp(0, Math.PI * 2, MathUtils.smootherstep(roll, 0, 1)) : damp(g.rotation.x % (Math.PI * 2), 0, 3, dt);
    const lift = st === "REACT" ? Math.sin(Math.min(1, k / 1.2) * Math.PI) * 0.8 : st === "DANCE" ? Math.abs(Math.sin(t.current * 6)) * 0.3 : 0;
    g.position.y = damp(g.position.y, Math.sin(t.current * 0.9) * 0.15 + lift, 6, dt);
    const awayX = 0;
    g.position.x = damp(g.position.x, awayX, st === "AWAY" ? 0.9 : 1.6, dt);
    const s = scale * (1 + (st === "REACT" ? Math.sin(Math.min(1, k) * Math.PI) * 0.05 : 0));
    g.scale.setScalar(damp(g.scale.x, s, 5, dt));
    const blink = 1 - brain.blink;
    if (eyeL.current) eyeL.current.scale.y = Math.max(0.1, blink);
    if (eyeR.current) eyeR.current.scale.y = Math.max(0.1, blink);
  });
  const onCompile = (shader) => swim.patch(shader, swim.uniforms);
  return (
    <group ref={root}>
      <group ref={body}>
        <mesh geometry={geo.body}>
          <meshStandardMaterial vertexColors roughness={0.38} metalness={0.05} emissive={glow ? new Color(color) : new Color("#000")} emissiveIntensity={glow ? 0.25 : 0} onBeforeCompile={onCompile} />
        </mesh>
        {/* grooves under the jaw */}
        {[...Array(6)].map((_, i) => (
          <mesh key={i} position={[-1.1 + i * 0.22, -0.38, 0]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.18, 0.012, 0.5 - i * 0.04]} />
            <meshStandardMaterial color="#9fb3c6" roughness={0.6} />
          </mesh>
        ))}
        <mesh ref={eyeL} geometry={geo.eye} position={[-1.15, 0.02, 0.43]}>
          <meshStandardMaterial color="#0b0f14" roughness={0.2} />
        </mesh>
        <mesh ref={eyeR} geometry={geo.eye} position={[-1.15, 0.02, -0.43]}>
          <meshStandardMaterial color="#0b0f14" roughness={0.2} />
        </mesh>
        <group ref={finL} position={[-0.7, -0.25, 0.45]} rotation={[0.5, 0.4, -0.5]}>
          <mesh geometry={geo.fin} scale={[1.7, 1, 1.3]}>
            <meshStandardMaterial color="#38577c" side={DoubleSide} roughness={0.5} />
          </mesh>
        </group>
        <group ref={finR} position={[-0.7, -0.25, -0.45]} rotation={[-0.5, -0.4, -0.5]}>
          <mesh geometry={geo.fin} scale={[1.7, 1, -1.3]}>
            <meshStandardMaterial color="#38577c" side={DoubleSide} roughness={0.5} />
          </mesh>
        </group>
        <group ref={tail} position={[2.45, 0.04, 0]}>
          <mesh geometry={geo.fluke} scale={[1.0, 1, 1.25]}>
            <meshStandardMaterial color="#2c4a6e" side={DoubleSide} roughness={0.5} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ------------------------------------------------------------------ parrot
// A teardrop body turned on a lathe: round chest, tapering to the tail.
function parrotBody() {
  const pts = [];
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const r = Math.sin(Math.PI * Math.pow(t, 0.75)) * (0.5 - t * 0.22) + 0.015;
    pts.push(new Vector2(r, 0.75 - t * 1.75));
  }
  return new LatheGeometry(pts, 32);
}

// A flattened, pointed blob for wing panels and tail feathers.
function blade(len, wid, thick) {
  const pts = [];
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(new Vector2(Math.sin(Math.PI * Math.pow(t, 0.7)) * wid + 0.002, -t * len));
  }
  const g = new LatheGeometry(pts, 16);
  g.scale(1, 1, thick / wid);
  return g;
}

/** A big scarlet macaw on a branch: follows the pointer with its head, squawks and flaps when tapped, dances to sound, flies off on scroll. */
export function Parrot({ brain, scale = 1 }) {
  const root = useRef(null);
  const bodyG = useRef(null);
  const head = useRef(null);
  const wingL = useRef(null);
  const wingR = useRef(null);
  const tail = useRef(null);
  const lids = useRef([]);
  const t = useRef(0);
  const geo = useMemo(() => {
    const beakTop = new ConeGeometry(0.19, 0.44, 18);
    const hook = new ConeGeometry(0.1, 0.28, 14);
    const beakLow = new SphereGeometry(0.1, 14, 10);
    return {
      body: parrotBody(),
      head: new SphereGeometry(0.34, 28, 20),
      face: new SphereGeometry(0.2, 20, 14),
      eye: new SphereGeometry(0.06, 14, 10),
      glint: new SphereGeometry(0.018, 8, 6),
      beakTop,
      hook,
      beakLow,
      shoulder: blade(0.55, 0.2, 0.07),
      band: blade(0.75, 0.17, 0.06),
      primary: blade(1.25, 0.15, 0.045),
      tailF: blade(1.9, 0.11, 0.035),
      branch: new CapsuleGeometry(0.1, 5, 4, 12),
      toe: new CapsuleGeometry(0.035, 0.16, 3, 6),
    };
  }, []);
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05);
    t.current += dt;
    const st = brain.state;
    const k = brain.since;
    const g = root.current;
    if (!g) return;
    const breathe = Math.sin(t.current * 2.2) * 0.025;
    if (bodyG.current) bodyG.current.scale.set(1 + breathe, 1, 1 + breathe);
    if (head.current) {
      const tilt = brain.fidget * Math.sin(brain.fidget * Math.PI) * 0.7;
      head.current.rotation.y = damp(head.current.rotation.y, brain.look.x * 0.9, 8, dt);
      head.current.rotation.z = damp(head.current.rotation.z, -brain.look.y * 0.45 + tilt + (st === "DANCE" ? Math.sin(t.current * 12) * 0.35 : 0), 8, dt);
    }
    const flapping = st === "REACT" ? k < 1.2 : st === "AWAY";
    const speed = st === "AWAY" ? 13 : 19;
    const open = flapping ? 1.0 + Math.sin(t.current * speed) * 0.85 : st === "DANCE" ? 0.35 + Math.abs(Math.sin(t.current * 8)) * 0.45 : 0.04;
    if (wingL.current) wingL.current.rotation.x = damp(wingL.current.rotation.x, -open, 18, dt);
    if (wingR.current) wingR.current.rotation.x = damp(wingR.current.rotation.x, open, 18, dt);
    if (tail.current) tail.current.rotation.z = damp(tail.current.rotation.z, Math.sin(t.current * 1.3) * 0.05 + (st === "DANCE" ? Math.sin(t.current * 10) * 0.18 : 0) + (flapping ? 0.25 : 0), 6, dt);
    const hop = st === "REACT" ? Math.max(0, Math.sin(Math.min(1, k / 0.6) * Math.PI)) * 0.55 : 0;
    const bob = st === "DANCE" ? Math.abs(Math.sin(t.current * 8)) * 0.18 : 0;
    const awayP = st === "AWAY" ? Math.min(1, k / 1.8) : 0;
    g.position.y = damp(g.position.y, hop + bob + awayP * 1.2, st === "AWAY" ? 1.8 : 10, dt);
    g.position.x = damp(g.position.x, 0, 4, dt);
    g.position.z = damp(g.position.z, 0, 1.4, dt);
    g.rotation.z = damp(g.rotation.z, st === "AWAY" ? 0.5 : 0, 3, dt);
    const open2 = Math.max(0.12, 1 - brain.blink);
    lids.current.forEach((l) => l && (l.scale.y = open2));
  });
  const red = "#c8102e";
  const mat = (c, r = 0.55) => <meshStandardMaterial color={c} roughness={r} />;
  const wing = (side) => (
    <group ref={side > 0 ? wingL : wingR} position={[0.02, 0.42, 0.36 * side]} rotation={[0, 0, -0.18]}>
      <group rotation={[0.12 * side, 0, 0]}>
        <mesh geometry={geo.shoulder} position={[0.08, -0.05, 0]}>{mat(red)}</mesh>
        <mesh geometry={geo.band} position={[0.16, -0.32, 0.02 * side]}>{mat("#f4c20d")}</mesh>
        <mesh geometry={geo.primary} position={[0.22, -0.55, 0.035 * side]}>{mat("#1756c8", 0.45)}</mesh>
        <mesh geometry={geo.primary} position={[0.3, -0.5, 0.05 * side]} scale={[0.9, 0.95, 1]}>{mat("#0e8a6a", 0.45)}</mesh>
      </group>
    </group>
  );
  return (
    <group scale={scale}>
      <mesh geometry={geo.branch} position={[0, -1.08, 0]} rotation={[0.25, 0, Math.PI / 2 + 0.06]}>
        <meshStandardMaterial color="#5b3a22" roughness={0.95} />
      </mesh>
      <group ref={root}>
        {/* feet grip the branch */}
        {[-0.1, 0.1].map((z, i) => (
          <group key={i} position={[0.05, -0.98, z]}>
            {[-0.4, 0.4].map((r, j) => (
              <mesh key={j} geometry={geo.toe} rotation={[0, 0, Math.PI / 2 + r]} position={[r * 0.15, 0, 0]}>
                {mat("#6f6a66", 0.7)}
              </mesh>
            ))}
          </group>
        ))}
        <group ref={bodyG} rotation={[0, 0, 0.32]} position={[0.1, -0.15, 0]}>
          <mesh geometry={geo.body}>{mat(red)}</mesh>
          {wing(1)}
          {wing(-1)}
          <group ref={tail} position={[0.0, -0.95, 0]}>
            {[
              [0, "#c8102e", 1],
              [0.08, "#1756c8", 0.85],
              [-0.08, "#1756c8", 0.85],
            ].map(([z, c, sc], i) => (
              <mesh key={i} geometry={geo.tailF} position={[0, 0, z]} rotation={[z * 1.2, 0, 0.04 * (i - 1)]} scale={[1, sc, 1]}>
                {mat(c, 0.5)}
              </mesh>
            ))}
          </group>
        </group>
        <group ref={head} position={[-0.12, 0.78, 0]}>
          <mesh geometry={geo.head}>{mat(red, 0.5)}</mesh>
          {[1, -1].map((side) => (
            <group key={side} position={[-0.1, 0.0, 0.2 * side]} rotation={[0, 0.5 * side, 0]}>
              <mesh geometry={geo.face} scale={[1.15, 0.95, 0.45]}>{mat("#f6f1e8", 0.75)}</mesh>
              <mesh ref={(el) => (lids.current[side > 0 ? 0 : 1] = el)} geometry={geo.eye} position={[0.02, 0.05, 0.07 * side]}>
                <meshStandardMaterial color="#f2d36b" roughness={0.3} />
              </mesh>
              <mesh geometry={geo.eye} position={[0.0, 0.05, 0.1 * side]} scale={0.55}>
                <meshStandardMaterial color="#0b0b0b" roughness={0.1} />
              </mesh>
              <mesh geometry={geo.glint} position={[-0.015, 0.075, 0.13 * side]}>
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
          ))}
          {/* the hooked beak: an ivory upper bill curling over a dark lower one */}
          <mesh geometry={geo.beakTop} position={[-0.38, 0.0, 0]} rotation={[0, 0, Math.PI / 2 - 0.25]}>{mat("#efe3cf", 0.35)}</mesh>
          <mesh geometry={geo.hook} position={[-0.53, -0.1, 0]} rotation={[0, 0, Math.PI - 0.15]}>{mat("#e8dbc4", 0.35)}</mesh>
          <mesh geometry={geo.beakLow} position={[-0.33, -0.15, 0]} scale={[1.2, 0.8, 1]}>{mat("#2a2624", 0.4)}</mesh>
        </group>
      </group>
    </group>
  );
}

export const CREATURES = { whale: Whale, parrot: Parrot };
export const CALLS = { whale: whaleCall, parrot: squawk };
