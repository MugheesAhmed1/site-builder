import { useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { damp } from "./kit.jsx";

// A pearl sculpture: a knot with a shimmering, oil-on-water finish in your colours. Drag to
// spin it (it keeps turning when let go), tap to tie it into a new knot, scroll to roll it.

const KNOTS = [
  [2, 3],
  [3, 5],
  [2, 5],
  [3, 4],
];

const vertex = /* glsl */ `
varying vec3 vN; varying vec3 vView; varying vec3 vPos;
void main(){
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = -mv.xyz; vPos = position;
  gl_Position = projectionMatrix * mv;
}`;

const fragment = /* glsl */ `
uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uTime; uniform vec3 uLight;
varying vec3 vN; varying vec3 vView; varying vec3 vPos;
void main(){
  vec3 n = normalize(vN); vec3 v = normalize(vView);
  float ndv = max(dot(n, v), 0.0);
  float fres = pow(1.0 - ndv, 3.0);
  // Thin-film shimmer: bands that slide as the angle changes.
  float band = 0.5 + 0.5 * sin(ndv * 9.0 + vPos.y * 1.5 + uTime * 0.6);
  vec3 film = mix(mix(uA, uB, band), uC, 0.5 + 0.5 * sin(ndv * 5.0 - uTime * 0.4));
  vec3 l = normalize(uLight);
  float diff = max(dot(n, l), 0.0);
  float spec = pow(max(dot(reflect(-l, n), v), 0.0), 60.0);
  vec3 col = film * (0.35 + 0.7 * diff) + fres * mix(uB, vec3(1.0), 0.5) + spec * 0.8;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export function Knot({ input, look, thumb }) {
  const mesh = useRef(null);
  const viewport = useThree((s) => s.viewport);
  const [k, setK] = useState(0);
  const uniforms = useMemo(() => ({ uA: { value: look.a }, uB: { value: look.b }, uC: { value: look.c }, uTime: { value: 0 }, uLight: { value: [2, 3, 4] } }), [look]);
  const st = useRef({ vx: 0, vy: 0.35, lastDX: 0, lastDY: 0, taps: 0, squash: 0, press: null });
  useFrame((_, dt) => {
    const s = input.current;
    const m = mesh.current;
    if (!m) return;
    dt = Math.min(dt, 0.05);
    const p = st.current;
    uniforms.uTime.value += dt;
    uniforms.uLight.value = [s.sx * 4, s.sy * 4 + 1, 4];
    const ddx = s.dragX - p.lastDX;
    const ddy = s.dragY - p.lastDY;
    p.lastDX = s.dragX;
    p.lastDY = s.dragY;
    if (s.down) {
      p.vy = (ddx / Math.max(dt, 0.001)) * 1.4;
      p.vx = (-ddy / Math.max(dt, 0.001)) * 1.4;
    }
    p.vy = damp(p.vy, 0.35, 0.8, dt);
    p.vx = damp(p.vx, 0, 0.8, dt);
    m.rotation.y += p.vy * dt;
    m.rotation.x += p.vx * dt;
    m.rotation.z = damp(m.rotation.z, (s.scroll - 0.5) * 1.6, 2, dt);
    // A press that barely moves is a tap: tie a new knot when it lifts.
    if (s.taps !== p.taps) {
      p.taps = s.taps;
      p.press = [s.dragX, s.dragY];
    }
    if (p.press && !s.down) {
      if (Math.abs(s.dragX - p.press[0]) + Math.abs(s.dragY - p.press[1]) < 0.04) {
        p.squash = 1;
        setK((x) => (x + 1) % KNOTS.length);
      }
      p.press = null;
    }
    p.squash = Math.max(0, p.squash - dt * 1.8);
    const wide = !thumb && viewport.aspect > 1.45;
    const size = Math.min(viewport.width, viewport.height) * (wide ? 0.21 : 0.2);
    const pop = 1 - Math.sin(p.squash * Math.PI) * 0.18;
    m.scale.setScalar(damp(m.scale.x || size, size * pop, 8, dt));
    m.position.x = damp(m.position.x, wide ? viewport.width * 0.22 : 0, 3, dt);
    m.position.y = damp(m.position.y, s.sy * 0.2, 3, dt);
  });
  const [pk, qk] = KNOTS[k];
  return (
    <mesh ref={mesh}>
      <torusKnotGeometry key={k} args={[1, 0.32, thumb ? 160 : 320, thumb ? 20 : 36, pk, qk]} />
      <shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} />
    </mesh>
  );
}
