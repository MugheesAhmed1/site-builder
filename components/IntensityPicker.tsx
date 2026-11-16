"use client";

import { useEffect, useState } from "react";
import { LEVELS, intensityPatch, levelOf } from "@/lib/intensity";
import type { Design } from "@/lib/types";
import { CHARACTERS, ENVIRONMENTS, normalizeStory } from "@/template/src/story.js";

// The animation engine's main dial: one slider from 1 (fades and hover) to 10 (a full 3D
// journey). At 10 the world and the creature can be picked.

export default function IntensityPicker({ design, category, onChange }: { design: Design; category: string; onChange: (patch: Partial<Design>) => void }) {
  const current = design.intensity ?? (design.heroStyle === "journey" ? 10 : 5);
  const [n, setN] = useState(current);
  useEffect(() => setN(current), [current]);
  const level = levelOf(n);
  const story = normalizeStory(design.story);
  const commit = (v: number) => onChange(intensityPatch(v, design, category));
  return (
    <div className="panel ix">
      <div className="row between">
        <span className="lbl">Animation intensity</span>
        <span className="ix-num mono" aria-hidden="true">
          {n}
          <span className="muted">/10</span>
        </span>
      </div>
      <input
        className="ix-range"
        type="range"
        min={1}
        max={10}
        step={1}
        value={n}
        aria-label="Animation intensity from 1 to 10"
        aria-valuetext={`${n}, ${level.name}`}
        style={{ "--ix": (n - 1) / 9 } as React.CSSProperties}
        onChange={(e) => setN(Number(e.target.value))}
        onPointerUp={() => commit(n)}
        onKeyUp={() => commit(n)}
        onBlur={() => n !== current && commit(n)}
      />
      <div className="ix-scale" aria-hidden="true">
        {LEVELS.map((l) => (
          <button key={l.name} type="button" className={level.name === l.name ? "is-on" : ""} onClick={() => (setN(l.min), commit(l.min))}>
            {l.name}
          </button>
        ))}
      </div>
      <p className="small muted ix-text">{level.text}</p>
      {n >= 10 && design.heroStyle === "journey" && (
        <div className="ix-world">
          <div>
            <span className="lbl">World</span>
            <div className="ix-chips" role="radiogroup" aria-label="World">
              {ENVIRONMENTS.map((e) => (
                <button key={e.id} type="button" role="radio" aria-checked={story.scene === e.id} className={"chip" + (story.scene === e.id ? " is-on" : "")} onClick={() => onChange({ story: { ...story, scene: e.id, character: e.character } })}>
                  {e.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="lbl">Creature</span>
            <div className="ix-chips" role="radiogroup" aria-label="Creature">
              {CHARACTERS.map((c) => (
                <button key={c.id} type="button" role="radio" aria-checked={story.character === c.id} className={"chip" + (story.character === c.id ? " is-on" : "")} onClick={() => onChange({ story: { ...story, character: c.id } })}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <p className="small muted">Scroll the preview to fly through it. Point at the creature, tap it, or press “Let it listen” and talk to it.</p>
        </div>
      )}
    </div>
  );
}
