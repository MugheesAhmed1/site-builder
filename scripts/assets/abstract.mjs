// The abstract shapes of the asset library, made in code (original work, free to ship anywhere):
// glass orb, liquid blob, crystal, chrome knot, silk ribbon, orbital rings, frosted capsule and a
// particle cloud. three.js builds the geometry; @gltf-transform writes each one as a GLB with real
// PBR materials (transmission, clearcoat, iridescence) so the asset renderer lights them like any
// downloaded model. Run with ASSET_TOOLS set (see ingest.mjs), then run ingest.mjs.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as THREE from "three";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const TOOLS = process.env.ASSET_TOOLS;
if (!TOOLS) throw new Error("Set ASSET_TOOLS");
const req = createRequire(join(TOOLS, "package.json"));
const load = (m) => import(pathToFileURL(req.resolve(m)).href);
const { Document, NodeIO } = await load("@gltf-transform/core");
const X = await load("@gltf-transform/extensions");
const io = new NodeIO().registerExtensions(X.ALL_EXTENSIONS);
const OUT = join(ROOT, "public/assets/3d/abstract");
mkdirSync(OUT, { recursive: true });

function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function material(doc, o) {
  const m = doc.createMaterial(o.name).setBaseColorFactor([...o.color, o.alpha ?? 1]).setMetallicFactor(o.metal ?? 0).setRoughnessFactor(o.rough ?? 0.3);
  if (o.emissive) m.setEmissiveFactor(o.emissive);
  if (o.transmission) {
    m.setExtension("KHR_materials_transmission", doc.createExtension(X.KHRMaterialsTransmission).createTransmission().setTransmissionFactor(o.transmission));
    m.setExtension("KHR_materials_volume", doc.createExtension(X.KHRMaterialsVolume).createVolume().setThicknessFactor(o.thickness ?? 0.5).setAttenuationColor(o.attenuation ?? [1, 1, 1]).setAttenuationDistance(o.attDist ?? 2));
    m.setExtension("KHR_materials_ior", doc.createExtension(X.KHRMaterialsIOR).createIOR().setIOR(o.ior ?? 1.5));
  }
  if (o.clearcoat) m.setExtension("KHR_materials_clearcoat", doc.createExtension(X.KHRMaterialsClearcoat).createClearcoat().setClearcoatFactor(o.clearcoat).setClearcoatRoughnessFactor(0.05));
  if (o.iridescence) m.setExtension("KHR_materials_iridescence", doc.createExtension(X.KHRMaterialsIridescence).createIridescence().setIridescenceFactor(o.iridescence).setIridescenceIOR(1.3));
  if (o.sheen) m.setExtension("KHR_materials_sheen", doc.createExtension(X.KHRMaterialsSheen).createSheen().setSheenColorFactor(o.sheen).setSheenRoughnessFactor(0.4));
  if (o.unlit) m.setExtension("KHR_materials_unlit", doc.createExtension(X.KHRMaterialsUnlit).createUnlit());
  if (o.double) m.setDoubleSided(true);
  return m;
}

/** A three.js BufferGeometry as a glTF primitive. */
function prim(doc, buf, g, mat, mode = 4) {
  g = g.index ? g : g;
  const p = doc.createPrimitive().setMaterial(mat).setMode(mode);
  const pos = g.getAttribute("position");
  p.setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(pos.array)).setBuffer(buf));
  const n = g.getAttribute("normal");
  if (n) p.setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(new Float32Array(n.array)).setBuffer(buf));
  const uv = g.getAttribute("uv");
  if (uv) p.setAttribute("TEXCOORD_0", doc.createAccessor().setType("VEC2").setArray(new Float32Array(uv.array)).setBuffer(buf));
  if (g.index) p.setIndices(doc.createAccessor().setType("SCALAR").setArray(new Uint32Array(g.index.array)).setBuffer(buf));
  return p;
}

async function save(id, parts) {
  const doc = new Document();
  const buf = doc.createBuffer();
  const scene = doc.createScene(id);
  doc.getRoot().setDefaultScene(scene);
  for (const [i, part] of parts.entries()) {
    const mesh = doc.createMesh(id + "-" + i).addPrimitive(prim(doc, buf, part.geo, material(doc, part.mat), part.mode));
    const node = doc.createNode(part.name ?? id + "-" + i).setMesh(mesh);
    if (part.t) node.setTranslation(part.t);
    if (part.r) node.setRotation(part.r);
    scene.addChild(node);
  }
  const glb = await io.writeBinary(doc);
  writeFileSync(join(OUT, id + ".glb"), glb);
  console.log(id, glb.byteLength);
}

const q = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)).toArray();

// Glass orb: a clear sphere with a small gold core.
await save("abstract-glass-orb-001", [
  { geo: new THREE.SphereGeometry(1, 64, 48), mat: { name: "glass", color: [1, 1, 1], rough: 0.02, transmission: 1, thickness: 1.6, ior: 1.5, attenuation: [0.85, 0.92, 1], attDist: 3 } },
  { geo: new THREE.IcosahedronGeometry(0.28, 3), mat: { name: "gold", color: [1, 0.78, 0.38], metal: 1, rough: 0.18 } },
]);

// Liquid blob: a sphere pushed out by a few smooth waves (stable seed), mirror chrome.
{
  const g = new THREE.SphereGeometry(1, 128, 96);
  const p = g.getAttribute("position");
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const d = 1 + 0.16 * Math.sin(v.x * 3.1 + 0.6) * Math.cos(v.y * 2.7) + 0.1 * Math.sin(v.z * 4.3 + v.x * 1.7) + 0.06 * Math.cos(v.y * 6.1 + v.z * 2.2);
    v.multiplyScalar(d);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  await save("abstract-blob-001", [{ geo: g, mat: { name: "chrome", color: [0.92, 0.93, 0.95], metal: 1, rough: 0.06, clearcoat: 1 } }]);
}

// Crystal shard: a stretched octahedron with faceted normals, violet glass.
{
  const g = new THREE.OctahedronGeometry(1, 0);
  g.scale(0.62, 1.5, 0.62);
  g.computeVertexNormals();
  const s = new THREE.OctahedronGeometry(1, 0);
  s.scale(0.3, 0.75, 0.3);
  s.computeVertexNormals();
  await save("abstract-crystal-001", [
    { geo: g, mat: { name: "crystal", color: [0.62, 0.46, 1], metal: 0.1, rough: 0.05, transmission: 0.55, thickness: 1.2, ior: 2.0, attenuation: [0.6, 0.4, 1], attDist: 1, iridescence: 1 } },
    { geo: s, mat: { name: "crystal-small", color: [0.62, 0.46, 1], metal: 0.1, rough: 0.05, transmission: 0.55, thickness: 0.6, ior: 2.0, attenuation: [0.6, 0.4, 1], attDist: 1, iridescence: 1 } , t: [0.72, -0.62, 0.15], r: q(0.2, 0.4, -0.5) },
  ]);
}

await save("abstract-torus-knot-001", [{ geo: new THREE.TorusKnotGeometry(0.72, 0.22, 256, 32, 2, 3), mat: { name: "chrome", color: [0.95, 0.95, 0.97], metal: 1, rough: 0.08, clearcoat: 0.6 } }]);

// Silk ribbon: a flat band following a smooth curve, two-sided satin with sheen.
{
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push(new THREE.Vector3(Math.sin(t * Math.PI * 2) * 1.2, (t - 0.5) * 2.6, Math.cos(t * Math.PI * 3) * 0.6));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const seg = 320;
  const width = 0.42;
  const pos = [];
  const uv = [];
  const idx = [];
  const frames = curve.computeFrenetFrames(seg, false);
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const c = curve.getPointAt(t);
    const twist = t * Math.PI * 1.5;
    const side = frames.normals[i].clone().multiplyScalar(Math.cos(twist)).add(frames.binormals[i].clone().multiplyScalar(Math.sin(twist)));
    for (const s of [-1, 1]) {
      const p = c.clone().addScaledVector(side, (s * width) / 2);
      pos.push(p.x, p.y, p.z);
      uv.push((s + 1) / 2, t);
    }
    if (i < seg) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  await save("abstract-ribbon-001", [{ geo: g, mat: { name: "satin", color: [0.96, 0.72, 0.74], metal: 0.15, rough: 0.35, sheen: [1, 0.85, 0.7], double: true } }]);
}

await save("abstract-rings-001", [
  { geo: new THREE.TorusGeometry(1, 0.035, 12, 128), mat: { name: "gold", color: [1, 0.8, 0.42], metal: 1, rough: 0.2 } },
  { geo: new THREE.TorusGeometry(0.8, 0.035, 12, 112), mat: { name: "black", color: [0.03, 0.03, 0.035], metal: 0.6, rough: 0.25, clearcoat: 1 }, r: q(Math.PI / 2, 0, 0) },
  { geo: new THREE.TorusGeometry(0.6, 0.035, 12, 96), mat: { name: "gold-2", color: [1, 0.8, 0.42], metal: 1, rough: 0.2 }, r: q(0, Math.PI / 2, 0.4) },
  { geo: new THREE.SphereGeometry(0.22, 40, 24), mat: { name: "core", color: [0.03, 0.03, 0.035], metal: 0.2, rough: 0.1, clearcoat: 1 } },
]);

await save("abstract-pill-001", [
  { geo: new THREE.CapsuleGeometry(0.42, 1.1, 16, 48), mat: { name: "frost", color: [0.72, 0.83, 1], rough: 0.3, transmission: 0.45, thickness: 0.8, ior: 1.45, attenuation: [0.6, 0.78, 1], attDist: 1, clearcoat: 1 } , r: q(0, 0, Math.PI / 4) },
]);

// Particle cloud: points in a soft sphere (glTF POINTS), emissive, rendered as sprites by three.
{
  const r = rng(7);
  const pos = [];
  for (let i = 0; i < 2400; i++) {
    const u = r() * 2 - 1;
    const th = r() * Math.PI * 2;
    const rad = Math.pow(r(), 0.6) * 1.2;
    const s = Math.sqrt(1 - u * u);
    pos.push(Math.cos(th) * s * rad, u * rad * 0.7, Math.sin(th) * s * rad);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  await save("abstract-particles-001", [{ geo: g, mat: { name: "glow", color: [1, 0.82, 0.48], emissive: [1, 0.8, 0.45], unlit: true }, mode: 0 }]);
}
