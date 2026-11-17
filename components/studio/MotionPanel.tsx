"use client";

import { useMemo } from "react";
import { briefInput, withExperience } from "@/lib/experience";
import type { Project } from "@/lib/types";
import { generateExperience, optionsOf, set3d, setChannels, setControl } from "@/packages/experience-core";
import type { Experience, MotionChannels } from "@/template/src/experiences/types";
import { primitive } from "@/template/src/motion/primitives";

// The Motion control (PRD sections 30 and 65): each kind of movement on its own dial.
// Smart lets the intensity decide; moving any dial switches to Custom, where the dials win.
// Creative also lists what every scene does, as a small motion inspector.

type Update = (fn: (prev: Project) => Project) => void;

const CHANNELS: { id: keyof MotionChannels; label: string; hint: string }[] = [
  { id: "scroll", label: "Scroll", hint: "How strongly scrolling drives the world" },
  { id: "cursor", label: "Cursor", hint: "What follows or reacts to the pointer" },
  { id: "hover", label: "Hover", hint: "Buttons, cards and pictures under the pointer" },
  { id: "click", label: "Click", hint: "Ripples, bursts and reactions to a click or tap" },
  { id: "transitions", label: "Transitions", hint: "How one scene turns into the next" },
  { id: "typography", label: "Typography", hint: "How headings and words arrive" },
  { id: "characters", label: "Characters", hint: "Characters that look, follow and react" },
  { id: "environment", label: "Environment", hint: "Particles, weather and light in the world" },
];

const STEPS = ["Off", "Low", "Medium", "High"];
const name = (id: string) => primitive(id)?.name ?? id.split(".").pop();

export default function MotionPanel({ p, update }: { p: Project; update: Update }) {
  const e = p.experience!;
  const input = useMemo(() => briefInput(p), [p]);
  const change = (next: Experience, label: string) => update((prev) => withExperience(prev, next, label));
  const scenes = e.scenes.filter((s) => !s.hidden);
  const can3d = !!e.stage.webgl || e.intensity < 7;

  return (
    <div className="xpp">
      <section className="xpp-block" aria-labelledby="mp-control">
        <h3 id="mp-control">Control</h3>
        <div className="seg" role="group" aria-labelledby="mp-control">
          {(["smart", "creative", "custom"] as const).map((c) => (
            <button key={c} type="button" aria-pressed={e.control === c} className={e.control === c ? "is-on" : ""} onClick={() => c !== e.control && change(setControl(e, input, c), c[0].toUpperCase() + c.slice(1) + " control")}>
              {c === "smart" ? "Smart" : c === "creative" ? "Creative" : "Custom"}
            </button>
          ))}
        </div>
        <p className="small muted">
          {e.control === "smart"
            ? "The motion intensity sets every dial. Move one to take over."
            : e.control === "creative"
              ? "The intensity sets the dials, and each scene shows what it does below."
              : "Your dials win. The intensity no longer changes them."}
        </p>
      </section>

      <section className="xpp-block" aria-label="Motion channels">
        <ul className="mp-channels">
          {CHANNELS.map((c) => {
            const v = e.channels[c.id];
            return (
              <li key={c.id}>
                <div>
                  <b>{c.label}</b>
                  <span className="small muted">{c.hint}</span>
                </div>
                <div className="seg mp-steps" role="group" aria-label={c.label}>
                  {STEPS.map((s, i) => (
                    <button key={s} type="button" aria-pressed={v === i} className={v === i ? "is-on" : ""} onClick={() => v !== i && change(setChannels(e, input, { [c.id]: i }), `${c.label}: ${s}`)}>
                      {s}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="xpp-block" aria-label="More">
        <label className="mp-toggle">
          <input type="checkbox" checked={!e.noWebgl} disabled={!can3d} onChange={(ev) => change(set3d(e, input, ev.target.checked), ev.target.checked ? "3D on" : "3D off")} />
          <span>
            <b>Real 3D</b>
            <span className="small muted">{e.stage.webgl ? "From intensity 7, on computers that can draw it smoothly. Phones get the 2D version." : "This concept has no 3D version."}</span>
          </span>
        </label>
        <label className="mp-toggle">
          <input type="checkbox" checked={e.sound} onChange={(ev) => change({ ...generateExperience(input, { ...optionsOf(e), sound: ev.target.checked, channels: e.control === "custom" ? e.channels : undefined }), directions: e.directions }, ev.target.checked ? "Sound on" : "Sound off")} />
          <span>
            <b>Sound</b>
            <span className="small muted">Soft sounds on clicks, only after the visitor turns them on in the footer.</span>
          </span>
        </label>
      </section>

      {e.control !== "smart" && (
        <section className="xpp-block" aria-labelledby="mp-inspector">
          <h3 id="mp-inspector">Scene by scene</h3>
          <ol className="mp-scenes">
            {scenes.map((s) => (
              <li key={s.id}>
                <b>{s.title}</b>
                <span className="small muted">{s.note}</span>
                <span className="small">
                  Words: {name(s.entrance)}, {name(s.text)}
                  {s.transitions[0] ? ` · Then: ${name(s.transitions[0].primitive)}` : ""}
                  {s.interactions.length ? ` · Reacts: ${s.interactions.map((x) => name(x.primitive)).join(", ")}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
