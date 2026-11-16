"use client";

import { useState } from "react";
import { LEVELS, levelOf } from "@/lib/intensity";

// A live taste of the intensity dial: the little stage changes with the slider, from a
// quiet fade to a creature crossing a 3D-feeling sea.

export default function IntensityDemo() {
  const [n, setN] = useState(7);
  const level = levelOf(n);
  return (
    <div className="ixd" data-level={level.name.toLowerCase()}>
      <div className="ixd-stage" aria-hidden="true">
        <div className="ixd-sky" />
        <div className="ixd-particles">
          {Array.from({ length: 24 }, (_, i) => (
            <i key={i} style={{ "--i": i } as React.CSSProperties} />
          ))}
        </div>
        <div className="ixd-creature" />
        <div className="ixd-card ixd-card-a">
          <b>Fresh bread daily</b>
          <span />
          <span />
        </div>
        <div className="ixd-card ixd-card-b">
          <b>Order online</b>
          <span />
        </div>
        <div className="ixd-title">
          <span>Made</span> <span>by</span> <span>hand</span>
        </div>
      </div>
      <div className="ixd-controls">
        <div className="ixd-num">
          <span className="mono">{String(n).padStart(2, "0")}</span>
          <b>{level.name}</b>
        </div>
        <input type="range" min={1} max={10} value={n} onChange={(e) => setN(Number(e.target.value))} aria-label="Animation intensity" aria-valuetext={`${n}, ${level.name}`} style={{ "--ix": (n - 1) / 9 } as React.CSSProperties} />
        <div className="ixd-levels">
          {LEVELS.map((l) => (
            <button key={l.name} type="button" className={l.name === level.name ? "is-on" : ""} onClick={() => setN(l.min === 1 ? 2 : l.min)}>
              <b>{l.name}</b>
              <span>{l.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
