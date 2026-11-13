import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Object3D, Plane, Raycaster, Vector2, Vector3 } from "three";
import { damp } from "./kit.jsx";

// A field of blocks seen from above, like a tiny city or a sound wave. The blocks rise
// under the pointer, a tap drops a stone that ripples out, and scrolling stirs the field.

const N = 26;

export function Blocks({ input, look, thumb }) {
  const mesh = useRef(null);
  const n = thumb ? 20 : N;
  const count = n * n;
  const dummy = useMemo(() => new Object3D(), []);
  const ray = useMemo(() => ({ caster: new Raycaster(), ground: new Plane(new Vector3(0, 1, 0), 0), hit: new Vector3(), ndc: new Vector2() }), []);
  const st = useRef({ px: 0, pz: 0, lift: 0, waves: [], taps: 0 });
  const tint = useMemo(() => new Color(), []);
  const heights = useMemo(() => new Float32Array(count), [count]);
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    for (let i = 0; i < count; i++) m.setColorAt(i, look.c);
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [count, look]);
  useFrame(({ camera, clock }, dt) => {
    const s = input.current;
    const m = mesh.current;
    if (!m) return;
    dt = Math.min(dt, 0.05);
    const t = clock.elapsedTime;
    const p = st.current;
    camera.lookAt(0, 0, 0);
    // Where the pointer meets the ground.
    ray.ndc.set(s.sx, s.sy);
    ray.caster.setFromCamera(ray.ndc, camera);
    if (ray.caster.ray.intersectPlane(ray.ground, ray.hit)) {
      p.px = ray.hit.x;
      p.pz = ray.hit.z;
    }
    p.lift = damp(p.lift, s.inside ? 1 : 0, 4, dt);
    if (s.taps !== p.taps) {
      p.taps = s.taps;
      ray.ndc.set(s.tapX, s.tapY);
      ray.caster.setFromCamera(ray.ndc, camera);
      if (ray.caster.ray.intersectPlane(ray.ground, ray.hit)) p.waves.push({ x: ray.hit.x, z: ray.hit.z, age: 0 });
      if (p.waves.length > 4) p.waves.shift();
    }
    p.waves.forEach((w) => (w.age += dt));
    p.waves = p.waves.filter((w) => w.age < 3);
    const gap = 0.36;
    const half = ((n - 1) * gap) / 2;
    const stir = 0.25 + s.scroll * 0.5;
    for (let ix = 0; ix < n; ix++)
      for (let iz = 0; iz < n; iz++) {
        const i = ix * n + iz;
        const x = ix * gap - half;
        const z = iz * gap - half;
        let h = 0.18 + (Math.sin(x * 1.3 + t * 0.9) + Math.cos(z * 1.1 - t * 0.7)) * stir * 0.35 + stir * 0.35;
        const dx = x - p.px;
        const dz = z - p.pz;
        h += Math.exp(-(dx * dx + dz * dz) * 1.4) * 1.6 * p.lift;
        for (const w of p.waves) {
          const d = Math.hypot(x - w.x, z - w.z);
          const front = w.age * 3.2;
          h += Math.sin((d - front) * 3) * Math.exp(-Math.abs(d - front) * 1.8) * (1 - w.age / 3) * 0.9;
        }
        h = Math.max(0.06, h);
        heights[i] = damp(heights[i] || h, h, 10, dt);
        const hh = heights[i];
        dummy.position.set(x, hh / 2, z);
        dummy.scale.set(gap * 0.82, hh, gap * 0.82);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
        tint.copy(look.c).lerp(look.a, Math.min(1, hh / 1.1)).lerp(look.b, Math.max(0, Math.min(1, (hh - 1.1) / 0.8)));
        m.setColorAt(i, tint);
      }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <group>
      <ambientLight intensity={look.dark ? 0.4 : 0.7} />
      <directionalLight position={[4, 9, 3]} intensity={1.8} />
      <directionalLight position={[-6, 3, -4]} intensity={0.45} color={look.b} />
      <instancedMesh key={count} ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.45} metalness={0.05} />
      </instancedMesh>
    </group>
  );
}
