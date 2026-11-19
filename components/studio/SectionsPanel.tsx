"use client";

import { useEffect, useState } from "react";
import SectionControls from "@/components/prd/SectionControls";
import type { Project } from "@/lib/types";
import { HERO_TYPES, LAYOUTS, type Block, type SectionSpec } from "@/template/src/content/blocks";
import type { WebsiteContent } from "@/template/src/content/types";
import { DIRECTORS } from "@/template/src/director";
import "@/components/prd/prd.css";

// Sections: every dynamic section of a PRD site, and the parameters it is generated from.
// Picking one scrolls the preview to it; every change shows at once.

type Update = (fn: (prev: Project) => Project, quiet?: boolean) => void;

export default function SectionsPanel({ p, update }: { p: Project; update: Update }) {
  const c = p.content as WebsiteContent;
  const blocks = c.blocks ?? [];
  const [on, setOn] = useState(blocks[0]?.id ?? "");
  const i = Math.max(0, blocks.findIndex((b) => b.id === on));
  const b: Block | undefined = blocks[i];
  // Following a click in the preview: Edit on page sends the section it was in.
  useEffect(() => {
    const pick = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (blocks.some((x) => x.id === id)) setOn(id);
    };
    window.addEventListener("xp-pick-block", pick);
    return () => window.removeEventListener("xp-pick-block", pick);
  }, [blocks]);
  if (!blocks.length) return <p className="muted">This site has no PRD sections yet. Build it from a PRD first.</p>;
  const setSpec = (spec: SectionSpec) =>
    update((prev) => {
      const pc = prev.content as WebsiteContent;
      return { ...prev, content: { ...pc, blocks: (pc.blocks ?? []).map((x, k) => (k === i ? { ...x, spec } : x)) } };
    });
  const show = (id: string, k: number) => {
    setOn(id);
    const el = document.querySelector<HTMLElement>(`.studio-canvas [data-block="${CSS.escape(id)}"]`);
    el?.closest("section")?.scrollIntoView({ behavior: "smooth", block: k === 0 ? "start" : "start" });
  };
  return (
    <div className="secp">
      <div className="secp-list" role="listbox" aria-label="Sections">
        {blocks.map((x, k) => (
          <button key={x.id} type="button" role="option" aria-selected={x.id === b?.id} className={x.id === b?.id ? "is-on" : ""} onClick={() => show(x.id, k)}>
            <span className="mono small">{String(k + 1).padStart(2, "0")}</span>
            <span className="grow">
              <b>{x.heading}</b>
              <br />
              <span className="small muted">
                {LAYOUTS.find((l) => l.id === x.spec.layout)?.label} · {HERO_TYPES.find((h) => h.id === x.spec.hero.type)?.label} · {DIRECTORS[x.spec.director]?.label}
                {x.spec.secondary ? " + " + DIRECTORS[x.spec.secondary]?.label : ""}
              </span>
            </span>
          </button>
        ))}
      </div>
      {b && (
        <section className="xpp-block" aria-label={"Section " + b.heading}>
          <h3>{b.heading}</h3>
          <p className="small muted" style={{ marginBottom: 12 }}>
            Carries {b.reqs.map((r) => r.id).join(", ") || "no requirements"}. Click any word or picture in the preview with Edit on page to change it.
          </p>
          <SectionControls block={b} onChange={setSpec} />
        </section>
      )}
    </div>
  );
}
