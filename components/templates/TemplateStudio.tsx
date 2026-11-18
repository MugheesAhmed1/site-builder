"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadValues, plan, previewSrc, saveValues, templateZip, zipName, type TemplateInfo } from "@/lib/templates";

// The template studio: an imported whole-project template, running as itself, with its words
// and pictures as fields. Every change shows in the live preview at once; the downloads write
// the same changes into the built site or into the project's source.

const DEVICES = [
  { id: "desktop", label: "Desktop", w: 1440, h: 900 },
  { id: "tablet", label: "Tablet", w: 834, h: 1112 },
  { id: "phone", label: "Phone", w: 390, h: 844 },
] as const;

export default function TemplateStudio({ t }: { t: TemplateInfo }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("desktop");
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState<"" | "site" | "source">("");
  const [error, setError] = useState("");
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setValues(loadValues(t.id));
    if (window.innerWidth < 760) setDevice("phone");
    setReady(true);
  }, [t.id]);

  const reps = useMemo(() => plan(t.slots, values), [t.slots, values]);

  // The address carries the replacements only when the frame (re)loads; after that they travel by message.
  const repsNow = useRef(reps);
  repsNow.current = reps;
  // Worked out with the frame's key, so a new frame never starts on an old address.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const src = useMemo(() => previewSrc(t.id, repsNow.current), [t.id, ready, reload, device]);

  useEffect(() => {
    if (!ready) return;
    saveValues(t.id, values);
    const id = setTimeout(() => frame.current?.contentWindow?.postMessage({ type: "xp-template", reps }, "*"), 120);
    return () => clearTimeout(id);
  }, [reps, values, ready, t.id]);

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

  const groups = useMemo(() => {
    const out = new Map<string, TemplateInfo["slots"]>();
    for (const s of t.slots) out.set(s.group || "Words", [...(out.get(s.group || "Words") || []), s]);
    return [...out.entries()];
  }, [t.slots]);

  async function download(which: "site" | "source") {
    setBusy(which);
    setError("");
    try {
      const blob = await templateZip(t, values, which);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = zipName(t, values, which);
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The download failed");
    } finally {
      setBusy("");
    }
  }

  const changed = reps.length;

  return (
    <div className="lab tpl">
      <aside className="lab-side" aria-label="Template words and pictures">
        <header className="lab-head">
          <p className="small">
            <Link href="/#gallery">← Experience Gallery</Link>
          </p>
          <h1>{t.name}</h1>
          <p className="muted small">{t.pitch}</p>
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
          {changed ? `${changed} change${changed === 1 ? "" : "s"}, saved in this browser.` : "Type over any field. The preview changes as you type."}{" "}
          {changed > 0 && (
            <button type="button" className="tpl-link" onClick={() => (setValues({}), setReload((n) => n + 1))}>
              Start over
            </button>
          )}
        </p>
        {error && (
          <p className="tpl-warn" role="alert">
            {error}
          </p>
        )}

        {groups.map(([g, slots]) => (
          <fieldset key={g} className="tpl-group">
            <legend>{g}</legend>
            {slots.map((s) => {
              const v = values[s.key] ?? "";
              const set = (x: string) => setValues((o) => ({ ...o, [s.key]: x }));
              return (
                <label key={s.key} className="lab-field">
                  <span>{s.label}</span>
                  {s.type === "image" ? (
                    <input type="url" inputMode="url" placeholder="https://… (leave empty to keep the picture)" value={v} onChange={(e) => set(e.target.value)} />
                  ) : s.long ? (
                    <textarea rows={3} placeholder={s.default} value={v} onChange={(e) => set(e.target.value)} />
                  ) : (
                    <input type="text" placeholder={s.default} value={v} onChange={(e) => set(e.target.value)} />
                  )}
                  {s.hint && <small className="muted">{s.hint}</small>}
                </label>
              );
            })}
          </fieldset>
        ))}

        {t.remoteAssets.length > 0 && (
          <p className="tpl-warn small">
            {t.remoteAssets.length} pictures or videos in this template load from another host. The downloads list them in the README so you can copy them in before launch.
          </p>
        )}
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
            {ready && (
              <iframe
                key={reload + device}
                ref={frame}
                src={src}
                title={`${t.name} preview`}
                sandbox="allow-scripts allow-forms"
                allow="autoplay"
                onLoad={() => frame.current?.contentWindow?.postMessage({ type: "xp-template", reps }, "*")}
              />
            )}
          </div>
          </div>
        </div>
      </section>
    </div>
  );
}
