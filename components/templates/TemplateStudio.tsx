"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useMemo, useRef, useState, useId } from "react";
import { businessLabel, changes, keepContent, openContent, previewSrc, templateZip, zipName, type Content, type SchemaField, type TemplateInfo } from "@/lib/templates";
import ModelField from "@/components/character/ModelField";
import { rolesOf } from "@/lib/character/apply";
import { BLOCKS, LIBRARY_FONTS, blockById, mediaFor, type LibraryMedia } from "@/lib/library-blocks";
import { clone, getPath, setPath } from "@/lib/template-schema.mjs";

// The template studio: an imported whole-project template, running as itself, with every part of
// it (words, lists, pictures, video, links, colours, fonts, sections and motion) as a field from its
// schema. Changes show in the live preview at once; the downloads carry them, and any uploads.

const DEVICES = [
  { id: "desktop", label: "Desktop", w: 1440, h: 900 },
  { id: "tablet", label: "Tablet", w: 834, h: 1112 },
  { id: "phone", label: "Phone", w: 390, h: 844 },
] as const;

const FONTS = [
  "Inter", "Inter Tight", "Manrope", "DM Sans", "Plus Jakarta Sans", "Outfit", "Sora", "Space Grotesk", "Work Sans", "Figtree", "Urbanist", "Lexend",
  "Poppins", "Montserrat", "Raleway", "Archivo", "Barlow", "Antonio", "Oswald", "Bebas Neue", "Anton", "Syne", "Unbounded", "Fraunces",
  "Playfair Display", "Cormorant Garamond", "DM Serif Display", "Instrument Serif", "Libre Baskerville", "Lora", "EB Garamond", "Newsreader",
  "JetBrains Mono", "IBM Plex Mono", "Space Mono", "DM Mono", "Fira Code",
];

const LIMIT = { image: 8, video: 30 }; // MB per upload

/** Which template is open, its business types, and whether a field belongs to a library block. */
const Ctx = createContext<{ tid: string; business: string[]; inBlock: boolean }>({ tid: "", business: [], inBlock: false });

/** A thumbnail address for a value: library pictures and the template's own media resolve here. */
function thumb(v: string, tid: string) {
  if (v.startsWith("lib:")) return "/lib/media/" + v.slice(4);
  if (/^(\.\/)?media\//.test(v)) return `/tpl/${tid}/site/` + v.replace(/^\.\//, "");
  return v;
}

/** Pictures and films from every template and the library, the ones made for this business first. */
function MediaPicker({ kind, onPick, onClose }: { kind: "image" | "video"; onPick: (m: LibraryMedia) => void; onClose: () => void }) {
  const { business } = useContext(Ctx);
  const list = useMemo(() => mediaFor(kind, business), [kind, business]);
  return (
    <div className="tpl-picker" role="listbox" aria-label="Library">
      {list.length === 0 && <p className="muted small">Nothing of this kind in the library yet.</p>}
      {list.map((m) => (
        <button key={m.src} type="button" role="option" aria-selected={false} title={m.label} onClick={() => (onPick(m), onClose())}>
          {kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.src} alt={m.label} loading="lazy" />
          ) : (
            <video src={m.src} muted playsInline preload="metadata" />
          )}
        </button>
      ))}
    </div>
  );
}

function readFile(file: File): Promise<string> {
  return new Promise((ok, fail) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => fail(r.error);
    r.readAsDataURL(file);
  });
}

/** A blank item for a list: the shape of the first default item, with empty words. */
function blankItem(f: SchemaField, sample: Record<string, unknown> | undefined) {
  const out: Record<string, unknown> = {};
  for (const s of f.fields || []) {
    const v = sample?.[s.path];
    out[s.path] = s.type === "number" ? (typeof v === "number" ? v : s.min ?? 0) : s.type === "toggle" ? v ?? true : s.type === "color" ? v ?? "#888888" : s.type === "select" ? s.options?.[0]?.value ?? "" : s.type === "image" || s.type === "video" ? v ?? "" : "";
  }
  return out;
}

function Field({ f, value, set, sample, onError }: { f: SchemaField; value: any; set: (v: unknown) => void; sample?: any; onError: (m: string) => void }) {
  const id = "f-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ctx = useContext(Ctx);
  const [picking, setPicking] = useState(false);
  const hint = f.hint && <small className="muted">{f.hint}</small>;

  async function upload(file: File | undefined, kind: "image" | "video") {
    if (!file) return;
    if (!file.type.startsWith(kind + "/")) return onError(`That file is not ${kind === "image" ? "a picture" : "a video"}.`);
    if (file.size > LIMIT[kind] * 1024 * 1024) return onError(`Keep ${kind === "image" ? "pictures" : "videos"} under ${LIMIT[kind]} MB.`);
    set(await readFile(file));
  }

  /** A library picture: blocks keep the short lib: name; a template's own field gets the file
   * itself, so the download carries it into media/. Pictures on other hosts stay as addresses. */
  async function pick(m: LibraryMedia) {
    if (/^https?:/.test(m.src)) return set(m.src);
    if (ctx.inBlock && m.src.startsWith("/lib/media/")) return set("lib:" + m.src.slice(11));
    try {
      const blob = await fetch(m.src).then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))));
      set(await readFile(new File([blob], m.src.split("/").pop() || "file", { type: blob.type })));
    } catch {
      onError("That picture could not be read. Please try another.");
    }
  }

  switch (f.type) {
    case "toggle":
      return (
        <label className="lab-field tpl-toggle">
          <input type="checkbox" checked={!!value} onChange={(e) => set(e.target.checked)} />
          <span>{f.label}</span>
          {hint}
        </label>
      );
    case "textarea":
      return (
        <label className="lab-field">
          <span>{f.label}</span>
          <textarea rows={Math.min(6, Math.max(2, String(value ?? "").split("\n").length + 1))} value={value ?? ""} onChange={(e) => set(e.target.value)} />
          {hint}
        </label>
      );
    case "number": {
      const step = f.step ?? 1;
      return (
        <label className="lab-field">
          <span>{f.label}</span>
          <span className="tpl-num">
            {f.min != null && f.max != null && f.max - f.min <= 100000 && <input type="range" min={f.min} max={f.max} step={step} value={value ?? 0} onChange={(e) => set(Number(e.target.value))} aria-label={f.label} />}
            <input type="number" min={f.min} max={f.max} step={step} value={value ?? 0} onChange={(e) => e.target.value !== "" && isFinite(+e.target.value) && set(Math.max(f.min ?? -Infinity, Math.min(f.max ?? Infinity, Number(e.target.value))))} />
          </span>
          {hint}
        </label>
      );
    }
    case "select":
      return (
        <label className="lab-field">
          <span>{f.label}</span>
          <select value={value} onChange={(e) => set(e.target.value)}>
            {(f.options || []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {hint}
        </label>
      );
    case "color":
      return (
        <label className="lab-field tpl-color">
          <span>{f.label}</span>
          <span className="tpl-num">
            <input type="color" value={value} onChange={(e) => set(e.target.value)} aria-label={f.label} />
            <input type="text" value={value} spellCheck={false} onChange={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && set(e.target.value.toLowerCase())} />
          </span>
          {hint}
        </label>
      );
    case "colors": {
      const list: string[] = Array.isArray(value) ? value : [];
      return (
        <div className="lab-field">
          <span>{f.label}</span>
          <div className="tpl-swatches">
            {list.map((c, i) => (
              <span key={i} className="tpl-swatch">
                <input type="color" value={c} aria-label={`${f.label} ${i + 1}`} onChange={(e) => set(list.map((x, j) => (j === i ? e.target.value : x)))} />
                {list.length > (f.min ?? 1) && (
                  <button type="button" className="tpl-x" aria-label={`Remove colour ${i + 1}`} onClick={() => set(list.filter((_, j) => j !== i))}>
                    ×
                  </button>
                )}
              </span>
            ))}
            {list.length < (f.max ?? 8) && (
              <button type="button" className="btn btn-sm" onClick={() => set([...list, list[list.length - 1] || "#ffffff"])}>
                Add
              </button>
            )}
          </div>
          {hint}
        </div>
      );
    }
    case "font":
      return (
        <label className="lab-field">
          <span>{f.label}</span>
          <input type="text" list="tpl-fonts" value={value ?? ""} onChange={(e) => set(e.target.value)} placeholder="Any Google Fonts family" />
          {hint || <small className="muted">Any family from Google Fonts, spelled as it is there.</small>}
        </label>
      );
    case "image":
    case "video": {
      const v = String(value ?? "");
      const uploaded = v.startsWith("data:");
      return (
        <div className="lab-field tpl-media">
          <span>{f.label}</span>
          {v &&
            (f.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb(v, ctx.tid)} alt="" className="tpl-thumb" />
            ) : (
              <video src={thumb(v, ctx.tid)} className="tpl-thumb" muted playsInline preload="metadata" />
            ))}
          <input id={id} type="text" inputMode="url" placeholder="https://… or upload" value={uploaded ? "Uploaded file" : v} readOnly={uploaded} onChange={(e) => set(e.target.value)} />
          <span className="tpl-row">
            <label className="btn btn-sm">
              Upload
              <input type="file" accept={f.type === "image" ? "image/*" : "video/mp4,video/webm"} hidden onChange={(e) => upload(e.target.files?.[0], f.type as "image" | "video")} />
            </label>
            <button type="button" className="btn btn-sm" aria-expanded={picking} onClick={() => setPicking((x) => !x)}>
              Library
            </button>
            {v && (
              <button type="button" className="btn btn-sm" onClick={() => set("")}>
                Remove
              </button>
            )}
            {sample !== undefined && v !== sample && (
              <button type="button" className="tpl-link" onClick={() => set(sample)}>
                Use the original
              </button>
            )}
          </span>
          {picking && <MediaPicker kind={f.type as "image" | "video"} onPick={pick} onClose={() => setPicking(false)} />}
          {hint}
        </div>
      );
    }
    case "blocks":
      return <BlocksField f={f} value={value} set={set} onError={onError} />;
    case "list": {
      const items: Record<string, unknown>[] = Array.isArray(value) ? value : [];
      const max = f.max ?? 12;
      const min = f.min ?? 0;
      const move = (i: number, d: number) => {
        const n = [...items];
        [n[i], n[i + d]] = [n[i + d], n[i]];
        set(n);
      };
      return (
        <div className="lab-field tpl-list">
          <span>
            {f.label} <small className="muted">({items.length})</small>
          </span>
          {items.map((item, i) => (
            <details key={i} className="tpl-item">
              <summary>
                <span>
                  {f.itemLabel || "Item"} {i + 1}
                  {(() => {
                    const first = (f.fields || []).find((s) => s.type === "text" || s.type === "textarea");
                    const t = first && String(item[first.path] ?? "").split("\n")[0];
                    return t ? <em> · {t.slice(0, 40)}</em> : null;
                  })()}
                </span>
              </summary>
              <div className="tpl-item-body">
                {(f.fields || []).map((s) => (
                  <Field key={s.path} f={s} value={item[s.path]} sample={undefined} onError={onError} set={(v) => set(items.map((x, j) => (j === i ? { ...x, [s.path]: v } : x)))} />
                ))}
                <span className="tpl-row">
                  <button type="button" className="btn btn-sm" disabled={i === 0} onClick={() => move(i, -1)}>
                    Up
                  </button>
                  <button type="button" className="btn btn-sm" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                    Down
                  </button>
                  <button type="button" className="btn btn-sm" disabled={items.length >= max} onClick={() => set([...items.slice(0, i + 1), clone(item), ...items.slice(i + 1)])}>
                    Copy
                  </button>
                  <button type="button" className="btn btn-sm" disabled={items.length <= min} onClick={() => set(items.filter((_, j) => j !== i))}>
                    Remove
                  </button>
                </span>
              </div>
            </details>
          ))}
          {items.length < max && (
            <button
              type="button"
              className="btn btn-sm tpl-add"
              onClick={(e) => {
                const box = e.currentTarget.parentElement;
                set([...items, blankItem(f, (sample as Record<string, unknown>[] | undefined)?.[0] ?? items[0])]);
                // Open the new item and put the cursor in it, so the person sees what was added.
                requestAnimationFrame(() => {
                  const all = box?.querySelectorAll<HTMLDetailsElement>(":scope > details");
                  const last = all?.[all.length - 1];
                  if (!last) return;
                  last.open = true;
                  last.querySelector<HTMLElement>("input, textarea")?.focus();
                });
              }}
            >
              Add {(f.itemLabel || "item").toLowerCase()}
            </button>
          )}
          {hint}
        </div>
      );
    }
    default:
      return (
        <label className="lab-field">
          <span>{f.label}</span>
          <input type="text" inputMode={f.type === "url" ? "url" : undefined} value={value ?? ""} onChange={(e) => set(e.target.value)} />
          {hint}
        </label>
      );
  }
}

type Extra = { block: string; props?: Record<string, unknown> };

/** Library blocks added to this template: add any of them, change every setting, reorder, remove. */
function BlocksField({ f, value, set, onError }: { f: SchemaField; value: any; set: (v: unknown) => void; onError: (m: string) => void }) {
  const ctx = useContext(Ctx);
  const items: Extra[] = Array.isArray(value) ? value : [];
  const [choice, setChoice] = useState("");
  const [open, setOpen] = useState(-1);
  const groups = useMemo(() => {
    const fit = (b: (typeof BLOCKS)[number]) => b.business.some((x) => ctx.business.includes(x));
    return (["section", "scene", "effect"] as const).map((kind) => ({
      kind,
      label: kind === "section" ? "Sections" : kind === "scene" ? "3D scenes" : "Effects",
      blocks: BLOCKS.filter((b) => b.kind === kind).sort((a, b) => Number(fit(b)) - Number(fit(a)) || a.name.localeCompare(b.name)),
    }));
  }, [ctx.business]);
  const move = (i: number, d: number) => {
    const n = [...items];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    set(n);
    setOpen(i + d);
  };
  const add = () => {
    const b = blockById(choice || groups[0].blocks[0]?.id);
    if (!b) return;
    set([...items, { block: b.id, props: clone(b.defaults) }]);
    setOpen(items.length);
    setChoice("");
  };
  return (
    <div className="lab-field tpl-list tpl-blocks">
      <span>
        {f.label} <small className="muted">({items.length})</small>
      </span>
      {items.map((x, i) => {
        const b = blockById(x.block);
        const props = { ...(b?.defaults || {}), ...(x.props || {}) };
        return (
          <details key={i} className="tpl-item" open={open === i} onToggle={(e) => (e.currentTarget.open ? setOpen(i) : open === i && setOpen(-1))}>
            <summary>
              <span>
                {b ? b.name : x.block} <em> · {b ? (b.kind === "scene" ? "3D scene" : b.kind) : "not in the library"}</em>
              </span>
            </summary>
            <div className="tpl-item-body">
              {b && <small className="muted">{b.description}</small>}
              <Ctx.Provider value={{ ...ctx, inBlock: true }}>
                {(b?.fields || []).map((s) => (
                  <Field
                    key={s.path}
                    f={s}
                    value={getPath(props, s.path)}
                    sample={getPath(b!.defaults, s.path)}
                    onError={onError}
                    set={(v) => set(items.map((y, j) => (j === i ? { ...y, props: setPath(props, s.path, v) } : y)))}
                  />
                ))}
              </Ctx.Provider>
              <span className="tpl-row">
                <button type="button" className="btn btn-sm" disabled={i === 0} onClick={() => move(i, -1)}>
                  Up
                </button>
                <button type="button" className="btn btn-sm" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                  Down
                </button>
                <button type="button" className="btn btn-sm" disabled={items.length >= 12} onClick={() => set([...items.slice(0, i + 1), clone(x), ...items.slice(i + 1)])}>
                  Copy
                </button>
                <button type="button" className="btn btn-sm" onClick={() => (set(items.filter((_, j) => j !== i)), setOpen(-1))}>
                  Remove
                </button>
              </span>
            </div>
          </details>
        );
      })}
      {items.length < 12 && (
        <span className="tpl-row tpl-block-add">
          <select aria-label="Block to add" value={choice || groups[0].blocks[0]?.id || ""} onChange={(e) => setChoice(e.target.value)}>
            {groups.map((g) => (
              <optgroup key={g.kind} label={g.label}>
                {g.blocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.business.some((x) => ctx.business.includes(x)) ? " ★" : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button type="button" className="btn btn-sm" onClick={add}>
            Add block
          </button>
          <Link href="/library" className="tpl-link small" target="_blank">
            Browse the library
          </Link>
        </span>
      )}
      {f.hint && <small className="muted">{f.hint} ★ marks blocks made for this kind of business.</small>}
    </div>
  );
}

export default function TemplateStudio({ t }: { t: TemplateInfo }) {
  const [content, setContent] = useState<Content>(t.content);
  const [ready, setReady] = useState(false);
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("desktop");
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState<"" | "site" | "source">("");
  const [error, setError] = useState("");
  const [kept, setKept] = useState(true);
  const frame = useRef<HTMLIFrameElement>(null);
  const [searchFrom, setSearchFrom] = useState("");
  useEffect(() => setSearchFrom(new URLSearchParams(location.search).get("from") || ""), []);
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    let live = true;
    if (window.innerWidth < 760) setDevice("phone");
    openContent(t).then((c) => {
      if (!live) return;
      setContent(c);
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, [t]);

  const now = useRef(content);
  now.current = content;
  // The address carries the content only when the frame (re)loads; after that it travels by message.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const src = useMemo(() => previewSrc(t, now.current), [t, ready, reload, device]);

  const send = () => frame.current?.contentWindow?.postMessage({ type: "xp-data", data: now.current }, "*");

  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.source && e.source === frame.current?.contentWindow && e.data?.type === "xp-ready") send();
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => {
      send();
      keepContent(t.id, content).then(setKept);
    }, 160);
    return () => clearTimeout(id);
  }, [content, ready, t.id]);

  const dev = DEVICES.find((d) => d.id === device)!;
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / dev.w, el.clientHeight / dev.h));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [dev.w, dev.h]);

  async function download(which: "site" | "source") {
    setBusy(which);
    setError("");
    try {
      const blob = await templateZip(t, content, which);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = zipName(t, content, which);
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The download failed");
    } finally {
      setBusy("");
    }
  }

  const changed = ready ? changes(t, content) : 0;
  const roles = useMemo(() => rolesOf(t), [t]);

  return (
    <div className="lab tpl">
      <aside className="lab-side" aria-label="Everything in this template">
        <header className="lab-head">
          <p className="small">
            <Link href="/templates">← All templates</Link>
          </p>
          <h1>{t.name}</h1>
          <p className="muted small">{t.pitch}</p>
          <p className="small tpl-biz">
            <strong>Made for</strong> {t.sector}
          </p>
          <ul className="xg-tags" aria-label="Business types it suits">
            {t.business.map((b) => (
              <li key={b}>
                <Link href={`/templates?business=${b}`}>{businessLabel(b)}</Link>
              </li>
            ))}
          </ul>
        </header>

        <div className="tpl-actions">
          <button type="button" className="btn btn-primary" disabled={!!busy} onClick={() => download("site")}>
            {busy === "site" ? "Packing…" : "Download site"}
          </button>
          <button type="button" className="btn" disabled={!!busy} onClick={() => download("source")}>
            {busy === "source" ? "Packing…" : "Download source"}
          </button>
        </div>
        <p className="muted small">
          {changed ? `${changed} change${changed === 1 ? "" : "s"}${kept ? ", saved in this browser." : "."}` : "Every part of this template is below. The preview changes as you edit."}{" "}
          {changed > 0 && (
            <button type="button" className="tpl-link" onClick={() => (setContent(clone(t.content)), setReload((n) => n + 1))}>
              Start over
            </button>
          )}
        </p>
        {!kept && <p className="tpl-warn small">Your uploads are too big for this browser to remember. They stay until you leave the page, and the downloads include them.</p>}
        {searchFrom === "journey" && (
          <p className="tpl-note small">
            Your site, built around your character. Change anything below; every colour, word, picture and the model itself is here. <Link href="/create">Back to the journey</Link>
          </p>
        )}
        {error && (
          <p className="tpl-warn" role="alert">
            {error}{" "}
            <button type="button" className="tpl-link" onClick={() => setError("")}>
              OK
            </button>
          </p>
        )}

        <datalist id="tpl-fonts">
          {[...new Set([...FONTS, ...LIBRARY_FONTS])].map((x) => (
            <option key={x} value={x} />
          ))}
        </datalist>

        <Ctx.Provider value={{ tid: t.id, business: t.business, inBlock: false }}>
        {t.schema.map((g, gi) => (
          <details key={g.group} className="tpl-group" open={gi < 2}>
            <summary>{g.group}</summary>
            <div className="tpl-group-body">
              {g.fields.map((f) =>
                f.type === "model" ? (
                  <ModelField key={f.path} content={content} roles={roles} words={[...t.categories, ...t.business]} business={t.business[0]} setContent={setContent} onError={setError} />
                ) : (
                  <Field key={f.path} f={f} value={getPath(content, f.path)} sample={getPath(t.content, f.path)} onError={setError} set={(v) => setContent((c) => setPath(c, f.path, v))} />
                ),
              )}
            </div>
          </details>
        ))}
        </Ctx.Provider>

        <p className="muted small">
          Template supplied by {t.licence.holder}. {t.licence.note}
        </p>
      </aside>

      <section className="lab-view tpl-view" aria-label="Live preview">
        <div className="tpl-bar">
          <div className="seg" role="radiogroup" aria-label="Device">
            {DEVICES.map((d) => (
              <button key={d.id} type="button" role="radio" aria-checked={device === d.id} className={device === d.id ? "is-on" : ""} onClick={() => setDevice(d.id)}>
                {d.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-sm" onClick={() => setReload((n) => n + 1)}>
            Replay
          </button>
        </div>
        <div className="tpl-stage" ref={box}>
          <div className="tpl-fit" style={{ width: dev.w * scale, height: dev.h * scale }}>
            <div className="tpl-device" style={{ width: dev.w, height: dev.h, transform: `scale(${scale})` }}>
              {ready && <iframe key={reload + device} ref={frame} src={src} title={`${t.name} preview`} sandbox="allow-scripts allow-forms" allow="autoplay" onLoad={send} />}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
