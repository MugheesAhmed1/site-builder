"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DesignEditor from "@/components/DesignEditor";
import Icon from "@/components/Icon";
import MotionPicker from "@/components/MotionPicker";
import CastPicker from "@/components/CastPicker";
import { castContext } from "@/template/src/Cast.jsx";
import PortfolioForm, { GROUPS, groupCount } from "@/components/PortfolioForm";
import Preview from "@/components/Preview";
import { BuildStep, DeployStep, StatusBadge } from "@/components/Steps";
import Topbar from "@/components/Topbar";
import { composePortfolioFromInput, emptyInput, profileToInput } from "@/lib/compose";
import { personalDesign } from "@/lib/designs";
import { TONE_MOOD } from "@/lib/questions";
import { fileToText, parseResume } from "@/lib/resume";
import { SAMPLE_RESUME } from "@/lib/sample";
import { getProject, keepCast, markChanged, saveProject } from "@/lib/store";
import type { PortfolioInput, Project, StepId } from "@/lib/types";

// Portfolio Studio: a separate flow for professional portfolios. A full form (with résumé
// import to fill it), then the look, the animation, a final check and publishing.

const ease = [0.23, 1, 0.32, 1] as const;

const FLOW: { id: StepId; title: string; hint: string }[] = [
  { id: "questions", title: "Your details", hint: "Fill the form or import a résumé" },
  { id: "design", title: "Look", hint: "500 design systems to remix" },
  { id: "cast", title: "Characters", hint: "520 characters, 512 widgets" },
  { id: "motion", title: "Animation", hint: "728 styles played by Motion" },
  { id: "build", title: "Check and edit", hint: "Every word, every section" },
  { id: "deploy", title: "Publish", hint: "Download and put it online" },
];

function inputOf(p: Project): PortfolioInput {
  return { ...emptyInput(), ...(p.input ?? profileToInput(p.profile, p.answers)) };
}

function isEmpty(v: unknown) {
  return v === "" || v == null || (Array.isArray(v) && v.length === 0);
}

// Fills only what's empty, so typed details are never overwritten by an import.
function mergeInput(cur: PortfolioInput, add: PortfolioInput): PortfolioInput {
  const out = { ...cur } as Record<string, unknown>;
  for (const [k, v] of Object.entries(add)) if (isEmpty(out[k]) && !isEmpty(v)) out[k] = v;
  return out as unknown as PortfolioInput;
}

function ImportBox({ fileName, onImport }: { fileName: string; onImport: (text: string, file: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [paste, setPaste] = useState("");
  const read = async (f: File) => {
    setError("");
    setBusy(true);
    try {
      const t = await fileToText(f);
      if (t.trim().length < 40) throw new Error("We couldn't find text in that file. If it's a scanned image, paste the text instead.");
      onImport(t, f.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="import">
      <div
        className={"dropzone is-slim" + (over ? " is-over" : "")}
        role="button"
        tabIndex={0}
        onClick={() => ref.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && ref.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) read(f);
        }}
      >
        <Icon name="upload" size={20} />
        <span>
          <strong>{busy ? "Reading..." : fileName ? `Filled from ${fileName}. Drop another to add more.` : "Fill the form from your résumé"}</strong>
          <span className="small muted"> PDF or text, read on this device and never uploaded.</span>
        </span>
        <input ref={ref} type="file" accept=".pdf,.txt,.md,application/pdf,text/plain" hidden onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
      </div>
      <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
        <details className="disclosure">
          <summary>Paste text instead</summary>
          <textarea rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} aria-label="Résumé text" style={{ marginTop: 8 }} />
          <button className="btn btn-sm" style={{ marginTop: 8 }} disabled={paste.trim().length < 40} onClick={() => onImport(paste, "pasted text")}>
            Fill from this text
          </button>
        </details>
        {!fileName && (
          <button className="btn btn-ghost btn-sm" onClick={() => onImport(SAMPLE_RESUME, "sample-resume.txt")}>
            Try a sample résumé
          </button>
        )}
      </div>
      {error && (
        <div className="notice notice-error" role="alert" style={{ marginTop: 10 }}>
          <strong>That didn&apos;t work.</strong> {error}
        </div>
      )}
    </div>
  );
}

export default function PortfolioStudio() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<Project | null>(null);
  const [step, setStep] = useState<StepId>("questions");
  const [group, setGroup] = useState<string>("basics");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const proj = getProject(id);
    if (proj && !proj.input) proj.input = inputOf(proj);
    setP(proj);
    if (proj) setStep(FLOW.find((s) => proj.steps[s.id] !== "approved")?.id ?? "deploy");
    setLoaded(true);
  }, [id]);

  const update = useCallback((fn: (prev: Project) => Project) => {
    setP((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      saveProject(next);
      return next;
    });
  }, []);

  const input = p ? inputOf(p) : null;
  const draft = useMemo(() => (input ? composePortfolioFromInput(input) : null), [p?.input]); // eslint-disable-line react-hooks/exhaustive-deps
  const personal = useMemo(() => (p && input ? personalDesign(input.name || p.query, p.query, TONE_MOOD[input.tone] ?? undefined, p.category) : null), [input?.name, input?.tone, p?.query]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!loaded) return null;
  if (!p || !input || !draft || !personal) {
    return (
      <>
        <Topbar />
        <main className="page" style={{ paddingTop: 64 }}>
          <h1>We couldn&apos;t find that portfolio</h1>
          <p className="muted" style={{ marginTop: 10 }}>
            Portfolios are saved in the browser they were made in. If you made it elsewhere, import its backup on the home page.
          </p>
          <Link className="btn" href="/" style={{ marginTop: 20 }}>
            Go to home
          </Link>
        </main>
      </>
    );
  }

  const go = (s: StepId) => {
    setStep(s);
    window.scrollTo({ top: 0 });
  };
  const idx = FLOW.findIndex((s) => s.id === step);
  const canOpen = (s: StepId) => {
    const i = FLOW.findIndex((x) => x.id === s);
    return i === 0 || FLOW.slice(0, i).every((x) => p.steps[x.id] === "approved" || p.steps[x.id] === "stale");
  };
  const rebuild = (prev: Project): Project => ({
    ...prev,
    content: composePortfolioFromInput(inputOf(prev)),
    history: prev.content ? [{ at: new Date().toISOString(), label: "Before rebuild", content: prev.content }, ...prev.history].slice(0, 10) : prev.history,
    steps: { ...prev.steps, build: "draft" },
  });
  const approve = (s: StepId, extra?: (prev: Project) => Project) => {
    update((prev) => {
      let next: Project = { ...prev, steps: { ...prev.steps, [s]: "approved" } };
      if (extra) next = extra(next);
      return next;
    });
    const i = FLOW.findIndex((x) => x.id === s);
    if (i < FLOW.length - 1) go(FLOW[i + 1].id);
  };
  const head = (title: string, intro: string, action?: React.ReactNode) => (
    <div className="main-head">
      <div>
        <div className="eyebrow">
          <span className="mono">
            Step {idx + 1} of {FLOW.length}
          </span>
          <StatusBadge s={p.steps[step]} />
        </div>
        <h1>{title}</h1>
        <p className="intro">{intro}</p>
      </div>
      {action}
    </div>
  );
  const missing = [!input.name && "your name", !input.role && "what you do", !input.email && "your email"].filter(Boolean) as string[];
  const setInput = (v: PortfolioInput) => update((prev) => markChanged({ ...prev, input: v, name: v.name || prev.name }, "questions"));

  return (
    <>
      <Topbar>
        <span className="saved">Saved in this browser</span>
      </Topbar>
      <div className="builder">
        <aside className="sidebar" aria-label="Steps">
          <div className="studio-tag">
            <span className="studio-avatar" aria-hidden="true">
              {(input.name || "P")
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase())
                .join("")}
            </span>
            <span>
              <b>{input.name || "Your portfolio"}</b>
              <span className="small muted" style={{ display: "block" }}>
                Portfolio Studio
              </span>
            </span>
          </div>
          <ol className="stepper">
            {FLOW.map((s, i) => (
              <li key={s.id}>
                <button className={`step-link ${s.id === step ? "is-active" : ""} is-${p.steps[s.id]}`} disabled={!canOpen(s.id)} aria-current={s.id === step ? "step" : undefined} onClick={() => go(s.id)}>
                  <span className="step-num">{p.steps[s.id] === "approved" ? <Icon name="check" size={14} /> : i + 1}</span>
                  <span>
                    <span className="step-title" style={{ display: "block" }}>
                      {s.title}
                    </span>
                    <span className="step-hint">{p.steps[s.id] === "stale" ? "Changed earlier, needs a look" : s.hint}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <main className="main">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div className="step-body" key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24, ease }}>
              {p.steps[step] === "stale" && (
                <div className="notice notice-warn" style={{ marginBottom: 20 }}>
                  You changed your details after this step was made. Check it still fits, rebuild it, or approve it as it is.
                </div>
              )}

              {step === "questions" && (
                <>
                  {head(
                    "Your details",
                    "Everything a professional portfolio needs, in plain fields. Each group becomes a section of your site, and empty groups are left out. The preview updates as you type.",
                    <button
                      className="btn btn-primary"
                      disabled={missing.length > 0}
                      title={missing.length ? "Add " + missing.join(", ") : undefined}
                      onClick={() =>
                        approve("questions", (prev) => {
                          let next = prev;
                          if (prev.steps.design === "todo") next = { ...next, design: keepCast(prev.design, personalDesign(input.name || prev.query, prev.query, TONE_MOOD[input.tone] ?? undefined, prev.category)) };
                          if (prev.content) next = { ...next, steps: { ...next.steps, build: "stale" } };
                          return next;
                        })
                      }
                    >
                      Next: look
                      <Icon name="arrow" size={16} />
                    </button>
                  )}
                  {missing.length > 0 && <p className="hint" style={{ marginTop: -12, marginBottom: 16 }}>To continue, add {missing.join(", ")} under Basics.</p>}
                  <ImportBox
                    fileName={p.resumeFileName}
                    onImport={(text, file) =>
                      update((prev) => {
                        const profile = parseResume(text);
                        return markChanged({ ...prev, profile, resumeText: text, resumeFileName: file, input: mergeInput(inputOf(prev), profileToInput(profile)) }, "questions");
                      })
                    }
                  />
                  <div className="studio-grid">
                    <nav className="group-nav" aria-label="Form sections">
                      {GROUPS.map((g) => {
                        const n = groupCount(input, g.id);
                        return (
                          <button key={g.id} className={"group-link" + (group === g.id ? " is-on" : "")} aria-current={group === g.id ? "true" : undefined} onClick={() => setGroup(g.id)}>
                            {group === g.id && <motion.span layoutId="group-pill" className="group-pill" transition={{ type: "spring", visualDuration: 0.3, bounce: 0.15 }} />}
                            <span className="group-text">
                              <b>{g.title}</b>
                              <span className="small muted">{g.hint}</span>
                            </span>
                            <span className={"group-count mono" + (n ? " is-on" : "")}>{n || ""}</span>
                          </button>
                        );
                      })}
                    </nav>
                    <section className="panel studio-form">
                      <div className="panel-title">
                        <h2>{GROUPS.find((g) => g.id === group)?.title}</h2>
                        <span className="small muted">{GROUPS.find((g) => g.id === group)?.hint}</span>
                      </div>
                      <PortfolioForm value={input} onChange={setInput} group={group} />
                      <div className="row between" style={{ marginTop: 22 }}>
                        <button className="btn btn-ghost btn-sm" disabled={group === GROUPS[0].id} onClick={() => setGroup(GROUPS[Math.max(0, GROUPS.findIndex((g) => g.id === group) - 1)].id)}>
                          Back
                        </button>
                        {group !== GROUPS[GROUPS.length - 1].id && (
                          <button className="btn btn-sm" onClick={() => setGroup(GROUPS[GROUPS.findIndex((g) => g.id === group) + 1].id)}>
                            Next: {GROUPS[GROUPS.findIndex((g) => g.id === group) + 1].title}
                            <Icon name="arrow" size={15} />
                          </button>
                        )}
                      </div>
                    </section>
                    <div className="sticky-preview studio-preview">
                      <Preview kind="portfolio" design={p.design.id ? p.design : personal} content={draft} compact />
                    </div>
                  </div>
                </>
              )}

              {step === "design" && (
                <>
                  {head(
                    "Your look",
                    "This design system was made for you. Shuffle, remix one part, lock what you like, or pick from the library of 500.",
                    <button className="btn btn-primary" onClick={() => approve("design")}>
                      Next: characters
                      <Icon name="arrow" size={16} />
                    </button>
                  )}
                  <div className="design-grid">
                    <DesignEditor kind="portfolio" design={p.design} locks={p.locks} personal={personal} onChange={(design) => update((prev) => markChanged({ ...prev, design: keepCast(prev.design, design) }, "design"))} onLocks={(locks) => update((prev) => ({ ...prev, locks }))} />
                    <div className="sticky-preview">
                      <Preview kind="portfolio" design={p.design} content={p.content ?? draft} />
                    </div>
                  </div>
                </>
              )}

              {step === "cast" && (
                <>
                  {head(
                    "Characters, widgets and live scenes",
                    "Pick a character, up to six widgets and a live scene. Everything is already animated and reacts to the pointer, taps and drags: particles, nature, your own photo or 3D shapes you can throw around.",
                    <button className="btn btn-primary" onClick={() => approve("cast")}>
                      Use this cast
                      <Icon name="arrow" size={16} />
                    </button>
                  )}
                  <div className="design-grid">
                    <CastPicker photo={((p.content ?? draft) as { hero?: { photoUrl?: string } } | null)?.hero?.photoUrl} kind="portfolio" category={p.category} design={p.design} ctx={castContext("portfolio", p.content ?? draft)} onChange={(patch) => update((prev) => markChanged({ ...prev, design: { ...prev.design, ...patch } }, "cast"))} />
                    <div className="sticky-preview">
                      <Preview kind={"portfolio"} design={p.design} content={p.content ?? draft} replayKey={(p.design.cast?.character.id ?? "none") + (p.design.cast?.widgets.map((w) => w.id).join("") ?? "") + (p.design.scene?.id ?? "") + (p.design.sceneMode ?? "")} />
                    </div>
                  </div>
                </>
              )}

              {step === "motion" && (
                <>
                  {head(
                    "Animation",
                    "Pick how your portfolio moves. All 728 styles are played by Motion, the library behind Framer Motion, in the site you download too.",
                    <button className="btn btn-primary" onClick={() => approve("motion", (prev) => (prev.content && prev.steps.build !== "stale" ? prev : rebuild(prev)))}>
                      Use this animation
                      <Icon name="arrow" size={16} />
                    </button>
                  )}
                  <div className="design-grid">
                    <MotionPicker category={p.category} design={p.design} onChange={(patch) => update((prev) => markChanged({ ...prev, design: { ...prev.design, ...patch } }, "motion"))} />
                    <div className="sticky-preview">
                      <Preview kind="portfolio" design={p.design} content={p.content ?? draft} replayKey={p.design.anim + p.design.hover + (p.design.intro ? "i" : "") + (p.design.tilt === false ? "t" : "")} />
                    </div>
                  </div>
                </>
              )}

              {step === "build" && (
                <BuildStep
                  p={p}
                  head={head}
                  word="portfolio"
                  onRebuild={() => update(rebuild)}
                  onEdit={(content) => update((prev) => markChanged({ ...prev, content }, "build"))}
                  onUndo={(i) =>
                    update((prev) =>
                      markChanged({ ...prev, content: prev.history[i].content, history: [{ at: new Date().toISOString(), label: "Before undo", content: prev.content! }, ...prev.history.filter((_, j) => j !== i)].slice(0, 10) }, "build")
                    )
                  }
                  onApprove={() => approve("build")}
                />
              )}

              {step === "deploy" && <DeployStep p={p} head={head} onDone={() => approve("deploy")} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </>
  );
}
