"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DesignEditor from "@/components/DesignEditor";
import Icon from "@/components/Icon";
import Preview from "@/components/Preview";
import ThemeToggle from "@/components/ThemeToggle";
import { StorageNotice } from "@/components/Topbar";
import DetailsPanel from "@/components/studio/DetailsPanel";
import ExperiencePanel from "@/components/studio/ExperiencePanel";
import MotionPanel from "@/components/studio/MotionPanel";
import PagePanel from "@/components/studio/PagePanel";
import PublishPanel from "@/components/studio/PublishPanel";
import RefinePanel from "@/components/studio/RefinePanel";
import { describe, nextPanel, panelById, panelsFor, readiness, type Panel, type PanelId } from "@/lib/flow";
import PrdPanel from "@/components/studio/PrdPanel";
import SectionsPanel from "@/components/studio/SectionsPanel";
import { syncPrd } from "@/lib/prd";
import type { WebsiteContent } from "@/template/src/content/types";
import { briefInput, withExperience } from "@/lib/experience";
import { designFor } from "@/lib/project";
import { changeWorld } from "@/packages/experience-core";
import type { Experience } from "@/template/src/experiences/types";
import { keepCast } from "@/lib/store";
import type { Design, Project, SiteContent } from "@/lib/types";
import { useProject } from "@/lib/useProject";

// The studio (PRD section 30): one workspace for every kind of site. The live site is always
// on screen; the five controls beside it (Content, Experience, Design, Motion, Page) and
// Publish are open from the start and can be visited in any order. Every change is saved and
// can be undone, and earlier experiences can be compared in the preview and restored.

const ease = [0.23, 1, 0.32, 1] as const;

// Materials (PRD section 30, Design): for liquid concepts the material is the world.
const MATERIALS = [
  { world: "liquid", label: "Liquid" },
  { world: "fabric", label: "Silk" },
  { world: "glass", label: "Glass" },
  { world: "metallic", label: "Chrome" },
  { world: "fluid", label: "Smoke" },
];

function useHashPanel(list: Panel[]): [PanelId, (p: PanelId) => void] {
  const [panel, setPanel] = useState<PanelId>(list[0].id);
  useEffect(() => {
    const read = () => setPanel(panelById(window.location.hash.slice(1), list).id);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [list]);
  const go = useCallback((p: PanelId) => {
    setPanel(p);
    history.replaceState(null, "", "#" + p);
  }, []);
  return [panel, go];
}

function Missing() {
  return (
    <main className="studio-missing">
      <h1>We couldn&apos;t find that site</h1>
      <p className="muted">Sites are saved in the browser they were made in. If you made it somewhere else, import its backup from Your sites.</p>
      <div className="row wrap" style={{ justifyContent: "center" }}>
        <Link className="btn btn-primary" href="/sites">
          Your sites
        </Link>
        <Link className="btn" href="/">
          Start a new one
        </Link>
      </div>
    </main>
  );
}

export default function Studio({ id }: { id: string }) {
  const { project: p, loaded, update, undo, redo, canUndo, canRedo, saveState } = useProject(id);
  const list = useMemo(() => panelsFor(p), [!!p?.prd]); // eslint-disable-line react-hooks/exhaustive-deps
  const [panel, go] = useHashPanel(list);
  const [view, setView] = useState<"edit" | "preview">("edit"); // phones show one at a time
  const [focus, setFocus] = useState(false); // desktop: the preview alone
  const [compare, setCompare] = useState<Experience | null>(null); // an earlier experience shown in the preview
  const body = useRef<HTMLDivElement>(null);

  // Opening a panel counts as having looked at it (the launch check uses this).
  useEffect(() => {
    if (!p) return;
    const step = panelById(panel, list).step;
    if (step !== "deploy" && p.steps[step] !== "approved") update((prev) => ({ ...prev, steps: { ...prev.steps, [step]: "approved" } }), true);
    body.current?.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel, !!p]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (e.key === "Escape") setFocus(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [undo, redo]);

  const personal = useMemo(() => (p ? designFor(p) : null), [p?.answers.name, p?.answers.tone, p?.input?.name, p?.input?.tone, p?.query, p?.category, p?.kind]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!loaded) return <div className="studio-loading" aria-busy="true" />;
  if (!p || !p.content || !personal) return <Missing />;

  const content = p.content;
  const info = panelById(panel, list);
  const next = nextPanel(panel, list);
  const state = readiness(p);
  const patchDesign = (patch: Partial<Design>) => update((prev) => ({ ...prev, design: { ...prev.design, ...patch } }));
  // On a PRD site, words changed on the page are written back into the PRD.
  const setContent = (c: SiteContent) => update((prev) => ({ ...prev, content: c, prd: prev.prd && (c as WebsiteContent).blocks ? syncPrd(prev.prd, c as WebsiteContent) : prev.prd }));
  const hero = content.hero as { imageUrl?: string; photoUrl?: string; videoUrl?: string };
  const d = p.design;
  const replayKey = [d.anim, d.hover, d.intro ? "i" : "", d.tilt === false ? "t" : "", d.loader ?? "", d.showpiece ?? "", d.heroStyle].join("|");
  const rename = (name: string) => update((prev) => ({ ...prev, name }));

  return (
    <div className={"studio" + (focus ? " is-focus" : "") + " is-" + view}>
      <header className="studio-bar">
        <Link href="/sites" className="studio-back" aria-label="Back to your sites" title="Your sites">
          <span className="logo-mark" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 19 12 5l7 14M8.5 13h7" />
            </svg>
          </span>
        </Link>
        <div className="studio-name">
          <input aria-label="Site name" value={p.name} onChange={(e) => rename(e.target.value)} spellCheck={false} />
          <span className="small muted">{describe(p)}</span>
        </div>
        <div className="studio-bar-tools">
          <span className={"studio-save is-" + saveState} role="status" aria-live="polite">
            {saveState === "failed" ? "Not saved" : saveState === "saving" ? "Saving" : "Saved"}
          </span>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)">
            <Icon name="undo" size={16} />
          </button>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)">
            <Icon name="redo" size={16} />
          </button>
          <ThemeToggle />
          <button type="button" className="btn btn-sm studio-focus-btn" aria-pressed={focus} onClick={() => setFocus((v) => !v)}>
            <Icon name={focus ? "shrink" : "expand"} size={15} />
            {focus ? "Back to editing" : "Full preview"}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => (setFocus(false), setView("edit"), go("publish"))}>
            <Icon name="rocket" size={15} />
            Publish
          </button>
        </div>
      </header>
      <StorageNotice />

      <div className="studio-body">
        <nav className="studio-rail" aria-label="Studio panels">
          {list.map((x) => {
            const seen = x.step === "deploy" ? state.published : p.steps[x.step] === "approved";
            return (
              <button key={x.id} type="button" className={"studio-tab" + (panel === x.id ? " is-on" : "")} aria-current={panel === x.id ? "page" : undefined} onClick={() => (go(x.id), setView("edit"))}>
                {panel === x.id && <motion.span layoutId="studio-tab-pill" className="studio-tab-pill" transition={{ type: "spring", visualDuration: 0.25, bounce: 0.12 }} />}
                <span className="studio-tab-icon">
                  <Icon name={x.icon} size={19} />
                  {!seen && panel !== x.id && <span className="studio-tab-new" aria-label="Not opened yet" />}
                </span>
                <span className="studio-tab-text">{x.short}</span>
              </button>
            );
          })}
          <span className="studio-rail-foot" title={`${state.done} of ${state.total} launch checks done`}>
            <svg viewBox="0 0 36 36" width="34" height="34" aria-hidden="true">
              <circle cx="18" cy="18" r="15" fill="none" stroke="var(--line)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" pathLength={100} strokeDasharray={`${(state.done / state.total) * 100} 100`} transform="rotate(-90 18 18)" style={{ transition: "stroke-dasharray 400ms var(--ease-out)" }} />
            </svg>
            <span className="mono">
              {state.done}/{state.total}
            </span>
          </span>
        </nav>

        <section className="studio-panel" aria-label={info.title}>
          <div className="studio-panel-scroll" ref={body}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={panel} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease }}>
                <header className="studio-panel-head">
                  <h1>{info.title}</h1>
                  <p className="muted">{info.intro}</p>
                </header>

                {panel === "prd" && p.prd && <PrdPanel p={p} update={update} />}

                {panel === "sections" && <SectionsPanel p={p} update={update} />}

                {panel === "content" && (
                  <>
                    <DetailsPanel p={p} update={update} />
                    <h2 className="studio-sub">Polish the words</h2>
                    <RefinePanel p={p} update={update} />
                  </>
                )}

                {panel === "experience" && p.experience && <ExperiencePanel p={p} update={update} compare={compare} onCompare={setCompare} />}

                {panel === "design" && (
                  <DesignEditor
                    kind={p.kind}
                    design={p.design}
                    locks={p.locks}
                    personal={personal}
                    onChange={(design) => update((prev) => ({ ...prev, design: keepCast(prev.design, design) }))}
                    onLocks={(locks) => update((prev) => ({ ...prev, locks }), true)}
                    extra={
                      p.experience?.stage.engine === "liquid" ? (
                        <section className="xpp-block" aria-labelledby="st-material">
                          <h3 id="st-material">Material</h3>
                          <div className="seg" role="group" aria-labelledby="st-material">
                            {MATERIALS.map((m) => (
                              <button
                                key={m.world}
                                type="button"
                                aria-pressed={p.experience?.world === m.world}
                                className={p.experience?.world === m.world ? "is-on" : ""}
                                onClick={() => update((prev) => (prev.experience ? withExperience(prev, changeWorld(prev.experience, briefInput(prev), m.world), "Material: " + m.label) : prev))}
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>
                        </section>
                      ) : null
                    }
                  />
                )}

                {panel === "motion" && p.experience && <MotionPanel p={p} update={update} />}

                {panel === "page" && <PagePanel p={p} update={update} />}

                {panel === "publish" && <PublishPanel p={p} go={go} onDownloaded={() => update((prev) => ({ ...prev, steps: { ...prev.steps, deploy: "approved" } }), true)} />}
              </motion.div>
            </AnimatePresence>
          </div>
          {next && (
            <footer className="studio-panel-foot">
              <button type="button" className="btn studio-next" onClick={() => go(next.id)}>
                <span>
                  <span className="small muted">Next</span>
                  <b>{next.title}</b>
                </span>
                <Icon name="arrow" size={16} />
              </button>
            </footer>
          )}
        </section>

        <section className="studio-canvas" aria-label="Live preview">
          {compare && (
            <div className="studio-compare" role="status">
              <span>
                Showing an earlier version: <b>{compare.name}</b>
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCompare(null)}>
                Back to current
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => (update((prev) => withExperience(prev, compare, "Restore " + compare.name)), setCompare(null))}>
                Restore it
              </button>
            </div>
          )}
          <Preview kind={p.kind} design={p.design} content={content} experience={compare ?? p.experience} replayKey={replayKey} onContentChange={setContent} onDesignChange={patchDesign} />
        </section>
      </div>

      <button type="button" className="btn btn-primary studio-flip" onClick={() => setView((v) => (v === "edit" ? "preview" : "edit"))}>
        <Icon name={view === "edit" ? "eye" : "edit"} size={16} />
        {view === "edit" ? "See your site" : "Back to editing"}
      </button>
    </div>
  );
}
