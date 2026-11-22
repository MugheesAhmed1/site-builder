// Photo to 3D in the browser (docs/CHARACTER-JOURNEY.md). Two ways, best first:
//   sculpt  the img2threejs method: Gemini reads the photo into a part tree (/api/sculpt), the
//           model is built here, rendered, compared with the photo and corrected, then packed.
//   relief  no AI: the subject is cut from its background and inflated into a solid.
// Either way the result is a GLB (as a data: address), its still, and its colours. The cut-out
// comes first (findSubject): the MagicTouch model on this device, or colours and edges without it.
import { paletteFromPixels, type CharacterPalette } from "./palette";
import { hasCutout, maskedPixels, maskFromAlpha, maskShare, reliefMesh, subjectMask, type PixelImage, type ReliefStyle } from "./relief";
import { cutout, MIDDLE, type Point } from "./cutout";
import type { SculptSpec } from "./sculpt";

export interface PhotoModel {
  src: string;
  poster: string;
  name: string;
  palette: CharacterPalette | null;
  method: "sculpt" | "relief";
  spec?: SculptSpec;
  /** Why the sculptor was not used, when it was not. */
  note?: string;
}

export interface Picture {
  /** The picture, at most `max` pixels on its longest side. */
  canvas: HTMLCanvasElement;
  pixels: PixelImage;
  /** A copy to send to the sculptor (JPEG, or PNG when it has transparency). */
  dataUrl: string;
}

/** Reads a picture file (or address) into a canvas no bigger than `max`. */
export async function loadPicture(file: File | Blob | string, max = 768): Promise<Picture> {
  const url = typeof file === "string" ? file : URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.crossOrigin = "anonymous";
    await new Promise<void>((ok, fail) => {
      img.onload = () => ok();
      img.onerror = () => fail(new Error("That picture could not be opened."));
      img.src = url;
    });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight, 1));
    const w = Math.max(8, Math.round(img.naturalWidth * k)), h = Math.max(8, Math.round(img.naturalHeight * k));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    let clear = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] < 128) clear++;
    const dataUrl = clear > w * h * 0.04 ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.88);
    return { canvas, pixels: { width: w, height: h, data }, dataUrl };
  } finally {
    if (typeof file !== "string") URL.revokeObjectURL(url);
  }
}

/** The colours of a still (a transparent PNG of the model). */
export async function paletteOfStill(url: string): Promise<CharacterPalette | null> {
  try {
    const p = await loadPicture(url, 128);
    return paletteFromPixels(p.pixels.data);
  } catch {
    return null;
  }
}

const nameOf = (s: string) => (s ? s.replace(/\b[a-z]/, (c) => c.toUpperCase()) : "My character");

export interface SubjectCut {
  /** The working copy (384 px) the mask belongs to. */
  small: Picture;
  /** 1 for the subject, 0 for the background, per pixel of `small`. */
  mask: Uint8Array;
  /** How it was cut: the picture's own transparency, the model, or colours and edges. */
  method: "own" | "model" | "colour";
  /** The picture with the background faded to a checkerboard, for showing the cut. */
  preview: string;
  /** The subject alone on white (for the sculptor), at the picture's full size. */
  subject: string;
  point: Point;
}

const smalls = new WeakMap<Picture, Promise<Picture>>();
const smallOf = (pic: Picture) => {
  if (!smalls.has(pic)) smalls.set(pic, loadPicture(pic.canvas.toDataURL("image/png"), 384));
  return smalls.get(pic)!;
};

/**
 * Finds the subject: the picture's own transparency when it has one, else the MagicTouch model at
 * `point` (the middle by default; pass where the person tapped), else colours and edges.
 */
export async function findSubject(pic: Picture, point: Point = MIDDLE): Promise<SubjectCut> {
  const small = await smallOf(pic);
  const { width: w, height: h } = small.pixels;
  let mask: Uint8Array | null = null;
  let method: SubjectCut["method"] = "colour";
  if (hasCutout(small.pixels)) {
    mask = subjectMask(small.pixels);
    method = "own";
  } else {
    const cut = await cutout(small.canvas, point);
    if (cut && cut.width === w && cut.height === h) {
      const m = maskFromAlpha(cut.alpha, w, h);
      const k = maskShare(m);
      if (k > 0.01 && k < 0.97) (mask = m), (method = "model");
    }
  }
  if (!mask) mask = subjectMask(small.pixels);
  return { small, mask, method, point, preview: paintCut(small, mask, "checker"), subject: paintSubject(pic, small, mask) };
}

/** The small picture with the background faded into a checkerboard. */
function paintCut(small: Picture, mask: Uint8Array, bg: "checker"): string {
  const { width: w, height: h, data } = small.pixels;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, o = i * 4;
    if (mask[i]) {
      img.data[o] = data[o];
      img.data[o + 1] = data[o + 1];
      img.data[o + 2] = data[o + 2];
    } else {
      const t = bg === "checker" && ((x >> 3) + (y >> 3)) % 2 ? 236 : 250;
      img.data[o] = data[o] * 0.18 + t * 0.82;
      img.data[o + 1] = data[o + 1] * 0.18 + t * 0.82;
      img.data[o + 2] = data[o + 2] * 0.18 + t * 0.82;
    }
    img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL("image/jpeg", 0.86);
}

/** The subject alone on white at the full picture's size (the mask scaled up). */
function paintSubject(pic: Picture, small: Picture, mask: Uint8Array): string {
  const W = pic.canvas.width, H = pic.canvas.height;
  const sw = small.pixels.width, sh = small.pixels.height;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(W, H);
  const src = pic.pixels.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4;
    const k = mask[Math.min(sh - 1, Math.floor((y * sh) / H)) * sw + Math.min(sw - 1, Math.floor((x * sw) / W))];
    img.data[o] = k ? src[o] : 255;
    img.data[o + 1] = k ? src[o + 1] : 255;
    img.data[o + 2] = k ? src[o + 2] : 255;
    img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL("image/jpeg", 0.88);
}

/** The relief: no network, a second or two. */
export async function reliefFromPicture(pic: Picture, style: ReliefStyle = "puffy", name = "", cut?: SubjectCut): Promise<PhotoModel> {
  const { buildRelief, exportGlb, glbDataUrl, renderStill } = await import("./model3d");
  // The mask and mesh work on a smaller copy; the texture keeps the full picture.
  const { small, mask } = cut ?? (await findSubject(pic));
  const mesh = reliefMesh(small.pixels, { style, mask });
  if (!mesh) throw new Error("No clear subject was found in that picture. Try one where it stands out from a plain background, or a PNG with the background removed.");
  // The mesh's UVs span the whole picture, so the sharper full-size copy maps onto it the same way.
  const root = buildRelief(mesh, pic.canvas);
  const glb = await exportGlb(root);
  const poster = renderStill(root, { turn: -16 });
  return { src: glbDataUrl(glb), poster, name: nameOf(name), palette: paletteFromPixels(maskedPixels(small.pixels, mask)), method: "relief" };
}

async function post(body: unknown): Promise<{ ok: boolean; spec?: SculptSpec; error?: string; note?: string }> {
  const r = await fetch("/api/sculpt", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  try {
    return await r.json();
  } catch {
    return { ok: false, error: "The sculptor did not answer." };
  }
}

/**
 * The img2threejs way: read, build, render, review and correct (`rounds` reviews), then pack.
 * Throws with the sculptor's reason when it cannot run, so the caller can make a relief instead.
 */
export async function sculptFromPicture(pic: Picture, opts: { hint?: string; rounds?: number; cut?: SubjectCut; onStep?: (what: string, spec?: SculptSpec) => void } = {}): Promise<PhotoModel> {
  const { buildSculpt, exportGlb, glbDataUrl, renderStill } = await import("./model3d");
  opts.onStep?.("Reading the picture");
  // The subject alone reads better than the subject in a busy room.
  const image = opts.cut && opts.cut.method !== "colour" ? opts.cut.subject : pic.dataUrl;
  const first = await post({ step: "spec", image, hint: opts.hint });
  if (!first.ok || !first.spec) throw Object.assign(new Error(first.error || "The sculptor could not read that picture."), { note: first.note });
  let spec = first.spec;
  for (let round = 0; round < (opts.rounds ?? 2); round++) {
    opts.onStep?.(round === 0 ? "Building it from shapes" : "Comparing it with the picture again", spec);
    const { root } = buildSculpt(spec);
    const render = renderStill(root, { size: 512, background: "#e8e8ee" }).replace("image/png", "image/png");
    opts.onStep?.("Comparing it with the picture", spec);
    const next = await post({ step: "review", image, render, spec, hint: opts.hint });
    if (!next.ok || !next.spec) break;
    spec = next.spec;
  }
  opts.onStep?.("Packing the model", spec);
  const { root, clips } = buildSculpt(spec);
  const glb = await exportGlb(root, clips);
  const poster = renderStill(root, { turn: -18 });
  return { src: glbDataUrl(glb), poster, name: nameOf(opts.hint || spec.subject), palette: await paletteOfStill(poster), method: "sculpt", spec };
}

/** Is the AI sculptor set up on this server? */
export async function sculptorReady(): Promise<boolean> {
  try {
    const r = await fetch("/api/sculpt", { cache: "no-store" });
    return !!(await r.json()).enabled;
  } catch {
    return false;
  }
}
