// Big uploads (3D models, photos) kept in the browser's IndexedDB, which holds far more than
// localStorage. Content keeps a short "idb:<key>" reference in their place while it is saved, and
// gets the files back when it is opened. Nothing leaves the device.

const DB = "xp-blobs";
const STORE = "files";
export const REF = "idb:";
/** Strings longer than this move out of localStorage. */
export const BIG = 120_000;

function open(): Promise<IDBDatabase> {
  return new Promise((ok, fail) => {
    if (typeof indexedDB === "undefined") return fail(new Error("No IndexedDB"));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fail(r.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((ok, fail) => {
      const t = db.transaction(STORE, mode);
      const req = run(t.objectStore(STORE));
      t.oncomplete = () => ok(req.result);
      t.onerror = () => fail(t.error);
      t.onabort = () => fail(t.error);
    });
  } finally {
    db.close();
  }
}

export const putBlob = (key: string, value: string) => tx("readwrite", (s) => s.put(value, key)).then(() => undefined);
export const getBlob = (key: string) => tx<string | undefined>("readonly", (s) => s.get(key) as IDBRequest<string | undefined>);

/** A copy of `v` with big data: strings moved to IndexedDB under `prefix`, and the work to wait on. */
export async function dehydrate<T>(v: T, prefix: string): Promise<T> {
  const writes: Promise<void>[] = [];
  const walk = (x: unknown, path: string): unknown => {
    if (typeof x === "string") {
      if (x.startsWith("data:") && x.length > BIG) {
        const key = `${prefix}/${path}`;
        writes.push(putBlob(key, x));
        return REF + key;
      }
      return x;
    }
    if (Array.isArray(x)) return x.map((y, i) => walk(y, `${path}.${i}`));
    if (x && typeof x === "object") return Object.fromEntries(Object.entries(x).map(([k, y]) => [k, walk(y, path ? `${path}.${k}` : k)]));
    return x;
  };
  const out = walk(v, "") as T;
  await Promise.all(writes);
  return out;
}

/** `v` with every "idb:" reference replaced by the file it stands for ("" when it is gone). */
export async function hydrate<T>(v: T): Promise<T> {
  const refs = new Map<string, string>();
  const find = (x: unknown) => {
    if (typeof x === "string" && x.startsWith(REF)) refs.set(x, "");
    else if (Array.isArray(x)) x.forEach(find);
    else if (x && typeof x === "object") Object.values(x).forEach(find);
  };
  find(v);
  if (!refs.size) return v;
  await Promise.all([...refs.keys()].map(async (r) => refs.set(r, (await getBlob(r.slice(REF.length)).catch(() => undefined)) ?? "")));
  const put = (x: unknown): unknown => (typeof x === "string" ? (refs.has(x) ? refs.get(x) : x) : Array.isArray(x) ? x.map(put) : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).map(([k, y]) => [k, put(y)])) : x);
  return put(v) as T;
}
