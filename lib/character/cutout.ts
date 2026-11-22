// The subject of a photo, cut out on this device by MediaPipe's MagicTouch model (Apache-2.0,
// public/models/NOTICE.md). It is told where the subject is (a little below the middle by default,
// or wherever the person taps) and answers how sure it is, pixel by pixel. It handles people,
// products, pets and mascots on busy backgrounds, which colour rules alone cannot.
//
// The runtime (15 MB, public/vendor/mediapipe) and the model (6 MB, public/models) load on first
// use and stay cached by the browser. Nothing is uploaded. When either cannot load, the caller
// falls back to the colour-and-edge cut in relief.ts.

import type { InteractiveSegmenterLegacy } from "@mediapipe/tasks-vision";

const RUNTIME = "/vendor/mediapipe";
const MODEL = "/models/magic-touch.tflite";

export interface Point {
  /** 0 to 1 across the picture. */
  x: number;
  /** 0 to 1 down the picture. */
  y: number;
}

/** Where the subject usually is: the middle, a little low (faces and products sit there). */
export const MIDDLE: Point = { x: 0.5, y: 0.55 };

export interface Cutout {
  width: number;
  height: number;
  /** 0 to 255 per pixel: how sure the model is that the pixel belongs to the subject. */
  alpha: Uint8Array;
}

let loading: Promise<InteractiveSegmenterLegacy | null> | null = null;

function segmenter(): Promise<InteractiveSegmenterLegacy | null> {
  if (!loading) {
    loading = (async () => {
      try {
        const { FilesetResolver, InteractiveSegmenterLegacy } = await import("@mediapipe/tasks-vision");
        const files = await FilesetResolver.forVisionTasks(RUNTIME);
        return await InteractiveSegmenterLegacy.createFromOptions(files, {
          baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },
          outputCategoryMask: false,
          outputConfidenceMasks: true,
        });
      } catch {
        loading = null; // try again next time (a dropped connection, say)
        return null;
      }
    })();
  }
  return loading;
}

/** Starts loading the model early (when a photo step opens), so the first cut is quick. */
export function warmCutout(): void {
  if (typeof window !== "undefined") void segmenter();
}

/** The subject at `point` in the canvas, or null when the model is not available here. */
export async function cutout(canvas: HTMLCanvasElement, point: Point = MIDDLE): Promise<Cutout | null> {
  const seg = await segmenter();
  if (!seg) return null;
  try {
    let out: Cutout | null = null;
    const keypoint = { x: Math.min(0.99, Math.max(0.01, point.x)), y: Math.min(0.99, Math.max(0.01, point.y)) };
    seg.segment(canvas, { keypoint }, (r) => {
      const m = r.confidenceMasks?.[0];
      if (!m) return;
      const f = m.getAsFloat32Array();
      const alpha = new Uint8Array(f.length);
      for (let i = 0; i < f.length; i++) alpha[i] = Math.round(Math.min(1, Math.max(0, f[i])) * 255);
      out = { width: m.width, height: m.height, alpha };
    });
    return out;
  } catch {
    return null;
  }
}
