"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import MotionPicker from "@/components/MotionPicker";
import CastPicker from "@/components/CastPicker";
import { castContext } from "@/template/src/Cast.jsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DesignEditor from "@/components/DesignEditor";
import FieldsEditor from "@/components/FieldsEditor";
import { BuildStep, DeployStep, StatusBadge, type Head } from "@/components/Steps";
import Icon from "@/components/Icon";
import Preview from "@/components/Preview";
import PreviewJump from "@/components/PreviewJump";
import Topbar from "@/components/Topbar";
import { CATEGORIES } from "@/lib/categories";
import { composePortfolio, composeWebsite } from "@/lib/compose";
import { personalDesign } from "@/lib/designs";
import { downloadZip, saveBlob, siteName } from "@/lib/export";
import { TONE_MOOD, defaultAnswers, questionsFor } from "@/lib/questions";
import { fileToText, parseResume } from "@/lib/resume";
import { SAMPLE_RESUME } from "@/lib/sample";
import { getProject, keepCast, markChanged, saveProject } from "@/lib/store";
import type { PortfolioContent, Project, Question, SiteContent, SiteKind, StepId, WebsiteContent } from "@/lib/types";
import { STEPS } from "@/lib/types";

function compose(p: Project): SiteContent {
  return p.kind === "portfolio" ? composePortfolio(p.profile, p.answers) : composeWebsite(p.category, p.answers);
}

export default function BuildPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [p, setP] = useState<Project | null>(null);
  const [step, setStep] = useState<StepId>("questions");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const proj = getProject(id);
    setP(proj);
    if (proj) setStep(STEPS.find((s) => proj.steps[s.id] !== "approved")?.id ?? "deploy");
    setLoaded(true);
  }, [id]);

  // Portfolios have their own studio with a full form.
  useEffect(() => {
    if (p?.kind === "portfolio") router.replace(`/portfolio/${p.id}`);
  }, [p?.kind, p?.id, router]);

  // Save on every change, so nothing is lost if the tab closes.
  const update = useCallback((fn: (prev: Project) => Project) => {
    setP((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      saveProject(next);
      return next;
    });
  }, []);

  const go = (s: StepId) => {
    setStep(s);
    window.scrollTo({ top: 0 });
  };

  const approve = (s: StepId, extra?: (prev: Project) => Project) => {
    update((prev) => {
      let next: Project = { ...prev, steps: { ...prev.steps, [s]: "approved" } };
      if (extra) next = extra(next);
      return next;
    });
    const i = STEPS.findIndex((x) => x.id === s);
    if (i < STEPS.length - 1) go(STEPS[i + 1].id);
  };

  const personal = useMemo(() => (p ? personalDesign(p.answers.name || p.name || p.query, p.query, TONE_MOOD[p.answers.tone ?? ""], p.category) : null), [p?.answers.name, p?.answers.tone, p?.query, p?.name]);
  const draft = useMemo(() => (p ? compose(p) : null), [p?.answers, p?.profile, p?.kind, p?.category]);

  if (!loaded) return null;
  if (!p || !personal || !draft) {
    return (
      <>
        <Topbar />
        <main className="page" style={{ paddingTop: 64 }}>
          <h1>We couldn&apos;t find that site</h1>
          <p className="muted" style={{ marginTop: 10 }}>
            Sites are saved in the browser they were made in. If you made it elsewhere, import its backup on the home page.
          </p>
          <Link className="btn" href="/" style={{ marginTop: 20 }}>
            Go to home
          </Link>
        </main>
      </>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const canOpen = (s: StepId) => {
    const i = STEPS.findIndex((x) => x.id === s);
    return i === 0 || STEPS.slice(0, i).every((x) => p.steps[x.id] === "approved" || p.steps[x.id] === "stale");
  };
  const word = p.kind === "portfolio" ? "portfolio" : "website";

  const head = (title: string, intro: string, action?: React.ReactNode) => (
    <div className="main-head">
      <div>
        <div className="eyebrow">
          <span className="mono">
            Step {stepIndex + 1} of {STEPS.length}
          </span>
          <StatusBadge s={p.steps[step]} />
        </div>
        <h1>{title}</h1>
        <p className="intro">{intro}</p>
      </div>
      {action}
    </div>
  );

  const rebuild = (prev: Project): Project => ({
    ...prev,
    content: compose(prev),
    history: prev.content ? [{ at: new Date().toISOString(), label: "Before rebuild", content: prev.content }, ...prev.history].slice(0, 10) : prev.history,
    steps: { ...prev.steps, build: "draft" },
  });

  return (
    <>
      <Topbar>
        <span className="saved">Saved in this browser</span>
      </Topbar>
      <div className="builder">
        <aside className="sidebar" aria-label="Steps">
          <ol className="stepper">
            {STEPS.map((s, i) => (
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
          <motion.div className="step-body" key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}>
            {p.steps[step] === "stale" && (
              <div className="notice notice-warn" style={{ marginBottom: 20 }}>
                You changed an earlier step after this one was made. Check it still fits, rebuild it, or approve it as it is.
              </div>
            )}

            {step === "start" && (
              <StartStep
                p={p}
                head={head}
                onChange={(kind, category) =>
                  update((prev) => {
                    const fresh = defaultAnswers(kind, category, { name: prev.answers.name ?? "", city: prev.answers.city ?? prev.answers.location ?? "" });
                    // Keep answers that still apply; fill new questions with their suggestions.
                    const ids = new Set(questionsFor(kind, category).map((q) => q.id));
                    const kept = Object.fromEntries(Object.entries(prev.answers).filter(([k]) => ids.has(k) && !(k in fresh && questionsFor(prev.kind, prev.category).find((q) => q.id === k)?.suggest === prev.answers[k])));
                    return markChanged({ ...prev, kind, category, answers: { ...fresh, ...kept } }, "start");
                  })
                }
                onApprove={() => approve("start")}
              />
            )}

            {step === "questions" && (
              <QuestionsStep
                p={p}
                head={head}
                onAnswers={(answers) => update((prev) => markChanged({ ...prev, answers }, "questions"))}
                onResume={(profile, resumeText, resumeFileName) =>
                  update((prev) => {
                    const a = { ...prev.answers };
                    const fill = (k: string, v: string) => {
                      if (v && !a[k]) a[k] = v;
                    };
                    fill("name", profile.name);
                    fill("role", profile.headline.split(/[,|]/)[0]?.trim() ?? "");
                    fill("location", profile.location);
                    fill("email", profile.email);
                    fill("phone", profile.phone);
                    fill("links", profile.links.map((l) => l.url).join("\n"));
                    return markChanged({ ...prev, profile, resumeText, resumeFileName, answers: a }, "questions");
                  })
                }
                onProfile={(profile) => update((prev) => markChanged({ ...prev, profile }, "questions"))}
                onApprove={() =>
                  approve("questions", (prev) => {
                    let next: Project = { ...prev, name: prev.answers.name || prev.name };
                    // The first time through, the design system is made for this person and their tone.
                    if (prev.steps.design === "todo") next.design = keepCast(prev.design, personalDesign(next.answers.name || next.name || next.query, next.query, TONE_MOOD[next.answers.tone ?? ""], next.category));
                    if (prev.content) next = { ...next, steps: { ...next.steps, build: "stale" } };
                    return next;
                  })
                }
              />
            )}

            {step === "design" && (
              <>
                {head(
                  "Your design system",
                  "This one was made for you. Shuffle for a new one, remix one part, lock what you like, or pick from the library. The preview uses your own words.",
                  <button className="btn btn-primary" onClick={() => approve("design")}>
                    Use this design
                    <Icon name="arrow" size={16} />
                  </button>
                )}
                <div className="design-grid">
                  <DesignEditor
                    kind={p.kind}
                    design={p.design}
                    locks={p.locks}
                    personal={personal}
                    onChange={(design) => update((prev) => markChanged({ ...prev, design: keepCast(prev.design, design) }, "design"))}
                    onLocks={(locks) => update((prev) => ({ ...prev, locks }))}
                  />
                  <div className="sticky-preview">
                    <Preview kind={p.kind} design={p.design} content={p.content ?? draft} />
                  </div>
                </div>
              </>
            )}

            {step === "cast" && (
              <>
                {head(
                  "Scene concepts, characters and widgets",
                  "Start with a scene concept for your opening: a parrot that flies in, a whale swimming past, a walk through the jungle and many more, in real-life, particle, nature or cartoon style. Then pick a character and up to six widgets. Everything is animated and reacts to the pointer, taps and drags.",
                  <button className="btn btn-primary" onClick={() => approve("cast")}>
                    Use this cast
                    <Icon name="arrow" size={16} />
                  </button>
                )}
                <div className="design-grid">
                  <CastPicker photo={((p.content ?? draft) as unknown as { hero?: { imageUrl?: string; photoUrl?: string } }).hero?.imageUrl} kind={p.kind} category={p.category} design={p.design} ctx={castContext(p.kind === "portfolio" ? "portfolio" : "website", p.content ?? draft)} onChange={(patch) => update((prev) => markChanged({ ...prev, design: { ...prev.design, ...patch } }, "cast"))} />
                  <div className="sticky-preview">
                    <Preview kind={p.kind} design={p.design} content={p.content ?? draft} replayKey={(p.design.cast?.character.id ?? "none") + (p.design.cast?.widgets.map((w) => w.id).join("") ?? "") + (p.design.scene?.id ?? "") + (p.design.sceneMode ?? "")} />
                  </div>
                </div>
              </>
            )}

            {step === "motion" && (
              <>
                {head(
                  "Animation",
                  "Pick how your site moves. Every style is played by Motion, the animation library behind Framer Motion, in the site you download too.",
                  <button className="btn btn-primary" onClick={() => approve("motion", (prev) => (prev.content && prev.steps.build !== "stale" ? prev : rebuild(prev)))}>
                    Use this animation
                    <Icon name="arrow" size={16} />
                  </button>
                )}
                <div className="design-grid">
                  <MotionPicker
                    category={p.category}
                    design={p.design}
                    onChange={(patch) => update((prev) => markChanged({ ...prev, design: { ...prev.design, ...patch } }, "motion"))}
                    video={(p.content as { hero?: { videoUrl?: string } } | null)?.hero?.videoUrl}
                    onVideo={p.content ? (v) => update((prev) => (prev.content ? ({ ...prev, content: { ...prev.content, hero: { ...prev.content.hero, videoUrl: v } } } as typeof prev) : prev)) : undefined}
                  />
                  <div className="sticky-preview">
                    <Preview kind={p.kind} design={p.design} content={p.content ?? draft} replayKey={p.design.anim + p.design.hover + (p.design.intro ? "i" : "") + (p.design.tilt === false ? "t" : "") + (p.design.loader || "")} />
                  </div>
                </div>
              </>
            )}

            {step === "build" && (
              <BuildStep
                p={p}
                head={head}
                word={word}
                onRebuild={() => update(rebuild)}
                onEdit={(content) => update((prev) => markChanged({ ...prev, content }, "build"))}
                onDesign={(patch) => update((prev) => ({ ...prev, design: { ...prev.design, ...patch } }))}
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
        <PreviewJump step={step} />
      </div>
    </>
  );
}


function StartStep({ p, head, onChange, onApprove }: { p: Project; head: Head; onChange: (k: SiteKind, c: string) => void; onApprove: () => void }) {
  return (
    <>
      {head(
        "What you're building",
        "We read your request with simple rules. If we guessed wrong, change it here. The questions change to match.",
        <button className="btn btn-primary" onClick={onApprove}>
          Looks right
          <Icon name="arrow" size={16} />
        </button>
      )}
      <div className="stack" style={{ gap: 22, maxWidth: 640 }}>
        <div>
          <label className="lbl">You asked for</label>
          <p className="lead-quote">{p.query}</p>
        </div>
        <div>
          <label className="lbl">Kind of site</label>
          <div className="seg" role="group" aria-label="Kind of site">
            {(["portfolio", "website"] as const).map((k) => (
              <button key={k} aria-pressed={p.kind === k} className={p.kind === k ? "is-on" : ""} onClick={() => onChange(k, k === "portfolio" ? "portfolio" : p.category === "portfolio" ? "general" : p.category)}>
                {k === "portfolio" ? "Personal portfolio" : "Business website"}
              </button>
            ))}
          </div>
        </div>
        {p.kind === "website" && (
          <div>
            <label className="lbl" htmlFor="cat">
              Type of business
            </label>
            <select id="cat" value={p.category} onChange={(e) => onChange("website", e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="hint" style={{ marginTop: 8 }}>
              Sets the questions, the starting services, the steps and the common questions on your site.
            </p>
          </div>
        )}
        <p className="hint">{questionsFor(p.kind, p.category).length} questions next. Most already have a suggested answer.</p>
      </div>
    </>
  );
}

function QuestionField({ q, value, onChange }: { q: Question; value: string; onChange: (v: string) => void }) {
  const id = "q-" + q.id;
  if (q.type === "choice") {
    return (
      <div className="choices" role="radiogroup" aria-labelledby={id + "-l"}>
        {q.options!.map((o) => (
          <button key={o} role="radio" aria-checked={value === o} className={"chip" + (value === o ? " is-on" : "")} onClick={() => onChange(o)}>
            {o}
          </button>
        ))}
      </div>
    );
  }
  if (q.type === "textarea" || q.type === "list") {
    const lines = Math.max(q.type === "list" ? 3 : 3, (value || q.placeholder || "").split("\n").length);
    return <textarea id={id} rows={Math.min(lines, 8)} value={value} placeholder={q.placeholder} onChange={(e) => onChange(e.target.value)} />;
  }
  return <input id={id} type="text" value={value} placeholder={q.placeholder} onChange={(e) => onChange(e.target.value)} />;
}

function QuestionsStep({
  p,
  head,
  onAnswers,
  onResume,
  onProfile,
  onApprove,
}: {
  p: Project;
  head: Head;
  onAnswers: (a: Record<string, string>) => void;
  onResume: (profile: NonNullable<Project["profile"]>, text: string, fileName: string) => void;
  onProfile: (profile: NonNullable<Project["profile"]>) => void;
  onApprove: () => void;
}) {
  const qs = questionsFor(p.kind, p.category);
  const missing = qs.filter((q) => q.required && !(p.answers[q.id] ?? "").trim());
  const [tried, setTried] = useState(false);
  return (
    <>
      {head(
        p.kind === "portfolio" ? "About you" : "About your business",
        p.kind === "portfolio"
          ? "Add your résumé to fill most of this in, then check the answers. Anything left empty is skipped or uses your résumé."
          : "Plain questions, most with a suggested answer. Change what's wrong and leave the rest.",
        <button
          className="btn btn-primary"
          onClick={() => {
            setTried(true);
            if (!missing.length) onApprove();
          }}
        >
          Next: design
          <Icon name="arrow" size={16} />
        </button>
      )}
      {tried && missing.length > 0 && (
        <div className="notice notice-warn" role="alert" style={{ marginBottom: 20, maxWidth: 760 }}>
          Please answer: {missing.map((q) => q.label.toLowerCase().replace(/[?.!]+$/, "")).join(", ")}.
        </div>
      )}
      {p.kind === "portfolio" && <ResumeBox p={p} onResume={onResume} onProfile={onProfile} />}
      <ol className="q-list" style={{ listStyle: "none", padding: 0, margin: 0, maxWidth: 760 }}>
        {qs.map((q, i) => {
          const v = p.answers[q.id] ?? "";
          const bad = tried && q.required && !v.trim();
          return (
            <li className={"q-item" + (bad ? " is-bad" : "")} key={q.id}>
              <span className="q-num">{String(i + 1).padStart(2, "0")}</span>
              <div className="q-body">
                <label htmlFor={"q-" + q.id} id={"q-" + q.id + "-l"}>
                  <h3>
                    {q.label}
                    {q.required && <span className="req"> required</span>}
                  </h3>
                </label>
                {q.help && <p className="q-why">{q.help}</p>}
                <QuestionField q={q} value={v} onChange={(val) => onAnswers({ ...p.answers, [q.id]: val })} />
                {q.suggest && v !== q.suggest && q.type !== "choice" && (
                  <div>
                    <button className="btn btn-ghost btn-sm" onClick={() => onAnswers({ ...p.answers, [q.id]: q.suggest! })}>
                      Use the suggestion
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="row" style={{ marginTop: 24 }}>
        <button
          className="btn btn-primary"
          onClick={() => {
            setTried(true);
            if (!missing.length) onApprove();
            else window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          Next: design
          <Icon name="arrow" size={16} />
        </button>
      </div>
    </>
  );
}

function ResumeBox({ p, onResume, onProfile }: { p: Project; onResume: (profile: NonNullable<Project["profile"]>, text: string, fileName: string) => void; onProfile: (profile: NonNullable<Project["profile"]>) => void }) {
  const [text, setText] = useState(p.resumeText);
  const [over, setOver] = useState(false);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = async (f: File) => {
    setError("");
    setReading(true);
    try {
      const t = await fileToText(f);
      if (t.trim().length < 40) throw new Error("We couldn't find text in that file. If it's a scanned image, paste the text instead.");
      setText(t);
      onResume(parseResume(t), t, f.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setReading(false);
    }
  };

  const found = p.profile;
  return (
    <section className="panel" style={{ maxWidth: 760, marginBottom: 28 }}>
      <div className="panel-title">
        <h2>Your résumé</h2>
        <span className="small muted">Read on this device. Never uploaded.</span>
      </div>
      <div
        className={"dropzone" + (over ? " is-over" : "")}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) readFile(f);
        }}
      >
        <Icon name="upload" size={24} />
        <strong>{reading ? "Reading..." : p.resumeFileName ? `Using ${p.resumeFileName}. Drop another to replace it.` : "Drop your résumé here, or choose a file"}</strong>
        <span className="small muted">PDF or plain text</span>
        <input ref={inputRef} type="file" accept=".pdf,.txt,.md,application/pdf,text/plain" hidden onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
      </div>
      {error && (
        <div className="notice notice-error" role="alert" style={{ marginTop: 12 }}>
          <strong>That didn&apos;t work.</strong> {error}
        </div>
      )}
      <details className="disclosure" style={{ marginTop: 14 }}>
        <summary>Paste the text instead</summary>
        <textarea rows={8} value={text} placeholder="Paste your résumé here" onChange={(e) => setText(e.target.value)} style={{ marginTop: 10 }} aria-label="Résumé text" />
        <div className="row wrap" style={{ marginTop: 8 }}>
          <button className="btn btn-sm" disabled={text.trim().length < 40} onClick={() => onResume(parseResume(text), text, "")}>
            Read this text
          </button>
        </div>
      </details>
      {!found && (
        <div className="row wrap" style={{ marginTop: 12 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setText(SAMPLE_RESUME);
              onResume(parseResume(SAMPLE_RESUME), SAMPLE_RESUME, "sample-resume.txt");
            }}
          >
            Try it with a sample résumé
          </button>
        </div>
      )}
      {found && (
        <details className="disclosure" style={{ marginTop: 16 }}>
          <summary>
            We found {found.experience.length} jobs, {found.projects.length} projects and {found.skills.length} skills. Check or fix them.
          </summary>
          <div style={{ marginTop: 12 }}>
            <FieldsEditor value={found} onChange={onProfile} />
          </div>
        </details>
      )}
    </section>
  );
}

