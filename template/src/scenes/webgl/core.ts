import { createRoot, useFrame, useThree } from "@react-three/fiber";
import { createElement, useEffect, useMemo } from "react";
import { Color, PerspectiveCamera, PMREMGenerator, Scene, setConsoleFunction, WebGLRenderer, type Texture } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Frame, Palette } from "../frame";
import type { AssetDirection, ExperienceAsset, Params, StageEngine3D } from "../../experiences/types";

// The 3D layer (PRD sections 17, 18 and 37): three.js through React Three Fiber, loaded on demand after the page
// is usable, and only where the intensity, the device and the visitor allow it. Each engine
// gets the same frame as the 2D engines, so scroll, cursor and taps drive it the same way.

export interface Init3D {
  params: Params;
  pal: Palette;
  labels: string[];
  mobile: boolean;
  /** The resolved assets and their direction, for the asset stage (asset3d). */
  assets?: ExperienceAsset[];
  direction?: AssetDirection;
}

export interface View3D {
  frame(f: Frame): void;
  resize(w: number, h: number, dpr: number): void;
  dispose(): void;
  /** Engines that load files say when they are ready; until then the 2D stage stays on screen. */
  ready?(): boolean;
  /** A load that failed (a missing file): the stage drops back to 2D. */
  failed?(): boolean;
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

export interface KitOptions {
  env?: boolean;
  fov?: number;
}

/** What an engine builds into the scene once: it gets a frame each tick and renders itself. */
export interface Built {
  frame(f: Frame): void;
  dispose?(): void;
}

export type Build = (k: Kit, init: Init3D) => Built;

/**
 * Mounts an engine with React Three Fiber. R3F owns the renderer, the canvas size, the pixel
 * ratio and the camera; the stage keeps the one loop for the whole page and advances R3F from
 * it (frameloop "never"), so 2D and 3D share pacing and the slow-frame fallback. The engine
 * registers a useFrame callback with a priority, so it renders the scene itself.
 */
// A finished site must keep a clean console. React Three Fiber still creates a THREE.Clock,
// which three now flags as deprecated; that one notice is dropped and everything else passes through.
setConsoleFunction((type: string, message: string, ...rest: unknown[]) => {
  if (typeof message === "string" && message.includes("THREE.Clock")) return;
  const c = console as unknown as Record<string, (...a: unknown[]) => void>;
  (c[type] ?? console.log)(message, ...rest);
});

export function host(o: KitOptions, build: Build): (canvas: HTMLCanvasElement, init: Init3D) => View3D | null {
  return (canvas, init) => {
    const root = createRoot(canvas);
    let advance: ((t: number) => void) | null = null;
    let latest: Frame | null = null;
    let gone = false;
    function Engine() {
      const state = useThree();
      const kit = useMemo(() => kitOf(state.gl, state.scene, state.camera as PerspectiveCamera, o), []); // eslint-disable-line react-hooks/exhaustive-deps
      const view = useMemo(() => build(kit, init), [kit]);
      useFrame(() => {
        if (latest) view.frame(latest);
      }, 1);
      useEffect(() => {
        advance = (t) => state.advance(t);
        return () => {
          advance = null;
          view.dispose?.();
          disposeKit(kit);
        };
      }, []); // eslint-disable-line react-hooks/exhaustive-deps
      return null;
    }
    const el = createElement(Engine);
    let size = { width: 1, height: 1, dpr: 1 };
    const show = () =>
      root
        .configure({
          gl: { alpha: true, antialias: !init.mobile, powerPreference: "high-performance" },
          camera: { fov: o.fov ?? 35, near: 0.1, far: 200, position: [0, 0, 8] },
          frameloop: "never",
          flat: false,
          size: { width: size.width, height: size.height, top: 0, left: 0 },
          dpr: size.dpr,
          onCreated: (s) => s.gl.setClearColor(0x000000, 0),
        })
        .then(() => !gone && root.render(el))
        .catch((e) => console.warn("3D stage", e));
    show();
    return {
      frame(f) {
        latest = f;
        advance?.(performance.now());
      },
      resize(w, h, dpr) {
        size = { width: w, height: h, dpr };
        show();
      },
      dispose() {
        gone = true;
        root.unmount();
      },
    };
  };
}

function kitOf(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, o: KitOptions): Kit {
  renderer.setClearColor(0x000000, 0);
  let env: Texture | null = null;
  if (o.env) {
    const pm = new PMREMGenerator(renderer);
    env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    scene.environment = env;
  }
  return { renderer, scene, camera, env, w: 1, h: 1 };
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
}
