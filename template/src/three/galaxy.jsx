import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, NormalBlending } from "three";
import { damp, seeded } from "./kit.jsx";

// A spiral galaxy of thousands of stars in your colours. Drag to turn it, tap for a
// burst of light, scroll to dive into it. The inner stars orbit faster than the outer ones.

const vertex = /* glsl */ `
uniform float uTime; uniform float uSize; uniform float uBurst; uniform float uPixel;
attribute float aSize; attribute vec3 aColor; attribute float aRadius;
varying vec3 vColor; varying float vGlow;
void main(){
  vec3 p = position;
  float a = uTime * 0.35 / (aRadius * 0.55 + 0.4);
  float c = cos(a), s = sin(a);
  p.xz = mat2(c, -s, s, c) * p.xz;
  p *= 1.0 + uBurst * (0.35 + 0.4 / (aRadius + 0.3));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * aSize * uPixel * (1.0 + uBurst) / -mv.z;
  vColor = aColor; vGlow = uBurst;
  gl_Position = projectionMatrix * mv;
}`;

const fragment = /* glsl */ `
uniform float uDark;
varying vec3 vColor; varying float vGlow;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  a = pow(a, uDark > 0.5 ? 1.8 : 1.4);
  gl_FragColor = vec4(vColor * (1.0 + vGlow), a * (uDark > 0.5 ? 0.8 : 0.95));
  #include <colorspace_fragment>
}`;

export function Galaxy({ input, look, thumb }) {
  const group = useRef(null);
  const dpr = useThree((s) => s.viewport.dpr);
  const geometry = useMemo(() => {
    const n = thumb ? 5000 : 14000;
    const r = seeded(5);
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const rad = new Float32Array(n);
    const arms = 4;
    const inner = look.dark ? look.b.clone().lerp(look.b.clone().set(1, 1, 1), 0.3) : look.a.clone();
    for (let i = 0; i < n; i++) {
      const radius = Math.pow(r(), 1.2) * 3.8 + 0.12;
      const arm = ((i % arms) / arms) * Math.PI * 2;
      const spin = radius * 1.05;
      const spread = Math.pow(r(), 2.6) * (r() < 0.5 ? 1 : -1) * 0.55 * radius;
      const spreadY = Math.pow(r(), 3) * (r() < 0.5 ? 1 : -1) * 0.3 * (1.2 - radius / 3.8);
      const spreadZ = Math.pow(r(), 2.6) * (r() < 0.5 ? 1 : -1) * 0.55 * radius;
      pos[i * 3] = Math.cos(arm + spin) * radius + spread;
      pos[i * 3 + 1] = spreadY;
      pos[i * 3 + 2] = Math.sin(arm + spin) * radius + spreadZ;
      const c = inner.clone().lerp(radius > 2 ? look.c : look.a, Math.min(1, radius / 3));
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      size[i] = (0.4 + r() * r() * 2.4) * (look.dark ? 0.75 + Math.min(1, radius / 2) * 0.25 : 1.15);
      rad[i] = radius;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("aColor", new BufferAttribute(col, 3));
    g.setAttribute("aSize", new BufferAttribute(size, 1));
    g.setAttribute("aRadius", new BufferAttribute(rad, 1));
    return g;
  }, [thumb, look]);
  const uniforms = useMemo(() => ({ uTime: { value: 4 }, uSize: { value: 26 }, uBurst: { value: 0 }, uPixel: { value: 1 }, uDark: { value: look.dark ? 1 : 0 } }), [look]);
  const spin = useRef({ y: 0.4, vy: 0, x: 0, lastDX: 0, lastDY: 0, taps: 0 });
  useFrame(({ camera }, dt) => {
    const s = input.current;
    const g = group.current;
    if (!g) return;
    dt = Math.min(dt, 0.05);
    const sp = spin.current;
    uniforms.uTime.value += dt;
    uniforms.uPixel.value = dpr;
    // Drag to turn, with a little momentum.
    const ddx = s.dragX - sp.lastDX;
    const ddy = s.dragY - sp.lastDY;
    sp.lastDX = s.dragX;
    sp.lastDY = s.dragY;
    if (s.down) sp.vy = ddx / Math.max(dt, 0.001) * 0.9;
    sp.vy *= Math.exp(-2.2 * dt);
    sp.y += (sp.vy + 0.05) * dt;
    sp.x = Math.max(-0.5, Math.min(0.5, sp.x - ddy * 1.2));
    if (s.taps !== sp.taps) {
      sp.taps = s.taps;
      uniforms.uBurst.value = 1;
    }
    uniforms.uBurst.value = Math.max(0, uniforms.uBurst.value - dt * 1.3);
    g.rotation.y = sp.y;
    g.rotation.x = damp(g.rotation.x, 0.75 + sp.x - s.sy * 0.15, 3, dt);
    g.rotation.z = damp(g.rotation.z, s.sx * 0.12, 3, dt);
    camera.position.z = damp(camera.position.z, 8 - s.scroll * 3.4, 2, dt);
    camera.position.x = damp(camera.position.x, s.sx * 0.5, 2, dt);
    camera.lookAt(0, 0, 0);
  });
  return (
    <group ref={group}>
      <points geometry={geometry}>
        <shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} transparent depthWrite={false} blending={look.dark ? AdditiveBlending : NormalBlending} />
      </points>
    </group>
  );
}
