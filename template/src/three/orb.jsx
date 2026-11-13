import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { NOISE, damp } from "./kit.jsx";

// A living orb: a sphere whose surface breathes with noise. It leans toward the pointer,
// its light follows it, a tap sends a ripple across it and scrolling stirs it up.

const vertex = /* glsl */ `
uniform float uTime; uniform float uAmp; uniform float uPulse; uniform vec3 uTap;
varying vec3 vN; varying vec3 vView; varying float vD;
${NOISE}
float shape(vec3 p){
  float n = snoise(p * 1.1 + vec3(0.0, uTime * 0.25, uTime * 0.18));
  n += 0.22 * snoise(p * 2.2 - vec3(uTime * 0.3));
  float ring = sin(distance(p, uTap) * 9.0 - uPulse * 14.0) * uPulse * 0.35;
  return n * uAmp + ring;
}
void main(){
  vec3 p = position;
  float d = shape(normalize(p));
  vec3 q = p + normal * d;
  // Normal from two nearby points on the moved surface.
  vec3 t = normalize(cross(normal, vec3(0.0, 1.0, 0.07)));
  vec3 b = normalize(cross(normal, t));
  float e = 0.02;
  vec3 pt = normalize(p + t * e); vec3 pb = normalize(p + b * e);
  vec3 qt = pt * length(p) + pt * shape(pt);
  vec3 qb = pb * length(p) + pb * shape(pb);
  vN = normalize(normalMatrix * normalize(cross(qt - q, qb - q)));
  vD = d;
  vec4 mv = modelViewMatrix * vec4(q, 1.0);
  vView = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const fragment = /* glsl */ `
uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform vec3 uLight; uniform float uDark;
varying vec3 vN; varying vec3 vView; varying float vD;
void main(){
  vec3 n = normalize(vN); vec3 v = normalize(vView);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 2.2);
  vec3 l = normalize(uLight);
  float diff = max(dot(n, l), 0.0);
  vec3 h = normalize(l + v);
  float spec = pow(max(dot(n, h), 0.0), 48.0);
  vec3 base = mix(uA, uC, smoothstep(-0.4, 0.5, vD));
  vec3 col = base * (0.35 + 0.75 * diff) + mix(uB, vec3(1.0), 0.4) * fres * 0.9 + vec3(spec) * 0.6;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export function Orb({ input, look, thumb, side = "right" }) {
  const mesh = useRef(null);
  const viewport = useThree((s) => s.viewport);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 0.22 },
      uPulse: { value: 0 },
      uTap: { value: new Vector3(0, 0, 1) },
      uLight: { value: new Vector3(1, 1, 1.5) },
      uA: { value: look.a },
      uB: { value: look.b },
      uC: { value: look.c },
      uDark: { value: look.dark ? 1 : 0 },
    }),
    [look]
  );
  const taps = useRef(0);
  useFrame((state, dt) => {
    const s = input.current;
    const m = mesh.current;
    if (!m) return;
    dt = Math.min(dt, 0.05) * (s.speed || 1);
    const u = uniforms;
    u.uTime.value += dt;
    u.uAmp.value = damp(u.uAmp.value, 0.18 + s.scroll * 0.2 + (s.inside ? 0.06 : 0), 2, dt);
    if (s.taps !== taps.current) {
      taps.current = s.taps;
      u.uPulse.value = 1;
      u.uTap.value.set(s.tapX, s.tapY, 0.8).normalize();
    }
    u.uPulse.value = Math.max(0, u.uPulse.value - dt * 0.7);
    u.uLight.value.set(s.sx * 3, s.sy * 3 + 1, 2.2);
    // Leave room for the words on wide boxes: sit to the right.
    const wide = !thumb && side !== "center" && viewport.aspect > 1.45;
    const dir = side === "left" ? -1 : 1;
    const r = Math.min(viewport.width, viewport.height) * (wide ? 0.34 : 0.3);
    m.scale.setScalar(damp(m.scale.x, r / 1.4, 3, dt));
    m.position.x = damp(m.position.x, (wide ? dir * viewport.width * 0.22 : 0) + s.sx * 0.35, 3, dt);
    m.position.y = damp(m.position.y, s.sy * 0.25 + (0.5 - s.scroll) * 0.6, 3, dt);
    m.rotation.y += dt * 0.15;
    m.rotation.x = damp(m.rotation.x, -s.sy * 0.5, 3, dt);
    m.rotation.z = damp(m.rotation.z, s.sx * 0.35, 3, dt);
  });
  return (
    <mesh ref={mesh}>
      <icosahedronGeometry args={[1.4, thumb ? 24 : 48]} />
      <shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} />
    </mesh>
  );
}
