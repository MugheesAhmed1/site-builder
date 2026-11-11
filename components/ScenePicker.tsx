"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { SCENES, SCENE_GROUPS, SCENE_PALETTES, sceneType, type SceneDef } from "@/template/src/scenes.js";
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

export default function ScenePicker({ design, onChange, category, name, words, photo }: { design: Design; onChange: (p: Partial<Design>) => void; category: string; name: string; words: string[]; photo?: string }) {
  const [group, setGroup] = useState("fit");
  const [pal, setPal] = useState("all");
  const [shown, setShown] = useState(PAGE);
  const fit = scenesFor(category);
  const scene = design.scene ?? null;
  const mode = design.sceneMode ?? "backdrop";
  const list = useMemo(() => {
    const l = SCENES.filter((s) => (group === "fit" ? fit.includes(s.type) : group === "all" || s.group === group) && (pal === "all" || s.palette === pal));
    return group === "fit" ? [...l].sort((a, b) => fit.indexOf(a.type) - fit.indexOf(b.type)) : l;
  }, [group, pal, fit]);
  const img = (s: SceneDef) => (s.group === "photo" ? photo || SAMPLE_PHOTO : undefined);
  const choose = (s: SceneDef) => onChange(mode === "visual" ? { scene: s, sceneMode: mode, heroStyle: "stage" } : { scene: s, sceneMode: mode });

  return (
    <div className="stack scene-picker" style={{ gap: 14 }}>
      <div className="panel scene-now">
        <div className="scene-now-art">{scene ? <Scene def={scene} text={name} words={words} image={img(scene)} preview /> : <span className="small muted" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>No live scene</span>}</div>
        <div className="stack" style={{ gap: 10 }}>
          <span className="lbl" style={{ margin: 0 }}>Live scene</span>
          <b>{scene ? scene.name : "None"}</b>
          <p className="small muted">{scene ? sceneType(scene.type).hint : "Pick one below. Every scene moves with the pointer and reacts to taps."}</p>
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

      <div className="chips-scroll" role="group" aria-label="Kind of scene">
        {[{ id: "fit", name: "Best for this" }, { id: "all", name: "Everything" }, ...SCENE_GROUPS].map((g) => (
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
        {list.slice(0, shown).map((s) => {
          const on = scene?.id === s.id;
          return (
            <button key={s.id} type="button" className={"scene-tile" + (on ? " is-on" : "")} aria-pressed={on} onClick={() => choose(s)}>
              <span className="scene-art">
                <Scene def={s} text={name} words={words} image={img(s)} preview />
              </span>
              <span className="scene-meta">
                <span className="mono muted small">{s.id}</span>
                <b>{s.name}</b>
              </span>
              {on && (
                <span className="mt-check" aria-hidden="true">
                  <Icon name="check" size={14} />
                </span>
              )}
            </button>
          );
        })}
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
