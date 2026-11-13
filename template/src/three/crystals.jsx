import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { damp, seeded } from "./kit.jsx";

// Floating crystals: faceted gems in your colours drift in space. They slip away from the
// pointer, a tap spins them out in a burst, and they rise as the page scrolls.

const SHAPES = ["ico", "oct", "dodec", "tetra"];

function Gem({ shape }) {
  if (shape === "oct") return <octahedronGeometry args={[1, 0]} />;
  if (shape === "dodec") return <dodecahedronGeometry args={[1, 0]} />;
  if (shape === "tetra") return <tetrahedronGeometry args={[1, 0]} />;
  return <icosahedronGeometry args={[1, 0]} />;
}

export function Crystals({ input, look, thumb }) {
  const viewport = useThree((s) => s.viewport);
  const count = thumb ? 12 : 18;
  const gems = useMemo(() => {
    const r = seeded(11);
    return Array.from({ length: count }, (_, i) => ({
      shape: SHAPES[i % SHAPES.length],
      color: [look.a, look.b, look.c][i % 3],
      hx: r() * 2 - 1,
      hy: r() * 2 - 1,
      z: -r() * 4 + 0.5,
      size: 0.28 + r() * 0.5,
      phase: r() * Math.PI * 2,
      spin: [r() - 0.5, r() - 0.5, r() - 0.5],
    }));
  }, [count, look]);
  const refs = useRef([]);
  const state = useRef(gems.map(() => ({ ox: 0, oy: 0, vx: 0, vy: 0, kick: 0 })));
  const light = useRef(null);
  const taps = useRef(0);
  useFrame((_, dt) => {
    const s = input.current;
    dt = Math.min(dt, 0.05) * (s.speed || 1);
    const t = s.time;
    const w = viewport.width / 2;
    const h = viewport.height / 2;
    const px = s.sx * w;
    const py = s.sy * h;
    const burst = s.taps !== taps.current;
    taps.current = s.taps;
    if (light.current) light.current.position.set(px, py, 3);
    gems.forEach((g, i) => {
      const m = refs.current[i];
      const st = state.current[i];
      if (!m) return;
      const bx = g.hx * w * 0.92;
      const by = g.hy * h * 0.85 + Math.sin(t * 0.6 + g.phase) * 0.25 + (s.scroll - 0.5) * 2.4 * (1 + g.z * -0.15);
      // Slip away from the pointer (stronger for the near ones).
      const dx = bx + st.ox - px;
      const dy = by + st.oy - py;
      const d2 = dx * dx + dy * dy;
      const reach = s.inside ? 1.9 : 0;
      if (d2 < reach * reach && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const f = (1 - d / reach) * 9 * dt;
        st.vx += (dx / d) * f;
        st.vy += (dy / d) * f;
      }
      if (burst) {
        const a = Math.atan2(by - s.tapY * h, bx - s.tapX * w);
        st.vx += Math.cos(a) * 3.2;
        st.vy += Math.sin(a) * 3.2;
        st.kick = 1;
      }
      // Spring home.
      st.vx += -st.ox * 6 * dt;
      st.vy += -st.oy * 6 * dt;
      st.vx *= Math.exp(-3.2 * dt);
      st.vy *= Math.exp(-3.2 * dt);
      st.ox += st.vx * dt;
      st.oy += st.vy * dt;
      st.kick = Math.max(0, st.kick - dt * 0.8);
      m.position.set(bx + st.ox, by + st.oy, g.z);
      const sp = 0.4 + st.kick * 6;
      m.rotation.x += g.spin[0] * dt * sp;
      m.rotation.y += g.spin[1] * dt * sp + dt * 0.1;
      m.rotation.z += g.spin[2] * dt * sp;
      const sc = g.size * (1 + st.kick * 0.15);
      m.scale.setScalar(damp(m.scale.x || sc, sc, 6, dt));
    });
  });
  return (
    <group>
      <ambientLight intensity={look.dark ? 0.35 : 0.65} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <directionalLight position={[-4, -2, 2]} intensity={0.6} color={look.b} />
      <pointLight ref={light} intensity={14} distance={9} color={look.b} />
      {gems.map((g, i) => (
        <mesh key={i} ref={(m) => (refs.current[i] = m)} rotation={[g.phase, g.phase * 0.7, 0]}>
          <Gem shape={g.shape} />
          <meshStandardMaterial color={g.color} flatShading metalness={0.25} roughness={0.18} emissive={g.color} emissiveIntensity={look.dark ? 0.12 : 0.04} />
        </mesh>
      ))}
    </group>
  );
}
