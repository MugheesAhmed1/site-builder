"use client";

import dynamic from "next/dynamic";
import { useInView } from "motion/react";
import { useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { useStartSite } from "@/components/PromptBox";
import { SAMPLES, buildSample } from "@/lib/samples";

// Four real sites, made by the builder from the one line shown above each. They are the
// actual output running live: scroll them, switch to phone or dark, and start from one.

const Preview = dynamic(() => import("@/components/Preview"), { ssr: false, loading: () => <div className="demo-loading" aria-hidden="true" /> });

export default function LiveDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "300px 0px" });
  const [tab, setTab] = useState(SAMPLES[0].id);
  const start = useStartSite();
  const sample = SAMPLES.find((s) => s.id === tab)!;
  // Built once per sample, the first time its tab is opened.
  const cache = useRef(new Map<string, ReturnType<typeof buildSample>>());
  const project = useMemo(() => {
    if (!seen) return null;
    if (!cache.current.has(sample.id)) cache.current.set(sample.id, buildSample(sample));
    return cache.current.get(sample.id)!;
  }, [seen, sample]);

  return (
    <div className="demo" ref={ref}>
      <div className="demo-bar">
        <div className="demo-tabs" role="tablist" aria-label="Example sites">
          {SAMPLES.map((s) => (
            <button key={s.id} type="button" role="tab" aria-selected={tab === s.id} className={tab === s.id ? "is-on" : ""} onClick={() => setTab(s.id)}>
              {s.tab}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-sm demo-use" onClick={() => start({ query: sample.query })}>
          Start from this one
          <Icon name="arrow" size={15} />
        </button>
      </div>
      <p className="demo-line">
        <span className="mono">You type</span>
        <q>{sample.query}</q>
      </p>
      <div className="demo-stage">{project && project.content ? <Preview key={sample.id} kind={project.kind} design={project.design} content={project.content} /> : <div className="demo-loading" aria-hidden="true" />}</div>
    </div>
  );
}
