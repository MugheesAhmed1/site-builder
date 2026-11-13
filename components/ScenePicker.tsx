"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { CONCEPT_STYLES, SCENES, SCENE_GROUPS, SCENE_PALETTES, sceneType, type SceneDef } from "@/template/src/scenes.js";
import { conceptsFor } from "@/template/src/concepts.js";
import { Scene } from "@/template/src/Scenes.jsx";
import { scenesFor } from "@/lib/fit";
import type { Design } from "@/lib/types";

// Live scenes: particles, nature, your own photo and 3D physics. Each one reacts to the
// pointer, to taps and to drags. Shown behind the opening words, or as the opening visual.

const PAGE = 12;

// Used only here so photo scenes have something to show before people add their own photo.
const SAMPLE_PHOTO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6b26b"/><stop offset="0.55" stop-color="#e98a6d"/><stop offset="1" stop-color="#6d4c7d"/></linearGradient></defs><rect width="800" height="600" fill="url(#s)"/><circle cx="560" cy="250" r="70" fill="#ffe7a8"/><path d="M0 420 L160 300 L300 400 L440 280 L620 410 L800 320 L800 600 L0 600Z" fill="#3c3552"/><path d="M0 480 L200 400 L380 470 L560 390 L800 470 L800 600 L0 600Z" fill="#241f33"/></svg>`
  );

export default function ScenePicker({ design, onChange, category, name, words, photo, only = "scenes", scope = "fit" }: { design: Design; onChange: (p: Partial<Design>) => void; category: string; name: string; words: string[]; photo?: string; only?: "concepts" | "scenes"; scope?: "fit" | "all" }) {
  const [group, setGroup] = useState("fit");
  const [style, setStyle] = useState("all");
  const [more, setMore] = useState<Record<string, boolean>>({});
  const [pal, setPal] = useState("all");
  const [shown, setShown] = useState(PAGE);
  const fit = scenesFor(category);
  const scene = design.scene ?? null;
  const mode = design.sceneMode ?? "backdrop";
  const list = useMemo(() => {
    const l = SCENES.filter((s) => s.group !== "concept" && (group === "fit" ? fit.includes(s.type) : group === "all" || s.group === group) && (pal === "all" || s.palette === pal));
    return group === "fit" ? [...l].sort((a, b) => fit.indexOf(a.type) - fit.indexOf(b.type)) : l;
  }, [group, pal, fit]);
  const conceptFit = useMemo(() => conceptsFor(category), [category]);
  const concepts = useMemo(() => {
    const l = SCENES.filter((s) => s.group === "concept" && (style === "all" || s.style === style));
    if (scope === "all") return l;
    // Best for this category first, then the rest, so nothing is ever hidden.
    const rank = (s: SceneDef) => (conceptFit.includes(s.type) ? conceptFit.indexOf(s.type) : 100 + l.indexOf(s));
    return [...l].sort((a, b) => rank(a) - rank(b));
  }, [style, scope, conceptFit]);
  const img = (s: SceneDef) => (s.group === "photo" ? photo || SAMPLE_PHOTO : undefined);
  const choose = (s: SceneDef) => onChange(mode === "visual" ? { scene: s, sceneMode: mode, heroStyle: "stage" } : { scene: s, sceneMode: mode });

  const tile = (s: SceneDef, star = false) => {
    const on = scene?.id === s.id;
    return (
      <button key={s.id} type="button" className={"scene-tile" + (on ? " is-on" : "") + (s.group === "concept" ? " is-concept" : "")} aria-pressed={on} onClick={() => choose(s)}>
        <span className="scene-art">
          <Scene def={s} text={name} words={words} image={img(s)} preview thumb />
        </span>
        <span className="scene-meta">
          <span className="mono muted small">
            {s.id}
            {star && <span className="concept-fit"> · Best fit</span>}
          </span>
          <b>{s.name}</b>
        </span>
        {on && (
          <span className="mt-check" aria-hidden="true">
            <Icon name="check" size={14} />
          </span>
        )}
      </button>
    );
  };
  const nowPanel = (
    <div className="panel scene-now">
      <div className="scene-now-art">{scene ? <Scene def={scene} text={name} words={words} image={img(scene)} preview /> : <span className="small muted" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>No scene yet</span>}</div>
      <div className="stack" style={{ gap: 10 }}>
        <span className="lbl" style={{ margin: 0 }}>{scene?.group === "concept" ? "Scene concept" : "Live scene"}</span>
        <b>{scene ? scene.name : "None"}</b>
        <p className="small muted">{scene ? sceneType(scene.type).hint : only === "concepts" ? "Pick a concept below: a parrot that flies in, a whale swimming past, a walk through the jungle and more. It plays behind your opening words." : "Pick one below. Every scene moves with the pointer and reacts to taps."}</p>
        <div className="seg" role="group" aria-label="Where the scene goes">
          <button aria-pressed={mode === "backdrop"} className={mode === "backdrop" ? "is-on" : ""} onClick={() => onChange({ sceneMode: "backdrop" })} disabled={!scene}>
            Behind the words
          </button>
          <button aria-pressed={mode === "visual"} className={mode === "visual" ? "is-on" : ""} onClick={() => onChange({ sceneMode: "visual", heroStyle: "stage" })} disabled={!scene}>
            Main visual
          </button>
        </div>
        {scene && (
          <button className="btn btn-ghost btn-sm" style={{ justifySelf: "start" }} onClick={() => onChange({ scene: null })}>
            <Icon name="x" size={14} />
            No scene
          </button>
        )}
        {scene?.group === "photo" && !photo && <p className="small muted">Showing a sample picture. Add your own photo with Edit on page in the last step, or in your details.</p>}
      </div>
    </div>
  );

  if (only === "concepts") {
    const sections = style === "all" ? CONCEPT_STYLES.map((st) => ({ ...st, items: concepts.filter((s) => s.style === st.id) })) : [{ ...CONCEPT_STYLES.find((x) => x.id === style)!, items: concepts }];
    return (
      <div className="stack scene-picker" style={{ gap: 14 }}>
        {nowPanel}
        <div className="chips-scroll" role="group" aria-label="Concept style">
          {[{ id: "all", name: "Every style" }, ...CONCEPT_STYLES].map((g) => (
            <button key={g.id} className={"chip chip-sm" + (style === g.id ? " is-on" : "")} aria-pressed={style === g.id} onClick={() => setStyle(g.id)}>
              {g.name} <span className="muted">{g.id === "all" ? SCENES.filter((s) => s.group === "concept").length : SCENES.filter((s) => s.style === g.id).length}</span>
            </button>
          ))}
        </div>
        <p className="hint">
          {concepts.length} scene concepts{scope === "fit" ? ", the best for this kind of site first" : ""}. Each one is a small animated film: move your pointer over a tile to play with it, and choose one to put it behind your opening words.
        </p>
        {sections.map((sec) => {
          const open = more[sec.id] || style !== "all";
          const items = open ? sec.items : sec.items.slice(0, 6);
          return (
            <section key={sec.id} className="concept-section" aria-label={sec.name}>
              {style === "all" && (
                <h3 className="concept-head">
                  {sec.name} <span className="mono muted small">{sec.items.length}</span>
                </h3>
              )}
              <div className="scene-grid">{items.map((s) => tile(s, scope === "fit" && conceptFit.slice(0, 8).includes(s.type)))}</div>
              {!open && sec.items.length > 6 && (
                <div className="row" style={{ justifyContent: "center", marginTop: 10 }}>
                  <button className="btn btn-sm" onClick={() => setMore((m) => ({ ...m, [sec.id]: true }))}>
                    Show all {sec.items.length} {sec.name.toLowerCase()}
                  </button>
                </div>
              )}
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <div className="stack scene-picker" style={{ gap: 14 }}>
      {nowPanel}

      <div className="chips-scroll" role="group" aria-label="Kind of scene">
        {[{ id: "fit", name: "Best for this" }, { id: "all", name: "Everything" }, ...SCENE_GROUPS.filter((g) => g.id !== "concept")].map((g) => (
          <button key={g.id} className={"chip chip-sm" + (group === g.id ? " is-on" : "")} aria-pressed={group === g.id} onClick={() => (setGroup(g.id), setShown(PAGE))}>
            {g.name}
          </button>
        ))}
      </div>
      <div className="chips-scroll" role="group" aria-label="Colours">
        {[{ id: "all", name: "Every colour" }, ...SCENE_PALETTES].map((p) => (
          <button key={p.id} className={"chip chip-sm" + (pal === p.id ? " is-on" : "")} aria-pressed={pal === p.id} onClick={() => (setPal(p.id), setShown(PAGE))}>
            {p.name}
          </button>
        ))}
      </div>
      <p className="hint">{list.length} live scenes shown. Move your pointer over one to play with it.</p>
      <div className="scene-grid">
        {list.slice(0, shown).map((s) => tile(s))}
      </div>
      {list.length > shown && (
        <div className="row" style={{ justifyContent: "center" }}>
          <button className="btn" onClick={() => setShown((n) => n + PAGE)}>
            Show more ({list.length - shown} left)
          </button>
        </div>
      )}
    </div>
  );
}
