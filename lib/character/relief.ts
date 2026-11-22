// Photo to 3D without any service (docs/CHARACTER-JOURNEY.md): the subject of a picture is cut
// from its background and inflated into a solid, like a soft vinyl figure or a thick standee. Runs
// in the browser (and in tests) on plain pixel arrays: no AI, no network, nothing leaves the device.
//
//  1. Mask: a picture with transparency keeps its own cut-out. Photos are cut by the MagicTouch
//     model when it can load (cutout.ts); otherwise here, by colour and edges: a careful flood from
//     the border, then a seeded watershed between background and subject (cutFromBackground). The
//     largest solid shape is the subject (holes filled, a pixel trimmed so no fringe shows).
//  2. Height: each pixel's distance to the edge, shaped into a rounded profile ("puffy" for toys,
//     logos and characters; "standee" for people and products, nearly flat with a soft edge).
//  3. Mesh: a front and a back surface on a grid inside the mask, joined at the silhouette, whose
//     stair steps are smoothed away. The picture is printed on both faces.

export interface PixelImage {
  width: number;
  height: number;
  /** RGBA, row by row. */
  data: Uint8ClampedArray;
}

export type ReliefStyle = "puffy" | "standee";

export interface ReliefMesh {
  /** x, y, z per vertex; the model stands on y = 0 and is about 2 units tall. */
  positions: Float32Array;
  normals?: Float32Array;
  uvs: Float32Array;
  /** Triangles; front faces first, then the back, then the rim. */
  indices: Uint32Array;
  /** Index ranges for the two materials: printed faces and the rim. */
  groups: { start: number; count: number; material: 0 | 1 }[];
  /** How much of the picture the subject covers, 0 to 1. */
  coverage: number;
}

const lin = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

/** OKLab, for colour distances that match the eye. */
function lab(r: number, g: number, b: number): [number, number, number] {
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

/** True when enough of the picture is see-through that it is already cut out. */
export function hasCutout(img: PixelImage): boolean {
  let clear = 0;
  const n = img.width * img.height;
  for (let i = 3; i < img.data.length; i += 4) if (img.data[i] < 128) clear++;
  return clear > n * 0.04;
}

/** The subject's mask: 1 inside, 0 outside. */
export function subjectMask(img: PixelImage): Uint8Array {
  const { width: w, height: h, data } = img;
  const n = w * h;
  let mask: Uint8Array = new Uint8Array(n);
  if (hasCutout(img)) {
    for (let i = 0; i < n; i++) mask[i] = data[i * 4 + 3] >= 128 ? 1 : 0;
  } else {
    mask = cutFromBackground(img);
  }
  return cleanMask(mask, w, h);
}

/** A mask from a cut-out's certainty (0 to 255 per pixel), cleaned like any other. */
export function maskFromAlpha(alpha: Uint8Array, w: number, h: number, threshold = 128): Uint8Array {
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = alpha[i] >= threshold ? 1 : 0;
  return cleanMask(mask, w, h);
}

/** The largest shape, its holes filled, a pixel trimmed so no fringe of background shows. */
export function cleanMask(mask: Uint8Array, w: number, h: number): Uint8Array {
  return erode(fillHoles(largestShape(mask, w, h), w, h), w, h);
}

/** How much of the picture a mask covers, 0 to 1. */
export function maskShare(mask: Uint8Array): number {
  return share(mask);
}

/**
 * The subject of a photo with a background, in two passes.
 *
 *  1. A careful flood from the edges of the picture through background-like colour that stops at
 *     strong edges. The bottom edge only seeds from its corners, because busts and products sit on it.
 *  2. A seeded watershed: the background grows from the same seeds and the subject grows from the
 *     core of pass 1 plus a disc at its centre, both through the weakest edges first, so they meet on
 *     the subject's outline even where it fades (a white cup on a white table, a black top on a dark
 *     wall). Pass 2 is kept unless it ran away into flat background, which a real outline never is.
 */
function cutFromBackground(img: PixelImage): Uint8Array {
  const { width: w, height: h, data } = img;
  const n = w * h;
  // A light blur first, so JPEG noise and fine texture do not read as edges.
  const blur = new Float32Array(n * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, k = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = Math.min(w - 1, Math.max(0, x + dx)), yy = Math.min(h - 1, Math.max(0, y + dy));
      const j = (yy * w + xx) * 4;
      r += data[j];
      g += data[j + 1];
      b += data[j + 2];
      k++;
    }
    const [L0, A0, B0] = lab(r / k, g / k, b / k);
    blur[(y * w + x) * 3] = L0;
    blur[(y * w + x) * 3 + 1] = A0;
    blur[(y * w + x) * 3 + 2] = B0;
  }
  const at = (x: number, y: number, c: number) => blur[(Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))) * 3 + c];
  // Edge strength (Sobel over the three channels, lightness weighted most).
  const edge = new Float32Array(n);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let e = 0;
    for (let c = 0; c < 3; c++) {
      const gx = at(x + 1, y - 1, c) + 2 * at(x + 1, y, c) + at(x + 1, y + 1, c) - at(x - 1, y - 1, c) - 2 * at(x - 1, y, c) - at(x - 1, y + 1, c);
      const gy = at(x - 1, y + 1, c) + 2 * at(x, y + 1, c) + at(x + 1, y + 1, c) - at(x - 1, y - 1, c) - 2 * at(x, y - 1, c) - at(x + 1, y - 1, c);
      e += Math.hypot(gx, gy) * (c === 0 ? 1 : 0.7);
    }
    edge[y * w + x] = e / 8;
  }
  const sorted = Float32Array.from(edge).sort();
  const E = Math.max(0.012, sorted[Math.floor(n * 0.72)]);
  const dist = (i: number, c: number[]) => Math.hypot(blur[i * 3] - c[0], blur[i * 3 + 1] - c[1], blur[i * 3 + 2] - c[2]);
  const near = (i: number, j: number) => Math.hypot(blur[j * 3] - blur[i * 3], blur[j * 3 + 1] - blur[i * 3 + 1], blur[j * 3 + 2] - blur[i * 3 + 2]);
  const median = (ids: number[]) => [0, 1, 2].map((k) => {
    const v = ids.map((i) => blur[i * 3 + k]).sort((p, q) => p - q);
    return v[v.length >> 1];
  });
  const rim: number[] = [];
  for (let x = 0; x < w; x++) rim.push(x);
  for (let y = 1; y < h - 1; y++) rim.push(y * w, y * w + w - 1);
  const bgRef = median(rim);
  const spread = rim.map((i) => dist(i, bgRef)).sort((p, q) => p - q);
  const tol = Math.min(0.14, Math.max(0.035, spread[Math.floor(spread.length * 0.7)] * 1.6 + 0.02));

  // Background seeds: the top and the sides where they look like background, and the bottom row
  // walked in from each corner until something that is not the background stands on it.
  const seeds: number[] = [];
  for (const i of rim) if (dist(i, bgRef) < tol * 2.2 && edge[i] < E * 1.5) seeds.push(i);
  for (const [from, dir] of [[0, 1], [w - 1, -1]] as const) {
    const row = (h - 1) * w;
    if (dist(row + from, bgRef) >= tol * 2.2) continue;
    for (let x = from; x >= 0 && x < w; x += dir) {
      const i = row + x;
      if (edge[i] >= E || near(i, row + from) >= tol * 1.4) break;
      seeds.push(i);
    }
  }

  // Pass 1: the careful flood.
  const bg = new Uint8Array(n);
  const queue = new Int32Array(n);
  let qh = 0, qt = 0;
  for (const i of seeds) if (!bg[i]) (bg[i] = 1), (queue[qt++] = i);
  while (qh < qt) {
    const i = queue[qh++];
    const x = i % w, y = (i / w) | 0;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
      if (j < 0 || bg[j]) continue;
      if (edge[j] >= E) continue; // the outline stops the flood
      if (near(i, j) < tol * 0.45 && dist(j, bgRef) < tol * 3.2) {
        bg[j] = 1;
        queue[qt++] = j;
      }
    }
  }
  let first: Uint8Array = new Uint8Array(n);
  for (let i = 0; i < n; i++) first[i] = bg[i] ? 0 : 1;
  first = largestShape(open(first, w, h), w, h);
  const firstShare = share(first);

  // Pass 2: the seeded watershed. Labels: 1 background, 2 subject.
  const label = new Uint8Array(n);
  for (const i of seeds) label[i] = 1;
  let core: Uint8Array = first;
  for (let k = 0; k < 3; k++) core = erode(core, w, h);
  let cx = 0, cy = 0, cn = 0;
  for (let i = 0; i < n; i++) if (first[i]) (cx += i % w), (cy += (i / w) | 0), cn++;
  if (cn < n * 0.01) (cx = w / 2), (cy = h * 0.55);
  else (cx /= cn), (cy /= cn);
  const r = Math.max(3, Math.min(w, h) * 0.05);
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(h - 1, Math.ceil(cy + r)); y++) for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(w - 1, Math.ceil(cx + r)); x++) {
    const i = y * w + x;
    if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r && label[i] !== 1) label[i] = 2;
  }
  for (let i = 0; i < n; i++) if (core[i] && label[i] !== 1) label[i] = 2;
  // Colour models: a few colours each for the background (the border) and the subject (its core),
  // so a front pays to take a pixel that looks like the other side, not only to cross an edge.
  const sample = (ids: number[], max: number) => (ids.length <= max ? ids : Array.from({ length: max }, (_, k) => ids[Math.floor((k * ids.length) / max)]));
  const bgIds = sample(seeds, 1500);
  const fgIds: number[] = [];
  for (let i = 0; i < n; i++) if (label[i] === 2) fgIds.push(i);
  const bgC = centres(blur, bgIds, 5), fgC = centres(blur, sample(fgIds, 2000), 6);
  const nearest = (i: number, cs: number[][]) => {
    let d = Infinity;
    for (const c of cs) d = Math.min(d, dist(i, c));
    return d;
  };
  // Edge strength in 256 levels (E sits at 64), plus each side's colour penalty.
  const level = new Uint8Array(n), penB = new Uint8Array(n), penF = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    level[i] = Math.min(255, Math.floor((edge[i] / E) * 64));
    if (!fgC.length) continue;
    const db = nearest(i, bgC), df = nearest(i, fgC);
    penB[i] = Math.min(160, Math.max(0, Math.floor(((db - df) / tol) * 48)));
    penF[i] = Math.min(160, Math.max(0, Math.floor(((df - db) / tol) * 48)));
  }
  // Grow both sides together, cheapest step first; a pixel belongs to whichever side reaches it first.
  const cap = n * 5;
  const ePix = new Int32Array(cap), eLab = new Uint8Array(cap), eNext = new Int32Array(cap);
  const head = new Int32Array(256).fill(-1), tail = new Int32Array(256).fill(-1);
  let ec = 0;
  const push = (i: number, l: number, p: number) => {
    if (ec >= cap) return;
    const e = ec++;
    ePix[e] = i;
    eLab[e] = l;
    eNext[e] = -1;
    if (tail[p] < 0) head[p] = e;
    else eNext[tail[p]] = e;
    tail[p] = e;
  };
  const seedLabel = label.slice();
  label.fill(0);
  for (let i = 0; i < n; i++) if (seedLabel[i]) push(i, seedLabel[i], 0);
  for (let p = 0; p < 256; p++) {
    while (head[p] >= 0) {
      const e = head[p];
      head[p] = eNext[e];
      if (head[p] < 0) tail[p] = -1;
      const i = ePix[e];
      if (label[i]) continue;
      const l = eLab[e];
      label[i] = l;
      const pen = l === 1 ? penB : penF;
      const x = i % w, y = (i / w) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (j < 0 || label[j]) continue;
        push(j, l, Math.max(p, Math.min(255, level[j] + pen[j])));
      }
    }
  }
  let second: Uint8Array = new Uint8Array(n);
  for (let i = 0; i < n; i++) second[i] = label[i] === 2 ? 1 : 0;
  second = largestShape(open(second, w, h), w, h);
  const secondShare = share(second);

  // A real outline is mostly strong edges; a watershed that spilled into flat background is not.
  const outline = (m: Uint8Array) => {
    let all = 0, strong = 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!m[i] || (m[i - 1] && m[i + 1] && m[i - w] && m[i + w])) continue;
      all++;
      // the strongest edge right across the boundary
      let e = edge[i];
      for (const j of [i - 1, i + 1, i - w, i + w]) if (edge[j] > e) e = edge[j];
      if (e >= E * 0.8) strong++;
    }
    return all ? strong / all : 0;
  };
  const edge2 = outline(second);
  if (secondShare > 0.015 && secondShare < 0.9 && edge2 > 0.5) return second;
  if (firstShare > 0.015 && firstShare < 0.92) return first;
  // Nothing stands out (a blank picture): no subject rather than a made-up blob.
  return edge2 > 0.5 ? second : new Uint8Array(n);
}

/** A few representative colours of the given pixels (k-means in OKLab). */
function centres(px: Float32Array, ids: number[], k: number): number[][] {
  if (!ids.length) return [];
  let cs = Array.from({ length: Math.min(k, ids.length) }, (_, c) => {
    const i = ids[Math.floor(((c + 0.5) * ids.length) / Math.min(k, ids.length))];
    return [px[i * 3], px[i * 3 + 1], px[i * 3 + 2]];
  });
  for (let round = 0; round < 8; round++) {
    const sum = cs.map(() => [0, 0, 0, 0]);
    for (const i of ids) {
      let best = 0, bd = Infinity;
      for (let c = 0; c < cs.length; c++) {
        const d = (px[i * 3] - cs[c][0]) ** 2 + (px[i * 3 + 1] - cs[c][1]) ** 2 + (px[i * 3 + 2] - cs[c][2]) ** 2;
        if (d < bd) (bd = d), (best = c);
      }
      sum[best][0] += px[i * 3];
      sum[best][1] += px[i * 3 + 1];
      sum[best][2] += px[i * 3 + 2];
      sum[best][3]++;
    }
    cs = sum.filter((t) => t[3] > 0).map((t) => [t[0] / t[3], t[1] / t[3], t[2] / t[3]]);
  }
  return cs;
}

function share(m: Uint8Array): number {
  let k = 0;
  for (let i = 0; i < m.length; i++) k += m[i];
  return k / m.length;
}

/** Erode then dilate: thin leaks and specks go, the shape keeps its size. */
function open(mask: Uint8Array, w: number, h: number): Uint8Array {
  const e = erode(mask, w, h);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    out[i] = e[i] || (x > 0 && e[i - 1]) || (x < w - 1 && e[i + 1]) || (y > 0 && e[i - w]) || (y < h - 1 && e[i + w]) ? 1 : 0;
  }
  return out;
}

function largestShape(mask: Uint8Array, w: number, h: number): Uint8Array<ArrayBufferLike> {
  const label = new Int32Array(w * h).fill(-1);
  const queue = new Int32Array(w * h);
  let best = -1, bestSize = 0, id = 0;
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || label[s] >= 0) continue;
    let qh = 0, qt = 0, size = 0;
    queue[qt++] = s;
    label[s] = id;
    while (qh < qt) {
      const i = queue[qh++];
      size++;
      const x = i % w, y = (i / w) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (j >= 0 && mask[j] && label[j] < 0) (label[j] = id), (queue[qt++] = j);
      }
    }
    if (size > bestSize) (bestSize = size), (best = id);
    id++;
  }
  const out = new Uint8Array(w * h);
  if (best < 0) return out; // nothing at all
  for (let i = 0; i < w * h; i++) out[i] = label[i] === best ? 1 : 0;
  return out;
}

function fillHoles(mask: Uint8Array, w: number, h: number): Uint8Array<ArrayBufferLike> {
  // Outside = reachable from the border through empty pixels; everything else is the subject.
  const out = new Uint8Array(w * h).fill(1);
  const queue = new Int32Array(w * h);
  let qh = 0, qt = 0;
  const seed = (i: number) => {
    if (!mask[i] && out[i]) (out[i] = 0), (queue[qt++] = i);
  };
  for (let x = 0; x < w; x++) seed(x), seed((h - 1) * w + x);
  for (let y = 0; y < h; y++) seed(y * w), seed(y * w + w - 1);
  while (qh < qt) {
    const i = queue[qh++];
    const x = i % w, y = (i / w) | 0;
    if (x > 0) seed(i - 1);
    if (x < w - 1) seed(i + 1);
    if (y > 0) seed(i - w);
    if (y < h - 1) seed(i + w);
  }
  return out;
}

function erode(mask: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    out[i] = mask[i] && mask[i - 1] && mask[i + 1] && mask[i - w] && mask[i + w] ? 1 : 0;
  }
  return out;
}

/** Each pixel's distance to the nearest outside pixel (chamfer 3-4, in pixels). */
export function distanceInside(mask: Uint8Array, w: number, h: number): Float32Array {
  const INF = 1e9;
  const d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = mask[i] ? INF : 0;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!d[i]) continue;
    d[i] = Math.min(d[i], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4);
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x;
    if (!d[i]) continue;
    d[i] = Math.min(d[i], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4);
  }
  for (let i = 0; i < w * h; i++) d[i] /= 3;
  return d;
}

/**
 * The relief mesh for a picture. `grid` is the longest side in cells (detail); depth is the
 * thickness at the thickest point relative to the model's height.
 */
export function reliefMesh(img: PixelImage, opts: { style?: ReliefStyle; grid?: number; depth?: number; mask?: Uint8Array } = {}): ReliefMesh | null {
  const style = opts.style ?? "puffy";
  const { width: w, height: h } = img;
  const mask = opts.mask ?? subjectMask(img);
  let count = 0;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) {
    count++;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (count < 64) return null;
  const dist = distanceInside(mask, w, h);
  let maxD = 0;
  for (let i = 0; i < w * h; i++) if (dist[i] > maxD) maxD = dist[i];
  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  const cells = Math.max(24, Math.min(220, opts.grid ?? 150));
  const step = Math.max(1, Math.max(bw, bh) / cells);
  const gw = Math.floor(bw / step) + 2, gh = Math.floor(bh / step) + 2;
  // Sample the mask and height on the grid (cell corners).
  const inside = (gx: number, gy: number) => {
    const x = Math.round(minX + (gx - 0.5) * step), y = Math.round(minY + (gy - 0.5) * step);
    return x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
  };
  const heightAt = (gx: number, gy: number) => {
    const x = Math.min(w - 1, Math.max(0, Math.round(minX + (gx - 0.5) * step))), y = Math.min(h - 1, Math.max(0, Math.round(minY + (gy - 0.5) * step)));
    const t = Math.min(1, dist[y * w + x] / Math.max(1, maxD));
    if (style === "standee") return Math.min(1, t * 6) ** 0.5 * 0.35 + t * 0.15;
    return Math.sqrt(1 - (1 - t) ** 2);
  };
  // A corner is used when any cell touching it is inside.
  const cellIn = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh - 1; gy++) for (let gx = 0; gx < gw - 1; gx++) {
    let k = 0;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (inside(gx + dx, gy + dy)) k++;
    cellIn[gy * gw + gx] = k >= 3 ? 1 : 0;
  }
  const scale = 2 / (Math.max(bh, bw * 0.75) || 1); // about 2 units tall
  const depth = (opts.depth ?? (style === "standee" ? 0.08 : 0.32)) * 2;
  const vid = new Int32Array(gw * gh).fill(-1);
  const px: number[] = [], py: number[] = [], pz: number[] = [], uu: number[] = [], vv: number[] = [];
  const corner = (gx: number, gy: number) => {
    const i = gy * gw + gx;
    if (vid[i] >= 0) return vid[i];
    vid[i] = px.length;
    const x = minX + (gx - 0.5) * step, y = minY + (gy - 0.5) * step;
    px.push((x - (minX + bw / 2)) * scale);
    py.push((minY + bh - y) * scale);
    pz.push(heightAt(gx, gy) * depth * 0.5);
    uu.push(Math.min(1, Math.max(0, x / w)));
    vv.push(1 - Math.min(1, Math.max(0, y / h)));
    return vid[i];
  };
  const quads: [number, number, number, number][] = [];
  for (let gy = 0; gy < gh - 1; gy++) for (let gx = 0; gx < gw - 1; gx++) {
    if (!cellIn[gy * gw + gx]) continue;
    quads.push([corner(gx, gy), corner(gx + 1, gy), corner(gx + 1, gy + 1), corner(gx, gy + 1)]);
  }
  const nv = px.length;
  // The silhouette: edges used by exactly one quad.
  const edgeKey = (a: number, b: number) => (a < b ? a * nv + b : b * nv + a);
  const edges = new Map<number, [number, number, number]>();
  for (const q of quads) for (let k = 0; k < 4; k++) {
    const a = q[k], b = q[(k + 1) % 4];
    const key = edgeKey(a, b);
    const e = edges.get(key);
    if (e) e[2]++;
    else edges.set(key, [a, b, 1]);
  }
  const rim: [number, number][] = [];
  for (const [a, b, n] of edges.values()) if (n === 1) rim.push([a, b]);
  // Smooth the stair steps of the silhouette: rim corners move towards their rim neighbours,
  // and sit at the middle depth so front and back meet in a clean edge.
  const nb = new Map<number, number[]>();
  for (const [a, b] of rim) {
    (nb.get(a) ?? nb.set(a, []).get(a)!).push(b);
    (nb.get(b) ?? nb.set(b, []).get(b)!).push(a);
  }
  for (let it = 0; it < 4; it++) {
    const nx = new Map<number, [number, number]>();
    for (const [v, list] of nb) {
      let sx = px[v] * 2, sy = py[v] * 2;
      for (const u of list) (sx += px[u]), (sy += py[u]);
      nx.set(v, [sx / (list.length + 2), sy / (list.length + 2)]);
    }
    for (const [v, [x, y]] of nx) (px[v] = x), (py[v] = y);
  }
  for (const v of nb.keys()) pz[v] = 0;
  // Front (z up to +), back (mirrored z), then the rim joining them is closed already (z = 0 at the rim).
  const positions = new Float32Array(nv * 2 * 3);
  const uvs = new Float32Array(nv * 2 * 2);
  const back = style === "standee" ? 0.9 : 0.75;
  let minY2 = Infinity;
  for (let i = 0; i < nv; i++) minY2 = Math.min(minY2, py[i]);
  for (let i = 0; i < nv; i++) {
    positions.set([px[i], py[i] - minY2, pz[i]], i * 3);
    positions.set([px[i], py[i] - minY2, -pz[i] * back], (nv + i) * 3);
    uvs.set([uu[i], vv[i]], i * 2);
    uvs.set([uu[i], vv[i]], (nv + i) * 2);
  }
  const idx: number[] = [];
  for (const [a, b, c, d] of quads) idx.push(a, d, b, b, d, c);
  const frontCount = idx.length;
  for (const [a, b, c, d] of quads) idx.push(nv + a, nv + b, nv + d, nv + b, nv + c, nv + d);
  return {
    positions,
    uvs,
    indices: Uint32Array.from(idx),
    groups: [
      { start: 0, count: frontCount, material: 0 },
      { start: frontCount, count: idx.length - frontCount, material: 1 },
    ],
    coverage: count / (w * h),
  };
}

/** The subject's own pixels (masked), for its palette: RGBA with everything else clear. */
export function maskedPixels(img: PixelImage, mask: Uint8Array): Uint8ClampedArray {
  const out = new Uint8ClampedArray(img.data);
  for (let i = 0; i < mask.length; i++) if (!mask[i]) out[i * 4 + 3] = 0;
  return out;
}
