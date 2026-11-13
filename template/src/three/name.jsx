import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, Object3D } from "three";
import { damp, seeded } from "./kit.jsx";

// Your name in 3D: hundreds of little blocks stand in the shape of the letters. The pointer
// pushes them toward you like a wave, a tap blows them apart and they fly back home, and
// scrolling turns the whole word.

function sample(text, font, max) {
  const cv = document.createElement("canvas");
  const g = cv.getContext("2d", { willReadFrequently: true });
  if (!g) return { pts: [], w: 1, h: 1 };
  const word = (text || "Hello").trim().slice(0, 18) || "Hello";
  const H = 120;
  g.font = `800 ${H}px ${font}`;
  const W = Math.ceil(g.measureText(word).width) + 20;
  cv.width = W;
  cv.height = H + 40;
  g.font = `800 ${H}px ${font}`;
  g.textBaseline = "middle";
  g.fillStyle = "#000";
  g.fillText(word, 10, cv.height / 2);
  const data = g.getImageData(0, 0, cv.width, cv.height).data;
  // Pick a step that lands near the block budget.
  let filled = 0;
  for (let i = 3; i < data.length; i += 16) if (data[i] > 128) filled++;
  filled *= 4;
  const step = Math.max(3, Math.ceil(Math.sqrt(filled / max)));
  const pts = [];
  for (let y = 0; y < cv.height; y += step)
    for (let x = 0; x < cv.width; x += step) if (data[(y * cv.width + x) * 4 + 3] > 128) pts.push([x - cv.width / 2, cv.height / 2 - y]);
  return { pts, w: cv.width, h: cv.height, step };
}

export function NameBlocks({ input, look, text, thumb, reduce }) {
  const mesh = useRef(null);
  const group = useRef(null);
  const viewport = useThree((s) => s.viewport);
  const [fontsReady, setFontsReady] = useState(0);
  useEffect(() => {
    // Wait for web fonts, so the letters come out in the site's own typeface.
    let on = true;
    document.fonts?.ready?.then(() => on && setFontsReady(1));
    return () => {
      on = false;
    };
  }, []);
  const font = look.font + (fontsReady ? "" : " ");
  const shape = useMemo(() => sample(text, font.trim(), thumb ? 700 : 1400), [text, font, thumb]);
  const n = shape.pts.length;
  // Full scenes fly the blocks in; posters and reduced motion start with them in place.
  const sim = useMemo(() => {
    const r = seeded(3);
    const home = thumb || reduce;
    const fit = Math.min((viewport.width * 0.8) / shape.w, (viewport.height * 0.6) / shape.h);
    return shape.pts.map((p) => (home ? { x: p[0] * fit, y: p[1] * fit, z: 0, vx: 0, vy: 0, vz: 0, j: r() } : { x: (r() - 0.5) * 30, y: (r() - 0.5) * 20, z: -10 - r() * 10, vx: 0, vy: 0, vz: 0, j: r() }));
  }, [shape]);
  const dummy = useMemo(() => new Object3D(), []);
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const c = new Color();
    shape.pts.forEach((p, i) => {
      const u = (p[0] / shape.w) + 0.5;
      c.copy(look.a).lerp(u < 0.5 ? look.b : look.c, Math.abs(u - 0.5) * 2 * 0.9);
      m.setColorAt(i, c);
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [shape, look]);
  const taps = useRef(0);
  useFrame(({ clock }, dt) => {
    const s = input.current;
    const m = mesh.current;
    if (!m || !n) return;
    dt = Math.min(dt, 0.05);
    const t = clock.elapsedTime;
    const fit = Math.min((viewport.width * (thumb ? 0.86 : 0.8)) / shape.w, (viewport.height * 0.6) / shape.h);
    const px = (s.sx * viewport.width) / 2;
    const py = (s.sy * viewport.height) / 2;
    const boom = s.taps !== taps.current;
    taps.current = s.taps;
    const size = shape.step * fit * 0.82;
    for (let i = 0; i < n; i++) {
      const p = sim[i];
      const hx = shape.pts[i][0] * fit;
      const hy = shape.pts[i][1] * fit;
      const dx = hx - px;
      const dy = hy - py;
      const near = s.inside ? Math.exp(-(dx * dx + dy * dy) * 0.9) : 0;
      const hz = near * 1.6 + Math.sin(t * 1.4 + hx * 0.8 + p.j * 2) * 0.08;
      if (boom) {
        p.vx += (Math.random() - 0.5) * 22;
        p.vy += (Math.random() - 0.5) * 22;
        p.vz += Math.random() * 16;
      }
      p.vx += (hx - p.x) * 30 * dt;
      p.vy += (hy - p.y) * 30 * dt;
      p.vz += (hz - p.z) * 30 * dt;
      const f = Math.exp(-6.5 * dt);
      p.vx *= f;
      p.vy *= f;
      p.vz *= f;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      dummy.position.set(p.x, p.y, p.z);
      const spin = Math.min(1.2, Math.abs(p.vx) + Math.abs(p.vy)) + near;
      dummy.rotation.set(spin * 0.8, spin * 1.1 + p.j, 0);
      dummy.scale.setScalar(size * (1 + near * 0.35));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    const g = group.current;
    if (g) {
      g.rotation.y = damp(g.rotation.y, (s.scroll - 0.5) * 0.9 + s.sx * 0.18, 2, dt);
      g.rotation.x = damp(g.rotation.x, -s.sy * 0.15, 2, dt);
    }
  });
  return (
    <group ref={group}>
      <ambientLight intensity={look.dark ? 0.45 : 0.75} />
      <directionalLight position={[2, 4, 6]} intensity={1.7} />
      <directionalLight position={[-5, -2, 3]} intensity={0.5} color={look.b} />
      {n > 0 && (
        <instancedMesh key={n} ref={mesh} args={[undefined, undefined, n]} frustumCulled={false}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial roughness={0.35} metalness={0.1} />
        </instancedMesh>
      )}
    </group>
  );
}
