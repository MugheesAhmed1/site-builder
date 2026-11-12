"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { CATEGORY_GROUPS } from "@/lib/fit";
import type { SiteKind } from "@/lib/types";
import { CONCEPT_STYLES, SCENES, sceneType, type SceneDef } from "@/template/src/scenes.js";
import { conceptsFor } from "@/template/src/concepts.js";
import { Scene } from "@/template/src/Scenes.jsx";

// The home page showcase of scene concepts: animated set pieces (a parrot flying in, a whale
// swimming past, a jungle walk) by style and by kind of site. "Use this concept" starts a
// site with it already behind the opening words.
const ALL = SCENES.filter((s) => s.group === "concept");
// With every style shown, the first row mixes the four looks so each one is visible.
const LEAD = ["parrot", "p-whale", "jungle", "c-whale", "whale", "n-moonwhale", "safari", "c-rocket", "monkey", "p-parrot", "dolphins", "n-savanna"];
const leadRank = (t: string) => (LEAD.includes(t) ? LEAD.indexOf(t) : 100);
const SHOW = 8;

export default function ConceptShowcase({ startKind }: { startKind: (k: SiteKind, cat?: string, label?: string, sceneId?: string) => void }) {
  const [style, setStyle] = useState("all");
  const [cat, setCat] = useState("any");
  const [pick, setPick] = useState<string>(ALL[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const list = useMemo(() => {
    const l = ALL.filter((s) => style === "all" || s.style === style);
    if (cat === "any") return style === "all" ? [...l].sort((a, b) => leadRank(a.type) - leadRank(b.type)) : l;
    const fit = conceptsFor(cat);
    return l.filter((s) => fit.includes(s.type)).sort((a, b) => fit.indexOf(a.type) - fit.indexOf(b.type));
  }, [style, cat]);
  const featured: SceneDef | undefined = list.find((s) => s.id === pick) ?? list[0];
  const shown = open ? list : list.slice(0, SHOW);
  const group = CATEGORY_GROUPS.find((g) => g.items.some((x) => x.id === cat));
  const label = group?.items.find((x) => x.id === cat)?.label;
  const use = (s: SceneDef) => {
    const kind: SiteKind = group?.kind ?? "website";
    startKind(kind, cat === "any" ? undefined : cat, cat === "any" || cat === "portfolio" ? undefined : label, s.id);
  };

  return (
    <section className="concept-show" aria-labelledby="concept-title">
      <div className="cat-head">
        <p className="concept-kicker mono">New · {ALL.length} scene concepts</p>
        <h2 id="concept-title">Open your site with a scene</h2>
        <p className="muted">A parrot that flies in and lands beside your name, a whale gliding past, a walk through the jungle, rockets, dolphins, lanterns and more. Real-life photos, particles, painted nature or cartoon. Move your pointer over them, they react.</p>
      </div>

      <div className="concept-bar">
        <div className="chips-scroll" role="group" aria-label="Style">
          {[{ id: "all", name: "Every style" }, ...CONCEPT_STYLES].map((g) => (
            <button key={g.id} type="button" className={"chip chip-sm" + (style === g.id ? " is-on" : "")} aria-pressed={style === g.id} onClick={() => (setStyle(g.id), setOpen(false))}>
              {g.name}
            </button>
          ))}
        </div>
        <select aria-label="Best for" value={cat} onChange={(e) => (setCat(e.target.value), setOpen(false))}>
          <option value="any">Best for any site</option>
          {CATEGORY_GROUPS.map((g) => (
            <optgroup key={g.title} label={g.title}>
              {g.items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {featured && (
        <div className="concept-feature">
          <div className="concept-stage">
            <Scene key={featured.id} def={featured} text="Your brand" words={["Design", "Build", "Launch"]} />
            <div className="concept-stage-copy" aria-hidden="true">
              <span className="concept-stage-name">Your headline here</span>
            </div>
          </div>
          <div className="concept-feature-text">
            <span className="mono muted small">
              {featured.id} · {CONCEPT_STYLES.find((x) => x.id === featured.style)?.name}
            </span>
            <h3>{featured.name}</h3>
            <p className="muted">{sceneType(featured.type).hint}</p>
            <button type="button" className="btn btn-primary" onClick={() => use(featured)}>
              Use this concept
              <Icon name="arrow" size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="scene-grid concept-grid">
        {shown.map((s) => (
          <button key={s.id} type="button" className={"scene-tile is-concept" + (featured?.id === s.id ? " is-on" : "")} aria-pressed={featured?.id === s.id} onClick={() => setPick(s.id)}>
            <span className="scene-art">
              <Scene def={s} text="Your brand" words={[]} preview />
            </span>
            <span className="scene-meta">
              <span className="mono muted small">{CONCEPT_STYLES.find((x) => x.id === s.style)?.name}</span>
              <b>{s.name}</b>
            </span>
          </button>
        ))}
      </div>
      {list.length > SHOW && !open && (
        <div className="row" style={{ justifyContent: "center", marginTop: 14 }}>
          <button type="button" className="btn" onClick={() => setOpen(true)}>
            Show all {list.length} concepts
          </button>
        </div>
      )}
    </section>
  );
}
