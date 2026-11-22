"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { rankTemplates } from "@/lib/animator";
import { BLOCKS, blockById } from "@/lib/library-blocks";
import { businessLabel, previewSrc, templateBase, templateById, templateZip, zipName, type Content, type TemplateInfo } from "@/lib/templates";
import { gradientCss, type DesignSystem } from "@/lib/character/design";
import type { ModelInfo } from "@/lib/character/apply";
import type { Brief } from "@/lib/journey/brief";
import { blocksFor, contentFor, planFromBrief } from "@/lib/journey/plan";
import { stageOf } from "./design-tweak";

// Steps 4 and 5: the template library, every template shown as the person's own site (their words,
// their design system, their character), or a new template made from library sections around the
// character. The words are written by rules at once and by the AI writer when the server has a key.

export const NEW_TEMPLATE = "orbit";

type Device = "desktop" | "phone";
type Written = { texts: Record<string, string>; by: "ai" | "rules" };

const SECTIONS = BLOCKS.filter((b) => b.kind === "section");

async function write(plan: ReturnType<typeof planFromBrief>): Promise<{ texts: Record<string, string>; note?: string }> {
  const r = await fetch("/api/animate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ step: "write", plan }) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) throw new Error(data.error || "The writer did not answer.");
  return data;
}

export default function TemplateStep({
  brief,
  design,
  model,
  tid,
  blocks,
  onPick,
  onBlocks,
  onCustomise,
}: {
  brief: Brief;
  design: DesignSystem;
  model: ModelInfo | null;
  tid: string;
  blocks: string[] | null;
  onPick: (id: string) => void;
  onBlocks: (b: string[]) => void;
  onCustomise: (t: TemplateInfo, c: Content) => void;
}) {
  const fresh = templateById(NEW_TEMPLATE);
  const ranked = useMemo(() => rankTemplates(brief.business, brief.kind).filter((t) => t.id !== NEW_TEMPLATE), [brief.business, brief.kind]);
  const t = templateById(tid) || ranked[0];
  const isNew = t.id === NEW_TEMPLATE;
  const chosen = isNew ? blocks ?? blocksFor(brief, design.motion, t.id, 4) : undefined;
  const plan = useMemo(() => planFromBrief(brief, t, design, chosen), [brief, t, design, chosen?.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const [written, setWritten] = useState<Record<string, Written>>({});
  const [busy, setBusy] = useState("");
  const [device, setDevice] = useState<Device>("desktop");
  const [error, setError] = useState("");
  const key = `${t.id}:${chosen?.join() || ""}`;
  const content = useMemo(() => contentFor(t, plan, design, model, { texts: written[key]?.texts, email: brief.email }), [t, plan, design, model, written, key, brief.email]);

  // The AI writer, once per template (and per set of sections for a new one).
  const asked = useRef(new Set<string>());
  useEffect(() => {
    if (asked.current.has(key)) return;
    asked.current.add(key);
    setBusy(key);
    write(plan)
      .then((r) => setWritten((w) => ({ ...w, [key]: { texts: r.texts || {}, by: r.note === "no-key" || r.note === "busy" || r.note === "model-failed" ? "rules" : "ai" } })))
      .catch(() => setWritten((w) => ({ ...w, [key]: { texts: {}, by: "rules" } })))
      .finally(() => setBusy((b) => (b === key ? "" : b)));
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // The live preview: the template itself, fed the content by message.
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const latest = useRef(content);
  latest.current = content;
  const send = () => frame.current?.contentWindow?.postMessage({ type: "xp-data", data: latest.current }, "*");
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.source && e.source === frame.current?.contentWindow && e.data?.type === "xp-ready") send();
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);
  useEffect(() => void send(), [content]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / (device === "phone" ? 390 : 1440)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [device]);

  async function download() {
    setError("");
    try {
      const blob = await templateZip(t, content, "site");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = zipName(t, content, "site");
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The download failed.");
    }
  }

  const stage = stageOf(design);
  const by = written[key]?.by;
  const w = device === "phone" ? 390 : 1440;
  const h = device === "phone" ? 800 : 900;

  return (
    <div className="jr-templates">
      <div className="jr-sys-head">
        <p className="eyebrow">
          <span className="mono">Step 4 · Template</span>
        </p>
        <h2>Pick a template, or create a new one</h2>
        <p className="muted">Each one is shown as your site: your words, your design system and your character. Every part stays changeable in the next step.</p>
      </div>
      <div className="jr-tgrid" role="radiogroup" aria-label="Templates">
        {fresh && (
          <button type="button" role="radio" aria-checked={isNew} className={`jr-tcard jr-tnew ${isNew ? "is-on" : ""}`} onClick={() => onPick(NEW_TEMPLATE)}>
            <span className="jr-tart" style={{ background: gradientCss(stage.stops, design.gradient.style, design.gradient.angle, [50, 50]) }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {model && <img className="jr-tchar is-big" src={model.preview} alt="" />}
              <em className="jr-tbadge">New</em>
            </span>
            <strong>Create a new template</strong>
            <small>Your character centre stage, with the sections you choose from the library.</small>
          </button>
        )}
        {ranked.map((x, i) => {
          const on = x.id === t.id;
          return (
            <button key={x.id} type="button" role="radio" aria-checked={on} className={`jr-tcard ${on ? "is-on" : ""}`} onClick={() => onPick(x.id)}>
              <span className="jr-tart">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {x.poster ? <img src={`${templateBase(x.id)}/poster.webp`} alt="" loading="lazy" decoding="async" /> : <span className="jr-tname">{x.name}</span>}
                {model && (
                  <span className="jr-tchip" style={{ background: gradientCss(stage.stops, design.gradient.style, design.gradient.angle, [50, 50]) }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={model.preview} alt="" />
                  </span>
                )}
                {i < 3 && <em className="jr-tbadge">Best match</em>}
              </span>
              <strong>{x.name}</strong>
              <small>
                {businessLabel(x.business[0])} · {x.pitch}
              </small>
            </button>
          );
        })}
      </div>

      {isNew && (
        <fieldset className="jr-blocks">
          <legend>Sections in your new template</legend>
          <p className="small muted">The hero with your character, the about section and a contact form are always there. Tap to add or remove sections; they follow the about section in the order you pick them.</p>
          <div className="jr-chips">
            {SECTIONS.filter((b) => b.id !== "contact-form").map((b) => {
              const on = !!chosen?.includes(b.id);
              const place = on ? (chosen || []).filter((x) => blockById(x)?.kind === "section" && x !== "contact-form").indexOf(b.id) + 1 : 0;
              return (
                <button
                  key={b.id}
                  type="button"
                  className={`chip ${on ? "is-on" : ""}`}
                  aria-pressed={on}
                  data-n={place || undefined}
                  title={b.description}
                  onClick={() => {
                    const now = chosen || [];
                    const next = on ? now.filter((x) => x !== b.id) : [...now.filter((x) => blockById(x)?.kind === "section" && x !== "contact-form"), b.id, ...now.filter((x) => !(blockById(x)?.kind === "section" && x !== "contact-form"))];
                    onBlocks(next);
                  }}
                >
                  {b.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <section className="jr-live" aria-label={`Your site in ${t.name}`}>
        <div className="jr-live-bar">
          <strong>{isNew ? "Your new template" : t.name}</strong>
          <span className="small muted" aria-live="polite">
            {busy === key ? "Writing every word for you…" : by === "ai" ? "Every word written for you by AI." : by === "rules" ? "Key words written for you; the rest keep the template's with your name." : ""}
          </span>
          <div className="seg" role="radiogroup" aria-label="Preview size">
            {(["desktop", "phone"] as Device[]).map((d) => (
              <button key={d} type="button" role="radio" aria-checked={device === d} className={device === d ? "is-on" : ""} onClick={() => setDevice(d)}>
                {d === "desktop" ? "Desktop" : "Phone"}
              </button>
            ))}
          </div>
        </div>
        <div className={`jr-live-view is-${device}`} ref={box} style={{ height: h * scale }}>
          <iframe key={t.id} ref={frame} src={previewSrc(t)} title={`Preview: ${t.name}`} sandbox="allow-scripts allow-forms" style={{ width: w, height: h, transform: `scale(${scale})` }} />
        </div>
        {error && (
          <p className="tpl-warn small" role="alert">
            {error}
          </p>
        )}
        <div className="jr-next">
          <button type="button" className="btn btn-primary" onClick={() => onCustomise(t, content)}>
            Next: customise every part
          </button>
          <button type="button" className="btn" onClick={download}>
            Download the site
          </button>
        </div>
      </section>
    </div>
  );
}
