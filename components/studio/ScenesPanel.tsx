"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { intensityPatch } from "@/lib/intensity";
import type { Design } from "@/lib/types";
import { AtmosThumb } from "@/template/src/atmos/Atmos.jsx";
import { MOODS, SCENES, SCENE_GROUPS, atmosById, pickAtmos, sceneHasMood, siteAtmos, type AtmosDef } from "@/template/src/atmos/catalog.js";

// The Scenes panel: the world the site opens in. One live drop-down holds every scene in the
// library (living photos, our own shaders, Paper Shaders and okaybabe), filtered by mood and
// searchable. Every change blends the preview through the scenes' flat colours. "Surprise me"
// rolls a scene, and "Play the reel" flips through them on its own until you stop it.

const LAYOUTS: { id: NonNullable<Design["atmosLayout"]>; label: string }[] = [
  { id: "center", label: "Centre" },
  { id: "low", label: "Low" },
  { id: "high", label: "High" },
  { id: "panel", label: "Glass panel" },
  { id: "wordmark", label: "Giant word" },
];
const REEL_MS = 3600;

function familyNote(s: AtmosDef) {
  if (s.family === "plate") return "Living photo · our engine";
  if (s.family === "shader") return "Original shader";
  if (s.family === "paper") return "Paper Shaders · Apache-2.0";
  return "okaybabe · MIT";
}

export default function ScenesPanel({ design, category, words, onChange }: { design: Design; category: string; words: string; onChange: (patch: Partial<Design>) => void }) {
  const current = atmosById(siteAtmos(design, category, words));
  const isAtmos = design.heroStyle === "atmos";
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [mood, setMood] = useState<string>("");
  const [reel, setReel] = useState(false);
  const [active, setActive] = useState(current.id);
  const listRef = useRef<HTMLDivElement>(null);
  const before = useRef(current.id);

  const pick = (id: string) => onChange({ atmos: id, heroStyle: "atmos" });

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return SCENES.filter((s) => (!mood || sceneHasMood(s, mood)) && (!t || (s.label + " " + s.note + " " + s.group + " " + s.moods.join(" ")).toLowerCase().includes(t)));
  }, [q, mood]);
  const grouped = useMemo(() => SCENE_GROUPS.map((g) => ({ g, items: list.filter((s) => s.group === g) })).filter((x) => x.items.length), [list]);
  const flat = useMemo(() => grouped.flatMap((x) => x.items), [grouped]);

  // Suggestions: the director's pick for this kind of site, then scenes that share its mood.
  const suggested = useMemo(() => {
    const first = atmosById(pickAtmos(category, words));
    const rest = SCENES.filter((s) => s.id !== first.id && s.moods.some((m) => first.moods.includes(m) && m !== "light"));
    const seed = [...category].reduce((n, c) => n + c.charCodeAt(0), 0);
    return [first, ...[0, 1, 2].map((i) => rest[(seed * (i + 3) + i * 7) % Math.max(1, rest.length)])].filter((s, i, a) => s && a.findIndex((x) => x.id === s.id) === i);
  }, [category, words]);

  // Play the reel: flip through the filtered scenes until stopped.
  useEffect(() => {
    if (!reel) return;
    const pool = flat.length ? flat : SCENES;
    let i = Math.max(0, pool.findIndex((s) => s.id === current.id));
    const t = setInterval(() => {
      i = (i + 1) % pool.length;
      pick(pool[i].id);
    }, REEL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reel, flat]);

  useEffect(() => setActive(current.id), [current.id]);
  useEffect(() => {
    if (!open) return;
    before.current = current.id;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-id="${current.id}"]`);
    el?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const move = (dir: number) => {
    if (!flat.length) return;
    const i = flat.findIndex((s) => s.id === active);
    const next = flat[(i + dir + flat.length) % flat.length];
    setActive(next.id);
    pick(next.id); // the preview follows as you move: every step blends
    listRef.current?.querySelector<HTMLElement>(`[data-id="${next.id}"]`)?.scrollIntoView({ block: "nearest" });
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") (e.preventDefault(), move(1));
    else if (e.key === "ArrowUp") (e.preventDefault(), move(-1));
    else if (e.key === "Enter") (e.preventDefault(), setOpen(false));
    else if (e.key === "Escape") (e.preventDefault(), pick(before.current), setOpen(false));
  };
  const surprise = () => {
    setReel(false);
    const pool = (flat.length ? flat : SCENES).filter((s) => s.id !== current.id);
    pick(pool[Math.floor(Math.random() * pool.length)].id);
  };
  const energy = design.intensity ?? 8;

  return (
    <div className="scn">
      <div className="scn-now">
        <AtmosThumb id={current.id} className="scn-now-pic" />
        <div className="scn-now-text">
          <span className="lbl">{isAtmos ? "Your site opens in" : "Not showing yet"}</span>
          <strong>{current.label}</strong>
          <span className="small muted">{current.note}</span>
          <span className="scn-tag mono">{familyNote(current)}</span>
        </div>
      </div>

      <div className="scn-combo">
        <button type="button" className="scn-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span className="scn-swatch" style={{ background: current.flat }} aria-hidden="true" />
          <span>{current.label}</span>
          <span className="small muted">{SCENES.length} scenes</span>
          <Icon name="down" size={14} />
        </button>
        {open && (
          <div className="scn-pop" onKeyDown={onKey}>
            <input className="input scn-search" placeholder="Search scenes: ocean, violet, warm..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search scenes" autoFocus aria-controls="scn-list" aria-activedescendant={"scn-" + active} />
            <div className="scn-moods" role="group" aria-label="Filter by mood">
              <button type="button" className={!mood ? "is-on" : ""} aria-pressed={!mood} onClick={() => setMood("")}>
                All
              </button>
              {MOODS.map((m) => (
                <button key={m} type="button" className={mood === m ? "is-on" : ""} aria-pressed={mood === m} onClick={() => setMood(m === mood ? "" : m)}>
                  {m === "brand" ? "violet" : m}
                </button>
              ))}
            </div>
            <div className="scn-list" id="scn-list" role="listbox" aria-label="Scenes" ref={listRef} tabIndex={-1}>
              {grouped.map(({ g, items }) => (
                <div key={g} role="group" aria-label={g}>
                  <div className="scn-group small muted">{g}</div>
                  {items.map((s) => (
                    <div
                      key={s.id}
                      id={"scn-" + s.id}
                      data-id={s.id}
                      role="option"
                      aria-selected={s.id === current.id}
                      className={"scn-opt" + (s.id === current.id ? " is-on" : "") + (s.id === active ? " is-active" : "")}
                      onClick={() => (setReel(false), setActive(s.id), pick(s.id))}
                      onDoubleClick={() => setOpen(false)}
                    >
                      <AtmosThumb id={s.id} />
                      <span>
                        <strong>{s.label}</strong>
                        <span className="small muted">{s.note}</span>
                      </span>
                    </div>
                  ))}
                </div>
              ))}
              {!flat.length && <p className="small muted scn-empty">No scene matches. Try another word or mood.</p>}
            </div>
            <div className="scn-pop-foot small muted">
              <span>↑ ↓ to flip through · Enter to keep · Esc to undo</span>
              <button type="button" className="btn btn-sm" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="scn-actions">
        <button type="button" className="btn btn-sm" onClick={surprise}>
          <Icon name="shuffle" size={14} /> Surprise me
        </button>
        <button type="button" className={"btn btn-sm" + (reel ? " btn-primary" : "")} aria-pressed={reel} onClick={() => setReel((v) => !v)}>
          <Icon name={reel ? "pause" : "play"} size={14} /> {reel ? "Stop the reel" : "Play the reel"}
        </button>
      </div>

      <div className="scn-block">
        <span className="lbl">Made for your kind of site</span>
        <div className="scn-suggest">
          {suggested.map((s) => (
            <button key={s.id} type="button" className={"ix-atmos-tile" + (s.id === current.id ? " is-on" : "")} aria-pressed={s.id === current.id} onClick={() => (setReel(false), pick(s.id))}>
              <AtmosThumb id={s.id} />
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="scn-block">
        <span className="lbl">Where the words sit</span>
        <div className="seg seg-wrap" role="radiogroup" aria-label="Where the words sit">
          {LAYOUTS.map((l) => {
            const on = (design.atmosLayout || current.layout) === l.id;
            return (
              <button key={l.id} type="button" role="radio" aria-checked={on} className={on ? "is-on" : ""} onClick={() => onChange({ atmosLayout: l.id })}>
                {l.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="scn-block">
        <span className="lbl">Scene colours</span>
        <div className="seg" role="radiogroup" aria-label="Scene colours">
          {(["scene", "brand"] as const).map((t) => {
            const on = (design.sceneTint || "scene") === t;
            return (
              <button key={t} type="button" role="radio" aria-checked={on} className={on ? "is-on" : ""} onClick={() => onChange({ sceneTint: t })}>
                {t === "scene" ? "Its own" : "My brand colour"}
              </button>
            );
          })}
        </div>
        {design.sceneTint === "brand" && current.family !== "paper" && <p className="small muted">Brand colour recolours the Paper Shaders scenes. This scene keeps its own light.</p>}
      </div>

      <div className="scn-block">
        <div className="row between">
          <span className="lbl">Energy</span>
          <span className="mono small">{energy}/10</span>
        </div>
        <input className="ix-range" type="range" min={1} max={10} step={1} value={energy} aria-label="How much the scene moves, 1 to 10" style={{ "--ix": (energy - 1) / 9 } as React.CSSProperties} onChange={(e) => onChange(intensityPatch(Number(e.target.value), design, category))} />
        <p className="small muted">1 and 2 hold a still frame. From 5 the scene follows the pointer, and it pulls focus as the page scrolls.</p>
      </div>
    </div>
  );
}
