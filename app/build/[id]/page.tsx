"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import DesignEditor from "@/components/DesignEditor";
import FieldsEditor from "@/components/FieldsEditor";
import Icon from "@/components/Icon";
import Preview from "@/components/Preview";
import Topbar from "@/components/Topbar";
import { askClaude, fileToBase64 } from "@/lib/ai";
import { downloadZip, saveBlob } from "@/lib/export";
import { contentFromProfile } from "@/lib/fromProfile";
import { normalizeDesign } from "@/lib/presets";
import { getProject, markChanged, saveProject } from "@/lib/store";
import type { Design, PortfolioContent, PortfolioProject, Profile, Question, SectionId, StepId } from "@/lib/types";
import { STEPS } from "@/lib/types";

const ALL_SECTIONS: { id: SectionId; label: string }[] = [
  { id: "stats", label: "Impact numbers" },
  { id: "about", label: "About" },
  { id: "process", label: "How I work" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Work" },
  { id: "skills", label: "Skills" },
  { id: "education", label: "Education" },
  { id: "certifications", label: "Certifications" },
  { id: "testimonials", label: "Testimonials" },
  { id: "contact", label: "Contact" },
];

function Busy({ text, chars }: { text: string; chars: number }) {
  return (
    <span className="busy" role="status">
      <span className="spinner" aria-hidden="true" />
      {text}
      <span className="mono">{chars > 0 ? `${(chars / 1000).toFixed(1)}k characters` : "thinking"}</span>
    </span>
  );
}

function StatusBadge({ s }: { s: string }) {
  const text = s === "todo" ? "Not started" : s === "approved" ? "Approved" : s === "stale" ? "Needs a look" : "Draft";
  return <span className={`badge badge-${s}`}>{text}</span>;
}

export default function BuildPage() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<PortfolioProject | null>(null);
  const [step, setStep] = useState<StepId>("resume");
  const [busy, setBusy] = useState<string>("");
  const [chars, setChars] = useState(0);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const proj = getProject(id);
    setP(proj);
    if (proj) {
      const firstOpen = STEPS.find((s) => proj.steps[s.id] !== "approved");
      setStep(firstOpen?.id ?? "deploy");
    }
    setLoaded(true);
  }, [id]);

  // Save on every change, so nothing is lost if the tab closes.
  const update = useCallback((fn: (prev: PortfolioProject) => PortfolioProject) => {
    setP((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      saveProject(next);
      return next;
    });
  }, []);

  const run = async <T,>(label: string, req: Parameters<typeof askClaude>[0]): Promise<T | null> => {
    setBusy(label);
    setChars(0);
    setError("");
    try {
      return await askClaude<T>(req, setChars);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy("");
    }
  };

  const go = (s: StepId) => {
    setStep(s);
    setError("");
    window.scrollTo({ top: 0 });
  };

  const approve = (s: StepId) => {
    update((prev) => ({ ...prev, steps: { ...prev.steps, [s]: "approved" } }));
    const i = STEPS.findIndex((x) => x.id === s);
    if (i < STEPS.length - 1) go(STEPS[i + 1].id);
  };

  if (!loaded) return null;
  if (!p) {
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

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const canOpen = (s: StepId) => {
    const i = STEPS.findIndex((x) => x.id === s);
    return i === 0 || STEPS.slice(0, i).every((x) => p.steps[x.id] === "approved" || p.steps[x.id] === "stale");
  };
  const previewContent: PortfolioContent | null = p.content ?? (p.profile ? contentFromProfile(p.profile) : null);

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
                <button
                  className={`step-link ${s.id === step ? "is-active" : ""} is-${p.steps[s.id]}`}
                  disabled={!canOpen(s.id)}
                  aria-current={s.id === step ? "step" : undefined}
                  onClick={() => go(s.id)}
                >
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
          <div className="step-body" key={step}>
            {error && (
              <div className="notice notice-error" role="alert" style={{ marginBottom: 20 }}>
                <strong>That didn&apos;t work.</strong> {error}
              </div>
            )}
            {p.steps[step] === "stale" && (
              <div className="notice notice-warn" style={{ marginBottom: 20 }}>
                You changed an earlier step after this one was made. Check it still fits, regenerate it, or approve it as it is.
              </div>
            )}

            {step === "resume" && (
              <ResumeStep
                p={p}
                busy={busy}
                chars={chars}
                head={head}
                onExtract={async (text, file) => {
                  const pdfBase64 = file && file.type === "application/pdf" ? await fileToBase64(file) : undefined;
                  const resumeText = file && file.type !== "application/pdf" ? await file.text() : text;
                  const profile = await run<Profile>("Reading your résumé", { task: "extract", resumeText, pdfBase64 });
                  if (profile) {
                    update((prev) =>
                      markChanged({ ...prev, profile, resumeText: resumeText ?? "", resumeFileName: file?.name ?? "", name: profile.name || prev.name }, "resume")
                    );
                  }
                }}
                onEdit={(profile) => update((prev) => markChanged({ ...prev, profile }, "resume"))}
                onApprove={() => approve("resume")}
              />
            )}

            {step === "design" && (
              <>
                {head(
                  "Define your design system",
                  "Choose a preset, then tune colour, type, shape and motion. The preview uses your own résumé.",
                  <button className="btn btn-primary" onClick={() => approve("design")}>
                    Use this design
                    <Icon name="arrow" size={16} />
                  </button>
                )}
                <div className="design-grid">
                  <div className="stack" style={{ gap: 28 }}>
                    <DesignEditor design={p.design} onChange={(design) => update((prev) => markChanged({ ...prev, design }, "design"))} />
                    <AskBox
                      label="Or describe the look"
                      placeholder="Warmer colours, sharper corners, calmer motion"
                      button="Restyle"
                      busy={busy}
                      chars={chars}
                      onAsk={async (instruction) => {
                        const design = await run<Design>("Restyling", { task: "design", profile: p.profile, design: p.design, instruction });
                        if (design) update((prev) => markChanged({ ...prev, design: normalizeDesign({ ...prev.design, ...design }) }, "design"));
                      }}
                    />
                  </div>
                  <div className="sticky-preview">
                    {previewContent ? <Preview design={p.design} content={previewContent} /> : <div className="panel muted">Add your résumé first to see a preview.</div>}
                  </div>
                </div>
              </>
            )}

            {step === "questions" && (
              <QuestionsStep
                p={p}
                busy={busy}
                chars={chars}
                head={head}
                onGenerate={async () => {
                  if (!p.profile) return;
                  const res = await run<{ questions: Omit<Question, "answer">[] }>("Writing questions about you", { task: "questions", profile: p.profile, design: p.design });
                  if (res) update((prev) => markChanged({ ...prev, questions: res.questions.map((q) => ({ ...q, answer: "" })) }, "questions"));
                }}
                onChange={(questions) => update((prev) => markChanged({ ...prev, questions }, "questions"))}
                onApprove={() => approve("questions")}
              />
            )}

            {step === "build" && (
              <BuildStep
                p={p}
                busy={busy}
                chars={chars}
                head={head}
                onBuild={async () => {
                  if (!p.profile) return;
                  const content = await run<PortfolioContent>("Writing your portfolio", { task: "build", profile: p.profile, design: p.design, questions: p.questions });
                  if (content) {
                    update((prev) => ({
                      ...prev,
                      content,
                      history: [...(prev.content ? [{ at: new Date().toISOString(), label: "Before rewrite", content: prev.content }] : []), ...prev.history].slice(0, 10),
                      steps: { ...prev.steps, build: "draft", deploy: prev.steps.deploy === "approved" ? "stale" : prev.steps.deploy },
                    }));
                  }
                }}
                onRevise={async (instruction) => {
                  if (!p.profile || !p.content) return;
                  const content = await run<PortfolioContent>("Applying your change", { task: "revise", profile: p.profile, design: p.design, content: p.content, instruction });
                  if (content) {
                    update((prev) =>
                      markChanged({ ...prev, content, history: [{ at: new Date().toISOString(), label: instruction.slice(0, 60), content: prev.content! }, ...prev.history].slice(0, 10) }, "build")
                    );
                  }
                }}
                onEdit={(content) => update((prev) => markChanged({ ...prev, content }, "build"))}
                onUndo={(i) =>
                  update((prev) =>
                    markChanged(
                      {
                        ...prev,
                        content: prev.history[i].content,
                        history: [{ at: new Date().toISOString(), label: "Before undo", content: prev.content! }, ...prev.history.filter((_, j) => j !== i)].slice(0, 10),
                      },
                      "build"
                    )
                  )
                }
                onApprove={() => approve("build")}
              />
            )}

            {step === "deploy" && <DeployStep p={p} head={head} onDone={() => approve("deploy")} />}
          </div>
        </main>
      </div>
    </>
  );
}

type Head = (title: string, intro: string, action?: React.ReactNode) => React.ReactNode;

function AskBox({
  label,
  placeholder,
  button,
  busy,
  chars,
  onAsk,
  children,
}: {
  label: string;
  placeholder: string;
  button: string;
  busy: string;
  chars: number;
  onAsk: (s: string) => Promise<void>;
  children?: React.ReactNode;
}) {
  const [text, setText] = useState("");
  const submit = async () => {
    if (!text.trim() || busy) return;
    await onAsk(text.trim());
    setText("");
  };
  return (
    <div className="stack" style={{ gap: 8 }}>
      <label className="lbl" htmlFor={"ask-" + button}>
        {label}
      </label>
      <textarea
        id={"ask-" + button}
        rows={2}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
      />
      <div className="row wrap">
        <button className="btn" disabled={!!busy || !text.trim()} onClick={submit}>
          <Icon name="sparkle" size={16} />
          {button}
        </button>
        {busy ? <Busy text={busy} chars={chars} /> : <span className="hint">Ctrl or Cmd + Enter</span>}
        {children && <span className="row wrap" style={{ marginLeft: "auto", gap: 6 }}>{children}</span>}
      </div>
    </div>
  );
}

function ResumeStep({
  p,
  busy,
  chars,
  head,
  onExtract,
  onEdit,
  onApprove,
}: {
  p: PortfolioProject;
  busy: string;
  chars: number;
  head: Head;
  onExtract: (text: string, file: File | null) => Promise<void>;
  onEdit: (p: Profile) => void;
  onApprove: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState(p.resumeText);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const ready = !!file || text.trim().length > 40;
  return (
    <>
      {head(
        "Start with your résumé",
        "Upload a PDF or paste the text. Claude pulls out your details and you correct anything it got wrong.",
        p.profile && (
          <button className="btn btn-primary" onClick={onApprove}>
            Details look right
            <Icon name="arrow" size={16} />
          </button>
        )
      )}
      <div className="stack" style={{ gap: 16, maxWidth: 760 }}>
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
            if (f) setFile(f);
          }}
        >
          <Icon name="upload" size={24} />
          <strong>{file ? file.name : p.resumeFileName ? `Last used: ${p.resumeFileName}` : "Drop your résumé here, or choose a file"}</strong>
          <span className="small muted">PDF, TXT or Markdown, up to about 10 MB</span>
          <input ref={inputRef} type="file" accept=".pdf,.txt,.md,application/pdf,text/plain" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <details className="disclosure">
          <summary>Paste the text instead</summary>
          <textarea rows={8} value={text} placeholder="Paste your résumé here" onChange={(e) => setText(e.target.value)} style={{ marginTop: 10 }} aria-label="Résumé text" />
        </details>
        <div className="row wrap">
          <button className="btn btn-primary" disabled={!ready || !!busy} onClick={() => onExtract(text, file)}>
            {p.profile ? "Read it again" : "Read my résumé"}
          </button>
          {busy && <Busy text={busy} chars={chars} />}
        </div>
      </div>

      {p.profile && (
        <section className="panel" style={{ marginTop: 32, maxWidth: 760 }}>
          <div className="panel-title">
            <h2>What Claude found</h2>
            <span className="small muted">Fix anything wrong or missing</span>
          </div>
          <FieldsEditor value={p.profile} onChange={onEdit} />
          <div className="row" style={{ marginTop: 20 }}>
            <button className="btn btn-primary" onClick={onApprove}>
              Details look right
              <Icon name="arrow" size={16} />
            </button>
          </div>
        </section>
      )}
    </>
  );
}

function QuestionsStep({
  p,
  busy,
  chars,
  head,
  onGenerate,
  onChange,
  onApprove,
}: {
  p: PortfolioProject;
  busy: string;
  chars: number;
  head: Head;
  onGenerate: () => Promise<void>;
  onChange: (q: Question[]) => void;
  onApprove: () => void;
}) {
  useEffect(() => {
    if (p.questions.length === 0 && !busy) onGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const set = (i: number, patch: Partial<Question>) => onChange(p.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  return (
    <>
      {head(
        "A few questions about you",
        "Your answers set the headline, what gets featured and the tone. Leave a box empty to go with the suggestion.",
        p.questions.length > 0 && (
          <button className="btn btn-primary" disabled={!!busy} onClick={onApprove}>
            Build my portfolio
            <Icon name="arrow" size={16} />
          </button>
        )
      )}
      {busy && (
        <div style={{ marginBottom: 20 }}>
          <Busy text={busy} chars={chars} />
        </div>
      )}
      <ol className="q-list" style={{ listStyle: "none", padding: 0, margin: 0, maxWidth: 760 }}>
        {p.questions.map((q, i) => (
          <li className="q-item" key={q.id}>
            <span className="q-num">{String(i + 1).padStart(2, "0")}</span>
            <div className="q-body">
              <label htmlFor={"q-" + q.id}>
                <h3>{q.question}</h3>
              </label>
              {q.why && <p className="q-why">{q.why}</p>}
              <textarea id={"q-" + q.id} rows={2} value={q.answer} placeholder={q.suggested ? `Suggested: ${q.suggested}` : "Your answer"} onChange={(e) => set(i, { answer: e.target.value })} />
              <div className="row wrap" style={{ gap: 6 }}>
                {q.suggested && q.answer !== q.suggested && (
                  <button className="btn btn-sm" onClick={() => set(i, { answer: q.suggested })}>
                    Use suggestion
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => onChange(p.questions.filter((_, j) => j !== i))}>
                  Skip question
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>
      {p.questions.length > 0 && (
        <div className="row wrap" style={{ marginTop: 20 }}>
          <button className="btn" onClick={() => onChange([...p.questions, { id: "custom" + Date.now(), question: "Anything else Claude should know?", why: "Your own note, used when writing the site.", suggested: "", answer: "" }])}>
            <Icon name="plus" size={16} />
            Add a note
          </button>
          <button className="btn btn-ghost" disabled={!!busy} onClick={onGenerate}>
            Ask different questions
          </button>
        </div>
      )}
    </>
  );
}

function BuildStep({
  p,
  busy,
  chars,
  head,
  onBuild,
  onRevise,
  onEdit,
  onUndo,
  onApprove,
}: {
  p: PortfolioProject;
  busy: string;
  chars: number;
  head: Head;
  onBuild: () => Promise<void>;
  onRevise: (s: string) => Promise<void>;
  onEdit: (c: PortfolioContent) => void;
  onUndo: (i: number) => void;
  onApprove: () => void;
}) {
  const [tab, setTab] = useState<"preview" | "content" | "sections">("preview");
  useEffect(() => {
    if (!p.content && !busy) onBuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const c = p.content;
  return (
    <>
      {head(
        "Your portfolio",
        "Check it on desktop and phone, in light and dark. Edit any text, show or hide sections, or ask Claude for changes.",
        c && (
          <button className="btn btn-primary" disabled={!!busy} onClick={onApprove}>
            Approve portfolio
            <Icon name="arrow" size={16} />
          </button>
        )
      )}
      {!c &&
        (busy ? (
          <Busy text={busy} chars={chars} />
        ) : (
          <button className="btn btn-primary" onClick={onBuild}>
            Write my portfolio
          </button>
        ))}
      {c && (
        <>
          <div style={{ marginBottom: 28, maxWidth: 860 }}>
            <AskBox
              label="Ask Claude for a change"
              placeholder="Make the headline bolder. Feature the remittance app first."
              button="Apply change"
              busy={busy}
              chars={chars}
              onAsk={onRevise}
            >
              {p.history.length > 0 && (
                <select style={{ width: "auto", minHeight: 34, fontSize: 14 }} value="" onChange={(e) => e.target.value !== "" && onUndo(Number(e.target.value))} aria-label="Restore an earlier version">
                  <option value="">Restore an earlier version</option>
                  {p.history.map((h, i) => (
                    <option key={i} value={i}>
                      {new Date(h.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}, {h.label}
                    </option>
                  ))}
                </select>
              )}
              <button className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => confirm("Rewrite the whole portfolio from scratch? You can restore this version afterwards.") && onBuild()}>
                Rewrite from scratch
              </button>
            </AskBox>
          </div>
          <div className="tabs" role="tablist">
            {(["preview", "content", "sections"] as const).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} className={"tab" + (tab === t ? " is-on" : "")} onClick={() => setTab(t)}>
                {t === "preview" ? "Preview" : t === "content" ? "Edit text" : "Sections"}
              </button>
            ))}
          </div>
          {tab === "preview" && <Preview design={p.design} content={c} />}
          {tab === "content" && (
            <div className="design-grid" style={{ gridTemplateColumns: "minmax(0, 400px) minmax(0, 1fr)" }}>
              <div className="panel">
                <FieldsEditor value={c} onChange={onEdit} skip={["sections"]} />
              </div>
              <div className="sticky-preview">
                <Preview design={p.design} content={c} />
              </div>
            </div>
          )}
          {tab === "sections" && (
            <div className="design-grid">
              <div>
                <p className="hint" style={{ marginBottom: 10 }}>
                  Tick the sections to show and use the arrows to set their order.
                </p>
                <div>
                  {[...c.sections, ...ALL_SECTIONS.map((s) => s.id).filter((s) => !c.sections.includes(s))].map((sid) => {
                    const on = c.sections.includes(sid);
                    const idx = c.sections.indexOf(sid);
                    const label = ALL_SECTIONS.find((s) => s.id === sid)?.label ?? sid;
                    const empty = sid !== "contact" && sid !== "about" && Array.isArray(c[sid]) && (c[sid] as unknown[]).length === 0;
                    return (
                      <label className="section-row" key={sid}>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            onEdit({
                              ...c,
                              sections: on
                                ? c.sections.filter((x) => x !== sid)
                                : [...c.sections.filter((x) => x !== "contact"), sid, ...(c.sections.includes("contact") ? (["contact"] as SectionId[]) : [])],
                            })
                          }
                        />
                        <span className="grow">
                          {label}
                          {empty && <span className="small muted">. Empty, add content in Edit text</span>}
                        </span>
                        {on && (
                          <>
                            <button className="btn btn-ghost btn-sm btn-icon" aria-label={`Move ${label} up`} disabled={idx === 0} onClick={(e) => (e.preventDefault(), onEdit({ ...c, sections: swap(c.sections, idx, idx - 1) }))}>
                              <Icon name="up" size={16} />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm btn-icon"
                              aria-label={`Move ${label} down`}
                              disabled={idx === c.sections.length - 1}
                              onClick={(e) => (e.preventDefault(), onEdit({ ...c, sections: swap(c.sections, idx, idx + 1) }))}
                            >
                              <Icon name="down" size={16} />
                            </button>
                          </>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="sticky-preview">
                <Preview design={p.design} content={c} />
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

function swap<T>(a: T[], i: number, j: number): T[] {
  const out = a.slice();
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

function DeployStep({ p, head, onDone }: { p: PortfolioProject; head: Head; onDone: () => void }) {
  if (!p.content) return null;
  return (
    <>
      {head(
        "Put it online",
        "Download your portfolio as a React project, then publish it on Vercel for free. No coding needed.",
        <button className="btn btn-primary" onClick={onDone}>
          <Icon name="check" size={16} />
          Mark as published
        </button>
      )}
      <div className="deploy-grid">
        <section>
          <h2>1. Download your site</h2>
          <p className="muted" style={{ margin: "8px 0 18px" }}>
            A ready React (Vite) project. Every word, colour and setting lives in <code>src/portfolio-data.json</code>.
          </p>
          <div className="row wrap">
            <button className="btn btn-primary" onClick={() => downloadZip(p)}>
              <Icon name="download" size={16} />
              Download site (.zip)
            </button>
            <button className="btn" onClick={() => saveBlob(new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }), `${p.id}-portfolio-builder.json`)}>
              Save a backup
            </button>
          </div>
          <h2 style={{ marginTop: 40 }}>Add a photo or your CV</h2>
          <p className="muted" style={{ marginTop: 8 }}>
            In your GitHub repository, create a folder called <code>public</code> and upload <code>photo.jpg</code> and <code>resume.pdf</code>. Then in <b>Portfolio, Edit text, hero</b>, set the photo URL to <code>/photo.jpg</code> and the résumé URL to <code>/resume.pdf</code>, and download again. A link to an image that&apos;s already online works too.
          </p>
        </section>
        <section>
          <h2>2. Publish on Vercel</h2>
          <ol className="howto" style={{ marginTop: 14 }}>
            <li>
              <span>
                Unzip the download. You&apos;ll get a folder with <code>package.json</code> and a <code>src</code> folder inside.
              </span>
            </li>
            <li>
              <span>
                Sign in to{" "}
                <a href="https://github.com/new" target="_blank" rel="noreferrer">
                  GitHub
                </a>{" "}
                (free) and create a repository called <code>portfolio</code>. Keep it public.
              </span>
            </li>
            <li>
              <span>
                On the new repository page, choose <b>uploading an existing file</b>. Drag in everything inside the unzipped folder, including <code>src</code>, then choose <b>Commit changes</b>.
              </span>
            </li>
            <li>
              <span>
                Open{" "}
                <a href="https://vercel.com/new" target="_blank" rel="noreferrer">
                  vercel.com/new
                </a>
                , continue with GitHub, and choose <b>Import</b> next to <code>portfolio</code>.
              </span>
            </li>
            <li>
              <span>
                Leave the settings as they are (Vercel recognises Vite) and choose <b>Deploy</b>. About a minute later you get a link like <code>portfolio-yourname.vercel.app</code>.
              </span>
            </li>
            <li>
              <span>
                To update it, edit here, download again and upload the changed files to GitHub. Vercel republishes on its own. Add your own domain under <b>Settings, Domains</b>.
              </span>
            </li>
          </ol>
        </section>
      </div>
    </>
  );
}
