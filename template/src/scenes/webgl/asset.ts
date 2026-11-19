import { createRoot, useFrame, useThree } from "@react-three/fiber";
import { createElement as h, useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  AnimationMixer,
  Box3,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  EquirectangularReflectionMapping,
  Group,
  HemisphereLight,
  LoopOnce,
  LoopRepeat,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Points,
  PointsMaterial,
  Vector3,
  type AnimationAction,
  type Material,
  type Object3D,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { assetUrl } from "../../experiences/assets";
import type { AssetDirection, ExperienceAsset } from "../../experiences/types";
import { clamp, freshTaps, lerp, num, rng, str, type Frame } from "../frame";
import { anchor3, col, type Init3D, type Kit, type View3D } from "./core";

// asset3d: the generic asset renderer (docs/ASSETS.md). One renderer for every model in the
// library: sunglasses, a watch, a car, a character, a sofa, a building or a crystal. The
// experience says WHAT happens (its asset direction and each scene's beat); this file decides
// HOW, so the AI never writes three.js and every model gets the same treatment:
//
//   framing   any model is scaled by its measured size and set on its pivot (centre or floor)
//   light     studio, cinematic, natural, night, interior or urban, with the HDR the
//             resolver chose (desktop) or a generated room light (phones, to save the download)
//   motion    beat keys blended by scroll: spin, tilt, lift, shift, zoom, orbit, explode,
//             light, particles, clip (an animation the file really has) and variant (a material
//             variant the file really has); idle float or turntable between them
//   input     the cursor leans the object, hovering lifts it, a tap spins it (or plays a
//             character's wave or jump)
//
// It runs inside React Three Fiber on the stage's own loop, like the four other 3D engines,
// and keeps the stage's fallbacks: until the model has loaded the 2D still stays on screen, and
// if loading fails (a missing file) the view reports it and the stage stays 2D.

const loader = new GLTFLoader();
const cache = new Map<string, Promise<GLTF>>();
function loadModel(src: string): Promise<GLTF> {
  const url = assetUrl(src);
  if (!cache.has(url)) {
    const p = loader.loadAsync(url);
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return cache.get(url)!;
}

function softShadow() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(0,0,0,0.42)");
  r.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

/** KHR_materials_variants: three.js parses the file but has no switch, so this is the switch. */
async function variantSwitcher(gltf: GLTF) {
  const parser = gltf.parser as any;
  const names: string[] = (parser.json.extensions?.KHR_materials_variants?.variants ?? []).map((v: { name: string }) => v.name);
  if (!names.length) return null;
  const meshes: { mesh: Mesh; original: Material | Material[]; mappings: { material: number; variants: number[] }[] }[] = [];
  gltf.scene.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    const assoc = parser.associations.get(m);
    if (!assoc || assoc.meshes === undefined) return;
    const prim = parser.json.meshes[assoc.meshes]?.primitives?.[assoc.primitives ?? 0];
    const mappings = prim?.extensions?.KHR_materials_variants?.mappings;
    if (mappings) meshes.push({ mesh: m, original: m.material, mappings });
  });
  let current = "";
  return {
    names,
    async set(name: string) {
      if (name === current) return;
      current = name;
      const idx = names.indexOf(name);
      for (const it of meshes) {
        const map = it.mappings.find((x) => x.variants.includes(idx));
        it.mesh.material = map ? await parser.getDependency("material", map.material) : it.original;
      }
    },
  };
}

export interface AssetProps {
  spec: ExperienceAsset;
  /** Where the asset's pivot sits and how large it is, in world units. */
  position?: [number, number, number];
  scale?: number;
  /** Or a placement read every frame (the stage keeps the anchor beside the words). */
  place?: () => { position: [number, number, number]; scale: number };
  /** Extra rotation in radians (x, y, z), on top of the animation. */
  rotation?: [number, number, number];
  /** What drives it: the stage frame (scroll beats, pointer, taps). */
  frame: () => Frame | null;
  direction: AssetDirection;
  /** The anchor follows the beat; supporting assets only float beside it. */
  lead: boolean;
  onReady(): void;
  onError(e: unknown): void;
}

/**
 * <Asset>: renders any library model. Every behaviour checks what the file can actually do
 * (spec.clips, spec.variants, spec.capabilities) so it never fakes an animation.
 */
export function Asset(p: AssetProps) {
  const holder = useMemo(() => new Group(), []);
  const pose = useMemo(() => new Group(), []);
  const state = useRef({ spin: 0, extra: 0, lastTap: -1, hover: 0, scale: 0, mixer: null as AnimationMixer | null, actions: new Map<string, AnimationAction>(), playing: "", parts: [] as { o: Object3D; home: Vector3; dir: Vector3 }[], variants: null as Awaited<ReturnType<typeof variantSwitcher>>, variant: "", ready: false });
  useEffect(() => {
    holder.add(pose);
    let gone = false;
    loadModel(p.spec.src)
      .then(async (gltf) => {
        if (gone) return;
        const model = p.spec.clips.length || p.spec.variants.length ? gltf.scene : gltf.scene.clone(true);
        // Fit: the longest side becomes one unit, so scale means the same for every model.
        const box = new Box3().setFromObject(model);
        const size = box.getSize(new Vector3());
        const longest = Math.max(size.x, size.y, size.z) || p.spec.size || 1;
        model.scale.multiplyScalar(1 / longest);
        if (p.spec.pivot === "bottom") model.position.y -= 0.5 * (size.y / longest);
        model.traverse((o) => {
          const pts = o as Points;
          if (pts.isPoints) {
            (pts.material as PointsMaterial).size = 3;
            (pts.material as PointsMaterial).sizeAttenuation = false;
          }
        });
        pose.add(model);
        const s = state.current;
        if (gltf.animations.length) {
          s.mixer = new AnimationMixer(model);
          for (const clip of gltf.animations) s.actions.set(clip.name, s.mixer.clipAction(clip));
        }
        s.variants = await variantSwitcher(gltf);
        // Assembly: meshes that are separate parts can fly apart along their offset from the centre.
        if (p.spec.capabilities.includes("assemble")) {
          const c = new Box3().setFromObject(model).getCenter(new Vector3());
          model.children.forEach((o) => {
            const at = new Box3().setFromObject(o).getCenter(new Vector3());
            const dir = at.sub(c);
            if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0);
            s.parts.push({ o, home: o.position.clone(), dir: dir.normalize() });
          });
        }
        s.ready = true;
        p.onReady();
      })
      .catch((e) => !gone && p.onError(e));
    return () => {
      gone = true;
      state.current.mixer?.stopAllAction();
    };
  }, [p.spec.src]); // eslint-disable-line react-hooks/exhaustive-deps

  const play = (name: string, once = false) => {
    const s = state.current;
    if (!s.mixer || s.playing === name) return;
    const next = s.actions.get(name);
    if (!next) return;
    const prev = s.actions.get(s.playing);
    next.reset();
    next.setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity);
    next.clampWhenFinished = once;
    next.fadeIn(0.35).play();
    prev?.fadeOut(0.35);
    s.playing = name;
  };

  useFrame((_, delta) => {
    const f = p.frame();
    const s = state.current;
    if (!f || !s.ready) return;
    const b = f.beat;
    const moving = !f.reduced;
    const caps = p.spec.capabilities;
    // Entrance: scale-reveal grows from nothing, rise comes up from below, fade simply appears.
    s.scale = lerp(s.scale, 1, moving ? 0.06 : 1);
    const enter = p.direction.animation.enter;
    const grow = enter === "scale-reveal" ? s.scale : 1;
    const rise = enter === "rise" ? (1 - s.scale) * -0.6 : 0;
    // Taps: a turn for objects, a wave or a jump for characters.
    const tap = freshTaps(f, 1200).pop();
    if (p.lead && tap && tap.t !== s.lastTap) {
      s.lastTap = tap.t;
      if (p.spec.clips.includes("wave")) play("wave", true);
      else if (p.spec.clips.includes("jump")) play("jump", true);
      else if (caps.includes("rotate")) s.extra += Math.PI * 2;
    }
    // Clips: the scene's clip, else idle; a finished one-shot falls back to the scene's clip.
    if (s.mixer) {
      const want = str(b, "clip", p.spec.clips.includes("idle") ? "idle" : p.spec.clips[0] ?? "");
      const cur = s.actions.get(s.playing);
      if (!s.playing || (cur && cur.loop === LoopOnce ? !cur.isRunning() : s.playing !== want)) play(want);
      s.mixer.update(moving ? Math.min(delta, 0.05) : 0);
    }
    const variant = str(b, "variant");
    if (variant && s.variants && s.variants.names.includes(variant) && variant !== s.variant) {
      s.variant = variant;
      void s.variants.set(variant);
    }
    // Scroll: spin is the beat's angle (rotate-360 runs 0..360 over the page); idle adds a turntable.
    const turntable = p.direction.animation.idle === "turntable" && moving ? f.t * 0.25 : 0;
    const want = (num(b, "spin", 0) * Math.PI) / 180 + s.extra;
    s.spin = moving ? lerp(s.spin, want, 0.08) : want;
    const float = p.direction.animation.idle === "slow-float" && moving ? Math.sin(f.t * 1.1) * 0.035 : 0;
    // Hover: the pointer near the object lifts it and leans it toward the cursor.
    const near = f.pointer && Math.hypot(f.px - f.w * f.side, f.py - f.h * 0.5) < Math.min(f.w, f.h) * 0.3;
    s.hover = lerp(s.hover, near && caps.includes("hover") ? 1 : 0, 0.1);
    const lean = f.pointer && p.lead ? f.nx * 0.18 : 0;
    const zoom = num(b, "zoom", 1) * (1 + s.hover * 0.04);
    const pl = p.place ? p.place() : { position: p.position ?? [0, 0, 0], scale: p.scale ?? 1 };
    const lead = p.lead ? 1 : 0;
    holder.position.set(pl.position[0] + num(b, "shift", 0) * pl.scale * 0.9 * lead, pl.position[1] + (num(b, "lift", 0) * lead + float + rise + s.hover * 0.03) * pl.scale, pl.position[2]);
    holder.scale.setScalar(Math.max(0.0001, pl.scale * (p.lead ? zoom : 1) * grow));
    const r = p.rotation ?? [0, 0, 0];
    pose.rotation.set(r[0] + (num(b, "tilt", 0) * Math.PI) / 180 + (f.pointer && p.lead ? f.ny * 0.12 : 0), r[1] + s.spin + turntable + lean, r[2]);
    // Assembly: explode 0 is whole, 1 is every part pulled out along its own direction.
    const explode = clamp(num(b, "explode", 0));
    for (const part of s.parts) part.o.position.copy(part.home).addScaledVector(part.dir, explode * 0.6);
  });
  return h("primitive", { object: holder });
}

function Particles({ frame, count, color }: { frame: () => Frame | null; count: number; color: string }) {
  const pts = useMemo(() => {
    const r = rng(19);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (r() - 0.5) * 8;
      pos[i * 3 + 1] = (r() - 0.5) * 5;
      pos[i * 3 + 2] = (r() - 0.5) * 3 - 0.5;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    const m = new PointsMaterial({ color: col(color), size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.55, depthWrite: false, blending: AdditiveBlending });
    return new Points(g, m);
  }, [count, color]);
  useFrame(() => {
    const f = frame();
    if (!f) return;
    const show = clamp(num(f.beat, "particles", 0.5));
    (pts.material as PointsMaterial).opacity = 0.55 * show;
    if (!f.reduced) pts.rotation.y = f.t * 0.02 + f.pos * 0.15;
  });
  useEffect(() => () => (pts.geometry.dispose(), (pts.material as PointsMaterial).dispose()), [pts]);
  return h("primitive", { object: pts });
}

const LIGHTS: Record<AssetDirection["lighting"]["type"], { key: number; rim: string; fill: number; exposure: number; hdr: number }> = {
  // hdr: how strongly the HDR environment lights the object. A bright studio HDR at full strength
  // greys out dark glossy products (black frames, tinted lenses), so studio light keeps it low and
  // lets the key light model the shape.
  studio: { key: 2.0, rim: "#ffffff", fill: 0.4, exposure: 1.0, hdr: 0.45 },
  cinematic: { key: 2.6, rim: "accent", fill: 0.25, exposure: 0.95, hdr: 0.6 },
  natural: { key: 1.6, rim: "#fff4e0", fill: 0.6, exposure: 1.05, hdr: 0.8 },
  night: { key: 1.4, rim: "accent", fill: 0.18, exposure: 0.9, hdr: 0.5 },
  interior: { key: 1.5, rim: "#ffe7c4", fill: 0.55, exposure: 1.0, hdr: 0.7 },
  urban: { key: 1.8, rim: "#dfe8ff", fill: 0.45, exposure: 1.0, hdr: 0.7 },
};

function AssetStage({ init, frame, report }: { init: Init3D; frame: () => Frame | null; report: (state: "ready" | "failed") => void }) {
  const three = useThree();
  const gl = three.gl as WebGLRenderer;
  const scene = three.scene as Scene;
  const camera = three.camera as PerspectiveCamera;
  const dir = init.direction!;
  const models = (init.assets ?? []).filter((a) => a.kind === "model");
  // Phones and small screens: one object only (PRD: fewer simultaneous 3D objects on mobile).
  const shown = init.mobile ? models.slice(0, 1) : models.slice(0, 2);
  const hdri = (init.assets ?? []).find((a) => a.kind === "hdri");
  const pending = useRef(new Set(shown.map((a) => a.id)));
  const lights = useMemo(() => {
    const L = LIGHTS[dir.lighting.type] ?? LIGHTS.studio;
    const accent = col(init.pal.accent);
    const g = new Group();
    g.add(new HemisphereLight(0xffffff, col(init.pal.bg).getHex(), L.fill));
    const key = new DirectionalLight(0xffffff, L.key * dir.lighting.intensity);
    key.position.set(3, 5, 4);
    g.add(key);
    const rim = new DirectionalLight(L.rim === "accent" ? accent : new Color(L.rim), L.key * 0.6 * dir.lighting.intensity);
    rim.position.set(-4, 2, -3);
    g.add(rim);
    return { g, key, exposure: L.exposure };
  }, [dir.lighting.type, dir.lighting.intensity, init.pal.accent, init.pal.bg]);
  const shadow = useMemo(() => {
    const m = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: softShadow(), transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    return m;
  }, []);

  useEffect(() => {
    gl.setClearColor(0x000000, 0);
    gl.toneMappingExposure = lights.exposure;
    camera.fov = dir.camera.fov;
    camera.position.set(...dir.camera.position);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    let env: Texture | null = null;
    let gone = false;
    const pm = new PMREMGenerator(gl);
    const room = () => {
      env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = env;
      scene.environmentIntensity = 1;
    };
    // The HDR is the costlier light: desktop only. Phones light the object with a generated room.
    if (hdri && !init.mobile)
      new HDRLoader()
        .loadAsync(assetUrl(hdri.src))
        .then((t) => {
          if (gone) return t.dispose();
          t.mapping = EquirectangularReflectionMapping;
          env = pm.fromEquirectangular(t).texture;
          scene.environment = env;
          scene.environmentIntensity = LIGHTS[dir.lighting.type].hdr;
          t.dispose();
        })
        .catch(room);
    else room();
    return () => {
      gone = true;
      scene.environment = null;
      env?.dispose();
      pm.dispose();
      shadow.geometry.dispose();
      (shadow.material as MeshBasicMaterial).map?.dispose();
      (shadow.material as MeshBasicMaterial).dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const kit = { camera } as Kit;
  const live = useRef({ x: 0, y: 0, s: 1 });
  useFrame(() => {
    const f = frame();
    if (!f) return;
    // Where the anchor stands: beside the words, as every stage engine places it.
    const a = anchor3(kit, f);
    live.current = { x: a.x, y: a.y, s: a.s * 0.95 };
    shadow.position.set(a.x, a.y - a.s * 0.5, 0);
    shadow.scale.setScalar(a.s * 1.05);
    // Camera orbit and drift (environments) come from the beat; the light beat sets exposure.
    const orbit = (num(f.beat, "orbit", 0) * Math.PI) / 180;
    const drift = dir.animation.scroll === "drift" && !f.reduced ? Math.sin(f.t * 0.2) * 0.15 : 0;
    const [cx, cy, cz] = dir.camera.position;
    const rad = Math.hypot(cx, cz);
    camera.position.set(Math.sin(orbit + drift) * rad, cy, Math.cos(orbit + drift) * rad);
    camera.lookAt(0, 0, 0);
    gl.toneMappingExposure = lights.exposure * (0.85 + clamp(num(f.beat, "light", 0.7)) * 0.3);
    lights.key.intensity = LIGHTS[dir.lighting.type].key * dir.lighting.intensity * (0.7 + clamp(num(f.beat, "light", 0.7)) * 0.5);
  }, -1);
  // The engine renders the scene itself, on the stage's loop (as host() does for the others).
  useFrame(() => {
    if (frame()) gl.render(scene, camera);
  }, 1);

  const done = (id: string, ok: boolean) => {
    if (!ok) return report("failed");
    pending.current.delete(id);
    if (!pending.current.size) report("ready");
  };
  const group = useMemo(() => new Group(), []);
  const place = (i: number) => () => {
    const a = live.current;
    return i === 0 ? { position: [a.x, a.y, 0] as [number, number, number], scale: a.s } : { position: [a.x + a.s * 0.75, a.y - a.s * 0.25, -0.6] as [number, number, number], scale: a.s * 0.42 };
  };
  // Only <primitive> is used, so no three.js classes need registering with R3F (extend).
  return h(
    "primitive",
    { object: group },
    h("primitive", { object: lights.g }),
    h("primitive", { object: shadow }),
    dir.particles && !init.mobile ? h(Particles, { frame, count: Math.min(260, Math.max(40, Math.round((frame()?.budget.particles ?? 160) * 0.8))), color: init.pal.dark ? "#ffffff" : init.pal.accent }) : null,
    ...shown.map((spec, i) => h(Asset, { key: spec.id, spec, place: place(i), frame, direction: dir, lead: i === 0, onReady: () => done(spec.id, true), onError: (e: unknown) => (console.warn("asset", spec.id, e), done(spec.id, false)) })),
  );
}

/** Mounts the asset stage on the stage's canvas (the same contract as host() in core.ts). */
export function asset3d(canvas: HTMLCanvasElement, init: Init3D): View3D | null {
  if (!init.assets?.some((a) => a.kind === "model") || !init.direction) return null;
  const root = createRoot(canvas);
  let advance: ((t: number) => void) | null = null;
  let latest: Frame | null = null;
  let gone = false;
  let status: "loading" | "ready" | "failed" = "loading";
  const frame = () => latest;
  function Engine() {
    const state = useThree();
    useEffect(() => {
      advance = (t) => state.advance(t);
      return () => void (advance = null);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return h(AssetStage, { init, frame, report: (s: "ready" | "failed") => (status = s) });
  }
  let size = { width: 1, height: 1, dpr: 1 };
  const show = () =>
    root
      .configure({
        gl: { alpha: true, antialias: !init.mobile, powerPreference: "high-performance" },
        camera: { fov: init.direction!.camera.fov, near: 0.05, far: 200, position: init.direction!.camera.position },
        frameloop: "never",
        flat: false,
        size: { width: size.width, height: size.height, top: 0, left: 0 },
        dpr: size.dpr,
        onCreated: (s) => s.gl.setClearColor(0x000000, 0),
      })
      .then(() => !gone && root.render(h(Engine)))
      .catch((e) => {
        console.warn("3D stage", e);
        status = "failed";
      });
  show();
  return {
    frame(f) {
      latest = f;
      advance?.(performance.now());
    },
    resize(w, h2, dpr) {
      size = { width: w, height: h2, dpr };
      show();
    },
    dispose() {
      gone = true;
      root.unmount();
    },
    ready: () => status === "ready",
    failed: () => status === "failed",
  };
}
