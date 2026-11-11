"use client";

import { useAnimate, useReducedMotion } from "motion/react";
import { stagger } from "motion";
import { useMemo, useState } from "react";
import VideoField from "@/components/VideoField";
import Icon from "@/components/Icon";
import { FEELS, MOTIONS, REST, REVEAL_NAMES, TEMPO_NAMES, motionById, type MotionStyle } from "@/template/src/motion.js";
import CategorySelect from "@/components/CategorySelect";
import { categoryLabel, fitFor, fitsMotion } from "@/lib/fit";
import type { Design } from "@/lib/types";

// The animation step: 728 styles plus "Still", each previewed on a tiny mock page with
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

const PAGE = 48;

export default function MotionPicker({
  design,
  onChange,
  category = "general",
  video,
  onVideo,
}: {
  design: Design;
  onChange: (patch: Partial<Design>) => void;
  category?: string;
  video?: string;
  onVideo?: (v: string) => void;
}) {
  const [reveal, setReveal] = useState("all");
  const [tempo, setTempo] = useState("all");
  const [feel, setFeel] = useState("all");
  const [suit, setSuit] = useState(category);
  const [scope, setScope] = useState<"fit" | "all">("fit");
  const [shown, setShown] = useState(PAGE);
  const fit = fitFor(suit);
  const suitKind = suit === "portfolio" || suit.startsWith("role-") ? "portfolio" : "website";
  const current = design.motion === "none" ? "M-000" : design.anim;
  const list = useMemo(
    () =>
      MOTIONS.filter(
        (m) =>
          m.id === "M-000" ||
          ((reveal === "all" || m.reveal === reveal) && (tempo === "all" || m.tempo === tempo) && (feel === "all" || m.feel === feel) && (scope === "all" || fitsMotion(m, fit))),
      ),
    [reveal, tempo, feel, scope, fit],
  );
  const reset = () => setShown(PAGE);
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
            const pool = (list.length > 2 ? list : MOTIONS).filter((m) => m.id !== current && m.id !== "M-000");
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
            {(["none", "aurora", "mesh", "particles", "grid"] as const).map((b) => (
              <button key={b} aria-pressed={(design.backdrop ?? "none") === b} className={(design.backdrop ?? "none") === b ? "is-on" : ""} onClick={() => onChange({ backdrop: b })}>
                {b === "none" ? "Plain" : b === "aurora" ? "Moving glow" : b === "mesh" ? "Colour blobs" : b === "particles" ? "Particles" : "Fine grid"}
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

      <div className="panel stack" style={{ gap: 16 }}>
        <div>
          <span className="lbl">Studio touches</span>
          <p className="small muted">Techniques seen on award winning studio sites, rebuilt from scratch. Touch screens and reduced motion settings skip them.</p>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={!!design.intro} onChange={(e) => onChange({ intro: e.target.checked })} />
          <span>
            <b>Opening counter</b>
            <span className="small muted"> Your name and a count to 100, then a curtain lifts to show the site.</span>
          </span>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={!!design.magnetic} onChange={(e) => onChange({ magnetic: e.target.checked })} />
          <span>
            <b>Magnetic buttons</b>
            <span className="small muted"> Buttons lean toward the pointer as it comes close.</span>
          </span>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={!!design.cursor} onChange={(e) => onChange({ cursor: e.target.checked })} />
          <span>
            <b>Custom cursor</b>
            <span className="small muted"> A soft ring follows the pointer and grows over links and widgets.</span>
          </span>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={design.tilt !== false} onChange={(e) => onChange({ tilt: e.target.checked })} />
          <span>
            <b>3D tilt</b>
            <span className="small muted"> Cards and widget tiles lean toward the pointer, like objects you can hold.</span>
          </span>
        </label>
      </div>

      <div className="panel studio-panel">
        <h3 className="h3" style={{ margin: 0 }}>Studio effects</h3>
        <p className="small muted" style={{ margin: "4px 0 12px" }}>The scroll tricks you see on award sites. Each one is built in and works on phones too.</p>
        <div className="studio-grid">
          <div className="studio-video">
            <label className="toggle">
              <input type="checkbox" checked={video || design.video ? design.film !== false : !!design.film} onChange={(e) => onChange({ film: e.target.checked })} />
              <span>
                <b>Scroll film</b>
                <span className="small muted"> Your video plays forward and back as people scroll, with your steps pinned beside it and glowing hotspots at the end.</span>
              </span>
            </label>
            <VideoField label="Film video" value={video || design.video || ""} onChange={(v) => (onVideo && video && onVideo(""), onChange(v && design.film === false ? { video: v, film: true } : { video: v }))} />
          </div>
          <div className="studio-toggles">
            <label className="toggle">
              <input type="checkbox" checked={design.smooth !== false} onChange={(e) => onChange({ smooth: e.target.checked })} />
              <span>
                <b>Smooth scroll</b>
                <span className="small muted"> The page glides with a little weight instead of jumping.</span>
              </span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={design.loader === "line"} onChange={(e) => onChange({ loader: e.target.checked ? "line" : "none" })} />
              <span>
                <b>Line loader</b>
                <span className="small muted"> One line of text slides up through a mask, then the page wipes open.</span>
              </span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={design.flight !== false} onChange={(e) => onChange({ flight: e.target.checked })} />
              <span>
                <b>Flying tiles</b>
                <span className="small muted"> Your pictures or services fly out of a tray into gaps in a sentence as you scroll.</span>
              </span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={design.scrollWords !== false} onChange={(e) => onChange({ scrollWords: e.target.checked })} />
              <span>
                <b>Word by word</b>
                <span className="small muted"> Your opening about text sharpens one word at a time as it scrolls past.</span>
              </span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={!!design.carousel} onChange={(e) => onChange({ carousel: e.target.checked })} />
              <span>
                <b>Drag carousel</b>
                <span className="small muted"> The gallery drifts by itself and people can drag it with a finger or mouse.</span>
              </span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={!!design.grain} onChange={(e) => onChange({ grain: e.target.checked })} />
              <span>
                <b>Film grain</b>
                <span className="small muted"> A fine moving grain and soft dark corners, like a cinema print.</span>
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="panel fit-bar">
        <CategorySelect value={suit} onChange={(v) => (setSuit(v), reset())} />
        <div className="seg" role="group" aria-label="Show">
          <button aria-pressed={scope === "fit"} className={scope === "fit" ? "is-on" : ""} onClick={() => (setScope("fit"), reset())}>
            Best for this
          </button>
          <button aria-pressed={scope === "all"} className={scope === "all" ? "is-on" : ""} onClick={() => (setScope("all"), reset())}>
            Everything
          </button>
        </div>
      </div>

      <div className="motion-filters">
        <div className="seg" role="group" aria-label="Feel">
          {[{ id: "all", name: "Every feel" }, ...FEELS].map((t) => (
            <button key={t.id} aria-pressed={feel === t.id} className={feel === t.id ? "is-on" : ""} onClick={() => (setFeel(t.id), reset())}>
              {t.name}
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Speed">
          {[{ id: "all", name: "Every speed" }, ...TEMPO_NAMES].map((t) => (
            <button key={t.id} aria-pressed={tempo === t.id} className={tempo === t.id ? "is-on" : ""} onClick={() => (setTempo(t.id), reset())}>
              {t.name}
            </button>
          ))}
        </div>
        <div className="chips-scroll" role="group" aria-label="Entrance">
          {[{ id: "all", name: "Every entrance" }, ...REVEAL_NAMES].map((r) => (
            <button key={r.id} className={"chip chip-sm" + (reveal === r.id ? " is-on" : "")} aria-pressed={reveal === r.id} onClick={() => (setReveal(r.id), reset())}>
              {r.name}
            </button>
          ))}
        </div>
        <p className="hint">
          {list.length - 1} styles shown{scope === "fit" ? ` that suit ${categoryLabel(suitKind, suit).toLowerCase()}` : ""}. Point at one to play it, choose it to use it. The preview plays it on your real site.
        </p>
      </div>

      <div className="motion-grid">
        {list.slice(0, shown).map((m) => (
          <Tile key={m.id} m={m} active={m.id === current} onPick={() => pick(m)} />
        ))}
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
