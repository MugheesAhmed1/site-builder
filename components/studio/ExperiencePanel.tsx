"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { briefInput, withExperience } from "@/lib/experience";
import type { Project } from "@/lib/types";
import {
  applyPreset,
  CONCEPTS,
  changeConcept,
  changeMode,
  changeWorld,
  ENVIRONMENTS,
  findImprovements,
  makeBetter,
  PRESETS,
  remix,
  setIntensity,
  suggestions,
  surprise,
  useDirection as pickDirection,
  type BetterId,
} from "@/packages/experience-core";
import type { Experience, ExperienceMode } from "@/template/src/experiences/types";

// The Experience control (PRD sections 30 to 33, 49 and 66): what the site is built around,
// and every way to change it while the business, the words and the brand stay. Each change
// keeps the previous experience under Versions, where it can be compared and restored.

type Update = (fn: (prev: Project) => Project) => void;

const MODES: { id: ExperienceMode; label: string }[] = [
  { id: "editorial", label: "Editorial" },
  { id: "cinematic", label: "Cinematic" },
  { id: "world", label: "Interactive" },
  { id: "product", label: "Product" },
  { id: "playful", label: "Playful" },
];

const REMIX_EXAMPLES = ["Make it more cinematic", "Make it feel more playful", "Make the animation calmer", "Replace the world with a mountain journey"];

const levelWord = (n: number) => (n <= 2 ? "Calm" : n <= 4 ? "Gentle" : n <= 6 ? "Lively" : n <= 8 ? "Bold" : "Insane");

export default function ExperiencePanel({ p, update, compare, onCompare }: { p: Project; update: Update; compare: Experience | null; onCompare: (e: Experience | null) => void }) {
  const e = p.experience!;
  const input = useMemo(() => briefInput(p), [p]);
  const [phrase, setPhrase] = useState("");
  const [said, setSaid] = useState("");
  const [level, setLevel] = useState<number | null>(null);
  const [better, setBetter] = useState<ReturnType<typeof findImprovements> | null>(null);
  const top = useMemo(() => suggestions(input, e.seed, 6), [input.category, input.query, e.seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const env = ENVIRONMENTS.find((w) => w.id === e.world);
  const sectionCount = e.scenes.filter((s) => !s.hidden).length;

  const change = (next: Experience, label: string, note?: string) => {
    if (next === e) return;
    onCompare(null);
    update((prev) => withExperience(prev, next, label));
    setSaid(note ?? "");
    setBetter(null);
  };

  const doRemix = (text: string) => {
    const r = remix(e, input, text);
    if (!r) {
      setSaid("Try words like cinematic, playful, calmer or more motion, or name a world such as mountains, ocean or space.");
      return;
    }
    change(r.experience, "Remix: " + text, r.said);
    setPhrase("");
  };

  const doBetter = () => {
    const list = findImprovements(e, { density: p.design.density, sections: sectionCount });
    setBetter(list);
    setSaid(list.length ? "" : "Nothing to improve: hierarchy, motion, spacing, transitions and performance all look right.");
  };

  const applyBetter = (ids: BetterId[]) => {
    const list = better ?? [];
    const spacing = list.find((x) => x.design && ids.includes(x.id));
    const rest = ids.filter((id) => id !== "spacing");
    if (rest.length) update((prev) => withExperience(prev, makeBetter(e, input, rest), "Make it better"));
    if (spacing?.design) update((prev) => ({ ...prev, design: { ...prev.design, ...spacing.design } }));
    setBetter(list.filter((x) => !ids.includes(x.id)));
    setSaid(`${ids.length} ${ids.length === 1 ? "improvement" : "improvements"} applied. Undo takes them back.`);
  };

  return (
    <div className="xpp">
      <section className="card xpp-now" aria-label="Current experience">
        <div className="xpp-now-head">
          <span className="xpp-kicker">Concept</span>
          {e.stage.webgl && e.intensity >= 7 && !e.noWebgl && <span className="xpp-badge">3D</span>}
        </div>
        <h2>{e.name}</h2>
        <p className="muted">{e.pitch}</p>
        <dl className="xpp-facts">
          <div>
            <dt>World</dt>
            <dd>{env?.name ?? e.world}</dd>
          </div>
          <div>
            <dt>Interaction</dt>
            <dd>{MODES.find((m) => m.id === e.mode)?.label ?? e.mode}</dd>
          </div>
          <div>
            <dt>Motion</dt>
            <dd>
              {e.intensity} of 10, {levelWord(e.intensity).toLowerCase()}
            </dd>
          </div>
        </dl>
        <div className="xpp-row">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => change(surprise(e, input), "Surprise me", "A new direction for the same business. The earlier one is under Versions.")}>
            <Icon name="sparkle" size={15} />
            Surprise me
          </button>
          <button type="button" className="btn btn-sm" onClick={doBetter}>
            <Icon name="check" size={15} />
            Make it better
          </button>
        </div>
      </section>

      {said && (
        <p className="xpp-said small" role="status">
          {said}
        </p>
      )}

      {better && better.length > 0 && (
        <section className="xpp-better" aria-label="Suggested improvements">
          <header className="xpp-head">
            <h3>{better.length === 1 ? "One improvement" : `${better.length} improvements`}</h3>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => applyBetter(better.map((b) => b.id))}>
              Apply all
            </button>
          </header>
          <ul>
            {better.map((b) => (
              <li key={b.id}>
                <div>
                  <b>{b.problem}</b>
                  <span className="small muted">{b.fix}</span>
                </div>
                <button type="button" className="btn btn-sm" onClick={() => applyBetter([b.id])}>
                  Apply
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="xpp-block" aria-labelledby="xpp-remix">
        <h3 id="xpp-remix">Remix</h3>
        <p className="small muted">Say how it should change. Your words, brand and sections stay.</p>
        <form
          className="xpp-remix"
          onSubmit={(ev) => {
            ev.preventDefault();
            if (phrase.trim()) doRemix(phrase.trim());
          }}
        >
          <input type="text" value={phrase} onChange={(ev) => setPhrase(ev.target.value)} placeholder="Make it more cinematic" aria-label="How should the experience change?" maxLength={160} />
          <button type="submit" className="btn btn-sm" disabled={!phrase.trim()}>
            Remix
          </button>
        </form>
        <div className="xpp-chips">
          {REMIX_EXAMPLES.map((x) => (
            <button key={x} type="button" className="chip" onClick={() => doRemix(x)}>
              {x}
            </button>
          ))}
        </div>
      </section>

      <section className="xpp-block" aria-labelledby="xpp-intensity">
        <h3 id="xpp-intensity">Motion intensity</h3>
        <div className="xpp-range">
          <span className="small muted">Calm</span>
          <input
            type="range"
            min={1}
            max={10}
            value={level ?? e.intensity}
            aria-label="Motion intensity"
            aria-valuetext={`${level ?? e.intensity} of 10, ${levelWord(level ?? e.intensity)}`}
            onChange={(ev) => setLevel(Number(ev.target.value))}
            onPointerUp={() => level !== null && level !== e.intensity && (change(setIntensity(e, input, level), `Intensity ${level}`), setLevel(null))}
            onKeyUp={() => level !== null && level !== e.intensity && (change(setIntensity(e, input, level), `Intensity ${level}`), setLevel(null))}
          />
          <span className="small muted">Insane</span>
          <b className="xpp-level">{level ?? e.intensity}</b>
        </div>
      </section>

      <section className="xpp-block" aria-labelledby="xpp-concept">
        <h3 id="xpp-concept">Concept</h3>
        <div className="xpp-cards">
          {top.map((c) => (
            <button key={c.id} type="button" className={"xpp-card" + (c.id === e.concept ? " is-on" : "")} aria-pressed={c.id === e.concept} onClick={() => change(changeConcept(e, input, c.id), c.name)}>
              <b>{c.name}</b>
              <span className="small muted">{c.pitch}</span>
            </button>
          ))}
        </div>
        <label className="xpp-select">
          <span className="small muted">Every concept</span>
          <select value={e.concept} onChange={(ev) => change(changeConcept(e, input, ev.target.value), CONCEPTS.find((c) => c.id === ev.target.value)?.name ?? ev.target.value)}>
            {CONCEPTS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="xpp-block" aria-labelledby="xpp-world">
        <h3 id="xpp-world">World</h3>
        <label className="xpp-select">
          <span className="sr-only">World</span>
          <select value={e.world} onChange={(ev) => change(changeWorld(e, input, ev.target.value), "World: " + (ENVIRONMENTS.find((w) => w.id === ev.target.value)?.name ?? ""))}>
            {ENVIRONMENTS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="xpp-block" aria-labelledby="xpp-mode">
        <h3 id="xpp-mode">Interaction</h3>
        <div className="seg" role="group" aria-labelledby="xpp-mode">
          {MODES.map((m) => (
            <button key={m.id} type="button" aria-pressed={e.mode === m.id} className={e.mode === m.id ? "is-on" : ""} onClick={() => change(changeMode(e, input, m.id), m.label)}>
              {m.label}
            </button>
          ))}
        </div>
      </section>

      <section className="xpp-block" aria-labelledby="xpp-presets">
        <h3 id="xpp-presets">Presets</h3>
        <div className="xpp-chips">
          {PRESETS.map((x) => (
            <button key={x.id} type="button" className={"chip" + (e.preset === x.id ? " is-on" : "")} title={x.description} onClick={() => change(applyPreset(e, input, x.id), x.name)}>
              {x.name}
            </button>
          ))}
        </div>
      </section>

      {e.directions.length > 0 && (
        <section className="xpp-block" aria-labelledby="xpp-dirs">
          <h3 id="xpp-dirs">Three directions</h3>
          <p className="small muted">The directions considered for your business. The strongest was chosen first.</p>
          <div className="xpp-cards">
            {e.directions.map((d) => (
              <button key={d.label} type="button" className={"xpp-card" + (d.concept === e.concept ? " is-on" : "")} aria-pressed={d.concept === e.concept} onClick={() => change(pickDirection(e, input, d.label), "Direction " + d.label)}>
                <span className="xpp-kicker">
                  {d.label} · {MODES.find((m) => m.id === d.mode)?.label ?? d.mode}
                </span>
                <b>{d.name}</b>
                <span className="small muted">{d.pitch}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="xpp-block" aria-labelledby="xpp-versions">
        <h3 id="xpp-versions">Versions</h3>
        {!p.experiences?.length ? (
          <p className="small muted">Every change you make here keeps the one before, so you can compare and restore.</p>
        ) : (
          <ul className="xpp-versions">
            {p.experiences.map((v, i) => {
              const on = compare === v.experience;
              return (
                <li key={v.at + i} className={on ? "is-on" : ""}>
                  <div>
                    <b>{v.experience.name}</b>
                    <span className="small muted">
                      Before “{v.label}” · intensity {v.experience.intensity}
                    </span>
                  </div>
                  <div className="xpp-row">
                    <button type="button" className="btn btn-ghost btn-sm" aria-pressed={on} onClick={() => onCompare(on ? null : v.experience)}>
                      {on ? "Showing" : "Compare"}
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => change(v.experience, "Restore " + v.experience.name, `Restored ${v.experience.name}.`)}>
                      Restore
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
