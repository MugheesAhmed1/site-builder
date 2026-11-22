// Photo to 3D with the img2threejs method (https://github.com/img2threejs/img2threejs, Apache-2.0;
// docs/CHARACTER-JOURNEY.md): the subject of a picture is rebuilt in code, from primitives, as a
// procedural three.js model, instead of being scanned or downloaded. Vision (Gemini on the server)
// reads the picture into a sculpt spec: a part tree with shapes, sizes, positions and materials.
// The builder here turns the spec into a model, the model is rendered, and vision compares the
// render with the picture and corrects the spec (the method's review and self-correction pass).
// This file holds the spec, its checks and the words that ask for it; no three.js, no network.

export type SculptShape = "sphere" | "box" | "capsule" | "cylinder" | "cone" | "torus" | "lathe";

export interface SculptMaterial {
  id: string;
  color: string;
  roughness: number;
  metalness: number;
  /** A glow, for lamps, eyes, screens. */
  emissive?: string;
  /** Glass and similar, 0.2 to 1. */
  opacity?: number;
}

export interface SculptPart {
  id: string;
  /** The part it hangs from (it moves with it). */
  parent?: string;
  shape: SculptShape;
  /** Width, height and depth, in model units (the whole model is about 2 tall). */
  size: [number, number, number];
  /** Centre, relative to the parent's centre. */
  position: [number, number, number];
  /** Degrees, x then y then z. */
  rotation?: [number, number, number];
  material: string;
  /** Also place a copy mirrored across the model's middle (arms, legs, eyes, wheels). */
  mirror?: boolean;
  /** Box corners and capsule ends, 0 (sharp) to 0.5 (fully round). */
  round?: number;
  /** Cylinders: top width as a share of the bottom width. */
  taper?: number;
  /** Lathe: the outline turned around the vertical axis, as [radius, height] pairs from 0 to 1. */
  profile?: [number, number][];
  /** What it is, for the idle animation: heads nod, wings flap, tails swish. */
  role?: "head" | "body" | "arm" | "leg" | "wing" | "tail" | "eye" | "wheel" | "detail" | "base";
}

export interface SculptSpec {
  subject: string;
  kind: "object" | "character" | "hybrid";
  materials: SculptMaterial[];
  parts: SculptPart[];
  /** The idle animation the model is exported with. */
  idle: "bob" | "sway" | "spin" | "flap" | "none";
  /** What vision is unsure of, kept for the review pass. */
  notes?: string;
}

export const SHAPES: SculptShape[] = ["sphere", "box", "capsule", "cylinder", "cone", "torus", "lathe"];
const ROLES = ["head", "body", "arm", "leg", "wing", "tail", "eye", "wheel", "detail", "base"] as const;
export const MAX_PARTS = 64;

const HEX = /^#[0-9a-f]{6}$/i;
const num = (v: unknown, d: number, lo: number, hi: number) => (typeof v === "number" && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const vec = (v: unknown, d: [number, number, number], lo: number, hi: number): [number, number, number] =>
  Array.isArray(v) && v.length >= 3 ? [num(v[0], d[0], lo, hi), num(v[1], d[1], lo, hi), num(v[2], d[2], lo, hi)] : d;
const id = (v: unknown, i: number, pre: string) => String(v ?? "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || `${pre}-${i + 1}`;
const hex = (v: unknown, d: string) => {
  const s = String(v ?? "").trim();
  if (HEX.test(s)) return s.toLowerCase();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(s);
  return short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase() : d;
};

/**
 * A spec from anything vision answers, made safe to build: known shapes, sizes in range, colours
 * as #rrggbb, parents that exist (no loops), at most 64 parts, and a model about 2 units tall
 * standing on y = 0. Null when nothing usable is left.
 */
export function normalizeSpec(raw: unknown): SculptSpec | null {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const mats: SculptMaterial[] = (Array.isArray(r.materials) ? r.materials : []).slice(0, 24).map((m, i) => {
    const o = (m && typeof m === "object" ? m : {}) as Record<string, unknown>;
    const em = hex(o.emissive, "");
    return {
      id: id(o.id, i, "mat"),
      color: hex(o.color, "#b8b8c0"),
      roughness: num(o.roughness, 0.55, 0.03, 1),
      metalness: num(o.metalness, 0, 0, 1),
      ...(em && em !== "#000000" ? { emissive: em } : {}),
      ...(typeof o.opacity === "number" && o.opacity < 0.98 ? { opacity: num(o.opacity, 1, 0.2, 1) } : {}),
    };
  });
  if (!mats.length) mats.push({ id: "mat-1", color: "#b8b8c0", roughness: 0.55, metalness: 0 });
  const matIds = new Set(mats.map((m) => m.id));
  const seen = new Set<string>();
  const parts: SculptPart[] = [];
  for (const [i, p] of (Array.isArray(r.parts) ? r.parts : []).slice(0, MAX_PARTS).entries()) {
    const o = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
    const shape = SHAPES.includes(o.shape as SculptShape) ? (o.shape as SculptShape) : "sphere";
    let pid = id(o.id, i, "part");
    while (seen.has(pid)) pid += "-b";
    seen.add(pid);
    const size = vec(o.size, [0.3, 0.3, 0.3], 0.01, 4);
    const part: SculptPart = {
      id: pid,
      shape,
      size,
      position: vec(o.position, [0, 1, 0], -4, 4),
      rotation: vec(o.rotation, [0, 0, 0], -360, 360),
      material: matIds.has(id(o.material, 0, "mat")) ? id(o.material, 0, "mat") : mats[0].id,
    };
    if (typeof o.parent === "string" && o.parent) part.parent = id(o.parent, 0, "part");
    if (o.mirror === true) part.mirror = true;
    if (typeof o.round === "number") part.round = num(o.round, 0.1, 0, 0.5);
    if (typeof o.taper === "number") part.taper = num(o.taper, 1, 0, 3);
    if (shape === "lathe") {
      const prof = (Array.isArray(o.profile) ? o.profile : [])
        .filter((q): q is [number, number] => Array.isArray(q) && q.length >= 2)
        .map(([a, b]) => [num(a, 0.3, 0, 1), num(b, 0, 0, 1)] as [number, number])
        .slice(0, 32);
      part.profile = prof.length >= 3 ? prof.sort((a, b) => a[1] - b[1]) : [[0, 0], [0.5, 0.1], [0.45, 0.9], [0, 1]];
    }
    if (ROLES.includes(o.role as (typeof ROLES)[number])) part.role = o.role as SculptPart["role"];
    parts.push(part);
  }
  if (!parts.length) return null;
  // Parents must exist and must not loop back.
  const byId = new Map(parts.map((p) => [p.id, p]));
  for (const p of parts) {
    if (!p.parent) continue;
    if (!byId.has(p.parent) || p.parent === p.id) {
      delete p.parent;
      continue;
    }
    const chain = new Set([p.id]);
    let q: SculptPart | undefined = byId.get(p.parent);
    while (q) {
      if (chain.has(q.id)) {
        delete p.parent;
        break;
      }
      chain.add(q.id);
      q = q.parent ? byId.get(q.parent) : undefined;
    }
  }
  const kind = r.kind === "character" || r.kind === "hybrid" ? r.kind : "object";
  const idle = ["bob", "sway", "spin", "flap", "none"].includes(r.idle as string) ? (r.idle as SculptSpec["idle"]) : kind === "object" ? "spin" : "bob";
  return { subject: String(r.subject ?? "model").slice(0, 80), kind, materials: mats, parts, idle, ...(typeof r.notes === "string" ? { notes: r.notes.slice(0, 400) } : {}) };
}

/** Where every part's centre sits in the model (parents' offsets added up), mirrored copies left out. */
export function worldCentres(spec: SculptSpec): Map<string, [number, number, number]> {
  const byId = new Map(spec.parts.map((p) => [p.id, p]));
  const out = new Map<string, [number, number, number]>();
  const at = (p: SculptPart, depth = 0): [number, number, number] => {
    if (out.has(p.id)) return out.get(p.id)!;
    const base: [number, number, number] = p.parent && depth < 64 && byId.get(p.parent) ? at(byId.get(p.parent)!, depth + 1) : [0, 0, 0];
    const c: [number, number, number] = [base[0] + p.position[0], base[1] + p.position[1], base[2] + p.position[2]];
    out.set(p.id, c);
    return c;
  };
  for (const p of spec.parts) at(p);
  return out;
}

/** The spec's rough bounds: lowest and highest points, for the checks and the camera. */
export function specBounds(spec: SculptSpec): { min: [number, number, number]; max: [number, number, number] } {
  const c = worldCentres(spec);
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const p of spec.parts) {
    const [x, y, z] = c.get(p.id)!;
    const h = p.size.map((s) => s / 2);
    for (const sx of p.mirror ? [x, -x] : [x]) {
      min[0] = Math.min(min[0], sx - h[0]);
      max[0] = Math.max(max[0], sx + h[0]);
    }
    min[1] = Math.min(min[1], y - h[1]);
    max[1] = Math.max(max[1], y + h[1]);
    min[2] = Math.min(min[2], z - h[2]);
    max[2] = Math.max(max[2], z + h[2]);
  }
  return { min, max };
}

const SPEC_SHAPE = `{"subject":"<what it is, a few words>","kind":"object|character|hybrid","idle":"bob|sway|spin|flap|none","notes":"<what you could not see>",
"materials":[{"id":"<short id>","color":"#rrggbb","roughness":0.5,"metalness":0,"emissive":"#rrggbb (optional, for things that glow)","opacity":1}],
"parts":[{"id":"<short id>","parent":"<id of the part it is attached to, or omit>","shape":"sphere|box|capsule|cylinder|cone|torus|lathe","size":[w,h,d],"position":[x,y,z],"rotation":[rx,ry,rz],"material":"<material id>","mirror":false,"round":0.1,"taper":1,"profile":[[r,h]],"role":"head|body|arm|leg|wing|tail|eye|wheel|detail|base"}]}`;

/** The instructions for reading a picture into a spec (img2threejs: intake and spec stages). */
export const SPEC_SYSTEM = `You rebuild the main subject of a picture as a 3D model made only of simple shapes, for a website hero. Work like a careful sculptor, following the img2threejs method:
1. Look first. Decide if it is an object, a character (person, animal, creature, mascot) or a hybrid. Read the overall silhouette and proportions, then the major parts and how they attach, then the identity-defining details (eyes, ears, buttons, stripes, logos as plain colour shapes, wheels, handles).
2. Build a part tree. Every visible part is one primitive: sphere, box (round 0 to 0.5 for soft corners), capsule (round ends; size is width, total height, depth), cylinder (taper < 1 narrows the top), cone, torus (size w and h are the ring, d is the tube thickness), or lathe (an outline turned around the vertical axis: profile points [radius 0 to 1, height 0 to 1], scaled by size). Sizes are full widths, not radii.
3. Coordinates: y is up, x is the model's right, z points at the viewer. The model stands on y = 0 and is about 2 units tall (scale everything to fit). Positions are each part's centre RELATIVE TO ITS PARENT's centre (or to the origin with no parent). Use "mirror": true for a symmetric pair (one copy at +x, the twin is made at -x), with the part placed on the +x side.
4. Characters: head, body, limbs as their own parts so they can move; limbs and ears hang from the body or head (parent). Eyes as small dark spheres with a tiny white sphere highlight. Keep the character's real proportions (a chibi has a big head).
5. Materials: match the picture's colours exactly as #rrggbb. Skin, fabric and plastic are rough (0.5 to 0.9), polished metal has metalness 0.8 to 1 and low roughness, glass has opacity 0.3 to 0.5. Use few materials, reused across parts.
6. Detail: 12 to 48 parts. Enough parts that someone would recognise the subject, no tiny noise.
Never output a brand name or logo text; paint brand marks as plain shapes.
Return JSON only, exactly like: ${SPEC_SHAPE}`;

/** The instructions for the review pass (img2threejs: render, compare, self-correct). */
export const REVIEW_SYSTEM = `You review a 3D model made of simple shapes against the picture it rebuilds, the img2threejs way. You get the reference picture, a render of the current model seen from the front (same framing as the picture as far as possible) and the model's current spec.
Compare silhouette, proportions, part placement, colours and identity details. List what is most wrong, then fix it: move, resize, recolour, add or remove parts. Keep everything that is already right. Keep the same coordinate rules: y up, z towards the viewer, standing on y = 0, about 2 units tall, positions relative to the parent, mirror for symmetric pairs.
Return the whole corrected spec as JSON only, exactly like: ${SPEC_SHAPE}`;

/** A small starter spec for tests and as a placeholder: a friendly round robot. */
export const SAMPLE_SPEC: SculptSpec = {
  subject: "friendly robot",
  kind: "character",
  idle: "bob",
  materials: [
    { id: "shell", color: "#f2f2f5", roughness: 0.35, metalness: 0.05 },
    { id: "dark", color: "#1d1f2a", roughness: 0.4, metalness: 0.2 },
    { id: "glow", color: "#5ad1ff", roughness: 0.3, metalness: 0, emissive: "#2aa8ff" },
    { id: "accent", color: "#ff7a45", roughness: 0.45, metalness: 0.1 },
  ],
  parts: [
    { id: "body", shape: "capsule", size: [0.9, 1.0, 0.75], position: [0, 0.75, 0], material: "shell", round: 0.45, role: "body" },
    { id: "head", parent: "body", shape: "box", size: [0.95, 0.7, 0.75], position: [0, 0.82, 0], material: "shell", round: 0.3, role: "head" },
    { id: "visor", parent: "head", shape: "box", size: [0.75, 0.38, 0.1], position: [0, 0, 0.35], material: "dark", round: 0.2, role: "detail" },
    { id: "eye", parent: "visor", shape: "sphere", size: [0.14, 0.14, 0.06], position: [0.17, 0.02, 0.05], material: "glow", mirror: true, role: "eye" },
    { id: "antenna", parent: "head", shape: "cylinder", size: [0.04, 0.3, 0.04], position: [0, 0.48, 0], material: "dark", role: "detail" },
    { id: "bulb", parent: "antenna", shape: "sphere", size: [0.12, 0.12, 0.12], position: [0, 0.18, 0], material: "accent", role: "detail" },
    { id: "arm", parent: "body", shape: "capsule", size: [0.2, 0.6, 0.2], position: [0.58, 0.05, 0], rotation: [0, 0, 12], material: "shell", mirror: true, role: "arm" },
    { id: "leg", parent: "body", shape: "capsule", size: [0.24, 0.45, 0.24], position: [0.22, -0.6, 0], material: "dark", mirror: true, role: "leg" },
    { id: "badge", parent: "body", shape: "cylinder", size: [0.22, 0.05, 0.22], position: [0, 0.12, 0.37], rotation: [90, 0, 0], material: "accent", role: "detail" },
  ],
};
