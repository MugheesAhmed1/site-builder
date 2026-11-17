import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DirectionalLight,
  AmbientLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Points,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  DoubleSide,
} from "three";
import { clamp, freshTaps, hsl, hueOf, lerp, num, rng, smooth, type Frame } from "../frame";
import { anchor3, disposeKit, makeKit, resizeKit, visible, type Init3D, type View3D } from "./core";

// space3d: a flight through stars past real lit planets. Beat keys as in the 2D cosmos
// engine: cam, warp, planet (fractional: the current planet leaves as the next arrives).
// Scroll speed and taps push the warp; the cursor steers the view a little.

function planetTexture(seed: number, hue: number) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d")!;
  const R = rng(seed);
  const grd = g.createLinearGradient(0, 0, 0, 256);
  for (let i = 0; i <= 8; i++) grd.addColorStop(i / 8, hsl(hue + (R() - 0.5) * 40, 45 + R() * 25, 30 + R() * 40));
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = hsl(hue + (R() - 0.5) * 60, 40, 30 + R() * 50) + "55";
    const y = R() * 256;
    g.fillRect(0, y, 512, 2 + R() * 12);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

const STAR_V = /* glsl */ `
uniform float uZ, uSize, uWarp;
attribute float aSeed;
varying float vA;
void main(){
  vec3 p = position;
  p.z = mod(p.z + uZ, 120.0) - 110.0;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = min(6.0, uSize * (1.0 + uWarp * 1.5) * (30.0 / -mv.z) * (0.5 + aSeed));
  vA = clamp(1.0 - (-mv.z) / 110.0, 0.0, 1.0);
  gl_Position = projectionMatrix * mv;
}`;
const STAR_F = /* glsl */ `
varying float vA;
void main(){
  vec2 d = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.0, length(d));
  gl_FragColor = vec4(vec3(0.92, 0.95, 1.0), a * vA);
}`;

export function space3d(canvas: HTMLCanvasElement, init: Init3D): View3D | null {
  const k = makeKit(canvas, { fov: 50, mobile: init.mobile });
  if (!k) return null;
  const { scene, camera, renderer } = k;
  const n = init.mobile ? 1500 : 4000;
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  const R = rng(7);
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2;
    const r = 2 + R() * 40;
    pos.set([Math.cos(a) * r, Math.sin(a) * r, -R() * 120], i * 3);
    seed[i] = R();
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("aSeed", new BufferAttribute(seed, 1));
  const starMat = new ShaderMaterial({ vertexShader: STAR_V, fragmentShader: STAR_F, transparent: true, depthWrite: false, blending: AdditiveBlending, uniforms: { uZ: { value: 0 }, uSize: { value: init.mobile ? 1.1 : 1.4 }, uWarp: { value: 0 } } });
  scene.add(new Points(geo, starMat));
  scene.add(new AmbientLight(0xffffff, 0.12));
  const sun = new DirectionalLight(0xffffff, 2.4);
  sun.position.set(-5, 3, 4);
  scene.add(sun);
  const hue = hueOf(init.pal.accent);
  const planets = new Map<number, Group>();
  const planetAt = (i: number) => {
    let p = planets.get(i);
    if (p) return p;
    const h = (hue + i * 57) % 360;
    const Rp = rng(100 + i * 37);
    p = new Group();
    const body = new Mesh(new SphereGeometry(1, 64, 32), new MeshStandardMaterial({ map: planetTexture(100 + i * 37, h), roughness: 0.9 }));
    p.add(body);
    const glow = new Mesh(new SphereGeometry(1.08, 48, 24), new MeshBasicMaterial({ color: hsl(h, 70, 65), transparent: true, opacity: 0.12, blending: AdditiveBlending, depthWrite: false }));
    p.add(glow);
    if (Rp() > 0.45) {
      const ring = new Mesh(new RingGeometry(1.4, 2.1, 96), new MeshBasicMaterial({ color: hsl(h + 40, 50, 75), transparent: true, opacity: 0.45, side: DoubleSide }));
      ring.rotation.x = Math.PI / 2.4;
      p.add(ring);
    }
    p.userData.size = 0.8 + Rp() * 0.5;
    scene.add(p);
    planets.set(i, p);
    return p;
  };
  let z = 0;
  let lastTap = -1;
  let jump = 0;
  return {
    frame(f: Frame) {
      const tap = freshTaps(f, 900).pop();
      if (tap && tap.t !== lastTap) (lastTap = tap.t), (jump = 1);
      jump = Math.max(0, jump - f.dt * 1.2);
      const warp = clamp(num(f.beat, "warp", 0) + jump + Math.abs(f.speed) * 0.01);
      z += f.dt * (2 + f.energy * 4 + warp * 60) * (f.reduced ? 0 : 1);
      starMat.uniforms.uZ.value = z;
      starMat.uniforms.uWarp.value = warp;
      camera.rotation.y = lerp(camera.rotation.y, f.pointer ? -f.nx * 0.08 : 0, 0.05);
      camera.rotation.x = lerp(camera.rotation.x, f.pointer ? -f.ny * 0.05 : 0, 0.05);
      const pv = num(f.beat, "planet", 0);
      const i = Math.floor(pv);
      const kf = pv - i;
      const a = anchor3(k, f);
      const { vw } = visible(k);
      for (const [j, p] of planets) if (j < i - 1 || j > i + 2) p.visible = false;
      const place = (j: number, kk: number) => {
        // kk: -1 gone to the left, 0 in place, 1 still off to the right
        const p = planetAt(j);
        p.visible = true;
        const x = kk >= 0 ? lerp(a.x, vw * 0.9, smooth(clamp(kk))) : lerp(a.x, -vw * 0.9, smooth(clamp(-kk)));
        const s = a.s * 0.42 * p.userData.size;
        p.position.set(x, a.y, -1 - Math.abs(kk) * 3);
        p.scale.setScalar(s);
        p.rotation.y += f.dt * 0.08 * (f.reduced ? 0 : 1);
      };
      place(i, -kf);
      if (kf > 0.02) place(i + 1, 1 - kf);
      else if (planets.has(i + 1)) planets.get(i + 1)!.visible = false;
      renderer.render(scene, camera);
    },
    resize(w, h, dpr) {
      resizeKit(k, w, h, dpr);
    },
    dispose() {
      disposeKit(k);
    },
  };
}
