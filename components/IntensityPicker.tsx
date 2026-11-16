"use client";

import { useEffect, useState } from "react";
import { LEVELS, intensityPatch, levelOf } from "@/lib/intensity";
import type { Design } from "@/lib/types";

// The animation engine's main dial: one slider from 1 (still background, fades and hover) to
// 10 (the densest, fastest scene). The scene itself is picked in the Scenes panel.

export default function IntensityPicker({ design, category, onChange }: { design: Design; category: string; onChange: (patch: Partial<Design>) => void }) {
  const current = design.intensity ?? (design.heroStyle === "journey" || design.heroStyle === "atmos" ? 8 : 5);
  const [n, setN] = useState(current);
  useEffect(() => setN(current), [current]);
  const level = levelOf(n);
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
    </div>
  );
}
