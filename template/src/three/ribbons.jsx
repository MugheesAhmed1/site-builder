import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { DoubleSide, Vector2 } from "three";
import { damp } from "./kit.jsx";

// Silk ribbons: satin bands that ripple and twist through the scene. They bow toward the
// pointer, a tap sends a wave down their length, and scrolling turns them.

const vertex = /* glsl */ `
uniform float uTime; uniform float uI; uniform vec2 uPointer; uniform float uPull; uniform float uWave; uniform float uWaveX; uniform float uLen;
varying float vShade; varying float vU; varying float vSide;
void main(){
  float x = position.x;
  float k = uI * 1.7;
  float y = sin(x * 0.42 + uTime * 0.55 + k) * 0.9 + sin(x * 0.17 - uTime * 0.3 + k * 2.0) * 0.6 + (uI - 2.0) * 0.38;
  float z = cos(x * 0.33 + uTime * 0.4 + k) * 0.9;
  // Bow toward the pointer near it.
  float near = exp(-pow(x - uPointer.x, 2.0) * 0.18);
  y += (uPointer.y - y) * near * uPull * 0.55;
  // A travelling wave from a tap.
  float wx = x - uWaveX;
  y += sin(wx * 1.6 - uWave * 10.0) * exp(-abs(wx - (uWave * 14.0 - 2.0)) * 0.6) * (1.0 - uWave) * 0.8;
  float twist = x * 0.32 + uTime * 0.45 + k;
  vec3 across = vec3(0.0, cos(twist), sin(twist));
  vec3 p = vec3(x, y, z) + across * position.y;
  vShade = cos(twist);
  vU = (x / uLen) + 0.5;
  vSide = position.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const fragment = /* glsl */ `
uniform vec3 uA; uniform vec3 uB; uniform float uDark;
varying float vShade; varying float vU; varying float vSide;
void main(){
  float sheen = pow(abs(vShade), 6.0);
  vec3 col = mix(uA, uB, vU);
  col = col * (0.55 + 0.45 * abs(vShade)) + vec3(sheen) * 0.45;
  col *= 0.88 + 0.12 * smoothstep(0.3, 0.0, abs(vSide));
  float fade = smoothstep(0.0, 0.12, vU) * smoothstep(1.0, 0.88, vU);
  gl_FragColor = vec4(col, 0.92 * fade);
  #include <colorspace_fragment>
}`;

function Ribbon({ i, look, input, thumb, len }) {
  const viewport = useThree((s) => s.viewport);
  const colors = [look.a, look.b, look.c];
  const uniforms = useMemo(
    () => ({
      uTime: { value: i * 3 },
      uI: { value: i },
      uPointer: { value: new Vector2() },
      uPull: { value: 0 },
      uWave: { value: 1 },
      uWaveX: { value: 0 },
      uLen: { value: len },
      uA: { value: colors[i % 3] },
      uB: { value: colors[(i + 1) % 3] },
      uDark: { value: look.dark ? 1 : 0 },
    }),
    [i, look, len]
  );
  const taps = useRef(0);
  useFrame((_, dt) => {
    const s = input.current;
    dt = Math.min(dt, 0.05) * (s.speed || 1);
    const u = uniforms;
    u.uTime.value += dt * (0.8 + s.scroll * 0.6);
    u.uPointer.value.set(s.sx * viewport.width * 0.5, s.sy * viewport.height * 0.5);
    u.uPull.value = damp(u.uPull.value, s.inside ? 1 : 0, 3, dt);
    if (s.taps !== taps.current) {
      taps.current = s.taps;
      u.uWave.value = 0;
      u.uWaveX.value = s.tapX * viewport.width * 0.5;
    }
    u.uWave.value = Math.min(1, u.uWave.value + dt * 0.6);
  });
  return (
    <mesh>
      <planeGeometry args={[len, 0.6, thumb ? 120 : 260, 1]} />
      <shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} transparent depthWrite={false} side={DoubleSide} />
    </mesh>
  );
}

export function Ribbons({ input, look, thumb }) {
  const group = useRef(null);
  const viewport = useThree((s) => s.viewport);
  const len = Math.max(10, viewport.width * 1.3);
  useFrame((_, dt) => {
    const s = input.current;
    const g = group.current;
    if (!g) return;
    g.rotation.z = damp(g.rotation.z, -0.18 + (s.scroll - 0.5) * 0.5, 2, Math.min(dt, 0.05));
    g.rotation.x = damp(g.rotation.x, s.sy * 0.2, 2, Math.min(dt, 0.05));
  });
  return (
    <group ref={group}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Ribbon key={i} i={i} look={look} input={input} thumb={thumb} len={len} />
      ))}
    </group>
  );
}
