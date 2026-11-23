// The character engine (docs/CHARACTER-JOURNEY.md). One 3D model, from the asset library, an
// upload or a photo, drawn into any element on a page: lit by the colours of the gradient behind
// it, grounded by a soft shadow, and alive (its own animation or a gentle float, it turns toward
// the pointer, can be dragged and tapped, and moves as the page scrolls). It only draws while it
// is on screen, steps its resolution down on slow devices, holds a still pose for people who
// turn motion down, and shows the model's picture until the model is ready or if WebGL is off.
//
// Plain three.js and no framework, so every template (and the builder itself) can use it.
import {
  AnimationMixer,
  Box3,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Sphere,
  Vector3,
  WebGLRenderer,
  type AnimationClip,
  type Material,
  type Object3D,
  type Texture,
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  Sprite,
  SpriteMaterial,
} from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

export type CharacterMotion = "float" | "sway" | "spin" | "still";
export type CharacterReact = "follow" | "drag" | "both" | "none";
export type CharacterScroll = "turn" | "rise" | "zoom" | "film" | "none";

/**
 * One frame of the film (library/character/film.ts): where on the screen the model sits and how
 * the camera sees it. The film's director works this out from the scroll position every frame.
 */
export interface FilmShot {
  /** The box on the screen the model fills, in CSS pixels of the viewport. */
  cx: number;
  cy: number;
  w: number;
  h: number;
  /** Turn added to the resting turn, in degrees. */
  yaw: number;
  /** How far the camera has climbed above the model, in degrees (0 side on, 80 from above). */
  elev: number;
  /** 0..1: turn its long side to run up the screen (for the view from above). */
  align: number;
  /** 0..1: how much of the model shows (0 when a section has no room for it). */
  presence: number;
  /** 0..1 each: the glowing ring on the floor, the reflective floor and the dust. */
  ring: number;
  floor: number;
  dust: number;
  /** 0..1: the soft light under the model, as if it hovers (two pools under a car's wheels). */
  glow?: number;
  /** 0..1: one ring spreading out from under the model (0 before, 1 when it has faded away). */
  pulse?: number;
  /** 0..1: how high it hovers above the floor, as a fraction of its own height. */
  lift?: number;
}

export interface FilmDirector {
  /**
   * The shot for this frame; dt in seconds. `flat` is true for wide, low models (cars, boats).
   * `turn` is the model's resting turn and `base` the turn that shows a flat model side on (nose
   * left) or a tall one from the front: the shot's yaw is added to `base`.
   */
  shot(dt: number, info: { flat: boolean; reduced: boolean; turn: number; base: number }): FilmShot;
}
export type CharacterFinish = "original" | "paint" | "clay" | "chrome";

export interface CharacterConfig {
  src: string;
  poster?: string;
  name?: string;
  /** Size in its space, 0.4 to 1.8. */
  scale?: number;
  /** Resting turn and tilt, in degrees. */
  turn?: number;
  tilt?: number;
  /** Moves it up (positive) or down in its space, -1 to 1. */
  lift?: number;
  motion?: CharacterMotion;
  /** Its own animation: a clip name, "" for the best idle, "none" for none. */
  clip?: string;
  react?: CharacterReact;
  scroll?: CharacterScroll;
  finish?: CharacterFinish;
  /** The colour for paint, clay and chrome finishes. */
  paint?: string;
  /** Material names the paint finish changes (empty: the whole model). */
  parts?: string;
  /** Material names that become screens showing the brand gradient. */
  screen?: string;
  shadow?: boolean;
  /** The gradient behind it: base, glow and second colour. Lights take their colours from it. */
  stops?: string[];
  /** The rim light's colour (defaults to the glow). */
  light?: string;
  /** Rises in on first view. */
  entrance?: boolean;
  /** Draw quality; "auto" steps down on slow devices. */
  quality?: "auto" | "high" | "low";
  /** Speed of idle motion, 0.2 to 2. */
  speed?: number;
  /** The film: the host is a fixed full-screen layer and this director moves the camera. */
  film?: FilmDirector | null;
  /** The studio set in the film: reflective floor, ring and dust (default on). */
  studio?: boolean;
}

export interface CharacterView {
  update(next: Partial<CharacterConfig>): void;
  /** Plays a hop and a turn, as a tap does. */
  hop(): void;
  /** The current frame as a picture (for posters), or "" if nothing is drawn yet. */
  snapshot(type?: string): string;
  readonly ready: Promise<boolean>;
  dispose(): void;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const DEG = Math.PI / 180;
const names = (s?: string) => (s || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);

// ---------------------------------------------------------------- loading, shared between views

let draco: DRACOLoader | null = null;
const cache = new Map<string, Promise<GLTF>>();

function loadModel(src: string): Promise<GLTF> {
  let p = cache.get(src);
  if (!p) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    if (!draco) {
      draco = new DRACOLoader();
      draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
    }
    loader.setDRACOLoader(draco);
    p = loader.loadAsync(src);
    p.catch(() => cache.delete(src));
    // Keep the last few models; uploads are big.
    if (cache.size > 6) cache.delete(cache.keys().next().value as string);
    cache.set(src, p);
  }
  return p;
}

/** Starts loading a model before a view needs it (the builder warms the next pick). */
export function preloadCharacter(src: string) {
  if (src) loadModel(src).catch(() => undefined);
}

function shadowTexture(): Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(0,0,0,1)");
  r.addColorStop(0.45, "rgba(0,0,0,0.55)");
  r.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function ringTexture(): Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, "rgba(255,255,255,0.10)");
  r.addColorStop(0.62, "rgba(255,255,255,0.04)");
  r.addColorStop(0.8, "rgba(255,255,255,0.9)");
  r.addColorStop(0.84, "rgba(255,255,255,0.35)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 256, 256);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function glowTexture(): Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(255,255,255,0.95)");
  r.addColorStop(0.25, "rgba(255,255,255,0.5)");
  r.addColorStop(0.6, "rgba(255,255,255,0.12)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function dotTexture(): Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.35, "rgba(255,255,255,0.5)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 32, 32);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** A floor that mirrors the model, fading out from the middle (a wet studio floor). */
const FLOOR_SHADER = {
  name: "XpFloor",
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, strength: { value: 0.3 } },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUvP;
    varying vec2 vUv2;
    void main() {
      vUvP = textureMatrix * vec4(position, 1.0);
      vUv2 = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float strength;
    varying vec4 vUvP;
    varying vec2 vUv2;
    void main() {
      vec4 b = texture2DProj(tDiffuse, vUvP);
      float r = distance(vUv2, vec2(0.5));
      float fade = smoothstep(0.5, 0.06, r);
      gl_FragColor = vec4(b.rgb, b.a * strength * fade);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

function screenTexture(stops: string[]): Texture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 128;
  const g = c.getContext("2d")!;
  const l = g.createLinearGradient(0, 0, 64, 128);
  l.addColorStop(0, stops[1] || "#7c5cff");
  l.addColorStop(0.6, stops[2] || stops[1] || "#2b2b4a");
  l.addColorStop(1, stops[0] || "#101018");
  g.fillStyle = l;
  g.fillRect(0, 0, 64, 128);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.flipY = false;
  return t;
}

/** The clip to play: the one asked for, else one that looks like an idle, else the first. */
export function pickClip(clips: { name: string }[], want = ""): number {
  if (want === "none" || !clips.length) return -1;
  const w = want.trim().toLowerCase();
  if (w) {
    const i = clips.findIndex((c) => c.name.toLowerCase() === w);
    if (i >= 0) return i;
  }
  const idle = clips.findIndex((c) => /idle|breath|stand|loop|hover|fly|swim|float/i.test(c.name));
  return idle >= 0 ? idle : 0;
}

// ---------------------------------------------------------------- the view

export function mountCharacter(host: HTMLElement, init: CharacterConfig): CharacterView {
  let o: CharacterConfig = { scale: 1, turn: -18, tilt: 0, lift: 0, motion: "float", clip: "", react: "both", scroll: "turn", finish: "original", shadow: true, entrance: true, quality: "auto", speed: 1, ...init };
  const doc = host.ownerDocument;
  const win = doc.defaultView || window;
  const reducedQuery = win.matchMedia?.("(prefers-reduced-motion: reduce)");
  let reduced = !!reducedQuery?.matches;

  host.classList.add("xp-char");
  if (getComputedStyle(host).position === "static") host.style.position = "relative";

  // The picture first, so the space is never empty (a template may have drawn it already).
  const poster = host.querySelector<HTMLImageElement>(":scope > img.xp-char-poster") || doc.createElement("img");
  poster.className = "xp-char-poster";
  poster.alt = o.name ? `${o.name}, in 3D` : "";
  poster.decoding = "async";
  poster.draggable = false;
  Object.assign(poster.style, { position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "contain", transition: "opacity .6s ease", pointerEvents: "none" } as CSSStyleDeclaration);
  const setPoster = () => {
    if (o.poster) poster.src = o.poster;
    poster.style.display = o.poster ? "" : "none";
  };
  setPoster();
  host.appendChild(poster);

  const canvas = doc.createElement("canvas");
  canvas.className = "xp-char-canvas";
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", opacity: "0", transition: "opacity .7s ease", touchAction: "pan-y", outline: "none" } as CSSStyleDeclaration);
  host.appendChild(canvas);

  let renderer: WebGLRenderer | null = null;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: (win.devicePixelRatio || 1) < 2, powerPreference: "high-performance" });
  } catch {
    renderer = null;
  }
  let resolveReady: (ok: boolean) => void = () => undefined;
  const ready = new Promise<boolean>((r) => (resolveReady = r));
  if (!renderer) {
    host.classList.add("xp-char--still");
    resolveReady(false);
    return { update: (n) => ((o = { ...o, ...n }), setPoster()), hop: () => undefined, snapshot: () => "", ready, dispose: () => (poster.remove(), canvas.remove()) };
  }
  const gl = renderer;
  gl.setClearColor(0x000000, 0);
  gl.outputColorSpace = SRGBColorSpace;
  gl.toneMapping = NeutralToneMapping;
  gl.toneMappingExposure = 1.05;

  const scene = new Scene();
  const pm = new PMREMGenerator(gl);
  const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  pm.dispose();
  scene.environment = env;
  scene.environmentIntensity = 0.85;

  const camera = new PerspectiveCamera(26, 1, 0.01, 200);
  const hemi = new HemisphereLight("#ffffff", "#202020", 0.7);
  const key = new DirectionalLight("#ffffff", 2.1);
  key.position.set(2.6, 3.4, 3.2);
  const rim = new DirectionalLight("#88aaff", 2.6);
  rim.position.set(-3, 2.2, -3.2);
  const fill = new DirectionalLight("#ffffff", 0.5);
  fill.position.set(-2.5, 0.6, 2.5);
  scene.add(hemi, key, rim, fill);

  // Pivots: rest pose, then interaction, then idle motion, then the normalised model.
  const root = new Group();
  const turnG = new Group();
  const idleG = new Group();
  root.add(turnG);
  turnG.add(idleG);
  scene.add(root);
  const shadowTex = shadowTexture();
  const shadow = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.42, color: "#000000" }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.renderOrder = -1;
  root.add(shadow);

  // ------------------------------------------------------------ the film's studio set
  // A wet floor that mirrors the model, a glowing ring under it and dust in the light. They stay
  // level while the model turns, and each fades in and out with the shot.
  const film = () => o.film || null;
  const set = new Group();
  scene.add(set);
  let floor: Reflector | null = null;
  let ring: Mesh | null = null;
  let pulse: Mesh | null = null;
  let dust: Points | null = null;
  // Light pools under the model: two along its length for a flat model, one for a tall one.
  const glowG = new Group();
  const pools: Sprite[] = [];
  const setTextures: Texture[] = [];
  const buildSet = () => {
    if (!film() || o.studio === false || set.children.length) return;
    const lowEnd = o.quality === "low" || (win.innerWidth || 1000) < 700;
    if (!lowEnd) {
      const tw = Math.round(clamp((win.innerWidth || 1200) * 0.5, 256, 1024));
      floor = new Reflector(new PlaneGeometry(9, 9), { textureWidth: tw, textureHeight: tw, clipBias: 0.003, multisample: 0, shader: FLOOR_SHADER });
      const fm = floor.material as Material & { transparent: boolean; depthWrite: boolean };
      fm.transparent = true;
      fm.depthWrite = false;
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.001;
      floor.renderOrder = -2;
      set.add(floor);
    }
    const rt = ringTexture();
    setTextures.push(rt);
    ring = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: rt, transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0 }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.004;
    set.add(ring);
    pulse = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: rt, transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0 }));
    pulse.rotation.x = -Math.PI / 2;
    pulse.position.y = 0.005;
    pulse.visible = false;
    set.add(pulse);
    const gt = glowTexture();
    setTextures.push(gt);
    // Light pools are sprites: they face the lens, so they read as a glow under the model from any height.
    for (let i = 0; i < 2; i++) {
      const m = new Sprite(new SpriteMaterial({ map: gt, transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending, opacity: 0, color: "#cfe2ff" }));
      m.renderOrder = 6;
      m.visible = false;
      glowG.add(m);
      pools.push(m);
    }
    scene.add(glowG);
    const dt = dotTexture();
    setTextures.push(dt);
    const n = lowEnd ? 200 : 640;
    const pos: number[] = [];
    let seed = 7;
    const R = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    // Sparks on and near the floor, mostly in front of the model, as light dust in a studio.
    for (let i = 0; i < n; i++) {
      const high = R() < 0.14;
      pos.push((R() - 0.5) * 9, high ? 0.5 + R() * 1.6 : R() * R() * 0.7, -1.4 + R() * 5.4);
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
    dust = new Points(geo, new PointsMaterial({ map: dt, size: 0.045, sizeAttenuation: true, transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0 }));
    set.add(dust);
  };
  const disposeSet = () => {
    scene.remove(glowG);
    glowG.clear();
    for (const m of pools) m.material.dispose();
    pools.length = 0;
    for (const x of [floor, ring, pulse, dust]) {
      if (!x) continue;
      x.geometry.dispose();
      (x as Reflector).dispose?.();
      ((x as Mesh).material as Material).dispose?.();
    }
    for (const t of setTextures) t.dispose();
    setTextures.length = 0;
    set.clear();
    floor = ring = pulse = null;
    dust = null;
  };
  buildSet();

  let model: Object3D | null = null;
  let mixer: AnimationMixer | null = null;
  let clips: AnimationClip[] = [];
  let originals = new Map<Mesh, Material | Material[]>();
  let made: Material[] = [];
  let screenTex: Texture | null = null;
  let loadedSrc = "";
  const fitSphere = new Sphere(new Vector3(0, 1, 0), 1.2);
  let height = 2;
  // The model's size along x, y and z after it is normalised (its biggest side is 2).
  const dims = new Vector3(2, 2, 2);
  // About fifteen hundred points on the model's surface (x, y, z, in the normalised frame), so the
  // film can fit the model's true outline into a box instead of its bounding box.
  let outline: Float32Array | null = null;
  let gone = false;

  // ------------------------------------------------------------ colour

  const stops = () => [o.stops?.[0] || "#15151c", o.stops?.[1] || "#7c5cff", o.stops?.[2] || o.stops?.[1] || "#2b2b4a"];
  const light = () => {
    const [base, glow, second] = stops();
    rim.color.set(o.light || glow);
    hemi.color.set(new Color(glow).lerp(new Color("#ffffff"), 0.55));
    hemi.groundColor.set(new Color(base).lerp(new Color(second), 0.3));
    (shadow.material as MeshBasicMaterial).color.set(new Color(base).multiplyScalar(0.25));
    shadow.visible = o.shadow !== false;
    if (ring) (ring.material as MeshBasicMaterial).color.set(new Color(glow).lerp(new Color("#ffffff"), 0.35));
    if (pulse) (pulse.material as MeshBasicMaterial).color.set(new Color(glow).lerp(new Color("#ffffff"), 0.5));
    for (const m of pools) m.material.color.set(new Color(glow).lerp(new Color("#d8e6ff"), 0.7));
    if (dust) (dust.material as PointsMaterial).color.set(new Color(glow).lerp(new Color("#ffffff"), 0.6));
  };

  const restoreMaterials = () => {
    for (const [mesh, mat] of originals) mesh.material = mat;
    originals = new Map();
    for (const m of made) m.dispose();
    made = [];
    screenTex?.dispose();
    screenTex = null;
  };

  const finish = () => {
    if (!model) return;
    restoreMaterials();
    const kind = o.finish || "original";
    const parts = names(o.parts);
    const screens = names(o.screen);
    const paint = new Color(o.paint && /^#[0-9a-f]{6}$/i.test(o.paint) ? o.paint : stops()[1]);
    const cache = new Map<Material, Material>();
    const swap = (mat: Material, make: (m: MeshStandardMaterial) => Material) => {
      let n = cache.get(mat);
      if (!n) {
        n = make(mat as MeshStandardMaterial);
        made.push(n);
        cache.set(mat, n);
      }
      return n;
    };
    model.traverse((x) => {
      const mesh = x as Mesh;
      if (!mesh.isMesh) return;
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      let changed = false;
      const next = list.map((mat) => {
        const name = (mat.name || "").toLowerCase();
        if (screens.length && screens.includes(name)) {
          changed = true;
          return swap(mat, (m) => {
            const s = (m as MeshStandardMaterial).clone();
            screenTex ||= screenTexture(stops());
            s.map = null;
            s.color = new Color("#050508");
            s.emissive = new Color("#ffffff");
            s.emissiveMap = screenTex;
            s.emissiveIntensity = 0.95;
            s.roughness = 0.25;
            return s;
          });
        }
        if (kind === "original") return mat;
        if (kind === "paint" && parts.length && !parts.includes(name)) return mat;
        changed = true;
        return swap(mat, (m) => {
          if (kind === "paint") {
            const s = (m as MeshStandardMaterial).clone();
            if (s.color) s.color = paint.clone();
            s.map = null;
            return s;
          }
          const p = new MeshPhysicalMaterial({
            color: kind === "chrome" ? paint.clone().lerp(new Color("#ffffff"), 0.55) : paint.clone(),
            roughness: kind === "chrome" ? 0.16 : 0.58,
            metalness: kind === "chrome" ? 1 : 0,
            clearcoat: kind === "chrome" ? 0.6 : 0.25,
            clearcoatRoughness: 0.3,
            normalMap: (m as MeshStandardMaterial).normalMap || null,
          });
          p.side = m.side;
          p.transparent = m.transparent;
          p.opacity = m.opacity;
          p.alphaTest = m.alphaTest;
          return p;
        });
      });
      if (changed) {
        originals.set(mesh, mesh.material);
        mesh.material = Array.isArray(mesh.material) ? next : next[0];
      }
    });
  };

  // ------------------------------------------------------------ framing

  const size = { w: 1, h: 1 };
  let dpr = Math.min(win.devicePixelRatio || 1, o.quality === "low" ? 1 : 2);
  const resize = () => {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    size.w = w;
    size.h = h;
    gl.setPixelRatio(dpr);
    gl.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    needs = true;
  };

  /** Distance at which the model's bounding sphere fills the view with some air around it. */
  const fitDistance = () => {
    const vfov = camera.fov * DEG;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const f = Math.min(vfov, hfov);
    return (fitSphere.radius / Math.sin(f / 2)) * 1.06;
  };

  /** Points on the surface of every mesh, spread evenly, in the frame the model is normalised to. */
  const sampleOutline = (root0: Object3D, ox: number, oy: number, oz: number, k: number) => {
    const meshes: Mesh[] = [];
    let total = 0;
    root0.traverse((x) => {
      const mm = x as Mesh;
      const pos = mm.isMesh ? mm.geometry?.attributes?.position : null;
      if (pos) (meshes.push(mm), (total += pos.count));
    });
    const step = Math.max(1, Math.floor(total / 1500));
    const out: number[] = [];
    const v = new Vector3();
    for (const mm of meshes) {
      const pos = mm.geometry.attributes.position;
      mm.updateMatrixWorld(true);
      for (let i = 0; i < pos.count; i += step) {
        if (typeof mm.getVertexPosition === "function") mm.getVertexPosition(i, v);
        else v.fromBufferAttribute(pos, i);
        v.applyMatrix4(mm.matrixWorld);
        out.push((v.x - ox) * k, (v.y - oy) * k, (v.z - oz) * k);
      }
    }
    return out.length >= 12 ? new Float32Array(out) : null;
  };

  /**
   * The model, posed as it will be seen (the first frame of its clip, so a rigged character whose
   * clips move its hips is measured where it stands), then centred on the ground and sized so
   * its biggest side is 2 units.
   */
  const place = (gltf: GLTF) => {
    const scene0 = gltf.scene;
    let skinned = false;
    scene0.traverse((x) => ((x as Mesh & { isSkinnedMesh?: boolean }).isSkinnedMesh ? (skinned = true) : 0));
    const m = skinned ? cloneSkinned(scene0) : scene0.clone(true);
    const wrap = new Group();
    wrap.add(m);
    const list = gltf.animations || [];
    const i = pickClip(list, o.clip);
    let mx: AnimationMixer | null = null;
    if (i >= 0) {
      mx = new AnimationMixer(wrap);
      mx.clipAction(list[i]).play();
      mx.update(0);
    }
    m.updateMatrixWorld(true);
    // Skinned meshes are measured vertex by vertex in that pose; others by their boxes.
    const box = new Box3().setFromObject(m, skinned);
    if (box.isEmpty()) box.set(new Vector3(-1, 0, -1), new Vector3(1, 2, 1));
    const s = box.getSize(new Vector3());
    const c = box.getCenter(new Vector3());
    const big = Math.max(s.x, s.y, s.z) || 1;
    const k = 2 / big;
    outline = sampleOutline(m, c.x, box.min.y, c.z, k);
    m.position.set(-c.x, -box.min.y, -c.z);
    wrap.scale.setScalar(k);
    height = s.y * k;
    dims.set(s.x * k, s.y * k, s.z * k);
    const foot = Math.max(s.x, s.z) * k;
    fitSphere.center.set(0, height / 2, 0);
    fitSphere.radius = Math.max(0.55, Math.hypot(s.x * k, s.y * k, s.z * k) / 2);
    shadow.scale.set(foot * 1.5 + 0.4, foot * 1.5 + 0.4, 1);
    shadow.position.y = 0.002;
    m.traverse((x) => {
      const mesh = x as Mesh;
      if (mesh.isMesh) mesh.frustumCulled = false;
    });
    return { wrap, mixer: mx };
  };

  let current: GLTF | null = null;
  const setModel = (gltf: GLTF | null) => {
    if (model) {
      idleG.remove(model);
      restoreMaterials();
      mixer?.stopAllAction();
      mixer = null;
    }
    model = null;
    clips = [];
    current = gltf;
    if (!gltf) return;
    const placed = place(gltf);
    model = placed.wrap;
    mixer = placed.mixer;
    idleG.add(model);
    clips = gltf.animations || [];
    finish();
    light();
    entered = o.entrance === false || reduced ? 1 : 0;
    needs = true;
  };

  /** A new clip re-poses and re-measures the model. */
  const playClip = () => {
    if (!current) return;
    const keep = entered;
    setModel(current);
    entered = keep;
  };

  let failed = false;
  const load = () => {
    const src = o.src || "";
    if (src === loadedSrc) return;
    loadedSrc = src;
    canvas.style.opacity = "0";
    poster.style.opacity = "1";
    if (!src) {
      setModel(null);
      resolveReady(false);
      return;
    }
    host.classList.add("xp-char--loading");
    loadModel(src).then(
      (gltf) => {
        if (gone || src !== loadedSrc) return;
        failed = false;
        setModel(gltf);
        host.classList.remove("xp-char--loading", "xp-char--failed");
        drawNow();
        if (!film()) canvas.style.opacity = "1";
        else canvasAlpha = -1;
        poster.style.opacity = "0";
        resolveReady(true);
        host.dispatchEvent(new CustomEvent("xp-character", { bubbles: true, detail: { ok: true, clips: clips.map((c) => c.name) } }));
      },
      () => {
        if (gone || src !== loadedSrc) return;
        failed = true;
        host.classList.remove("xp-char--loading");
        host.classList.add("xp-char--failed");
        resolveReady(false);
        host.dispatchEvent(new CustomEvent("xp-character", { bubbles: true, detail: { ok: false } }));
      },
    );
  };

  // ------------------------------------------------------------ motion state (simple springs)

  const spring = (x: { v: number; p: number }, target: number, k: number, d: number, dt: number) => {
    const a = (target - x.p) * k - x.v * d;
    x.v += a * dt;
    x.p += x.v * dt;
  };
  const yaw = { p: 0, v: 0 };
  const pitch = { p: 0, v: 0 };
  const hover = { p: 1, v: 0 };
  const hopY = { p: 0, v: 0 };
  let hopSpin = 0;
  let hopT = -1;
  let dragYaw = 0;
  let dragVel = 0;
  let dragging = false;
  let lastDrag = 0;
  let pointer = { x: 0, y: 0, inside: false };
  let entered = 0;
  let t = 0;
  let needs = true;

  const wantFollow = () => !reduced && (o.react === "follow" || o.react === "both");
  const wantDrag = () => o.react === "drag" || o.react === "both";

  const onMove = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    pointer.x = clamp((e.clientX - cx) / Math.max(320, win.innerWidth / 2), -1, 1);
    pointer.y = clamp((e.clientY - cy) / Math.max(320, win.innerHeight / 2), -1, 1);
    pointer.inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    wake();
  };
  let downX = 0;
  let downY = 0;
  let lastX = 0;
  let moved = 0;
  const onDown = (e: PointerEvent) => {
    if (o.react === "none") return;
    downX = lastX = e.clientX;
    downY = e.clientY;
    moved = 0;
    dragging = wantDrag();
    lastDrag = performance.now();
    wake();
  };
  const onDrag = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    moved = Math.max(moved, Math.abs(e.clientX - downX), Math.abs(e.clientY - downY));
    if (moved > 6 && Math.abs(e.clientX - downX) > Math.abs(e.clientY - downY)) {
      if (e.cancelable) e.preventDefault();
      canvas.setPointerCapture?.(e.pointerId);
    }
    const now = performance.now();
    const step = (dx / Math.max(200, size.w)) * Math.PI * 1.6;
    dragYaw += step;
    dragVel = step / Math.max(1, now - lastDrag) * 16;
    lastDrag = now;
    wake();
  };
  const onUp = (e: PointerEvent) => {
    if (o.react === "none") return;
    const wasTap = moved < 6 && Math.abs(e.clientY - downY) < 6;
    dragging = false;
    canvas.releasePointerCapture?.(e.pointerId);
    if (wasTap) view.hop();
  };
  win.addEventListener("pointermove", onMove, { passive: true });
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onDrag);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", () => (dragging = false));
  canvas.addEventListener("pointerenter", () => (pointer.inside = true));
  canvas.addEventListener("pointerleave", () => (pointer.inside = false));
  const setInteractive = () => {
    canvas.style.pointerEvents = o.react === "none" || film() ? "none" : "auto";
    canvas.style.cursor = o.react === "none" ? "default" : wantDrag() ? "grab" : "pointer";
  };
  setInteractive();

  // ------------------------------------------------------------ the loop

  let visible = true;
  let raf = 0;
  // Seconds since the last frame (three's Clock is deprecated; this is all the loop needs).
  let last = performance.now();
  const delta = () => {
    const now = performance.now();
    const d = (now - last) / 1000;
    last = now;
    return d;
  };
  let slow = 0;
  let frames = 0;

  const scrollProgress = () => {
    const r = host.getBoundingClientRect();
    // 0 while it sits in view, rising to 1 as it scrolls up and away.
    return clamp(-r.top / Math.max(1, r.height), 0, 1);
  };

  /**
   * The film's camera: the director says where on the screen the model goes and from how high
   * the camera looks; the camera moves back until the model, as seen from there, fills that box,
   * and the lens shifts so the box sits where the director wants it.
   */
  let canvasAlpha = -1;
  let clearedHidden = false;
  let view3 = new Float32Array(0);
  const filmFrame = (director: FilmDirector, dt: number, s: number) => {
    const flat = dims.y < Math.max(dims.x, dims.z) * 0.62;
    // Side on for a flat model whose long side is front to back (nose left, for models made the
    // usual way), from the front for a tall one.
    const base = flat && dims.x < dims.z ? -90 : 0;
    const sh = director.shot(dt, { flat, reduced, turn: o.turn ?? 0, base });
    const W = size.w;
    const H = size.h;
    // Turn: the shot's turn, and for the view from above the turn that runs its long side up.
    let total = base + sh.yaw;
    if (sh.align > 0.001) {
      const base = dims.x >= dims.z ? 90 : 0;
      const k = Math.round((total - base) / 180);
      total = total + (base + k * 180 - total) * sh.align;
    }
    root.rotation.y = total * DEG;
    const yawR = root.rotation.y + turnG.rotation.y;
    const elev = clamp(sh.elev, -12, 86) * DEG;
    const vt = Math.tan((camera.fov * DEG) / 2);
    const ht = vt * camera.aspect;
    const bw = Math.max(40, sh.w);
    const bh = Math.max(40, sh.h);
    const tall = dims.y * s;
    // Where the camera looks: a little above the middle, and lower the more it looks down.
    const tc = (tall / 2) * (1 - Math.sin(elev) * 0.6);
    const cyW = root.position.y + tc;
    let dist: number;
    let tx = sh.cx;
    let ty = sh.cy;
    if (outline) {
      // The model's outline as the camera sees it: sideways, up and how far toward the lens.
      const n = outline.length / 3;
      if (view3.length < n * 3) view3 = new Float32Array(n * 3);
      const ce = Math.cos(elev);
      const se = Math.sin(elev);
      const cr = Math.cos(yawR);
      const sr = Math.sin(yawR);
      let near = 0;
      let wx0 = Infinity;
      let wx1 = -Infinity;
      let wy0 = Infinity;
      let wy1 = -Infinity;
      for (let i = 0; i < n; i++) {
        const x = outline[i * 3] * s;
        const y = outline[i * 3 + 1] * s - tc;
        const z = outline[i * 3 + 2] * s;
        const sx = x * cr + z * sr;
        const sz = -x * sr + z * cr;
        const py = y * ce - sz * se;
        const pd = y * se + sz * ce;
        view3[i * 3] = sx;
        view3[i * 3 + 1] = py;
        view3[i * 3 + 2] = pd;
        if (sx < wx0) wx0 = sx;
        if (sx > wx1) wx1 = sx;
        if (py < wy0) wy0 = py;
        if (py > wy1) wy1 = py;
        if (pd > near) near = pd;
      }
      const halfBoxW = bw / W;
      const halfBoxH = bh / H;
      // A first guess from the flat outline, then the lens's real perspective, three times over.
      dist = Math.max((wx1 - wx0) / 2 / (ht * halfBoxW), (wy1 - wy0) / 2 / (vt * halfBoxH)) + near;
      let nx0 = 0;
      let nx1 = 0;
      let ny0 = 0;
      let ny1 = 0;
      for (let pass = 0; pass < 4; pass++) {
        nx0 = ny0 = Infinity;
        nx1 = ny1 = -Infinity;
        for (let i = 0; i < n; i++) {
          const z = Math.max(0.05, dist - view3[i * 3 + 2]);
          const X = view3[i * 3] / (z * ht);
          const Y = view3[i * 3 + 1] / (z * vt);
          if (X < nx0) nx0 = X;
          if (X > nx1) nx1 = X;
          if (Y < ny0) ny0 = Y;
          if (Y > ny1) ny1 = Y;
        }
        if (pass === 3) break;
        const f = Math.max((nx1 - nx0) / 2 / halfBoxW, (ny1 - ny0) / 2 / halfBoxH);
        const d0 = near * 0.6;
        dist = d0 + (dist - d0) * f * 1.012;
      }
      // The outline's middle goes to the box's middle.
      tx = sh.cx - ((nx0 + nx1) / 2) * (W / 2);
      ty = sh.cy + ((ny0 + ny1) / 2) * (H / 2);
    } else {
      const cy = Math.abs(Math.cos(yawR));
      const sy = Math.abs(Math.sin(yawR));
      const across = (cy * dims.x + sy * dims.z) * s;
      const deep = (sy * dims.x + cy * dims.z) * s;
      const halfW = across / 2;
      const halfH = (tall * Math.cos(elev) + deep * Math.sin(elev)) / 2;
      const depth = (deep * Math.cos(elev) + tall * Math.sin(elev)) / 2;
      dist = Math.max(halfW / (ht * (bw / W)), halfH / (vt * (bh / H))) * 1.06 + depth;
    }
    camera.position.set(0, cyW + Math.sin(elev) * dist, Math.cos(elev) * dist);
    camera.lookAt(0, cyW, 0);
    camera.setViewOffset(W, H, -(tx - W / 2), -(ty - H / 2), W, H);
    // The set, level under the model.
    // It hovers: the model rises while the floor, ring and dust stay on the ground, and its soft shadow goes down with them.
    const lifted = clamp(sh.lift ?? 0, 0, 1) * dims.y * s;
    set.position.set(0, root.position.y - lifted, 0);
    set.scale.setScalar(s);
    shadow.position.y = 0.002 - lifted / Math.max(0.01, s);
    const foot = Math.max(dims.x, dims.z);
    if (ring) {
      ring.scale.set(foot * 1.35, foot * 1.35, 1);
      (ring.material as MeshBasicMaterial).opacity = clamp(sh.ring, 0, 1) * 0.85;
      ring.visible = sh.ring > 0.01;
    }
    if (pulse) {
      const k = clamp(sh.pulse ?? 1, 0, 1);
      const a = Math.sin(Math.min(1, k * 5) * Math.PI / 2) * (1 - k);
      pulse.visible = k > 0.001 && k < 0.999 && a > 0.01;
      if (pulse.visible) {
        pulse.scale.set(foot * (1.15 + 1.6 * k), foot * (1.15 + 1.6 * k), 1);
        (pulse.material as MeshBasicMaterial).opacity = a * 0.9;
      }
    }
    if (pools.length) {
      const g = clamp(sh.glow ?? 0, 0, 1);
      glowG.visible = g > 0.01;
      if (glowG.visible) {
        glowG.position.set(0, root.position.y, 0);
        glowG.rotation.y = root.rotation.y;
        glowG.scale.setScalar(s);
        const alongX = dims.x >= dims.z;
        const len = alongX ? dims.x : dims.z;
        const two = flat;
        pools.forEach((m, i) => {
          m.visible = two || i === 0;
          const off = two ? (i === 0 ? -1 : 1) * len * 0.29 : 0;
          m.position.set(alongX ? off : 0, two ? -0.045 : 0.03, alongX ? 0 : off);
          // A wide, low blob under each wheel of a flat model; one under the feet of a tall one.
          if (two) m.scale.set(len * 0.32, len * 0.11, 1);
          else m.scale.set(foot * 1.5, foot * 0.62, 1);
          m.material.opacity = g * (two ? 0.85 : 0.6);
        });
      }
    }
    if (floor) {
      floor.visible = sh.floor > 0.01;
      (floor.material as unknown as { uniforms: { strength: { value: number } } }).uniforms.strength.value = clamp(sh.floor, 0, 1) * 0.34;
    }
    if (dust) {
      (dust.material as PointsMaterial).opacity = clamp(sh.dust, 0, 1) * 0.95;
      dust.visible = sh.dust > 0.01;
      if (!reduced) {
        dust.rotation.y = t * 0.035;
        dust.position.y = Math.sin(t * 0.3) * 0.05;
      }
    }
    const a = Math.round(clamp(sh.presence, 0, 1) * 100) / 100;
    if (a !== canvasAlpha) {
      canvasAlpha = a;
      canvas.style.opacity = String(a);
    }
  };

  const drawNow = () => {
    if (gone) return;
    const dt = Math.min(0.05, delta());
    const speed = clamp(o.speed ?? 1, 0.2, 2);
    if (!reduced) t += dt * speed;
    const sp = o.scroll === "none" || reduced ? 0 : scrollProgress();

    // Interaction targets.
    const fy = wantFollow() ? pointer.x * 0.42 : 0;
    const fp = wantFollow() ? pointer.y * 0.14 : 0;
    spring(yaw, fy, 26, 9, dt);
    spring(pitch, fp, 26, 9, dt);
    spring(hover, pointer.inside && o.react !== "none" && !reduced ? 1.035 : 1, 140, 16, dt);
    if (!dragging) {
      dragYaw += dragVel;
      dragVel *= 0.92;
      // Let go for a moment and it turns back to its resting pose.
      if (performance.now() - lastDrag > 1600) dragYaw *= 0.94;
    }
    // A tap: a hop with a full turn.
    if (hopT >= 0) {
      hopT += dt;
      const k = clamp(hopT / 0.9, 0, 1);
      hopSpin = (1 - (1 - k) ** 3) * Math.PI * 2;
      if (k >= 1) (hopT = -1), (hopSpin = 0);
    }
    spring(hopY, 0, 90, 9, dt);

    // Entrance: rises and grows in, with a little overshoot.
    if (entered < 1) entered = Math.min(1, entered + dt / 1.1);
    const e = entered >= 1 ? 1 : 1 - Math.pow(2, -10 * entered) * Math.cos(entered * Math.PI * 1.6);

    // Idle motion.
    let bob = 0;
    let idleYaw = 0;
    let idleRoll = 0;
    if (!reduced) {
      if (o.motion === "float") (bob = Math.sin(t * 1.25) * 0.045), (idleYaw = Math.sin(t * 0.45) * 0.14), (idleRoll = Math.sin(t * 0.9) * 0.02);
      if (o.motion === "sway") (idleYaw = Math.sin(t * 0.7) * 0.35), (bob = Math.sin(t * 1.4) * 0.015);
      if (o.motion === "spin") idleYaw = t * 0.55;
    }
    mixer?.update(reduced ? 0 : dt * speed);

    const scrollTurn = o.scroll === "turn" || (o.scroll === "film" && !film()) ? sp * Math.PI * 0.75 : 0;
    const rise = o.scroll === "rise" ? sp * 0.7 : 0;
    const zoom = o.scroll === "zoom" ? 1 - sp * 0.28 : 1;
    const sc = clamp(o.scale ?? 1, 0.4, 1.8);

    root.rotation.set(clamp(o.tilt ?? 0, -40, 40) * DEG + pitch.p, (o.turn ?? 0) * DEG, 0);
    turnG.rotation.set(0, yaw.p + dragYaw + scrollTurn + hopSpin, 0);
    idleG.rotation.set(0, idleYaw, idleRoll);
    idleG.position.y = bob + hopY.p + (1 - e) * -0.35;
    const s = sc * hover.p * (0.86 + 0.14 * e) * (o.scroll === "rise" ? 1 - sp * 0.18 : 1);
    root.scale.setScalar(s);
    root.position.y = (o.lift ?? 0) * 0.9 + rise;

    const director = film();
    if (director) {
      filmFrame(director, dt, s);
      // Stepped out of the way: nothing to draw (the canvas is hidden), so skip the GPU work.
      if (canvasAlpha <= 0) {
        if (!clearedHidden) gl.clear(), (clearedHidden = true);
        needs = false;
        return;
      }
      clearedHidden = false;
    } else {
      const dist = fitDistance() * zoom;
      camera.position.set(0, fitSphere.center.y * s + root.position.y + dist * 0.08, dist);
      camera.lookAt(0, fitSphere.center.y * s + root.position.y, 0);
    }
    gl.render(scene, camera);
    needs = false;

    // Slow device: draw fewer pixels.
    if (o.quality === "auto" && !reduced) {
      frames++;
      if (dt > 0.026) slow++;
      if (frames >= 90) {
        if (slow > 45 && dpr > 1) {
          dpr = Math.max(1, dpr - 0.5);
          resize();
        }
        frames = slow = 0;
      }
    }
  };

  const animating = () => !reduced && (o.motion !== "still" || !!mixer || hopT >= 0 || dragging || Math.abs(dragVel) > 1e-4 || Math.abs(dragYaw) > 1e-3 || entered < 1 || o.scroll !== "none" || wantFollow());
  const loop = () => {
    raf = 0;
    if (gone || !visible || doc.hidden) return;
    if (model && (needs || animating())) drawNow();
    if (animating()) raf = win.requestAnimationFrame(loop);
  };
  const wake = () => {
    if (!raf && visible && !gone) {
      delta();
      raf = win.requestAnimationFrame(loop);
    }
  };

  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => (resize(), wake(), !animating() && model && drawNow())) : null;
  ro?.observe(host);
  const io =
    typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((es) => {
          visible = film() ? true : (es[es.length - 1]?.isIntersecting ?? true);
          if (visible) wake();
        }, { rootMargin: "120px" })
      : null;
  io?.observe(host);
  const onVis = () => !doc.hidden && wake();
  doc.addEventListener("visibilitychange", onVis);
  const onScroll = () => wake();
  win.addEventListener("scroll", onScroll, { passive: true });
  const onReduced = () => {
    reduced = !!reducedQuery?.matches;
    wake();
  };
  reducedQuery?.addEventListener?.("change", onReduced);

  if (film()) {
    // A darker studio with stronger highlights, so glossy models read as expensive.
    scene.environmentIntensity = 0.62;
    key.intensity = 2.6;
    key.position.set(1.2, 4.2, 2.4);
    rim.intensity = 3.2;
    fill.intensity = 0.3;
    gl.toneMappingExposure = 1.12;
  }
  resize();
  light();
  load();
  wake();

  const view: CharacterView = {
    ready,
    update(next) {
      const before = o;
      o = { ...o, ...next };
      if (before.poster !== o.poster) setPoster();
      if (before.name !== o.name) poster.alt = o.name ? `${o.name}, in 3D` : "";
      light();
      setInteractive();
      if (before.src !== o.src) load();
      else {
        if (before.clip !== o.clip) playClip();
        if (before.finish !== o.finish || before.paint !== o.paint || before.parts !== o.parts || before.screen !== o.screen || String(before.stops) !== String(o.stops)) finish();
      }
      if (before.quality !== o.quality) (dpr = Math.min(win.devicePixelRatio || 1, o.quality === "low" ? 1 : 2)), resize();
      needs = true;
      wake();
      if (model && !failed && !animating()) drawNow();
    },
    hop() {
      if (reduced || !model) return;
      hopT = 0;
      hopY.v = 2.4;
      wake();
    },
    snapshot(type = "image/webp") {
      if (!model) return "";
      drawNow();
      try {
        return canvas.toDataURL(type, 0.9);
      } catch {
        return "";
      }
    },
    dispose() {
      gone = true;
      if (raf) win.cancelAnimationFrame(raf);
      ro?.disconnect();
      io?.disconnect();
      doc.removeEventListener("visibilitychange", onVis);
      win.removeEventListener("scroll", onScroll);
      win.removeEventListener("pointermove", onMove);
      reducedQuery?.removeEventListener?.("change", onReduced);
      setModel(null);
      disposeSet();
      shadow.geometry.dispose();
      (shadow.material as Material).dispose();
      shadowTex.dispose();
      env.dispose();
      gl.dispose();
      canvas.remove();
      poster.remove();
      host.classList.remove("xp-char", "xp-char--loading", "xp-char--failed", "xp-char--still");
    },
  };
  return view;
}
