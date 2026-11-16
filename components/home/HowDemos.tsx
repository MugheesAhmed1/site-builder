"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { EXAMPLES } from "@/components/PromptBox";
import { categoryLabel } from "@/lib/fit";
import { readRequest } from "@/lib/project";

// The small working models beside the three steps on the home page.

const ease = [0.23, 1, 0.32, 1] as const;

// Step 1: the reading rules, running on the examples. Tap a line to read it.
export function ReadDemo() {
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % 4), 3200);
    return () => clearInterval(t);
  }, [auto]);
  const line = EXAMPLES[i];
  const r = readRequest(line);
  const facts = [
    ["Kind", r.kind === "portfolio" ? "Personal portfolio" : "Business website"],
    ["For", categoryLabel(r.kind, r.category)],
    ...(r.hints.name ? [["Name", r.hints.name]] : []),
    ...(r.hints.city ? [["City", r.hints.city]] : []),
  ];
  return (
    <div className="how-demo" onPointerEnter={() => setAuto(false)}>
      <div className="how-lines">
        {EXAMPLES.slice(0, 4).map((x, k) => (
          <button type="button" key={x} className={k === i ? "is-on" : ""} aria-pressed={k === i} onClick={() => (setI(k), setAuto(false))}>
            {x}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.dl key={i} className="how-facts" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease }}>
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </motion.dl>
      </AnimatePresence>
    </div>
  );
}

export interface Swatch {
  id: string;
  preset: string;
  accent: string;
  onAccent: string;
  bg: string;
  text: string;
  border: string;
  display: string;
  body: string;
  radius: number;
  dark: boolean;
}

// Step 2: shuffle through real design systems from the library.
export function ShuffleDemo({ designs }: { designs: Swatch[] }) {
  const [i, setI] = useState(0);
  const d = designs[i % designs.length];
  const bg = d.bg;
  const fg = d.text;
  return (
    <div className="how-demo">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={d.id} className="how-ds" style={{ background: bg, color: fg, borderRadius: Math.min(d.radius, 18) + 6 }} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease }}>
          <span className="how-ds-name">{d.preset}</span>
          <span className="how-ds-type">
            {d.display} <i>with</i> {d.body}
          </span>
          <span className="how-ds-row">
            <span className="how-ds-btn" style={{ background: d.accent, color: d.onAccent, borderRadius: Math.min(d.radius, 18) }}>
              Book a table
            </span>
            <span className="how-ds-dots" aria-hidden="true">
              <i style={{ background: d.accent }} />
              <i style={{ background: fg }} />
              <i style={{ background: d.border }} />
            </span>
          </span>
        </motion.div>
      </AnimatePresence>
      <button type="button" className="btn btn-sm how-shuffle" onClick={() => setI((x) => x + 1)}>
        <Icon name="shuffle" size={15} />
        Shuffle
      </button>
    </div>
  );
}
