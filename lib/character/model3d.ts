// Turning a sculpt spec or a relief into a real 3D model the character engine can show: a three.js
// scene, an idle animation, a GLB file and a still picture of it (docs/CHARACTER-JOURNEY.md).
// Browser only (WebGL and canvas). The method behind the sculpt is img2threejs (Apache-2.0).
import {
  AmbientLight,
  AnimationClip,
  Box3,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Euler,
  Group,
  HemisphereLight,
  LatheGeometry,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  type Object3D,
  PerspectiveCamera,
  Quaternion,
  QuaternionKeyframeTrack,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  Vector3,
  VectorKeyframeTrack,
  WebGLRenderer,
  type BufferGeometry as Geo,
  type Material,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import type { SculptPart, SculptSpec } from "./sculpt";
import type { ReliefMesh } from "./relief";

const D2R = Math.PI / 180;

function geometryFor(p: SculptPart): { geo: Geo; scale: [number, number, number] } {
  const [sx, sy, sz] = p.size;
  switch (p.shape) {
    case "box": {
      const r = Math.min(0.5, Math.max(0, p.round ?? 0.08)) * Math.min(sx, sy, sz);
      return { geo: new RoundedBoxGeometry(sx, sy, sz, r > 0.001 ? 4 : 1, r), scale: [1, 1, 1] };
    }
    case "capsule": {
      // A unit-wide capsule whose straight part keeps the caps round, stretched to the size.
      const wide = Math.max(0.01, Math.min(sx, sz));
      const len = Math.max(0, sy / wide - 1);
      return { geo: new CapsuleGeometry(0.5, len, 8, 24), scale: [sx, sy / (1 + len), sz] };
    }
    case "cylinder":
      return { geo: new CylinderGeometry(0.5 * Math.max(0, Math.min(3, p.taper ?? 1)), 0.5, 1, 32), scale: [sx, sy, sz] };
    case "cone":
      return { geo: new ConeGeometry(0.5, 1, 32), scale: [sx, sy, sz] };
    case "torus": {
      const tube = Math.min(0.45, Math.max(0.03, sz / Math.max(sx, sy, 0.01) / 2));
      return { geo: new TorusGeometry(0.5 - tube, tube, 16, 48), scale: [sx, sy, Math.max(sx, sy)] };
    }
    case "lathe": {
      const pts = (p.profile ?? [[0, 0], [0.5, 0.1], [0.45, 0.9], [0, 1]]).map(([r, h]) => new Vector2(Math.max(0, r) * 0.5, h - 0.5));
      return { geo: new LatheGeometry(pts, 32), scale: [sx, sy, sz] };
    }
    default:
      return { geo: new SphereGeometry(0.5, 32, 20), scale: [sx, sy, sz] };
  }
}

function materialsFor(spec: SculptSpec): Map<string, Material> {
  const out = new Map<string, Material>();
  for (const m of spec.materials) {
    const glossy = m.roughness < 0.3 && m.metalness < 0.5;
    out.set(
      m.id,
      new MeshPhysicalMaterial({
        name: m.id,
        color: new Color(m.color),
        roughness: m.roughness,
        metalness: m.metalness,
        clearcoat: glossy ? 0.6 : 0,
        clearcoatRoughness: 0.25,
        emissive: m.emissive ? new Color(m.emissive) : new Color(0x000000),
        emissiveIntensity: m.emissive ? 1.1 : 0,
        transparent: (m.opacity ?? 1) < 1,
        opacity: m.opacity ?? 1,
      }),
    );
  }
  return out;
}

/** Mirrors a built part across the model's middle (x to -x), with everything hanging from it. */
function mirrorTree(node: Object3D, suffix: string) {
  node.traverse((o) => {
    o.name = o.name ? o.name + suffix : o.name;
  });
  node.position.x *= -1;
  node.rotation.y *= -1;
  node.rotation.z *= -1;
  node.traverse((o) => {
    if (o === node || o.type !== "Group") return;
    o.position.x *= -1;
    o.rotation.y *= -1;
    o.rotation.z *= -1;
  });
}

/**
 * The model for a spec: one group per part (so parts can move), placed standing on the ground,
 * about 2 units tall and centred, with an idle animation that suits it.
 */
export function buildSculpt(spec: SculptSpec): { root: Group; clips: AnimationClip[] } {
  const mats = materialsFor(spec);
  const pivots = new Map<string, Group>();
  const model = new Group();
  model.name = "model";
  for (const p of spec.parts) {
    const pivot = new Group();
    pivot.name = p.id;
    pivot.position.set(...p.position);
    if (p.rotation) pivot.rotation.set(p.rotation[0] * D2R, p.rotation[1] * D2R, p.rotation[2] * D2R);
    const { geo, scale } = geometryFor(p);
    const mesh = new Mesh(geo, mats.get(p.material) ?? [...mats.values()][0]);
    mesh.name = p.id + "-mesh";
    mesh.scale.set(...scale);
    pivot.add(mesh);
    pivots.set(p.id, pivot);
  }
  for (const p of spec.parts) (p.parent && pivots.get(p.parent) ? pivots.get(p.parent)! : model).add(pivots.get(p.id)!);
  // Mirrored twins, made after the tree so each twin carries its own children.
  const isUnderMirror = (p: SculptPart): boolean => {
    let q = p.parent ? spec.parts.find((x) => x.id === p.parent) : undefined;
    for (let i = 0; q && i < 64; i++) {
      if (q.mirror) return true;
      q = q.parent ? spec.parts.find((x) => x.id === q!.parent) : undefined;
    }
    return false;
  };
  for (const p of spec.parts) {
    if (!p.mirror || isUnderMirror(p)) continue;
    const src = pivots.get(p.id)!;
    const twin = src.clone(true);
    mirrorTree(twin, "_m");
    src.parent!.add(twin);
  }
  // Stand it on the ground, centred, 2 units tall.
  model.updateMatrixWorld(true);
  const box = new Box3().setFromObject(model);
  const size = box.getSize(new Vector3());
  const k = 2 / Math.max(size.y, size.x * 0.8, size.z * 0.8, 0.01);
  const root = new Group();
  root.name = spec.subject.replace(/[^a-z0-9 -]/gi, "").slice(0, 40) || "model";
  const holder = new Group();
  holder.name = "holder";
  holder.scale.setScalar(k);
  const c = box.getCenter(new Vector3());
  model.position.set(-c.x, -box.min.y, -c.z);
  holder.add(model);
  root.add(holder);
  return { root, clips: idleClips(spec, root) };
}

const q = (x: number, y: number, z: number) => new Quaternion().setFromEuler(new Euler(x * D2R, y * D2R, z * D2R));

/** Rotation keys around a node's resting rotation. */
function wobble(node: Object3D, axis: 0 | 1 | 2, deg: number, period: number, phase = 0): QuaternionKeyframeTrack {
  const rest = node.quaternion.clone();
  const times: number[] = [];
  const values: number[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = (i / 8) * period;
    const a = Math.sin((i / 8) * Math.PI * 2 + phase) * deg;
    const r = q(axis === 0 ? a : 0, axis === 1 ? a : 0, axis === 2 ? a : 0);
    const out = rest.clone().multiply(r);
    times.push(t);
    values.push(out.x, out.y, out.z, out.w);
  }
  return new QuaternionKeyframeTrack(`${node.name}.quaternion`, times, values);
}

/** The idle clip: a gentle bob or sway for the whole, and small movements for heads, arms, wings and tails. */
function idleClips(spec: SculptSpec, root: Group): AnimationClip[] {
  if (spec.idle === "none") return [];
  const holder = root.getObjectByName("holder")!;
  const period = spec.idle === "spin" ? 12 : spec.idle === "flap" ? 2.4 : 4.8;
  const tracks = [];
  if (spec.idle === "spin") {
    const times: number[] = [], values: number[] = [];
    for (let i = 0; i <= 4; i++) {
      const r = q(0, i * 90, 0);
      times.push((i / 4) * period);
      values.push(r.x, r.y, r.z, r.w);
    }
    tracks.push(new QuaternionKeyframeTrack(`${holder.name}.quaternion`, times, values));
  } else {
    const y0 = holder.position.y;
    tracks.push(new VectorKeyframeTrack(`${holder.name}.position`, [0, period / 2, period], [0, y0, 0, 0, y0 + 0.06, 0, 0, y0, 0]));
    if (spec.idle === "sway") tracks.push(wobble(holder, 2, 3, period));
  }
  const nodes = new Map<string, Object3D>();
  root.traverse((o) => o.name && nodes.set(o.name, o));
  for (const p of spec.parts) {
    for (const name of [p.id, p.id + "_m"]) {
      const node = nodes.get(name);
      if (!node || node.type !== "Group") continue;
      const side = name.endsWith("_m") ? -1 : 1;
      if (p.role === "head") tracks.push(wobble(node, 0, 4, period, 0.6));
      else if (p.role === "arm") tracks.push(wobble(node, 0, 7 * side, period, side > 0 ? 0 : Math.PI));
      else if (p.role === "wing") tracks.push(wobble(node, 2, 22 * side, period / 4));
      else if (p.role === "tail") tracks.push(wobble(node, 1, 14, period / 2));
    }
  }
  return [new AnimationClip("idle", period, tracks)];
}

/** The relief as a model: the picture printed on the front and, a little darker, on the back. */
export function buildRelief(mesh: ReliefMesh, picture: HTMLCanvasElement | OffscreenCanvas): Group {
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(mesh.positions, 3));
  geo.setAttribute("uv", new BufferAttribute(mesh.uvs, 2));
  geo.setIndex(new BufferAttribute(mesh.indices, 1));
  for (const g of mesh.groups) geo.addGroup(g.start, g.count, g.material);
  geo.computeVertexNormals();
  const tex = new CanvasTexture(picture as HTMLCanvasElement);
  tex.colorSpace = SRGBColorSpace;
  tex.userData.mimeType = "image/webp";
  tex.anisotropy = 4;
  const front = new MeshStandardMaterial({ name: "print", map: tex, roughness: 0.5, metalness: 0 });
  const back = new MeshStandardMaterial({ name: "print-back", map: tex, color: new Color(0.82, 0.82, 0.86), roughness: 0.6, metalness: 0 });
  const m = new Mesh(geo, [front, back]);
  m.name = "relief";
  const root = new Group();
  root.name = "relief";
  root.add(m);
  return root;
}

/** The model as a GLB file, with its animation. */
export async function exportGlb(root: Object3D, clips: AnimationClip[] = []): Promise<ArrayBuffer> {
  const exporter = new GLTFExporter();
  const out = await exporter.parseAsync(root, { binary: true, animations: clips, onlyVisible: true, maxTextureSize: 1024 });
  if (!(out instanceof ArrayBuffer)) throw new Error("The model could not be packed.");
  return out;
}

/** A GLB file as an address the character engine (and the downloads) can take. */
export function glbDataUrl(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return "data:model/gltf-binary;base64," + btoa(s);
}

/**
 * A still of the model on a clear background: the poster shown while it loads, and the picture
 * its colours are read from. `turn` is in degrees (0 faces the viewer).
 */
export function renderStill(root: Object3D, opts: { size?: number; turn?: number; background?: string } = {}): string {
  const size = opts.size ?? 384;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const renderer = new WebGLRenderer({ canvas, alpha: !opts.background, antialias: true, preserveDrawingBuffer: true });
  try {
    renderer.setSize(size, size, false);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = NeutralToneMapping;
    const scene = new Scene();
    if (opts.background) scene.background = new Color(opts.background);
    scene.add(new HemisphereLight(0xffffff, 0x444455, 1.6));
    scene.add(new AmbientLight(0xffffff, 0.35));
    const key = new DirectionalLight(0xffffff, 2.2);
    key.position.set(2.5, 4, 3.5);
    scene.add(key);
    const rim = new DirectionalLight(0xffffff, 1.1);
    rim.position.set(-3, 2, -2);
    scene.add(rim);
    const holder = new Group();
    holder.add(root);
    holder.rotation.y = (opts.turn ?? 0) * D2R;
    scene.add(holder);
    holder.updateMatrixWorld(true);
    const box = new Box3().setFromObject(holder);
    const c = box.getCenter(new Vector3());
    const s = box.getSize(new Vector3());
    const cam = new PerspectiveCamera(30, 1, 0.01, 100);
    const dist = (Math.max(s.y, s.x) * 0.62) / Math.tan((30 * D2R) / 2) + s.z / 2;
    cam.position.set(c.x, c.y + s.y * 0.06, c.z + dist);
    cam.lookAt(c);
    renderer.render(scene, cam);
    const url = canvas.toDataURL("image/png");
    holder.remove(root);
    return url;
  } finally {
    renderer.dispose();
    renderer.forceContextLoss();
  }
}

/** A still of any GLB (an upload), for its poster and its colours. Empty when it cannot be read. */
export async function stillOfGlb(src: string): Promise<{ poster: string; clips: string[] }> {
  try {
    const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import("three/examples/jsm/loaders/GLTFLoader.js"), import("three/examples/jsm/libs/meshopt_decoder.module.js")]);
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(src);
    return { poster: renderStill(gltf.scene, { turn: -18 }), clips: gltf.animations.map((a) => a.name) };
  } catch {
    return { poster: "", clips: [] };
  }
}
