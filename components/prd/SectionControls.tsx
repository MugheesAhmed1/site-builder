"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import ImageField from "@/components/ImageField";
import VideoField from "@/components/VideoField";
import { mediaUrl, putMedia } from "@/lib/media";
import { ANIMATIONS, BACKGROUNDS, ENVIRONMENTS, HERO_TYPES, ILLUSTRATIONS, ITEM_STYLES, LAYOUTS, TEXT_ALIGNS, TEXT_FACES, type Block, type HeroAsset, type SectionSpec } from "@/template/src/content/blocks";
import { DIRECTOR_IDS, DIRECTORS, direct } from "@/template/src/director";

// The parameters a dynamic section is generated from, as controls: layout, hero asset (with
// upload, link or the asset library for 3D), background, animation and the Director cut. The
// Sections panel and the on-page inspector both use it, so every part of a section can change.

export function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="pe-field">
      <span className="pe-lbl">{label}</span>
      <div className="seg pe-seg sc-seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button type="button" key={o.id} className={value === o.id ? "is-on" : ""} aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Num({ label, value, min, max, step, unit = "", onChange }: { label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <label className="pe-field sc-num">
      <span className="pe-field-head">
        <span className="pe-lbl">{label}</span>
        <span className="pe-val">
          {Math.round(value * 100) / 100}
          {unit}
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
    </label>
  );
}

/** A GLB model: upload one (kept in this browser, copied into the download), paste a link, or clear it. */
export function ModelField({ value, onChange }: { value: string; onChange: (v: string, meta?: { assetId?: string }) => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [link, setLink] = useState(value.startsWith("http") ? value : "");
  useEffect(() => {
    if (value.startsWith("media:")) mediaUrl(value).then((u) => setName(u ? "Your uploaded model" : "Upload missing in this browser"));
    else setName(value ? value.split("/").pop() || "" : "");
  }, [value]);
  const take = async (f: File | undefined) => {
    if (!f) return;
    setErr("");
    const head = new Uint8Array(await f.slice(0, 4).arrayBuffer());
    const glb = head[0] === 0x67 && head[1] === 0x6c && head[2] === 0x54 && head[3] === 0x46; // "glTF"
    if (!glb) return setErr("That is not a GLB file. Export the model as .glb (binary glTF) and try again.");
    if (f.size > 60 * 1024 * 1024) return setErr("That model is over 60 MB. Compress it (for example with gltf.report) and try again.");
    setBusy(true);
    try {
      onChange(await putMedia(new Blob([f], { type: "model/gltf-binary" })));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="sc-model">
      <p className="small">{name ? <b>{name}</b> : <span className="muted">No model yet: a sculpted placeholder shows until you add one.</span>}</p>
      <div className="row wrap" style={{ gap: 6 }}>
        <button type="button" className="btn btn-sm" onClick={() => file.current?.click()} disabled={busy}>
          <Icon name="upload" size={14} />
          {busy ? "Saving" : "Upload GLB"}
        </button>
        {value && (
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => onChange("")}>
            Remove
          </button>
        )}
      </div>
      <input ref={file} type="file" accept=".glb,model/gltf-binary" hidden onChange={(e) => take(e.target.files?.[0])} />
      <label className="pe-field">
        <span className="pe-lbl">Or a link to a .glb file</span>
        <input type="url" placeholder="https://.../model.glb" value={link} onChange={(e) => setLink(e.target.value)} onBlur={() => link && /^https:\/\/.+\.glb(\?.*)?$/i.test(link) && onChange(link)} />
      </label>
      {err && <p className="small" style={{ color: "var(--danger, #DC2626)" }}>{err}</p>}
    </div>
  );
}

interface Card {
  id: string;
  name: string;
  src: string;
  preview: string;
  category: string;
  tags: string[];
  license: string;
}

/** The asset library's 3D models (licence-checked, local files) to pick from. */
export function AssetPicker({ subject, value, onPick }: { subject: string; value?: string; onPick: (c: Card) => void }) {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [best, setBest] = useState<string | undefined>();
  const [q, setQ] = useState("");
  // The library (its manifest is large) loads only when the picker opens.
  useEffect(() => {
    let on = true;
    Promise.all([import("@/packages/asset-library/registry"), import("@/lib/prd-build")]).then(([{ ASSETS, isShippable }, { libraryModel }]) => {
      if (!on) return;
      setCards(ASSETS.filter((a) => a.type === "3d" && isShippable(a)).map((a) => ({ id: a.id, name: a.name, src: a.asset, preview: a.preview, category: a.category, tags: a.tags, license: a.license.type })));
      setBest(subject ? libraryModel(subject)?.id : undefined);
    });
    return () => {
      on = false;
    };
  }, [subject]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = (cards ?? []).filter((c) => !t || (c.name + " " + c.tags.join(" ") + " " + c.category).toLowerCase().includes(t));
    return best ? [...list.filter((c) => c.id === best), ...list.filter((c) => c.id !== best)] : list;
  }, [cards, q, best]);
  if (!cards) return <p className="small muted">Opening the asset library...</p>;
  return (
    <div className="sc-picker">
      <input type="search" placeholder={`Search ${cards.length} models`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the asset library" />
      <div className="sc-picker-grid">
        {shown.slice(0, 48).map((c) => (
          <button type="button" key={c.id} className={"sc-pick" + (value === c.id ? " is-on" : "")} onClick={() => onPick(c)} title={`${c.name} (${c.license})`} aria-pressed={value === c.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.preview} alt="" loading="lazy" />
            <span>
              {c.name}
              {c.id === best && <em> best match</em>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SectionControls({ block, onChange, compact = false }: { block: Block; onChange: (spec: SectionSpec) => void; compact?: boolean }) {
  const s = block.spec;
  const h = s.hero;
  const bg = s.background;
  const set = (patch: Partial<SectionSpec>) => onChange({ ...s, ...patch });
  const hero = (patch: Partial<HeroAsset>) => set({ hero: { ...h, ...patch } });
  const back = (patch: Partial<SectionSpec["background"]>) => set({ background: { ...bg, ...patch } });
  const d = direct(s.director, s.secondary);
  const tx = s.text ?? {};
  const it = s.items ?? {};
  const text = (patch: Partial<NonNullable<SectionSpec["text"]>>) => set({ text: { ...tx, ...patch } });
  const items = (patch: Partial<NonNullable<SectionSpec["items"]>>) => set({ items: { ...it, ...patch } });
  const [library, setLibrary] = useState(false);
  const rot = h.rotation ?? [0, 0, 0];
  const pos = h.position ?? [0, 0];
  const directors = DIRECTOR_IDS.map((id) => ({ id, label: DIRECTORS[id].label }));
  return (
    <div className={"sc" + (compact ? " is-compact" : "")}>
      <section className="sc-group" aria-label="Director cut">
        <h4>Director cut</h4>
        <Seg label="Direction" value={s.director} options={directors} onChange={(director) => set({ director, secondary: s.secondary === director ? undefined : s.secondary })} />
        <Seg label="Blend in the movement of" value={(s.secondary ?? "") as never} options={[{ id: "" as never, label: "Nothing" }, ...directors.filter((x) => x.id !== s.director)] as never} onChange={(v: string) => set({ secondary: (v || undefined) as SectionSpec["secondary"] })} />
        <p className="small muted">
          {d.note} Spacing {d.space}x, {d.type.face} type, {d.transition} transitions, {d.camera.move} camera, intensity {Math.round(d.intensity * 10)} of 10.
        </p>
      </section>

      <section className="sc-group" aria-label="Text">
        <h4>Text</h4>
        <Seg label="Alignment" value={tx.align ?? (d.hierarchy.align === "center" ? "center" : "start")} options={TEXT_ALIGNS} onChange={(align) => text({ align })} />
        <Seg label="Typeface" value={tx.face ?? (d.type.face === "body" ? "body" : d.type.face)} options={TEXT_FACES} onChange={(face) => text({ face })} />
        <div className="sc-nums">
          <Num label="Heading size" value={tx.size ?? 1} min={0.6} max={1.8} step={0.05} unit="x" onChange={(size) => text({ size })} />
          <Num label="Heading weight" value={tx.weight ?? d.type.weight} min={300} max={900} step={100} onChange={(weight) => text({ weight })} />
        </div>
        <Seg label="Line width" value={tx.width ?? "normal"} options={[{ id: "narrow", label: "Narrow" }, { id: "normal", label: "Normal" }, { id: "wide", label: "Wide" }]} onChange={(width) => text({ width })} />
        <Seg label="Heading case" value={(tx.caps ?? d.type.caps) ? "upper" : "normal"} options={[{ id: "normal", label: "As written" }, { id: "upper", label: "Capitals" }]} onChange={(v) => text({ caps: v === "upper" })} />
        {s.text && (
          <button type="button" className="pe-link" onClick={() => set({ text: undefined })}>
            Back to the Director&apos;s type
          </button>
        )}
      </section>

      {block.items.length > 0 && (
        <section className="sc-group" aria-label="Items">
          <h4>{block.items.length} items</h4>
          <Seg label="Show them as" value={it.style ?? "cards"} options={ITEM_STYLES} onChange={(style) => items({ style })} />
          {(it.style ?? "cards") !== "list" && (it.style ?? "cards") !== "timeline" && (it.style ?? "cards") !== "carousel" && (
            <Seg label="Columns" value={String(it.columns ?? 0)} options={[{ id: "0", label: "Auto" }, { id: "1", label: "1" }, { id: "2", label: "2" }, { id: "3", label: "3" }, { id: "4", label: "4" }]} onChange={(v) => items({ columns: Number(v) || undefined })} />
          )}
          <Seg label="Pictures" value={it.images ? "on" : "off"} options={[{ id: "off", label: "No pictures" }, { id: "on", label: "A picture on each" }]} onChange={(v) => items({ images: v === "on" })} />
        </section>
      )}

      <section className="sc-group" aria-label="Layout">
        <Seg label="Layout" value={s.layout} options={LAYOUTS} onChange={(layout) => set({ layout })} />
        <Seg label="Animation" value={s.animation} options={ANIMATIONS} onChange={(animation) => set({ animation })} />
      </section>

      <section className="sc-group" aria-label="Hero asset">
        <h4>Hero asset</h4>
        <Seg label="Kind" value={h.type} options={HERO_TYPES} onChange={(type) => hero({ type, ...(type !== h.type ? { src: undefined, assetId: undefined } : {}) })} />
        {h.type === "glb" && (
          <>
            <ModelField value={h.src || ""} onChange={(src) => hero({ src: src || undefined, assetId: undefined })} />
            <button type="button" className="btn btn-sm" onClick={() => setLibrary((v) => !v)} aria-expanded={library}>
              <Icon name="grid" size={14} />
              {library ? "Close the asset library" : "Select from the asset library"}
            </button>
            {library && <AssetPicker subject={h.subject || block.heading} value={h.assetId} onPick={(c) => (hero({ src: c.src, assetId: c.id }), setLibrary(false))} />}
            <label className="pe-field">
              <span className="pe-lbl">What it shows</span>
              <input value={h.subject || ""} onChange={(e) => hero({ subject: e.target.value })} placeholder="realistic human heart" />
            </label>
          </>
        )}
        {h.type === "image" && <ImageField value={h.src || ""} onChange={(v) => hero({ src: v || undefined })} />}
        {h.type === "video" && <VideoField value={h.src || ""} onChange={(v) => hero({ src: v || undefined })} />}
        {h.type === "illustration" && <Seg label="Illustration" value={h.illustration || "orbits"} options={ILLUSTRATIONS} onChange={(illustration) => hero({ illustration })} />}
        {h.type !== "none" && (
          <>
            {(h.type === "image" || h.type === "video" || h.type === "glb") && (
              <label className="pe-field">
                <span className="pe-lbl">Description for screen readers</span>
                <input value={h.alt || ""} onChange={(e) => hero({ alt: e.target.value })} />
              </label>
            )}
            <div className="sc-nums">
              <Num label="Scale" value={h.scale ?? 1} min={0.3} max={3} step={0.05} unit="x" onChange={(scale) => hero({ scale })} />
              <Num label="Move across" value={pos[0]} min={-40} max={40} step={1} unit="%" onChange={(x) => hero({ position: [x, pos[1]] })} />
              <Num label="Move up or down" value={pos[1]} min={-40} max={40} step={1} unit="%" onChange={(y) => hero({ position: [pos[0], y] })} />
              {h.type === "glb" ? (
                <>
                  <Num label="Rotate X" value={rot[0]} min={-180} max={180} step={5} unit="°" onChange={(v) => hero({ rotation: [v, rot[1], rot[2]] })} />
                  <Num label="Rotate Y" value={rot[1]} min={-180} max={180} step={5} unit="°" onChange={(v) => hero({ rotation: [rot[0], v, rot[2]] })} />
                  <Num label="Rotate Z" value={rot[2]} min={-180} max={180} step={5} unit="°" onChange={(v) => hero({ rotation: [rot[0], rot[1], v] })} />
                </>
              ) : (
                <Num label="Rotate" value={rot[2]} min={-45} max={45} step={1} unit="°" onChange={(v) => hero({ rotation: [0, 0, v] })} />
              )}
              {h.type === "image" && (
                <>
                  <Num label="Crop across" value={h.focus?.[0] ?? 50} min={0} max={100} step={1} unit="%" onChange={(v) => hero({ focus: [v, h.focus?.[1] ?? 50] })} />
                  <Num label="Crop up or down" value={h.focus?.[1] ?? 50} min={0} max={100} step={1} unit="%" onChange={(v) => hero({ focus: [h.focus?.[0] ?? 50, v] })} />
                  <Num label="Zoom" value={h.zoom ?? 1} min={1} max={3} step={0.05} unit="x" onChange={(zoom) => hero({ zoom })} />
                </>
              )}
              {(h.type === "image" || h.type === "video") && <Num label="Round the corners" value={h.radius ?? 20} min={0} max={200} step={1} unit="px" onChange={(radius) => hero({ radius })} />}
            </div>
            {h.type === "glb" && (
              <>
                <Seg label="Camera" value={h.camera ?? d.camera.move} options={[{ id: "orbit", label: "Orbit" }, { id: "static", label: "Still" }, { id: "close", label: "Close" }, { id: "wide", label: "Wide" }, { id: "scroll", label: "Follows scroll" }]} onChange={(camera) => hero({ camera })} />
                <Seg label="Lighting" value={h.lighting ?? d.asset.lighting} options={[{ id: "studio", label: "Studio" }, { id: "lab", label: "Laboratory" }, { id: "warm", label: "Warm" }, { id: "dramatic", label: "Dramatic" }, { id: "soft", label: "Soft" }, { id: "neon", label: "Neon" }]} onChange={(lighting) => hero({ lighting })} />
                <Seg label="Its own movement" value={h.motion ?? d.asset.motion} options={[{ id: "spin", label: "Turntable" }, { id: "float", label: "Float" }, { id: "pulse", label: "Pulse" }, { id: "scroll", label: "Turns with scroll" }, { id: "none", label: "Still" }]} onChange={(motion) => hero({ motion })} />
              </>
            )}
          </>
        )}
      </section>

      <section className="sc-group" aria-label="Background">
        <h4>Background</h4>
        <Seg label="Kind" value={bg.type} options={BACKGROUNDS} onChange={(type) => back({ type, environment: type === "environment" ? bg.environment ?? d.asset.environment : bg.environment })} />
        {bg.type === "solid" && (
          <label className="pe-field sc-color">
            <span className="pe-lbl">Colour</span>
            <input type="color" value={bg.color || "#ffffff"} onChange={(e) => back({ color: e.target.value.toUpperCase() })} />
            {bg.color && (
              <button type="button" className="pe-link" onClick={() => back({ color: undefined })}>
                Director&apos;s colour
              </button>
            )}
          </label>
        )}
        {bg.type === "gradient" && (
          <div className="sc-nums">
            <label className="pe-field sc-color">
              <span className="pe-lbl">From</span>
              <input type="color" value={bg.gradient?.[0] || "#0B1020"} onChange={(e) => back({ gradient: [e.target.value, bg.gradient?.[1] || "#4F46E5", bg.gradient?.[2] ?? 160] })} />
            </label>
            <label className="pe-field sc-color">
              <span className="pe-lbl">To</span>
              <input type="color" value={bg.gradient?.[1] || "#4F46E5"} onChange={(e) => back({ gradient: [bg.gradient?.[0] || "#0B1020", e.target.value, bg.gradient?.[2] ?? 160] })} />
            </label>
            <Num label="Angle" value={bg.gradient?.[2] ?? 160} min={0} max={360} step={5} unit="°" onChange={(a) => back({ gradient: [bg.gradient?.[0] || "#0B1020", bg.gradient?.[1] || "#4F46E5", a] })} />
          </div>
        )}
        {bg.type === "image" && <ImageField value={bg.src || ""} onChange={(v) => back({ src: v || undefined })} />}
        {bg.type === "video" && <VideoField value={bg.src || ""} onChange={(v) => back({ src: v || undefined })} />}
        {bg.type === "environment" && <Seg label="Environment" value={bg.environment ?? d.asset.environment} options={ENVIRONMENTS} onChange={(environment) => back({ environment })} />}
        {(bg.type === "image" || bg.type === "video" || bg.type === "environment") && <Num label="Darken for the words" value={bg.dim ?? 0.35} min={0} max={0.85} step={0.05} onChange={(dim) => back({ dim })} />}
        <Seg label="Words" value={bg.tone ?? "auto"} options={[{ id: "auto", label: "As directed" }, { id: "dark", label: "Light words" }, { id: "light", label: "Dark words" }]} onChange={(tone) => back({ tone })} />
      </section>
    </div>
  );
}
