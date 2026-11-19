"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { looksFunctional, nextReqId, normalizePrd, sectionId, widgetFor, type Prd, type PrdItem, type PrdRequirement, type PrdSection } from "@/lib/prd";
import { ANIMATIONS, BACKGROUNDS, HERO_TYPES, LAYOUTS } from "@/template/src/content/blocks";
import { DIRECTOR_IDS, DIRECTORS } from "@/template/src/director";
import "./prd.css";

// The PRD, fully editable: the site's brief at the top, then every section with its words,
// items, requirements and visual direction. Every section here becomes a section of the site
// and every requirement must appear on it (lib/prd-coverage.ts).

const WIDGET_WORDS: Record<string, string> = {
  form: "a working form",
  faq: "questions that open",
  pricing: "price cards",
  gallery: "a picture gallery",
  map: "a map link",
  search: "a live search",
  video: "a video player",
  stats: "big numbers",
  compare: "a comparison table",
  explore: "tabs to explore",
  download: "a download button",
  button: "a button",
  list: "a line on the page",
};

function Field({ label, value, onChange, area = false, placeholder }: { label: string; value: string; onChange: (v: string) => void; area?: boolean; placeholder?: string }) {
  return (
    <label className="prd-field">
      <span>{label}</span>
      {area ? <textarea rows={Math.min(7, Math.max(2, Math.ceil(value.length / 70)))} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /> : <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
    </label>
  );
}

function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T | ""; options: { id: T | ""; label: string }[]; onChange: (v: T) => void }) {
  return (
    <label className="prd-field prd-select">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const directors = DIRECTOR_IDS.map((id) => ({ id, label: DIRECTORS[id].label }));

function Requirement({ r, onChange, onRemove }: { r: PrdRequirement; onChange: (r: PrdRequirement) => void; onRemove: () => void }) {
  const w = r.kind === "functional" ? widgetFor(r.text).widget : undefined;
  return (
    <li className="prd-req">
      <span className="prd-req-id mono">{r.id}</span>
      <div className="prd-req-main">
        <textarea rows={Math.max(1, Math.ceil(r.text.length / 64))} value={r.text} onChange={(e) => onChange({ ...r, text: e.target.value })} aria-label={"Requirement " + r.id} />
        <div className="prd-req-meta">
          <div className="seg" role="group" aria-label={"Kind of " + r.id}>
            {(["content", "functional"] as const).map((k) => (
              <button key={k} type="button" className={r.kind === k ? "is-on" : ""} aria-pressed={r.kind === k} onClick={() => onChange({ ...r, kind: k })}>
                {k === "content" ? "Content" : "Functional"}
              </button>
            ))}
          </div>
          <span className="small muted">{r.kind === "functional" ? "On the site: " + WIDGET_WORDS[w || "list"] : "Shown on the site as written"}</span>
        </div>
      </div>
      <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label={"Remove " + r.id} title="Remove this requirement" onClick={onRemove}>
        <Icon name="x" size={14} />
      </button>
    </li>
  );
}

function Items({ items, onChange }: { items: PrdItem[]; onChange: (items: PrdItem[]) => void }) {
  return (
    <div className="prd-items">
      {items.map((x, i) => (
        <div key={i} className="prd-item">
          <input value={x.title} placeholder="Title" onChange={(e) => onChange(items.map((y, k) => (k === i ? { ...y, title: e.target.value } : y)))} aria-label={`Item ${i + 1} title`} />
          <input value={x.text} placeholder="Words" onChange={(e) => onChange(items.map((y, k) => (k === i ? { ...y, text: e.target.value } : y)))} aria-label={`Item ${i + 1} words`} />
          <input className="prd-item-value" value={x.value || ""} placeholder="Value" onChange={(e) => onChange(items.map((y, k) => (k === i ? { ...y, value: e.target.value || undefined } : y)))} aria-label={`Item ${i + 1} value`} />
          <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label={`Remove item ${i + 1}`} onClick={() => onChange(items.filter((_, k) => k !== i))}>
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => onChange([...items, { title: "", text: "" }])}>
        <Icon name="plus" size={14} />
        Add an item
      </button>
    </div>
  );
}

function SectionCard({ s, i, n, prd, onChange, onMove, onRemove }: { s: PrdSection; i: number; n: number; prd: Prd; onChange: (s: PrdSection) => void; onMove: (d: -1 | 1) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(i < 2);
  const set = (patch: Partial<PrdSection>) => onChange({ ...s, ...patch });
  const v = s.visual;
  return (
    <article className={"prd-section" + (open ? " is-open" : "")}>
      <header className="prd-section-head">
        <button type="button" className="prd-section-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span className="mono prd-num">{String(i + 1).padStart(2, "0")}</span>
          <span className="prd-section-title">
            <b>{s.title || "Untitled section"}</b>
            <span className="small muted">
              {s.requirements.length} requirement{s.requirements.length === 1 ? "" : "s"} · {DIRECTORS[v.director]?.label} · {HERO_TYPES.find((h) => h.id === v.asset)?.label}
            </span>
          </span>
        </button>
        <div className="prd-section-tools">
          <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label="Move up" disabled={i === 0} onClick={() => onMove(-1)}>
            <Icon name="up" size={14} />
          </button>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label="Move down" disabled={i === n - 1} onClick={() => onMove(1)}>
            <Icon name="down" size={14} />
          </button>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label="Remove section" title="Remove this section and its requirements from the PRD" disabled={n <= 1} onClick={onRemove}>
            <Icon name="trash" size={14} />
          </button>
        </div>
      </header>
      {open && (
        <div className="prd-section-body">
          <Field label="Heading" value={s.title} onChange={(title) => set({ title })} />
          <Field label="Purpose (why this section exists)" value={s.purpose} onChange={(purpose) => set({ purpose })} />
          <Field label="What it says" value={s.content} area onChange={(content) => set({ content })} />
          <h4>Items</h4>
          <Items items={s.items} onChange={(items) => set({ items })} />
          <h4>Requirements</h4>
          <ul className="prd-reqs">
            {s.requirements.map((r, k) => (
              <Requirement key={r.id} r={r} onChange={(nr) => set({ requirements: s.requirements.map((x, j) => (j === k ? nr : x)) })} onRemove={() => set({ requirements: s.requirements.filter((_, j) => j !== k) })} />
            ))}
          </ul>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => set({ requirements: [...s.requirements, { id: nextReqId(prd), kind: "content", text: "" }] })}>
            <Icon name="plus" size={14} />
            Add a requirement
          </button>
          <h4>Visual direction</h4>
          <div className="prd-grid">
            <Select label="Director cut" value={v.director} options={directors} onChange={(director) => set({ visual: { ...v, director } })} />
            <Select label="Blend in movement of" value={v.secondary ?? ""} options={[{ id: "", label: "Nothing" }, ...directors.filter((d) => d.id !== v.director)]} onChange={(x) => set({ visual: { ...v, secondary: (x || undefined) as never } })} />
            <Select label="Hero asset" value={v.asset} options={HERO_TYPES} onChange={(asset) => set({ visual: { ...v, asset } })} />
            <Select label="Layout" value={v.layout ?? ""} options={[{ id: "", label: "Director decides" }, ...LAYOUTS]} onChange={(x) => set({ visual: { ...v, layout: (x || undefined) as never } })} />
            <Select label="Background" value={v.background ?? ""} options={[{ id: "", label: "Director decides" }, ...BACKGROUNDS]} onChange={(x) => set({ visual: { ...v, background: (x || undefined) as never } })} />
            <Select label="Animation" value={v.animation ?? ""} options={[{ id: "", label: "Director decides" }, ...ANIMATIONS]} onChange={(x) => set({ visual: { ...v, animation: (x || undefined) as never } })} />
          </div>
          {v.asset !== "none" && <Field label="What the asset shows" value={v.subject} placeholder="realistic human heart" onChange={(subject) => set({ visual: { ...v, subject } })} />}
        </div>
      )}
    </article>
  );
}

export default function PrdEditor({ prd, onChange }: { prd: Prd; onChange: (prd: Prd) => void }) {
  const [adding, setAdding] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<Prd>) => onChange({ ...prd, ...patch, status: "draft" });
  const setSection = (i: number, s: PrdSection) => set({ sections: prd.sections.map((x, k) => (k === i ? s : x)) });
  const move = (i: number, d: -1 | 1) => {
    const list = prd.sections.slice();
    const [s] = list.splice(i, 1);
    list.splice(i + d, 0, s);
    set({ sections: list });
  };
  const add = async () => {
    const title = adding.trim();
    if (!title) return;
    setBusy(true);
    let section: Record<string, unknown> = { title, requirements: [{ kind: looksFunctional(title) ? "functional" : "content", text: title }] };
    try {
      const r = await fetch("/api/prd", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ step: "section", prd, title }) });
      const data = await r.json();
      if (data?.ok && data.section) section = data.section;
    } catch {
      /* the plain section is fine */
    }
    const taken = new Set(prd.sections.map((s) => s.id));
    const id = sectionId(title, taken);
    let n = Number(nextReqId(prd).slice(1));
    const reqs = ((section.requirements as unknown[]) || []).map((r) => ({ ...(typeof r === "string" ? { text: r } : (r as object)), id: "R" + n++ }));
    const next = normalizePrd({ ...prd, sections: [...prd.sections, { ...section, id, requirements: reqs }] }, prd.idea, prd.source);
    set({ sections: next.sections });
    setAdding("");
    setBusy(false);
  };
  const total = prd.sections.reduce((n, s) => n + s.requirements.length, 0);
  return (
    <div className="prd-editor">
      <section className="prd-brief" aria-label="The brief">
        <div className="prd-grid">
          <Field label="Site name" value={prd.name} onChange={(name) => set({ name })} />
          <Field label="Document title" value={prd.title} onChange={(title) => set({ title })} />
        </div>
        <Field label="Summary" value={prd.summary} area onChange={(summary) => set({ summary })} />
        <div className="prd-grid">
          <Field label="Audience" value={prd.audience} area onChange={(audience) => set({ audience })} />
          <Field label="Goals (one per line)" value={prd.goals.join("\n")} area onChange={(g) => set({ goals: g.split("\n").map((x) => x.trim()).filter(Boolean) })} />
        </div>
        <div className="prd-grid prd-grid-4">
          <Field label="Tone" value={prd.tone} onChange={(tone) => set({ tone })} />
          <Select label="Overall Director" value={prd.director} options={directors} onChange={(director) => set({ director })} />
          <label className="prd-field">
            <span>Accent colour</span>
            <input type="color" value={prd.accent} onChange={(e) => set({ accent: e.target.value.toUpperCase() })} />
          </label>
          <Field label="Main button" value={prd.cta.label} onChange={(label) => set({ cta: { ...prd.cta, label } })} />
        </div>
        <div className="prd-grid prd-grid-3">
          <Field label="Email" value={prd.contact.email} onChange={(email) => set({ contact: { ...prd.contact, email } })} />
          <Field label="Phone" value={prd.contact.phone} onChange={(phone) => set({ contact: { ...prd.contact, phone } })} />
          <Field label="Address" value={prd.contact.address} onChange={(address) => set({ contact: { ...prd.contact, address } })} />
        </div>
      </section>

      <div className="prd-sections-head">
        <h3>
          {prd.sections.length} sections, {total} requirements
        </h3>
        <p className="small muted">Every section becomes a section of your site, in this order. Every requirement must appear on it.</p>
      </div>
      {prd.sections.map((s, i) => (
        <SectionCard
          key={s.id}
          s={s}
          i={i}
          n={prd.sections.length}
          prd={prd}
          onChange={(x) => setSection(i, x)}
          onMove={(d) => move(i, d)}
          onRemove={() => {
            if (confirm(`Remove "${s.title}" and its ${s.requirements.length} requirements from the PRD?`)) set({ sections: prd.sections.filter((_, k) => k !== i) });
          }}
        />
      ))}
      <form
        className="prd-add"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <input value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="Add a section, for example: Pricing plans" aria-label="New section" />
        <button type="submit" className="btn btn-sm" disabled={busy || !adding.trim()}>
          <Icon name="plus" size={14} />
          {busy ? "Writing it" : "Add section"}
        </button>
      </form>
    </div>
  );
}
