"use client";

// Videos are too big for the project store, so they live in the browser's IndexedDB.
// The site content keeps a short reference like "media:ab12cd" that the preview turns
// into a playable link and the download turns into a real file in public/media.

const DB = "site-builder-media";
const STORE = "files";
const urls = new Map<string, string>();

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export const MAX_VIDEO_MB = 120;

export async function putMedia(file: Blob): Promise<string> {
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`That video is over ${MAX_VIDEO_MB} MB. Try a shorter or smaller export.`);
  const id = Math.random().toString(36).slice(2, 10);
  const db = await open();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(file, id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  return "media:" + id;
}

export async function getMedia(ref: string): Promise<Blob | null> {
  if (!ref.startsWith("media:")) return null;
  const db = await open();
  return new Promise((res) => {
    const r = db.transaction(STORE).objectStore(STORE).get(ref.slice(6));
    r.onsuccess = () => res((r.result as Blob) || null);
    r.onerror = () => res(null);
  });
}

export async function mediaUrl(ref: string): Promise<string> {
  if (urls.has(ref)) return urls.get(ref)!;
  const b = await getMedia(ref);
  if (!b) return "";
  const u = URL.createObjectURL(b);
  urls.set(ref, u);
  return u;
}

export function cachedMediaUrl(ref: string) {
  return urls.get(ref);
}

/** Every "media:" reference found anywhere in a value. */
export function mediaRefs(v: unknown, out = new Set<string>()): Set<string> {
  if (typeof v === "string") {
    if (v.startsWith("media:")) out.add(v);
  } else if (Array.isArray(v)) v.forEach((x) => mediaRefs(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => mediaRefs(x, out));
  return out;
}

/** A copy of the value with each reference swapped by map(ref). */
export function swapMedia<T>(v: T, map: (ref: string) => string): T {
  return JSON.parse(JSON.stringify(v), (_k, x) => (typeof x === "string" && x.startsWith("media:") ? map(x) : x));
}
