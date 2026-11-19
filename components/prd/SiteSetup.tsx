"use client";

import { useState } from "react";
import ImageField from "@/components/ImageField";
import Preview from "@/components/Preview";
import { fromBrandColour, TYPE_PAIRINGS } from "@/lib/designs";
import type { Design, Project } from "@/lib/types";
import { HERO_TYPES, LAYOUTS, TEXT_ALIGNS, type Block, type SectionSpec } from "@/template/src/content/blocks";
import type { WebsiteContent } from "@/template/src/content/types";
import { DIRECTOR_IDS, DIRECTORS } from "@/template/src/director";
import SectionControls, { Seg } from "./SectionControls";

// Step 4 of the journey: the confirmed PRD is laid out as a first draft, and the person sets it
// up before the first version is generated. "Whole site" sets the look of every section at once
// (Director, colour, type, theme, corners, spacing, motion, effects); each section then sets its
// own text, items and pictures, layout, hero asset, background, animation and Director.
// Every change shows in the live preview beside it.

const blocksOf = (p: Project) => (p.content as WebsiteContent).blocks ?? [];

export default function SiteSetup({ project, onChange }: { project: Project; onChange: (p: Project) => void }) {
  const blocks = blocksOf(project);
  const [tab, setTab] = useState<string>("site");
  const d = project.design;
  const design = (patch: Partial<Design>) => onChange({ ...project, design: { ...project.design, ...patch } });
  const setBlocks = (fn: (b: Block, k: number) => Block) => onChange({ ...project, content: { ...(project.content as WebsiteContent), blocks: blocks.map(fn) } });
  const allSpecs = (fn: (s: SectionSpec) => SectionSpec) => setBlocks((b) => ({ ...b, spec: fn(b.spec) }));
  const k = blocks.findIndex((b) => b.id === tab);
  const b = k >= 0 ? blocks[k] : null;
  const pair = Math.max(0, TYPE_PAIRINGS.findIndex((x) => x.display === d.fonts.display && x.body === d.fonts.body));
  const same = <T,>(vals: T[]) => (vals.every((v) => v === vals[0]) ? vals[0] : undefined);
  const siteDirector = same(blocks.map((x) => x.spec.director));
  const siteAlign = same(blocks.map((x) => x.spec.text?.align ?? ""));

  const show = (id: string) => {
    setTab(id);
    requestAnimationFrame(() => document.querySelector(`.setup-preview [data-block="${CSS.escape(id)}"]`)?.closest("section")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="setup">
      <div className="setup-side">
        <nav className="setup-tabs" aria-label="What to set up">
          <button type="button" className={tab === "site" ? "is-on" : ""} aria-current={tab === "site" || undefined} onClick={() => setTab("site")}>
            <strong>Whole site</strong>
            <span>Director, colour, type, theme, motion</span>
          </button>
          {blocks.map((x, n) => (
            <button key={x.id} type="button" title={`${LAYOUTS.find((l) => l.id === x.spec.layout)?.label}, ${HERO_TYPES.find((h) => h.id === x.spec.hero.type)?.label.toLowerCase()}, ${DIRECTORS[x.spec.director].label.toLowerCase()}`} className={tab === x.id ? "is-on" : ""} aria-current={tab === x.id || undefined} onClick={() => show(x.id)}>
              <strong>
                {String(n + 1).padStart(2, "0")} {x.heading}
              </strong>
              <span>
                {LAYOUTS.find((l) => l.id === x.spec.layout)?.label}, {HERO_TYPES.find((h) => h.id === x.spec.hero.type)?.label.toLowerCase()}, {DIRECTORS[x.spec.director].label.toLowerCase()}
              </span>
            </button>
          ))}
        </nav>

        <div className="setup-panel">
          <p className="setup-title">{b ? `Section ${k + 1}: ${b.heading}` : "Whole site"}</p>
          {tab === "site" || !b ? (
            <div className="sc">
              <section className="sc-group" aria-label="Director for every section">
                <h4>Director cut for every section</h4>
                <Seg label="Direction" value={(siteDirector ?? "") as string} options={DIRECTOR_IDS.map((id) => ({ id, label: DIRECTORS[id].label }))} onChange={(director) => allSpecs((s) => ({ ...s, director: director as SectionSpec["director"], secondary: s.secondary === director ? undefined : s.secondary }))} />
                <p className="small muted">{siteDirector ? DIRECTORS[siteDirector].note : "Sections use different Directors. Pick one to use it everywhere, or set each section on its own."}</p>
              </section>
              <section className="sc-group" aria-label="Colour and theme">
                <h4>Colour and theme</h4>
                <label className="pe-field sc-color">
                  <span className="pe-lbl">Brand colour</span>
                  <input type="color" value={d.accent} onChange={(e) => onChange({ ...project, design: fromBrandColour(project.design, e.target.value.toUpperCase()) })} />
                </label>
                <Seg label="Theme" value={d.mode} options={[{ id: "auto", label: "Follow the visitor" }, { id: "light", label: "Light" }, { id: "dark", label: "Dark" }]} onChange={(mode) => design({ mode })} />
              </section>
              <section className="sc-group" aria-label="Type">
                <h4>Type</h4>
                <label className="pe-field">
                  <span className="pe-lbl">Typefaces</span>
                  <select value={pair} onChange={(e) => design({ fonts: { ...TYPE_PAIRINGS[Number(e.target.value)] } })}>
                    {TYPE_PAIRINGS.map((x, n) => (
                      <option key={n} value={n}>
                        {x.display} with {x.body}
                      </option>
                    ))}
                  </select>
                </label>
                <Seg label="Text alignment everywhere" value={(siteAlign ?? "mixed") as string} options={[{ id: "", label: "As directed" }, ...TEXT_ALIGNS]} onChange={(align) => allSpecs((s) => ({ ...s, text: { ...s.text, align: (align || undefined) as never } }))} />
              </section>
              <section className="sc-group" aria-label="Shape and spacing">
                <h4>Shape and spacing</h4>
                <label className="pe-field">
                  <span className="pe-lbl">Corners {d.radius}px</span>
                  <input type="range" min={0} max={32} step={1} value={d.radius} onChange={(e) => design({ radius: Number(e.target.value) })} />
                </label>
                <Seg label="Spacing" value={d.density} options={[{ id: "compact", label: "Compact" }, { id: "regular", label: "Regular" }, { id: "airy", label: "Airy" }]} onChange={(density) => design({ density })} />
              </section>
              <section className="sc-group" aria-label="Motion and effects">
                <h4>Motion and effects</h4>
                <Seg label="Motion" value={d.motion} options={[{ id: "none", label: "None" }, { id: "subtle", label: "Subtle" }, { id: "expressive", label: "Expressive" }]} onChange={(motion) => design({ motion })} />
                <div className="setup-checks">
                  {(
                    [
                      ["smooth", "Smooth, weighted scrolling"],
                      ["magnetic", "Buttons lean toward the pointer"],
                      ["tilt", "Cards tilt in 3D"],
                      ["cursor", "Soft custom cursor"],
                      ["grain", "Film grain"],
                      ["progress", "Reading progress bar"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="row" style={{ gap: 8 }}>
                      <input type="checkbox" checked={!!d[key]} onChange={(e) => design({ [key]: e.target.checked } as Partial<Design>)} />
                      <span className="small">{label}</span>
                    </label>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <>
              <SectionControls block={b} onChange={(spec) => setBlocks((x, n) => (n === k ? { ...x, spec } : x))} />
              {b.spec.items?.images && b.items.length > 0 && (
                <section className="sc-group setup-pics" aria-label="Item pictures">
                  <h4>Pictures for each item</h4>
                  {b.items.map((it, n) => (
                    <ImageField key={n} label={it.title || "Item " + (n + 1)} value={it.imageUrl || ""} onChange={(v) => setBlocks((x, m) => (m === k ? { ...x, items: x.items.map((y, j) => (j === n ? { ...y, imageUrl: v || undefined } : y)) } : x))} />
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </div>
      <div className="setup-preview" aria-label="Live preview">
        <Preview kind={project.kind} design={project.design} content={project.content!} experience={project.experience} compact />
      </div>
    </div>
  );
}
