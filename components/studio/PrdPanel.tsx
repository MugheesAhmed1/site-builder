"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import CoverageList from "@/components/prd/Coverage";
import PrdEditor from "@/components/prd/PrdEditor";
import { withExperience } from "@/lib/experience";
import type { Prd } from "@/lib/prd";
import { checkCoverage, domCoverage, type Coverage } from "@/lib/prd-coverage";
import type { Project } from "@/lib/types";
import type { WebsiteContent } from "@/template/src/content/types";

// The PRD in the studio: edit it, then rebuild the site from it. The person's choices for
// each section (layout, assets, background, animation, Director, uploads) are kept on a
// rebuild; the words and requirements follow the PRD. The coverage check runs on the data
// and on the live preview, so a requirement hidden on the page shows up here too.

type Update = (fn: (prev: Project) => Project, quiet?: boolean) => void;

function useLiveCoverage(prd: Prd | undefined, tick: unknown): Coverage | null {
  const [cov, setCov] = useState<Coverage | null>(null);
  useEffect(() => {
    if (!prd) return;
    const run = () => {
      const root = document.querySelector(".studio-canvas .pf");
      if (root) setCov(domCoverage(prd, root));
    };
    const t = setTimeout(run, 700);
    const iv = setInterval(run, 4000);
    return () => {
      clearTimeout(t);
      clearInterval(iv);
    };
  }, [prd, tick]);
  return cov;
}

export default function PrdPanel({ p, update }: { p: Project; update: Update }) {
  const [draft, setDraft] = useState<Prd>(p.prd!);
  const [dirty, setDirty] = useState(false);
  const [done, setDone] = useState("");
  // Words changed on the page come back into the PRD; follow them unless the draft is being edited.
  useEffect(() => {
    if (!dirty && p.prd) setDraft(p.prd);
  }, [p.prd, dirty]);
  const data = useMemo(() => (p.prd ? checkCoverage(p.prd, p.content as WebsiteContent, p.experience) : null), [p.prd, p.content, p.experience]);
  const live = useLiveCoverage(p.prd, p.content);
  const cov = data && !data.ok ? data : live && !live.ok ? live : data;

  const rebuild = async () => {
    // The builder (with the asset library's resolver) loads only when it is needed.
    const { buildFromPrd } = await import("@/lib/prd-build");
    update((prev) => {
      const next = buildFromPrd(draft, prev);
      return prev.experience ? withExperience(next, next.experience!, "Before rebuilding from the PRD") : next;
    });
    setDirty(false);
    setDone("Rebuilt from the PRD. Your section choices and uploads were kept.");
    setTimeout(() => setDone(""), 5000);
  };

  return (
    <div className="prdp">
      <section className="xpp-block">
        <h3>Coverage</h3>
        {cov && <CoverageList cov={cov} compact />}
        {cov && !cov.ok && (
          <p className="small muted" style={{ marginTop: 8 }}>
            Rebuild from the PRD to put the missing parts back, or change the PRD if they should go.
          </p>
        )}
        {cov && !cov.ok && (
          <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={rebuild}>
            <Icon name="undo" size={14} />
            Put every requirement back
          </button>
        )}
      </section>
      <div className="prdp-bar">
        <span className="small muted">{dirty ? "You changed the PRD. Rebuild to see it on the site." : p.prd?.submittedAt ? "Built from this PRD on " + new Date(p.prd.submittedAt).toLocaleString() : "Draft"}</span>
        <button type="button" className="btn btn-primary btn-sm" onClick={rebuild} disabled={!dirty && p.prd?.status === "submitted" && cov?.ok}>
          <Icon name="rocket" size={14} />
          Rebuild the site from the PRD
        </button>
      </div>
      {done && (
        <p className="prd-note" role="status">
          {done}
        </p>
      )}
      <PrdEditor
        prd={draft}
        onChange={(next) => {
          setDraft(next);
          setDirty(true);
        }}
      />
    </div>
  );
}
