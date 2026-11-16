import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, Fog, InstancedMesh, MathUtils, Matrix4, Object3D, PlaneGeometry, Quaternion, SphereGeometry, Vector3 } from "three";
import { CALLS, CREATURES, makeBrain } from "./creatures.jsx";
import { clamp, damp, seeded } from "./kit.jsx";

// Journeys: the opening of a site as a short film the visitor drives by scrolling.
//
//   scroll ─▶ the camera moves forward through a world (ocean, jungle path or deep space)
//          ─▶ the creature turns and swims or flies off across the screen
//          ─▶ each chapter's words rotate into view, then out
//          ─▶ particles thicken as the journey goes on
//          ─▶ the last stretch melts into the page colour, and the next section takes over
//
// The section is tall (one screen per chapter) with the canvas pinned inside it, so the
// scroll position is the film's timeline. The creature has its own brain (creatures.jsx):
// it watches the pointer, reacts to taps with a call, dances to sound when listening is on,
// and leaves when the page moves on.

export const WORLDS = {
  ocean: { creature: "whale", bg: "#04223a", fog: "#06345a", near: 6, far: 46, particle: "#bfe8ff", label: "Ocean" },
  jungle: { creature: "parrot", bg: "#0d2a1a", fog: "#163d27", near: 5, far: 40, particle: "#f7f2a1", label: "Jungle path" },
  cosmos: { creature: "whale", bg: "#05040f", fog: "#0b0922", near: 12, far: 80, particle: "#ffffff", label: "Deep space" },
};

const TRAVEL = 46; // how far the camera flies over the whole journey

// ------------------------------------------------------------------ particles that thicken
function Motes({ world, progress, count = 2400 }) {
  const ref = useRef(null);
  const geo = useMemo(() => {
    const r = seeded(11);
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (r() - 0.5) * 30;
      pos[i * 3 + 1] = (r() - 0.5) * 16;
      pos[i * 3 + 2] = 8 - r() * (TRAVEL + 30);
      seed[i] = r();
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new BufferAttribute(seed, 1));
    return g;
  }, [count]);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uColor: { value: new Color(WORLDS[world].particle) }, uDensity: { value: 0.3 }, uRise: { value: world === "ocean" ? 1 : world === "jungle" ? 0.3 : 0 } }), [world]);
  useFrame((_, dt) => {
    uniforms.uTime.value += Math.min(dt, 0.05);
    uniforms.uDensity.value = 0.25 + progress.current * 0.75;
  });
  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`uniform float uTime; uniform float uDensity; uniform float uRise; attribute float aSeed; varying float vA;
          void main(){ vec3 p = position;
            p.y += mod(uTime * (0.2 + aSeed * 0.5) * uRise + aSeed * 16.0, 16.0) * uRise - 8.0 * uRise;
            p.x += sin(uTime * 0.4 + aSeed * 30.0) * 0.4;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            vA = step(aSeed, uDensity) * (0.4 + 0.6 * sin(uTime * 2.0 + aSeed * 50.0) * 0.5 + 0.5);
            gl_PointSize = (1.5 + aSeed * 3.5) * (30.0 / -mv.z);
            gl_Position = projectionMatrix * mv; }`}
        fragmentShader={`uniform vec3 uColor; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(uColor, vA * smoothstep(0.5, 0.0, d)); }`}
      />
    </points>
  );
}

// ------------------------------------------------------------------ light shafts (ocean)
function Shafts() {
  const group = useRef(null);
  const mat = useMemo(
    () => ({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime; varying vec2 vUv; void main(){ float a = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x) * vUv.y; a *= 0.10 + 0.05 * sin(uTime * 0.7 + vUv.x * 9.0); gl_FragColor = vec4(0.7, 0.9, 1.0, a); }`,
    }),
    []
  );
  useFrame((_, dt) => (mat.uniforms.uTime.value += dt));
  const r = seeded(4);
  const shafts = useMemo(() => [...Array(9)].map(() => [(r() - 0.5) * 24, 6, -r() * TRAVEL, (r() - 0.5) * 0.5, 1.5 + r() * 3]), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group ref={group}>
      {shafts.map(([x, y, z, rot, w], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, 0, rot]}>
          <planeGeometry args={[w, 22]} />
          <shaderMaterial args={[mat]} transparent depthWrite={false} blending={AdditiveBlending} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// ------------------------------------------------------------------ sea floor, kelp
function Kelp({ count = 90 }) {
  const ref = useRef(null);
  const geo = useMemo(() => {
    const g = new PlaneGeometry(0.35, 4, 1, 10);
    g.translate(0, 2, 0);
    return g;
  }, []);
  const mat = useMemo(
    () => ({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `uniform float uTime; varying float vY; void main(){ vec3 p = position; vec4 w = instanceMatrix * vec4(p, 1.0); float k = p.y / 4.0; w.x += sin(uTime * 1.2 + w.z * 0.6 + w.x) * k * k * 0.8; vY = k; gl_Position = projectionMatrix * viewMatrix * modelMatrix * w; }`,
      fragmentShader: `varying float vY; void main(){ vec3 c = mix(vec3(0.05, 0.25, 0.18), vec3(0.25, 0.6, 0.35), vY); gl_FragColor = vec4(c, 1.0); }`,
    }),
    []
  );
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const r = seeded(9);
    const o = new Object3D();
    for (let i = 0; i < count; i++) {
      const side = r() < 0.5 ? -1 : 1;
      o.position.set(side * (4 + r() * 10), -5, 6 - r() * (TRAVEL + 20));
      o.rotation.set(0, r() * Math.PI, 0);
      o.scale.set(1, 0.6 + r() * 1.2, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [count]);
  useFrame((_, dt) => (mat.uniforms.uTime.value += dt));
  return (
    <instancedMesh ref={ref} args={[geo, undefined, count]} frustumCulled={false}>
      <shaderMaterial args={[mat]} side={DoubleSide} />
    </instancedMesh>
  );
}

function Floor({ color, y = -5 }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, -TRAVEL / 2]}>
      <planeGeometry args={[80, TRAVEL + 80, 1, 1]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

// ------------------------------------------------------------------ jungle path
function Trees({ count = 140 }) {
  const trunk = useRef(null);
  const crown = useRef(null);
  const fern = useRef(null);
  const geos = useMemo(() => ({ trunk: new CylinderGeometry(0.18, 0.3, 6, 7), crown: new SphereGeometry(1.6, 10, 8), fern: new ConeGeometry(0.9, 1.4, 6) }), []);
  useEffect(() => {
    const r = seeded(21);
    const o = new Object3D();
    const c = new Color();
    for (let i = 0; i < count; i++) {
      const side = i % 2 ? -1 : 1;
      const x = side * (3.2 + r() * 9);
      const z = 6 - r() * (TRAVEL + 26);
      const h = 0.8 + r() * 0.9;
      o.position.set(x, -5 + 3 * h, z);
      o.scale.set(1, h, 1);
      o.rotation.set(0, r() * 6, (r() - 0.5) * 0.12);
      o.updateMatrix();
      trunk.current.setMatrixAt(i, o.matrix);
      o.position.set(x + (r() - 0.5), -5 + 6 * h + 0.6, z);
      o.scale.setScalar(0.8 + r() * 0.9);
      o.scale.y *= 0.8;
      o.updateMatrix();
      crown.current.setMatrixAt(i, o.matrix);
      crown.current.setColorAt(i, c.setHSL(0.28 + r() * 0.08, 0.55, 0.18 + r() * 0.14));
      o.position.set(side * (1.6 + r() * 3), -4.4, 6 - r() * (TRAVEL + 26));
      o.scale.set(1 + r(), 0.6 + r() * 0.6, 1 + r());
      o.updateMatrix();
      fern.current.setMatrixAt(i, o.matrix);
      fern.current.setColorAt(i, c.setHSL(0.3 + r() * 0.06, 0.6, 0.22 + r() * 0.12));
    }
    [trunk, crown, fern].forEach((m) => {
      m.current.instanceMatrix.needsUpdate = true;
      if (m.current.instanceColor) m.current.instanceColor.needsUpdate = true;
    });
  }, [count]);
  return (
    <group>
      <instancedMesh ref={trunk} args={[geos.trunk, undefined, count]} frustumCulled={false}>
        <meshStandardMaterial color="#4a3222" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={crown} args={[geos.crown, undefined, count]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh ref={fern} args={[geos.fern, undefined, count]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
    </group>
  );
}

function Path() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4.98, -TRAVEL / 2]}>
      <planeGeometry args={[3.2, TRAVEL + 80]} />
      <meshStandardMaterial color="#8a6a43" roughness={1} />
    </mesh>
  );
}

// ------------------------------------------------------------------ deep space
function Planets() {
  const ring = useRef(null);
  useFrame((_, dt) => ring.current && (ring.current.rotation.z += dt * 0.05));
  return (
    <group>
      <mesh position={[9, 3, -30]}>
        <sphereGeometry args={[4, 48, 32]} />
        <meshStandardMaterial color="#6b4fd8" roughness={0.6} emissive="#2a145e" emissiveIntensity={0.4} />
      </mesh>
      <mesh ref={ring} position={[9, 3, -30]} rotation={[1.2, 0.3, 0]}>
        <ringGeometry args={[5, 7.5, 64]} />
        <meshBasicMaterial color="#c9b8ff" transparent opacity={0.35} side={DoubleSide} />
      </mesh>
      <mesh position={[-11, -4, -52]}>
        <sphereGeometry args={[6, 48, 32]} />
        <meshStandardMaterial color="#e2795a" roughness={0.8} emissive="#5a1e10" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[-4, 6, -14]}>
        <sphereGeometry args={[0.9, 32, 24]} />
        <meshStandardMaterial color="#9ad0ff" roughness={0.5} emissive="#2b5c8f" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// ------------------------------------------------------------------ the camera and the creature
function Rig({ world, progress, input, brain, creature, chapters, onCall, sound }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const scene = useThree((s) => s.scene);
  const w = WORLDS[world];
  const holder = useRef(null);
  const Creature = CREATURES[creature] || CREATURES.whale;
  useEffect(() => {
    scene.background = new Color(w.bg);
    scene.fog = new Fog(w.fog, w.near, w.far);
  }, [scene, w]);
  const look = useMemo(() => new Vector3(), []);
  const lastTaps = useRef(input.current.taps);
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05);
    const s = input.current;
    const p = progress.current;
    // Camera: fly forward with the scroll, sway with the pointer.
    const z = 9 - p * TRAVEL;
    camera.position.x = damp(camera.position.x, s.sx * 0.8, 3, dt);
    camera.position.y = damp(camera.position.y, s.sy * 0.5 + (world === "jungle" ? -2.2 : 0) + Math.sin(p * Math.PI) * 0.6, 3, dt);
    camera.position.z = damp(camera.position.z, z, 6, dt);
    look.set(camera.position.x * 0.3, camera.position.y * 0.6 - (world === "jungle" ? 0.4 : 0), camera.position.z - 10);
    camera.lookAt(look);
    // The creature: near the start it lives in front of the camera; past the first
    // chapter it leaves. The brain decides how it behaves on the way.
    const tapped = s.taps !== lastTaps.current;
    if (tapped) {
      lastTaps.current = s.taps;
      if (brain.state !== "AWAY") onCall();
    }
    const away = p > 0.03;
    brain.step(dt, { near: s.inside, x: s.sx, y: s.sy, tapped: tapped && !away, away, loud: sound.current > 0.25 });
    if (holder.current) {
      // The creature starts right of the words (under them on tall screens). Once the
      // visitor scrolls, it travels with the camera and crosses the screen, then is gone.
      const wide = size.width / Math.max(1, size.height) > 1.05;
      const parrot = creature === "parrot";
      const sx = wide ? (parrot ? 4.1 : 3.2) : parrot ? 1.4 : 0.6;
      const sy = wide ? (parrot ? -1.2 : -1.3) : parrot ? -2.9 : -2.6;
      const cross = MathUtils.smootherstep(clamp((p - 0.03) / 0.42, 0, 1), 0, 1);
      holder.current.position.set(MathUtils.lerp(sx, -16, cross), sy + Math.sin(cross * Math.PI) * (parrot ? 2.5 : 0.8), camera.position.z - 9);
      holder.current.scale.setScalar(wide ? 1 : 0.72);
    }
  });
  const scale = creature === "parrot" ? 1.3 : 1.2;
  return (
    <>
      <ambientLight intensity={world === "cosmos" ? 0.35 : 0.55} />
      <directionalLight position={[4, 10, 6]} intensity={world === "jungle" ? 1.4 : 1.1} color={world === "ocean" ? "#cfe9ff" : "#fff3dd"} />
      <hemisphereLight args={[w.particle, w.bg, 0.35]} />
      <group ref={holder}>
        <pointLight position={[-1, 3, 4]} intensity={world === "cosmos" ? 26 : 16} distance={14} color={w.particle} />
        <group rotation={creature === "parrot" ? [0, 0.95, 0] : [0.32, 0.55, 0.12]}>
          <Creature brain={brain} scale={scale} glow={world === "cosmos"} />
        </group>
      </group>
      {chapters}
    </>
  );
}

// ------------------------------------------------------------------ the section
/**
 * @param {{ world?: string, creature?: string, chapters: { kicker?: string, title: string, text?: string }[], cta?: any, still?: boolean, preview?: boolean }} props
 */
export default function Journey({ world = "ocean", creature, chapters = [], cta = null, still = false }) {
  const wrap = useRef(null);
  const pin = useRef(null);
  const progress = useRef(0);
  const input = useRef({ x: 0, y: 0, sx: 0, sy: 0, inside: false, taps: 0 });
  const brain = useMemo(() => makeBrain(), []);
  const sound = useRef(0);
  const [listening, setListening] = useState(false);
  const [muted, setMuted] = useState(false);
  const [visible, setVisible] = useState(true);
  const [state, setState] = useState("IDLE");
  const mutedRef = useRef(false);
  mutedRef.current = muted;
  const w = WORLDS[world] ? world : "ocean";
  const who = creature || WORLDS[w].creature;
  const list = chapters.filter((c) => c && c.title).slice(0, 5);
  const n = Math.max(1, list.length);

  // Scroll: progress through the tall section, and per-chapter values for the words.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const scroller = el.closest("[data-scroll-root]");
    let raf = 0;
    const measure = () => {
      raf = 0;
      const vh = scroller ? scroller.clientHeight : window.innerHeight;
      el.style.setProperty("--jv", vh + "px");
      const r = el.getBoundingClientRect();
      const top0 = scroller ? scroller.getBoundingClientRect().top : 0;
      const p = clamp(-(r.top - top0) / Math.max(1, r.height - vh), 0, 1);
      progress.current = p;
      el.style.setProperty("--jp", p.toFixed(4));
      // Each chapter owns an equal slice; inside it, words rotate in, rest, then rotate out.
      const slice = 0.86 / n;
      el.querySelectorAll(".jr-ch").forEach((ch, i) => {
        const local = (p - i * slice) / slice; // 0..1 across this chapter
        const inT = i === 0 ? 1 : clamp(local * 3.2, 0, 1);
        const outT = i === n - 1 ? clamp((p - 0.86) / 0.1, 0, 1) : clamp((local - 0.72) * 3.6, 0, 1);
        ch.style.setProperty("--in", inT.toFixed(3));
        ch.style.setProperty("--out", outT.toFixed(3));
        ch.style.visibility = inT > 0 && outT < 1 ? "visible" : "hidden";
      });
      el.style.setProperty("--melt", clamp((p - 0.88) / 0.12, 0, 1).toFixed(3));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", on, { passive: true, capture: true });
    window.addEventListener("resize", on);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { root: scroller || null, rootMargin: "100px" });
    io.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", on, { capture: true });
      window.removeEventListener("resize", on);
      io.disconnect();
    };
  }, [n]);

  // Pointer over the pinned screen: where it is, and taps on the creature's side.
  useEffect(() => {
    const el = pin.current;
    if (!el) return;
    const s = input.current;
    const at = (e) => {
      const r = el.getBoundingClientRect();
      return [((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1), e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom];
    };
    const move = (e) => {
      const [x, y, inside] = at(e);
      s.inside = inside;
      s.x = x;
      s.y = y;
    };
    const down = (e) => {
      const [, , inside] = at(e);
      if (!inside || (e.target.closest && e.target.closest("a, button, input, textarea, select"))) return;
      s.taps += 1;
    };
    let raf = 0;
    const ease = () => {
      s.sx = damp(s.sx, s.inside ? s.x : 0, 3.5, 1 / 60);
      s.sy = damp(s.sy, s.inside ? s.y : 0, 3.5, 1 / 60);
      raf = requestAnimationFrame(ease);
    };
    raf = requestAnimationFrame(ease);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    const t = setInterval(() => setState(brain.state), 250);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      clearInterval(t);
    };
  }, [brain]);

  // Listening: the microphone level (only after the visitor turns it on) makes the creature dance.
  useEffect(() => {
    if (!listening) return;
    let stream = null;
    let raf = 0;
    let ctx = null;
    let stop = false;
    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((st) => {
        if (stop) return st.getTracks().forEach((t) => t.stop());
        stream = st;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        const an = ctx.createAnalyser();
        an.fftSize = 512;
        ctx.createMediaStreamSource(st).connect(an);
        const buf = new Uint8Array(an.fftSize);
        const tick = () => {
          an.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += Math.abs(buf[i] - 128);
          sound.current = damp(sound.current, sum / buf.length / 30, 8, 1 / 60);
          raf = requestAnimationFrame(tick);
        };
        tick();
      })
      .catch(() => setListening(false));
    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      sound.current = 0;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (ctx) ctx.close();
    };
  }, [listening]);

  const call = () => {
    if (!mutedRef.current) (CALLS[who] || CALLS.whale)();
  };
  const label = { IDLE: "resting", LOOK: "watching you", REACT: who === "parrot" ? "squawking" : "rolling", DANCE: "dancing", AWAY: who === "parrot" ? "flying off" : "swimming off" }[state];

  if (still) {
    return (
      <section className="jr jr-still" data-world={w}>
        <div className="jr-stillbg" />
        <div className="jr-copy">
          {list.map((c, i) => (
            <div key={i} className="jr-static">
              {c.kicker && <p className="jr-kicker">{c.kicker}</p>}
              <h2 className="jr-title">{c.title}</h2>
              {c.text && <p className="jr-text">{c.text}</p>}
              {i === 0 && cta}
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={wrap} className="jr" data-world={w} style={{ "--chapters": n }}>
      <div ref={pin} className="jr-pin">
        <div className="jr-canvas">
          <Canvas dpr={[1, 1.75]} frameloop={visible ? "always" : "never"} camera={{ position: [0, 0, 9], fov: 50, near: 0.1, far: 140 }} gl={{ antialias: true, powerPreference: "high-performance" }}>
            <Rig world={w} progress={progress} input={input} brain={brain} creature={who} onCall={call} sound={sound} />
            <Motes world={w} progress={progress} />
            {w === "ocean" && (
              <>
                <Shafts />
                <Kelp />
                <Floor color="#0b3b4f" />
              </>
            )}
            {w === "jungle" && (
              <>
                <Trees />
                <Path />
                <Floor color="#13301d" />
              </>
            )}
            {w === "cosmos" && <Planets />}
          </Canvas>
        </div>
        <div className="jr-vignette" aria-hidden="true" />
        <div className="jr-copy">
          {list.map((c, i) => (
            <div key={i} className={"jr-ch" + (i === 0 ? " is-first" : "")} style={{ "--in": i === 0 ? 1 : 0, "--out": 0 }}>
              {c.kicker && <p className="jr-kicker">{c.kicker}</p>}
              {i === 0 ? <h1 className="jr-title">{c.title}</h1> : <h2 className="jr-title">{c.title}</h2>}
              {c.text && <p className="jr-text">{c.text}</p>}
              {i === 0 && cta}
            </div>
          ))}
        </div>
        <div className="jr-hud">
          <span className="jr-state" aria-live="polite">
            <i className={"jr-dot is-" + state.toLowerCase()} />
            The {who} is {label}
          </span>
          <button type="button" className="jr-btn" onClick={() => setMuted((m) => !m)} aria-pressed={!muted}>
            {muted ? "Sound off" : "Sound on"}
          </button>
          <button type="button" className="jr-btn" onClick={() => setListening((v) => !v)} aria-pressed={listening}>
            {listening ? "Listening" : "Let it listen"}
          </button>
        </div>
        <div className="jr-hint" aria-hidden="true">
          <span>Tap the {who}</span>
          <span className="jr-scroll">Scroll to dive in</span>
        </div>
        <div className="jr-progress" aria-hidden="true" />
        <div className="jr-melt" aria-hidden="true" />
      </div>
    </section>
  );
}
