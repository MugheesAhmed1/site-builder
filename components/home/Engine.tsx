"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

// The engine, drawn: one line of words goes through the director (rules, or Gemini on the
// server), which writes a scene spec; three layers render it into the site.

const ease = [0.23, 1, 0.32, 1] as const;

const LAYERS = [
  { name: "UI motion", tech: "Motion", items: ["Entrances", "Hover and press", "Magnetic buttons", "Kinetic type"] },
  { name: "Scroll story", tech: "Lenis + scroll engine", items: ["Scroll focus-pull", "Pinned scenes", "Section transitions", "Parallax"] },
  { name: "Living background", tech: "WebGL shaders", items: ["11 atmospheres", "Pointer depth", "Focus-pull on scroll", "Grain and light"] },
];

const SPEC = `{
  "atmos": "meadow",
  "accentFace": "serif",
  "intensity": 8,
  "sectionFx": "curtain"
}`;

export default function Engine() {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, { once: true, margin: "-15% 0px" });
  const step = (i: number) => ({ initial: { opacity: 0, y: 24 }, animate: on ? { opacity: 1, y: 0 } : {}, transition: { duration: 0.6, ease, delay: 0.1 + i * 0.12 } });
  return (
    <div className="eng" ref={ref}>
      <motion.div className="eng-node eng-in" {...step(0)}>
        <span className="eng-tag mono">Input</span>
        <b>“Website for my flower shop in Lahore”</b>
      </motion.div>
      <div className="eng-wire" aria-hidden="true" />
      <motion.div className="eng-node eng-director" {...step(1)}>
        <span className="eng-tag mono">Director</span>
        <b>Reads your words and picks from the library</b>
        <span className="small">Local rules, or Gemini on the server when it is switched on</span>
        <pre className="eng-spec mono">{SPEC}</pre>
      </motion.div>
      <div className="eng-wire eng-wire-split" aria-hidden="true" />
      <div className="eng-layers">
        {LAYERS.map((l, i) => (
          <motion.div key={l.name} className="eng-node eng-layer" {...step(2 + i)}>
            <span className="eng-tag mono">{l.tech}</span>
            <b>{l.name}</b>
            <ul>
              {l.items.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
      <div className="eng-wire eng-wire-join" aria-hidden="true" />
      <motion.div className="eng-node eng-out" {...step(5)}>
        <span className="eng-tag mono">Output</span>
        <b>A React site you own: one folder, free to host</b>
      </motion.div>
    </div>
  );
}
