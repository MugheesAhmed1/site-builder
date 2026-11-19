"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useStartSite } from "@/components/PromptBox";
import { briefInput } from "@/lib/experience";
import { SAMPLES, buildSample } from "@/lib/samples";
import { CONCEPTS, ENVIRONMENTS, generateExperience } from "@/packages/experience-core";
import type { Experience, MotionChannels } from "@/template/src/experiences/types";
import { PRIMITIVES } from "@/template/src/motion/primitives";

// The Experience Lab (PRD section 63), which replaces the Scene Lab. Combine a background, an
// object or character, scroll, cursor, shaders, transitions, camera and typography, and see
// the result as a real site: the same renderer and the same Experience JSON a generated site
// uses. Nothing here is saved; "Build a site with this" starts a project with the concept.

const Preview = dynamic(() => import("@/components/Preview"), { ssr: false, loading: () => <div className="demo-loading" aria-hidden="true" /> });

const STEPS = ["Off", "Low", "Medium", "High"];
const DIALS: { id: keyof MotionChannels; label: string }[] = [
  { id: "scroll", label: "Scroll and camera" },
  { id: "cursor", label: "Cursor" },
  { id: "click", label: "Click and tap" },
  { id: "environment", label: "Particles and weather" },
  { id: "characters", label: "Characters" },
];
const of = (cat: string) => PRIMITIVES.filter((p) => p.category === cat);

export default function ExperienceLab() {
  const [sampleId, setSampleId] = useState(SAMPLES[0].id);
  const [concept, setConcept] = useState("mountain-journey");
  const [world, setWorld] = useState("");
  const [intensity, setIntensity] = useState(7);
  const [channels, setChannels] = useState<Partial<MotionChannels>>({});
  const [webgl, setWebgl] = useState(true);
  const [transition, setTransition] = useState("");
  const [text, setText] = useState("");
  const [entrance, setEntrance] = useState("");
  const start = useStartSite();

  const project = useMemo(() => buildSample(SAMPLES.find((s) => s.id === sampleId)!), [sampleId]);
  const experience = useMemo<Experience | undefined>(() => {
    if (!project.content) return undefined;
    const e = generateExperience(briefInput(project), {
      seed: 11,
      concept,
      world: world || undefined,
      intensity,
      allow3d: webgl ? undefined : false,
      control: Object.keys(channels).length ? "custom" : "smart",
      channels: Object.keys(channels).length ? channels : undefined,
    });
    // Typography and transitions are tried on every scene at once.
    const scenes = e.scenes.map((s, i) => ({
      ...s,
      text: text || s.text,
      entrance: entrance && i > 0 ? entrance : s.entrance,
      transitions: transition && s.transitions.length ? s.transitions.map((t) => ({ ...t, primitive: transition })) : s.transitions,
    }));
    return { ...e, scenes };
  }, [project, concept, world, intensity, channels, webgl, transition, text, entrance]);

  const c = CONCEPTS.find((x) => x.id === concept)!;
  const groups = [
    { label: "Worlds and journeys", list: CONCEPTS.filter((x) => !x.character && ["landscape", "depths", "cosmos", "liquid", "kinetic", "progress"].includes(x.engine)) },
    { label: "Objects", list: CONCEPTS.filter((x) => !x.character && !["landscape", "depths", "cosmos", "liquid", "kinetic", "progress"].includes(x.engine)) },
    { label: "Characters", list: CONCEPTS.filter((x) => x.character) },
  ];

  return (
    <div className="lab">
      <aside className="lab-side" aria-label="Lab controls">
        <header className="lab-head">
          <h1>Experience Lab</h1>
          <p className="muted small">Combine the pieces and watch the result on a real site. Scroll the preview to play the story.</p>
        </header>

        <label className="lab-field">
          <span>Site</span>
          <select value={sampleId} onChange={(e) => setSampleId(e.target.value)}>
            {SAMPLES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.tab}
              </option>
            ))}
          </select>
        </label>

        <label className="lab-field">
          <span>Object or character</span>
          <select value={concept} onChange={(e) => (setConcept(e.target.value), setWorld(""))}>
            {groups.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.list.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <small className="muted">{c.pitch}</small>
        </label>

        <label className="lab-field">
          <span>Background</span>
          <select value={world} onChange={(e) => setWorld(e.target.value)}>
            <option value="">The concept&apos;s own world</option>
            {ENVIRONMENTS.filter((w) => w.engine === c.engine).map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <small className="muted">Backgrounds drawn by the same engine as this concept.</small>
        </label>

        <label className="lab-field">
          <span>Intensity: {intensity}</span>
          <input type="range" min={1} max={10} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} />
        </label>

        {DIALS.map((d) => (
          <div key={d.id} className="lab-field">
            <span id={"lab-" + d.id}>{d.label}</span>
            <div className="seg lab-seg" role="group" aria-labelledby={"lab-" + d.id}>
              <button type="button" aria-pressed={channels[d.id] === undefined} className={channels[d.id] === undefined ? "is-on" : ""} onClick={() => setChannels(({ [d.id]: _, ...rest }) => rest)}>
                Auto
              </button>
              {STEPS.map((s, i) => (
                <button key={s} type="button" aria-pressed={channels[d.id] === i} className={channels[d.id] === i ? "is-on" : ""} onClick={() => setChannels((v) => ({ ...v, [d.id]: i }))}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}

        <label className="lab-check">
          <input type="checkbox" checked={webgl} disabled={!c.webgl} onChange={(e) => setWebgl(e.target.checked)} />
          <span>
            Shaders and 3D
            <small className="muted">{c.webgl ? " From intensity 7 on a computer." : " This concept is 2D only."}</small>
          </span>
        </label>

        <label className="lab-field">
          <span>Transitions</span>
          <select value={transition} onChange={(e) => setTransition(e.target.value)}>
            <option value="">The concept&apos;s own</option>
            {of("transition").map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="lab-field">
          <span>Headings</span>
          <select value={text} onChange={(e) => setText(e.target.value)}>
            <option value="">Chosen for the concept</option>
            {of("text").map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="lab-field">
          <span>How sections arrive</span>
          <select value={entrance} onChange={(e) => setEntrance(e.target.value)}>
            <option value="">Chosen for the concept</option>
            {of("entrance").map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="btn btn-primary" onClick={() => start({ query: SAMPLES.find((s) => s.id === sampleId)!.query, concept })}>
          Build a site with this
        </button>
        <Link className="small" href="/#gallery">
          Back to the gallery
        </Link>
      </aside>
      <section className="lab-view" aria-label="Result">
        {project.content && experience && <Preview key={sampleId} kind={project.kind} design={project.design} content={project.content} experience={experience} replayKey={[concept, world, intensity, webgl, transition, text, entrance, JSON.stringify(channels)].join("|")} />}
      </section>
    </div>
  );
}
