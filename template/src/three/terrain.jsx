import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide, Vector2 } from "three";
import { NOISE, damp } from "./kit.jsx";

// A flowing landscape: a glowing grid of hills you glide over. Hills rise under the
// pointer, a tap sends a shockwave rolling out, and scrolling speeds up the flight.

const vertex = /* glsl */ `
uniform float uTime; uniform vec2 uPointer; uniform float uLift; uniform vec2 uTap; uniform float uWave;
varying vec2 vXZ; varying float vH; varying float vDist;
${NOISE}
void main(){
  vec3 p = position.xzy; // the plane lies flat
  p.z = -p.z - 8.0;
  vec2 q = vec2(p.x, p.z - uTime);
  float h = snoise(vec3(q * 0.22, 0.0)) * 1.1 + snoise(vec3(q * 0.55, 3.0)) * 0.35;
  h = h * 0.5 + 0.35;
  float pd = distance(p.xz, uPointer);
  h += exp(-pd * pd * 0.9) * uLift;
  float td = distance(p.xz, uTap);
  h += sin(td * 3.0 - uWave * 18.0) * exp(-abs(td - uWave * 6.0) * 1.6) * uWave * 0.9;
  p.y = h;
  vXZ = p.xz; vH = h;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const fragment = /* glsl */ `
uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uTime; uniform float uDark;
varying vec2 vXZ; varying float vH; varying float vDist;
void main(){
  vec2 g = vec2(vXZ.x, vXZ.y - uTime) * 2.0;
  vec2 w = abs(fract(g - 0.5) - 0.5) / fwidth(g);
  float line = 1.0 - min(min(w.x, w.y), 1.0);
  vec3 fill = mix(uC, uA, smoothstep(-0.2, 1.4, vH));
  vec3 ink = uDark > 0.5 ? mix(uB, vec3(1.0), 0.25) : uA;
  vec3 col = mix(fill * (uDark > 0.5 ? 0.35 : 1.0), ink, line);
  float fade = 1.0 - smoothstep(5.0, 15.0, vDist);
  float a = ((uDark > 0.5 ? 0.28 : 0.16) + line * 0.84) * fade;
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`;

export function Terrain({ input, look, thumb }) {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPointer: { value: new Vector2(0, 0) },
      uLift: { value: 0 },
      uTap: { value: new Vector2(0, 0) },
      uWave: { value: 0 },
      uA: { value: look.a },
      uB: { value: look.b },
      uC: { value: look.c },
      uDark: { value: look.dark ? 1 : 0 },
    }),
    [look]
  );
  const taps = useRef(0);
  useFrame(({ camera }, dt) => {
    const s = input.current;
    dt = Math.min(dt, 0.05) * (s.speed || 1);
    const u = uniforms;
    u.uTime.value += dt * (0.5 + s.scroll * 1.4);
    // Pointer onto the ground: x across, nearer the camera lower down.
    u.uPointer.value.set(s.sx * 4.5, -1.5 - (s.sy + 1) * 2.4);
    u.uLift.value = damp(u.uLift.value, s.inside ? 1.2 : 0, 3, dt);
    if (s.taps !== taps.current) {
      taps.current = s.taps;
      u.uTap.value.set(s.tapX * 4.5, -1.5 - (s.tapY + 1) * 2.4);
      u.uWave.value = 0.001;
    }
    if (u.uWave.value > 0) u.uWave.value = u.uWave.value > 1.2 ? 0 : u.uWave.value + dt * 0.55;
    camera.position.x = damp(camera.position.x, s.sx * 0.8, 2, dt);
    camera.position.y = damp(camera.position.y, 1.6 + s.sy * 0.35 - s.scroll * 0.5, 2, dt);
    camera.lookAt(0, 0.3, -4);
  });
  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[22, 22, thumb ? 90 : 180, thumb ? 90 : 180]} />
      <shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} transparent depthWrite={false} side={DoubleSide} />
    </mesh>
  );
}
