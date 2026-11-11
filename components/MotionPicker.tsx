"use client";

import { useAnimate, useReducedMotion } from "motion/react";
import { stagger } from "motion";
import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { MOTIONS, REST, REVEAL_NAMES, TEMPO_NAMES, motionById, type MotionStyle } from "@/template/src/motion.js";
import type { Design } from "@/lib/types";

// The animation step: 144 styles plus "Still", each previewed on a tiny mock page with
// the same Motion keyframes the finished site uses. Hover, focus or tap a tile to play it.

const HEAD: Record<string, Record<string, (string | number)[]>> = {
  words: { opacity: [0, 1], y: ["0.45em", "0em"] },
  mask: { y: ["105%", "0%"] },
  letters: { opacity: [0, 1], y: ["0.35em", "0em"] },
  block: { opacity: [0, 1], y: [10, 0] },
};

function keyframes(from: Record<string, string | number>) {
  const kf: Record<string, (string | number)[]> = {};
  for (const [k, v] of Object.entries(from)) kf[k] = k === "transformPerspective" ? [v, v] : [v, REST[k]];
  if (!("opacity" in kf)) kf.opacity = [1, 1];
  return kf;
}

function Tile({ m, active, onPick }: { m: MotionStyle; active: boolean; onPick: () => void }) {
  const [scope, animate] = useAnimate();
  const reduce = useReducedMotion();
  const play = () => {
    if (!m.from || !scope.current) return;
    const t = (m.transition ?? {}) as Record<string, unknown>;
    if (reduce) {
      animate(scope.current.querySelectorAll(".mt-part, .mt-block"), { opacity: [0, 1] }, { duration: 0.3 });
      return;
    }
    const parts = scope.current.querySelectorAll(".mt-part");
    animate(parts, HEAD[m.headline] ?? HEAD.block, { ...t, delay: stagger(m.headline === "letters" ? 0.02 : m.stagger) });
    animate(scope.current.querySelectorAll(".mt-block"), keyframes(m.from), { ...t, delay: stagger(m.stagger, { startDelay: 0.18 }) });
  };
  const word = m.headline === "letters" ? "Hello".split("") : ["Hi,", "I'm", "Sara"];
  return (
    <button
      type="button"
      className={"mt" + (active ? " is-on" : "") + (m.from ? "" : " is-still")}
      aria-pressed={active}
      onMouseEnter={play}
      onFocus={play}
      onClick={() => {
        onPick();
        play();
      }}
    >
      <span className="mt-stage" ref={scope} aria-hidden="true">
        <span className={"mt-head" + (m.headline === "mask" ? " is-mask" : "")}>
          {word.map((w, i) => (
            <span className="mt-word" key={i}>
              <span className="mt-part">{w}</span>
            </span>
          ))}
        </span>
        <span className="mt-blocks">
          <span className="mt-block" />
          <span className="mt-block" />
          <span className="mt-block" />
        </span>
      </span>
      <span className="mt-meta">
        <span className="mono muted">{m.id}</span>
        <span className="mt-name">{m.name}</span>
      </span>
      {active && (
        <span className="mt-check" aria-hidden="true">
          <Icon name="check" size={14} />
        </span>
      )}
    </button>
  );
}

export default function MotionPicker({ design, onChange }: { design: Design; onChange: (patch: Partial<Design>) => void }) {
  const [reveal, setReveal] = useState("all");
  const [tempo, setTempo] = useState("all");
  const current = design.motion === "none" ? "M-000" : design.anim;
  const list = useMemo(() => MOTIONS.filter((m) => (reveal === "all" || m.reveal === reveal || m.id === "M-000") && (tempo === "all" || m.tempo === tempo || m.id === "M-000")), [reveal, tempo]);
  const pick = (m: MotionStyle) => onChange({ anim: m.id, motion: m.id === "M-000" ? "none" : "expressive", hover: m.id === "M-000" ? "none" : design.hover === "none" ? m.hover : design.hover });
  const chosen = motionById(current);

  return (
    <div className="motion-picker">
      <div className="panel motion-now">
        <div>
          <span className="lbl">Playing now</span>
          <p className="motion-now-name">
            {current === "M-000" ? "Still, no animation" : chosen.name}
            <span className="mono muted"> {current}</span>
          </p>
        </div>
        <button
          className="btn btn-sm"
          onClick={() => {
            const pool = MOTIONS.slice(1).filter((m) => m.id !== current);
            pick(pool[Math.floor(Math.random() * pool.length)]);
          }}
        >
          <Icon name="shuffle" size={15} />
          Surprise me
        </button>
      </div>

      <div className="panel stack" style={{ gap: 16 }}>
        <div>
          <label className="lbl">When you point at a card or button</label>
          <div className="seg" role="group" aria-label="Hover effect">
            {(["lift", "glow", "line", "spotlight", "none"] as const).map((h) => (
              <button key={h} aria-pressed={design.hover === h} className={design.hover === h ? "is-on" : ""} onClick={() => onChange({ hover: h })}>
                {h === "lift" ? "Lifts up" : h === "glow" ? "Glows" : h === "line" ? "Underline" : h === "spotlight" ? "Spotlight" : "Nothing"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="lbl">Behind the opening</label>
          <div className="seg" role="group" aria-label="Opening backdrop">
            {(["none", "aurora", "grid"] as const).map((b) => (
              <button key={b} aria-pressed={(design.backdrop ?? "none") === b} className={(design.backdrop ?? "none") === b ? "is-on" : ""} onClick={() => onChange({ backdrop: b })}>
                {b === "none" ? "Plain" : b === "aurora" ? "Moving glow" : "Fine grid"}
              </button>
            ))}
          </div>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={design.progress} onChange={(e) => onChange({ progress: e.target.checked })} />
          <span>
            <b>Reading bar</b>
            <span className="small muted"> A thin line at the top fills as people scroll.</span>
          </span>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={design.marquee} onChange={(e) => onChange({ marquee: e.target.checked })} />
          <span>
            <b>Moving strip</b>
            <span className="small muted"> Your skills or clients slide past slowly. It pauses when pointed at.</span>
          </span>
        </label>
      </div>

      <div className="motion-filters">
        <div className="seg" role="group" aria-label="Speed">
          {[{ id: "all", name: "Every speed" }, ...TEMPO_NAMES].map((t) => (
            <button key={t.id} aria-pressed={tempo === t.id} className={tempo === t.id ? "is-on" : ""} onClick={() => setTempo(t.id)}>
              {t.name}
            </button>
          ))}
        </div>
        <div className="chips-scroll" role="group" aria-label="Entrance">
          {[{ id: "all", name: "Every entrance" }, ...REVEAL_NAMES].map((r) => (
            <button key={r.id} className={"chip chip-sm" + (reveal === r.id ? " is-on" : "")} aria-pressed={reveal === r.id} onClick={() => setReveal(r.id)}>
              {r.name}
            </button>
          ))}
        </div>
        <p className="hint">
          {list.length - 1} styles shown. Point at one to play it, choose it to use it. The preview plays it on your real site.
        </p>
      </div>

      <div className="motion-grid">
        {list.map((m) => (
          <Tile key={m.id} m={m} active={m.id === current} onPick={() => pick(m)} />
        ))}
      </div>
    </div>
  );
}
