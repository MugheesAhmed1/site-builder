import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  Mesh,
  MeshPhysicalMaterial,
  type Object3D,
  PerspectiveCamera,
  PMREMGenerator,
  PointLight,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type Texture,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// A section's own 3D asset (PRD journey, Hero asset "3D GLB"). Each dynamic section that shows
// a model gets one small view: the GLB (uploaded, linked or from the asset library), lit and
// framed by the section's Director (lighting, camera move, distance, asset motion). It only
// draws while the section is on screen, holds a still frame with reduced motion, and without a
// model it shows a sculpted placeholder so the layout never has a hole.

export interface ModelOptions {
  src?: string;
  scale: number;
  rotation: [number, number, number];
  position: [number, number];
  camera: "orbit" | "static" | "close" | "wide" | "scroll";
  lighting: "studio" | "lab" | "warm" | "dramatic" | "soft" | "neon";
  motion: "spin" | "float" | "none" | "scroll" | "pulse";
  speed: number;
  distance: number;
  fov: number;
  accent: string;
  /** Fog and floor colour of the section's environment, if any. */
  env?: { base: string; glow: string } | null;
  reduced: boolean;
}

export interface ModelView {
  update(o: Partial<ModelOptions>): void;
  /** Section progress, 0 to 1, from the scroll conductor (drives "scroll" moves). */
  progress(p: number): void;
  dispose(): void;
}

const LIGHTS: Record<ModelOptions["lighting"], { key: string; fill: string; rim: string; keyI: number; fillI: number; rimI: number; amb: number; exposure: number }> = {
  studio: { key: "#ffffff", fill: "#dfe8ff", rim: "#ffffff", keyI: 2.4, fillI: 0.9, rimI: 1.2, amb: 0.45, exposure: 1.05 },
  lab: { key: "#cfe9ff", fill: "#2a6f8f", rim: "#7fd3ff", keyI: 2.2, fillI: 0.7, rimI: 2.4, amb: 0.18, exposure: 0.95 },
  warm: { key: "#ffd9a8", fill: "#ffb37a", rim: "#fff1d6", keyI: 2.3, fillI: 0.8, rimI: 1.4, amb: 0.35, exposure: 1.05 },
  dramatic: { key: "#ffffff", fill: "#334155", rim: "#a5b4fc", keyI: 3.2, fillI: 0.25, rimI: 2.8, amb: 0.08, exposure: 0.9 },
  soft: { key: "#ffffff", fill: "#ffffff", rim: "#ffffff", keyI: 1.4, fillI: 1.1, rimI: 0.6, amb: 0.7, exposure: 1.1 },
  neon: { key: "#e9d5ff", fill: "#06b6d4", rim: "#f0abfc", keyI: 1.6, fillI: 1.4, rimI: 3, amb: 0.12, exposure: 1 },
};

function placeholder(accent: string) {
  const geo = new IcosahedronGeometry(1, 24);
  const pos = geo.attributes.position;
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = Math.sin(v.x * 3.1) * Math.cos(v.y * 2.7) * Math.sin(v.z * 2.3);
    v.multiplyScalar(1 + n * 0.12);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const mat = new MeshPhysicalMaterial({ color: new Color(accent), roughness: 0.28, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.2, sheen: 0.4 });
  return new Mesh(geo, mat);
}

/** Centre a model on the origin and scale it to fit a unit sphere. */
function fit(o: Object3D) {
  const box = new Box3().setFromObject(o);
  const size = box.getSize(new Vector3());
  const centre = box.getCenter(new Vector3());
  const r = Math.max(size.x, size.y, size.z) || 1;
  o.position.sub(centre);
  const g = new Group();
  g.add(o);
  g.scale.setScalar(2 / r);
  return g;
}

let draco: DRACOLoader | null = null;

export function mountModel(canvas: HTMLCanvasElement, init: ModelOptions): ModelView | null {
  let o = { ...init };
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  const scene = new Scene();
  const pm = new PMREMGenerator(renderer);
  const env: Texture = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  pm.dispose();
  scene.environment = env;
  const camera = new PerspectiveCamera(o.fov, 1, 0.05, 100);
  const pivot = new Group();
  scene.add(pivot);
  const amb = new AmbientLight("#ffffff", 0.3);
  const hemi = new HemisphereLight("#ffffff", "#222222", 0.3);
  const key = new DirectionalLight("#ffffff", 2);
  key.position.set(3, 4, 5);
  const fill = new DirectionalLight("#ffffff", 0.8);
  fill.position.set(-4, 1, 2);
  const rim = new PointLight("#ffffff", 2, 20);
  rim.position.set(-1, 2, -4);
  scene.add(amb, hemi, key, fill, rim);
  let model: Object3D | null = null;
  let loadedSrc = "";
  let gone = false;
  let raf = 0;
  let visible = true;
  let p = 0.5;
  let t0 = performance.now();

  const light = () => {
    const L = LIGHTS[o.lighting] ?? LIGHTS.studio;
    key.color.set(L.key);
    key.intensity = L.keyI;
    fill.color.set(L.fill);
    fill.intensity = L.fillI;
    rim.color.set(o.lighting === "neon" || o.lighting === "lab" ? o.accent : L.rim);
    rim.intensity = L.rimI;
    amb.intensity = L.amb;
    hemi.intensity = L.amb * 0.8;
    renderer.toneMappingExposure = L.exposure;
    scene.fog = o.env ? new Fog(new Color(o.env.base), 4, 14) : null;
  };

  const setModel = (m: Object3D) => {
    if (model) {
      pivot.remove(model);
      model.traverse((x: any) => {
        x.geometry?.dispose?.();
        const mats = Array.isArray(x.material) ? x.material : x.material ? [x.material] : [];
        for (const mt of mats) mt.dispose?.();
      });
    }
    model = m;
    pivot.add(m);
    draw();
  };

  const load = () => {
    const src = o.src || "";
    if (src === loadedSrc && model) return;
    loadedSrc = src;
    if (!src) return setModel(placeholder(o.accent));
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    if (!draco) {
      draco = new DRACOLoader();
      draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
    }
    loader.setDRACOLoader(draco);
    loader.load(
      src,
      (gltf) => {
        if (gone || src !== loadedSrc) return;
        setModel(fit(gltf.scene));
        canvas.dispatchEvent(new CustomEvent("xp-model", { detail: { ok: true } }));
      },
      undefined,
      () => {
        if (gone || src !== loadedSrc) return;
        setModel(placeholder(o.accent));
        canvas.dispatchEvent(new CustomEvent("xp-model", { detail: { ok: false } }));
      },
    );
  };

  const size = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const draw = () => {
    if (gone) return;
    const t = o.reduced ? 1.2 : (performance.now() - t0) / 1000;
    const dist = (o.camera === "close" ? 3.2 : o.camera === "wide" ? 6.4 : 4.6) * o.distance;
    let yaw = (o.rotation[1] * Math.PI) / 180;
    let camYaw = 0;
    let lift = 0;
    let pulse = 1;
    if (!o.reduced) {
      if (o.camera === "orbit") camYaw = t * o.speed;
      if (o.camera === "scroll") camYaw = (p - 0.5) * Math.PI * 1.2;
      if (o.motion === "spin") yaw += t * 0.35;
      if (o.motion === "float") lift = Math.sin(t * 1.1) * 0.08;
      if (o.motion === "scroll") yaw += (p - 0.5) * Math.PI * 1.6;
      if (o.motion === "pulse") pulse = 1 + Math.sin(t * 5.2) * 0.025 * (Math.sin(t * 5.2) > 0 ? 1 : 0.4);
    }
    camera.fov = o.fov;
    camera.position.set(Math.sin(camYaw) * dist, 0.35 * o.distance, Math.cos(camYaw) * dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    pivot.rotation.set((o.rotation[0] * Math.PI) / 180, yaw, (o.rotation[2] * Math.PI) / 180);
    pivot.scale.setScalar(Math.max(0.2, Math.min(3, o.scale)) * pulse);
    pivot.position.set(o.position[0] * 0.04, o.position[1] * -0.04 + lift, 0);
    renderer.render(scene, camera);
  };

  const loop = () => {
    raf = 0;
    if (gone) return;
    if (visible && !document.hidden) draw();
    if (!o.reduced) raf = requestAnimationFrame(loop);
  };

  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => (size(), draw())) : null;
  ro?.observe(canvas);
  const io = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver((es) => (visible = es[0]?.isIntersecting ?? true)) : null;
  io?.observe(canvas);
  size();
  light();
  load();
  loop();

  return {
    update(next) {
      const srcChanged = next.src !== undefined && next.src !== o.src;
      const wasReduced = o.reduced;
      o = { ...o, ...next };
      light();
      if (srcChanged) load();
      if (wasReduced && !o.reduced && !raf) (t0 = performance.now()), loop();
      draw();
    },
    progress(v) {
      p = v;
      if (o.reduced) draw();
    },
    dispose() {
      gone = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      io?.disconnect();
      if (model) setModel(new Group());
      env.dispose();
      renderer.dispose();
    },
  };
}

export default mountModel;
