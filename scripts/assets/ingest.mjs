// Builds the 3D asset library from the curated sources (scripts/assets/sources.mjs).
//
//   ASSET_SRC=/path/to/downloads ASSET_TOOLS=/path/with/node_modules node scripts/assets/ingest.mjs
//
// ASSET_SRC holds the downloaded originals (see docs/ASSETS.md for where each came from).
// ASSET_TOOLS is a folder where these MIT-licensed tools are installed, so they never become
// dependencies of the builder: @gltf-transform/core, @gltf-transform/extensions,
// @gltf-transform/functions and sharp.
//
// For every model: third-party logos are painted out, unused animation clips are dropped and the
// kept ones get plain names (idle, walk, run ...), textures become WebP at the size the asset
// needs, the pivot is set (centre for objects that turn, the floor for things that stand), and
// the result is written as one self-contained GLB in public/assets/3d/<category>/<id>.glb.
// Then it is measured (triangles, materials, textures, clips, bounds, size) and the manifest
// library/assets/manifest.json is written. Previews are made by scripts/assets/previews.mjs.
import { createRequire } from "node:module";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ABSTRACT, LICENSES, SOURCES } from "./sources.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SRC = process.env.ASSET_SRC;
const TOOLS = process.env.ASSET_TOOLS;
if (!SRC || !TOOLS) throw new Error("Set ASSET_SRC (downloads) and ASSET_TOOLS (folder with @gltf-transform/* and sharp installed).");
const req = createRequire(join(TOOLS, "package.json"));
const load = (m) => import(pathToFileURL(req.resolve(m)).href);
const { NodeIO } = await load("@gltf-transform/core");
const { ALL_EXTENSIONS } = await load("@gltf-transform/extensions");
const F = await load("@gltf-transform/functions");
const sharp = (await load("sharp")).default;
const { MeshoptSimplifier } = await load("meshoptimizer");
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

const only = process.argv.slice(2);
const OUT3D = join(ROOT, "public/assets/3d");
const OUTHDR = join(ROOT, "public/assets/hdr");
const MANIFEST = join(ROOT, "library/assets/manifest.json");

/** The motion a model can honestly do, from what it is and what it carries. */
function capabilities(entry, m) {
  const c = new Set();
  const cat = entry.category;
  if (["product", "vehicle", "prop", "abstract"].includes(cat)) ["rotate", "float", "orbit", "scale", "reveal", "parallax", "scrollRotate", "scrollMove", "hover"].forEach((x) => c.add(x));
  if (cat === "nature" || cat === "architecture") ["rotate", "float", "reveal", "parallax", "scale", "scrollMove"].forEach((x) => c.add(x));
  if (cat === "environment") ["cameraDrift", "parallax", "reveal", "lightingTransition", "rotate"].forEach((x) => c.add(x));
  if (cat === "character") ["reveal", "parallax", "rotate", "scrollMove", "lookAtPointer"].forEach((x) => c.add(x));
  for (const clip of m.clips) c.add(clip.name);
  if (m.variants.length > 1) c.add("materialChange");
  if (m.parts >= 4 && cat !== "character") c.add("assemble");
  return [...c];
}

function tierOf(bytes, tris) {
  if (bytes <= 600_000 && tris <= 20_000) return "low";
  if (bytes <= 2_500_000 && tris <= 120_000) return "medium";
  return "high";
}

async function measure(doc, bytes) {
  const root = doc.getRoot();
  let triangles = 0;
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    for (const p of mesh.listPrimitives()) {
      const n = p.getIndices()?.getCount() ?? p.getAttribute("POSITION")?.getCount() ?? 0;
      const mode = p.getMode();
      triangles += mode === 4 ? n / 3 : mode === 5 || mode === 6 ? Math.max(0, n - 2) : 0;
    }
  }
  const scene = root.getDefaultScene() ?? root.listScenes()[0];
  const b = F.getBounds(scene);
  const size = b.max.map((v, i) => +(v - b.min[i]).toFixed(4));
  let tex = 0;
  for (const t of root.listTextures()) {
    const s = t.getSize();
    if (s) tex = Math.max(tex, s[0], s[1]);
  }
  const variantsExt = root.listExtensionsUsed().find((e) => e.extensionName === "KHR_materials_variants");
  const variants = variantsExt ? variantsExt.listVariants().map((v) => v.getName()) : [];
  return {
    triangles: Math.round(triangles),
    materials: root.listMaterials().length,
    textures: root.listTextures().length,
    textureResolution: tex ? (tex >= 2048 ? "2k" : tex >= 1024 ? "1k" : tex >= 512 ? "512" : "256") : "none",
    textureMax: tex,
    clips: root.listAnimations().map((a) => ({ name: a.getName(), duration: +Math.max(0, ...a.listSamplers().map((s) => s.getInput()?.getMax([])[0] ?? 0)).toFixed(2) })),
    bounds: { min: b.min.map((v) => +v.toFixed(4)), max: b.max.map((v) => +v.toFixed(4)), size },
    parts: root.listMeshes().length,
    skinned: root.listSkins().length > 0,
    morphs: root.listMeshes().some((m) => m.listPrimitives().some((p) => p.listTargets().length > 0)),
    variants,
    extensions: root.listExtensionsUsed().map((e) => e.extensionName).sort(),
    bytes,
  };
}

async function processModel(e) {
  const file = join(SRC, e.file);
  if (!existsSync(file)) throw new Error("missing source " + file);
  const doc = await io.read(file);
  const root = doc.getRoot();
  // Owner files sometimes carry a studio floor, a brand mark as its own mesh, or metadata that
  // names a brand: those go first.
  for (const name of e.removeNodes ?? []) {
    const nodes = root.listNodes().filter((n) => n.getName() === name);
    if (!nodes.length) throw new Error(`${e.id}: no node ${name} to remove`);
    for (const n of nodes) n.dispose();
  }
  for (const name of e.removeMaterialPrims ?? []) {
    let hit = 0;
    for (const mesh of root.listMeshes())
      for (const prim of mesh.listPrimitives())
        if (prim.getMaterial()?.getName() === name) {
          mesh.removePrimitive(prim);
          prim.dispose();
          hit++;
        }
    if (!hit) throw new Error(`${e.id}: no primitives use ${name}`);
  }
  if (e.stripExtras) for (const sc of root.listScenes()) sc.setExtras({});
  // A mask texture (black and white) recoloured between two colours, for a file whose colours
  // lived in its authoring tool's shader nodes rather than in the texture.
  for (const g of e.gradientMap ?? []) {
    const mat = root.listMaterials().find((m) => m.getName() === g.material);
    const tex = mat?.getBaseColorTexture();
    if (!tex) throw new Error(`${e.id}: no base colour texture on ${g.material} to recolour`);
    const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [a, b] = [hex(g.dark), hex(g.light)];
    const { data, info } = await sharp(Buffer.from(tex.getImage())).resize(g.size ?? 2048).greyscale().raw().toBuffer({ resolveWithObject: true });
    const out = Buffer.alloc(info.width * info.height * 3);
    for (let i = 0; i < info.width * info.height; i++) {
      const t = data[i * info.channels] / 255;
      for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(a[c] + (b[c] - a[c]) * t);
    }
    tex.setImage(new Uint8Array(await sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer())).setMimeType("image/png");
    mat.setMetallicRoughnessTexture(null);
    mat.setMetallicFactor(0);
    mat.setRoughnessFactor(g.roughness ?? 0.7);
  }
  for (const o of e.materialOverrides ?? []) {
    const mats = root.listMaterials().filter((m) => m.getName() === o.material);
    if (!mats.length) throw new Error(`${e.id}: no material ${o.material} to override`);
    for (const m of mats) {
      if (o.color) m.setBaseColorFactor(o.color.length === 4 ? o.color : [...o.color, 1]);
      if (o.noTexture) {
        m.setBaseColorTexture(null);
        m.setEmissiveTexture(null);
        m.setEmissiveFactor([0, 0, 0]);
      }
      if (o.emissive) m.setEmissiveFactor(o.emissive);
      if (o.alpha) m.setAlphaMode(o.alpha);
      if (typeof o.metallic === "number") m.setMetallicFactor(o.metallic);
      if (typeof o.roughness === "number") m.setRoughnessFactor(o.roughness);
    }
  }
  if (e.dropClips) for (const a of root.listAnimations()) a.dispose();
  // Clips that came as separate files (Mixamo exports one clip per file) join the base model,
  // matched to its bones by name.
  for (const mc of e.mergeClips ?? []) {
    const other = await io.read(join(SRC, mc.file));
    const byName = new Map(root.listNodes().map((n) => [n.getName(), n]));
    for (const anim of other.getRoot().listAnimations()) {
      const into = doc.createAnimation(mc.name);
      const copied = new Map();
      const acc = (a) => {
        if (!copied.has(a)) copied.set(a, doc.createAccessor().setType(a.getType()).setArray(a.getArray().slice()).setNormalized(a.getNormalized()));
        return copied.get(a);
      };
      for (const ch of anim.listChannels()) {
        const target = byName.get(ch.getTargetNode()?.getName());
        if (!target) continue;
        const s0 = ch.getSampler();
        const out = acc(s0.getOutput());
        // Each file places its root bone in its own space (one clip's hips sit 90 cm away from the
        // model's): the root's track is moved so its first pose matches the model's rest pose,
        // keeping its motion.
        if (e.rebaseRoot && ch.getTargetPath() === "translation" && target.getName() === e.rebaseRoot) {
          const a = out.getArray().slice();
          const rest = target.getTranslation();
          const d = [a[0] - rest[0], a[1] - rest[1], a[2] - rest[2]];
          for (let i = 0; i < a.length; i += 3) for (let k = 0; k < 3; k++) a[i + k] -= d[k];
          // A walk or a run made "in place": the travel from first to last pose is taken out,
          // the bounce in between is kept, so the character walks on the spot.
          if (mc.inPlace) {
            const n = a.length / 3;
            const last = [a[a.length - 3], a[a.length - 2], a[a.length - 1]];
            const first = [a[0], a[1], a[2]];
            for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) a[i * 3 + k] -= ((last[k] - first[k]) * i) / Math.max(1, n - 1);
          }
          out.setArray(a);
        }
        const s1 = doc.createAnimationSampler().setInput(acc(s0.getInput())).setOutput(out).setInterpolation(s0.getInterpolation());
        into.addSampler(s1).addChannel(doc.createAnimationChannel().setTargetNode(target).setTargetPath(ch.getTargetPath()).setSampler(s1));
      }
      break;
    }
  }
  // Logos out.
  for (const d of e.delogo ?? []) {
    const mats = root.listMaterials().filter((m) => m.getName() === d.material);
    if (!mats.length) throw new Error(`${e.id}: no material ${d.material} to clean`);
    for (const m of mats) {
      // Every map goes: a logo can be engraved in the roughness, normal or occlusion map too.
      m.setBaseColorTexture(null);
      m.setBaseColorFactor([...d.color, 1]);
      m.setEmissiveTexture(null);
      m.setMetallicRoughnessTexture(null);
      m.setNormalTexture(null);
      m.setOcclusionTexture(null);
    }
  }
  for (const [from, to] of Object.entries(e.renameMaterials ?? {})) {
    const mats = root.listMaterials().filter((m) => m.getName() === from);
    if (!mats.length) throw new Error(`${e.id}: no material ${from} to rename`);
    for (const m of mats) m.setName(to);
  }
  // Clips: keep the useful ones under plain names.
  if (e.clips) {
    for (const a of root.listAnimations()) {
      const to = e.clips[a.getName()];
      if (to) a.setName(to);
      else a.dispose();
    }
    const missing = Object.values(e.clips).filter((n) => !root.listAnimations().some((a) => a.getName() === n));
    if (missing.length) throw new Error(`${e.id}: clips not found ${missing}`);
  }
  // Z-up files (trimesh, Blender exports without the Y-up flag) are stood upright, then turned
  // to face the camera (face: degrees about Y).
  if (e.upright || e.face) {
    const rx = e.upright ? -Math.PI / 4 : 0;
    const ry = ((e.face ?? 0) * Math.PI) / 360;
    // q = qY * qX
    const q = [Math.cos(ry) * Math.sin(rx), Math.sin(ry) * Math.cos(rx), -Math.sin(ry) * Math.sin(rx), Math.cos(ry) * Math.cos(rx)];
    for (const scene of root.listScenes()) {
      const wrap = doc.createNode("upright").setRotation(q);
      for (const c of scene.listChildren()) {
        scene.removeChild(c);
        wrap.addChild(c);
      }
      scene.addChild(wrap);
    }
  }
  // Heavy scans are simplified (meshoptimizer, error-bounded) before anything else; every mesh is
  // quantized (KHR_mesh_quantization), which three.js reads natively, so no decoder ships.
  if (e.simplify) await doc.transform(F.weld(), F.simplify({ simplifier: MeshoptSimplifier, ratio: e.simplify, error: e.simplifyError ?? 0.0015 }));
  await doc.transform(
    F.dedup(),
    F.prune({ keepLeaves: false }),
    F.resample(),
    F.center({ pivot: e.pivot === "bottom" ? "below" : "center" }),
    F.quantize(),
    F.textureCompress({ encoder: sharp, targetFormat: "webp", resize: [e.maxTex ?? 1024, e.maxTex ?? 1024], quality: 82 }),
    F.prune(),
  );
  const out = join(OUT3D, e.category, e.id + ".glb");
  mkdirSync(dirname(out), { recursive: true });
  // A second pass on the written file drops accessors orphaned by the dropped clips.
  const again = await io.readBinary(await io.writeBinary(doc));
  await again.transform(F.prune());
  const glb = await io.writeBinary(again);
  writeFileSync(out, glb);
  return { path: `/assets/3d/${e.category}/${e.id}.glb`, metrics: await measure(await io.readBinary(glb), glb.byteLength) };
}

function hdrInfo(file) {
  const head = readFileSync(file).subarray(0, 300).toString("latin1");
  const m = /-Y (\d+) \+X (\d+)/.exec(head);
  return m ? { w: +m[2], h: +m[1] } : { w: 0, h: 0 };
}

const previous = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : { assets: [] };
const keep = new Map(previous.assets.map((a) => [a.id, a]));
const assets = [];
const today = new Date().toISOString().slice(0, 10);

for (const e of SOURCES) {
  if (only.length && !only.includes(e.id)) {
    // Not rebuilt, but its record follows the source list: a licence cleared, a name or tags
    // changed there show up without reprocessing the file.
    const k = keep.get(e.id);
    if (k) assets.push({ ...k, name: e.name, subcategory: e.subcategory, tags: e.tags, style: e.style, materials: e.materials ?? k.materials, colors: e.colors ?? k.colors, license: e.license, source: e.source, display: { ...k.display, ...(e.tint ? { tint: e.tint } : {}), ...(e.screen ? { screen: e.screen } : {}) } });
    continue;
  }
  const base = {
    id: e.id,
    name: e.name,
    type: e.type === "hdri" ? "hdri" : "3d",
    format: e.type === "hdri" ? "hdr" : "glb",
    category: e.category,
    subcategory: e.subcategory,
    tags: e.tags,
    style: e.style,
    materials: e.materials ?? [],
    colors: e.colors ?? [],
    license: e.license,
    source: e.source,
    modifications: [e.modifications, e.clips ? "Kept only the listed animation clips, renamed to plain names." : "", e.simplify ? `Mesh simplified to about ${Math.round(e.simplify * 100)}% of its triangles with meshoptimizer.` : "", e.type === "hdri" ? "" : "Textures converted to WebP; meshes quantized; pivot centred; packed as one GLB."].filter(Boolean).join(" "),
    added: keep.get(e.id)?.added ?? today,
  };
  if (e.type === "hdri") {
    const out = join(OUTHDR, e.id + ".hdr");
    mkdirSync(OUTHDR, { recursive: true });
    copyFileSync(join(SRC, e.file), out);
    const { w, h } = hdrInfo(out);
    const bytes = statSync(out).size;
    assets.push({ ...base, animationCapabilities: ["lightingTransition"], performance: { fileSizeMB: +(bytes / 1048576).toFixed(2), bytes, triangles: 0, textureResolution: w >= 1024 ? "1k" : String(w), materials: 0, animation: "none", tier: "medium" }, preview: `/assets/previews/${e.id}.webp`, asset: `/assets/hdr/${e.id}.hdr`, display: { width: w, height: h } });
    console.log("hdri", e.id, (bytes / 1048576).toFixed(2) + " MB");
    continue;
  }
  const { path, metrics } = await processModel(e);
  const anim = metrics.clips.length ? (metrics.skinned ? "skeletal" : "keyframe") : "none";
  assets.push({
    ...base,
    animationCapabilities: capabilities(e, metrics),
    clips: metrics.clips,
    performance: { fileSizeMB: +(metrics.bytes / 1048576).toFixed(2), bytes: metrics.bytes, triangles: metrics.triangles, textureResolution: metrics.textureResolution, materials: metrics.materials, animation: anim, tier: tierOf(metrics.bytes, metrics.triangles) },
    bounds: metrics.bounds,
    display: { pivot: e.pivot === "bottom" ? "bottom" : "center", rotation: e.rotation ?? [0, 0, 0], variants: metrics.variants, skinned: metrics.skinned, morphs: metrics.morphs, extensions: metrics.extensions, ...(e.tint ? { tint: e.tint } : {}), ...(e.screen ? { screen: e.screen } : {}) },
    preview: `/assets/previews/${e.id}.webp`,
    asset: path,
  });
  console.log("model", e.id, (metrics.bytes / 1048576).toFixed(2) + " MB", metrics.triangles + " tris", metrics.textureResolution, metrics.clips.map((c) => c.name).join(",") || "-");
}

// The abstract set is made in code (scripts/assets/abstract.mjs writes the GLBs); measure and list them here.
for (const a of ABSTRACT) {
  const out = join(OUT3D, "abstract", a.id + ".glb");
  if (!existsSync(out)) {
    console.warn("abstract missing, run scripts/assets/abstract.mjs:", a.id);
    continue;
  }
  const buf = readFileSync(out);
  const m = await measure(await io.readBinary(new Uint8Array(buf)), buf.byteLength);
  const e = { ...a, category: "abstract" };
  assets.push({
    id: a.id,
    name: a.name,
    type: "3d",
    format: "glb",
    category: "abstract",
    subcategory: a.subcategory,
    tags: a.tags,
    style: a.style,
    materials: a.materials,
    colors: a.colors,
    license: { ...LICENSES.ORIGINAL, evidence: "Made in code by scripts/assets/abstract.mjs in this repository" },
    source: { url: "https://github.com/MugheesAhmed1/site-builder/blob/main/scripts/assets/abstract.mjs", creator: "Site Builder", publisher: "Site Builder", via: "generated" },
    modifications: "Original",
    added: keep.get(a.id)?.added ?? today,
    animationCapabilities: capabilities(e, m),
    clips: m.clips,
    performance: { fileSizeMB: +(m.bytes / 1048576).toFixed(2), bytes: m.bytes, triangles: m.triangles, textureResolution: m.textureResolution, materials: m.materials, animation: "none", tier: tierOf(m.bytes, m.triangles) },
    bounds: m.bounds,
    display: { pivot: "center", rotation: [0, 0, 0], variants: [], skinned: false, morphs: false, extensions: m.extensions },
    preview: `/assets/previews/${a.id}.webp`,
    asset: `/assets/3d/abstract/${a.id}.glb`,
  });
}

const order = ["product", "vehicle", "character", "nature", "architecture", "environment", "prop", "abstract", "hdri"];
assets.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.id.localeCompare(b.id));
mkdirSync(dirname(MANIFEST), { recursive: true });
writeFileSync(MANIFEST, JSON.stringify({ version: 1, generated: today, note: "Built by scripts/assets/ingest.mjs from scripts/assets/sources.mjs. Do not edit by hand.", assets }, null, 2) + "\n");
console.log("manifest:", assets.length, "assets");
