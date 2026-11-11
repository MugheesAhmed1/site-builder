// Helpers for editing a site right on the preview: find which piece of content a clicked
// bit of text came from, change a value deep inside the content, and turn an uploaded or
// pasted picture into a small data link the site can show (and the download turns into a file).

type Json = unknown;
export type Path = (string | number)[];

export function parsePath(p: string): Path {
  return p.split(".").map((x) => (/^\d+$/.test(x) ? Number(x) : x));
}

export function getAt(obj: Json, path: Path): Json {
  let cur = obj as Record<string | number, Json>;
  for (const k of path) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[k] as Record<string | number, Json>;
  }
  return cur;
}

export function setAt<T>(obj: T, path: Path, value: Json): T {
  if (!path.length) return value as T;
  const [k, ...rest] = path;
  const src = (obj ?? (typeof k === "number" ? [] : {})) as Record<string | number, Json>;
  const copy = (Array.isArray(src) ? src.slice() : { ...src }) as Record<string | number, Json>;
  copy[k] = setAt(src[k], rest, value);
  return copy as T;
}

const norm = (s: string) => s.replace(/\s+/g, " ").replace(/[“”"]/g, "").trim().toLowerCase();

// Every string in the content with its path. Keys that are not words people read are skipped.
const SKIP = /url|href|link|id$|^sections$|email|phone|whatsapp/i;
function strings(obj: Json, path: Path = [], out: { path: Path; text: string }[] = []) {
  if (typeof obj === "string") out.push({ path, text: obj });
  else if (Array.isArray(obj)) obj.forEach((v, i) => strings(v, [...path, i], out));
  else if (obj && typeof obj === "object")
    for (const [k, v] of Object.entries(obj)) {
      if (SKIP.test(k)) continue;
      strings(v, [...path, k], out);
    }
  return out;
}

// Finds the content behind the clicked words. Exact matches first, then the longest
// string that the clicked words contain or are part of.
export function findText(content: Json, shown: string): { path: Path; text: string } | null {
  const want = norm(shown);
  if (want.length < 2) return null;
  const all = strings(content).filter((s) => s.text.trim());
  const exact = all.find((s) => norm(s.text) === want);
  if (exact) return exact;
  let best: { path: Path; text: string } | null = null;
  for (const s of all) {
    const t = norm(s.text);
    if (t.length < 3) continue;
    if (want.includes(t) || t.includes(want)) if (!best || Math.abs(t.length - want.length) < Math.abs(norm(best.text).length - want.length)) best = s;
  }
  return best;
}

// Shrinks a picture so the project still fits in the browser's storage.
export function imageToDataUrl(file: Blob, max = 1400, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * s);
      const h = Math.round(img.height * s);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d")!;
      g.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      // PNGs keep transparency; everything else becomes a JPEG.
      resolve(file.type === "image/png" && w * h < 700 * 700 ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't a picture this browser can read."));
    };
    img.src = url;
  });
}

export function imageFromClipboard(e: ClipboardEvent | React.ClipboardEvent): File | null {
  const items = e.clipboardData?.items;
  if (!items) return null;
  for (const it of Array.from(items)) if (it.type.startsWith("image/")) return it.getAsFile();
  return null;
}
