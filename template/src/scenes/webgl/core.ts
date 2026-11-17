import { Color, PerspectiveCamera, Scene, SRGBColorSpace, ACESFilmicToneMapping, WebGLRenderer, PMREMGenerator, type Texture } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Frame, Palette } from "../frame";
import type { Params, StageEngine3D } from "../../experiences/types";

// The 3D layer (PRD sections 17, 18 and 37): three.js only, loaded on demand after the page
// is usable, and only where the intensity, the device and the visitor allow it. Each engine
// gets the same frame as the 2D engines, so scroll, cursor and taps drive it the same way.

export interface Init3D {
  params: Params;
  pal: Palette;
  labels: string[];
  mobile: boolean;
}

export interface View3D {
  frame(f: Frame): void;
  resize(w: number, h: number, dpr: number): void;
  dispose(): void;
}

export type Mount3D = (canvas: HTMLCanvasElement, engine: StageEngine3D, init: Init3D) => View3D | null;

export interface Kit {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  env: Texture | null;
  w: number;
  h: number;
}

export function makeKit(canvas: HTMLCanvasElement, opts: { env?: boolean; fov?: number; mobile: boolean }): Kit | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: !opts.mobile, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(opts.fov ?? 35, 1, 0.1, 200);
  camera.position.set(0, 0, 8);
  let env: Texture | null = null;
  if (opts.env) {
    const pm = new PMREMGenerator(renderer);
    env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    scene.environment = env;
  }
  return { renderer, scene, camera, env, w: 1, h: 1 };
}

export function resizeKit(k: Kit, w: number, h: number, dpr: number) {
  k.w = w;
  k.h = h;
  k.renderer.setPixelRatio(dpr);
  k.renderer.setSize(w, h, false);
  k.camera.aspect = w / Math.max(1, h);
  k.camera.updateProjectionMatrix();
}

/** World units visible at the origin plane. */
export function visible(k: Kit) {
  const d = k.camera.position.length();
  const vh = 2 * Math.tan((k.camera.fov * Math.PI) / 360) * d;
  return { vw: vh * k.camera.aspect, vh };
}

/** Where the anchor object sits, in world units: beside the words, or above them on phones (as anchorBox in 2D). */
export function anchor3(k: Kit, f: Frame) {
  const { vw, vh } = visible(k);
  const sx = f.mobile ? 0.5 : Math.min(0.74, Math.max(0.26, f.side));
  const x = (sx - 0.5) * vw;
  const y = f.mobile ? vh * 0.2 : vh * (-0.02 + (1 - f.presence) * 0.06);
  const size = (Math.min(f.w, f.h) * (f.mobile ? 0.5 : 0.62) * (0.75 + 0.25 * f.presence)) / f.h;
  return { x, y, s: size * vh };
}

export const col = (hex: string) => new Color(hex);

export function disposeKit(k: Kit) {
  k.scene.traverse((o: any) => {
    o.geometry?.dispose?.();
    const m = o.material;
    if (Array.isArray(m)) m.forEach((x) => x.dispose());
    else if (m) {
      for (const v of Object.values(m)) if (v && typeof (v as Texture).dispose === "function" && (v as Texture).isTexture) (v as Texture).dispose();
      m.dispose?.();
    }
  });
  k.env?.dispose();
  k.renderer.dispose();
  k.renderer.forceContextLoss();
}
