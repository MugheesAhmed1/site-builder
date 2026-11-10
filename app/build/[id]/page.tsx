"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import DesignEditor from "@/components/DesignEditor";
import FieldsEditor from "@/components/FieldsEditor";
import Preview from "@/components/Preview";
import Topbar from "@/components/Topbar";
import { askClaude, fileToBase64 } from "@/lib/ai";
import { downloadZip, saveBlob } from "@/lib/export";
import { contentFromProfile } from "@/lib/fromProfile";
import { getProject, markChanged, saveProject } from "@/lib/store";
import type { Design, PortfolioContent, PortfolioProject, Profile, Question, SectionId, StepId } from "@/lib/types";
import { STEPS } from "@/lib/types";

const ALL_SECTIONS: { id: SectionId; label: string }[] = [
  { id: "stats", label: "Impact numbers" },
  { id: "about", label: "About" },
  { id: "process", label: "How I work" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "education", label: "Education" },
  { id: "certifications", label: "Certifications" },
  { id: "testimonials", label: "Testimonials" },
  { id: "contact", label: "Contact" },
];

function Busy({ text, chars }: { text: string; chars: number }) {
  return (
    <span className="busy">
      <span className="spinner" /> {text}
      {chars > 0 ? ` (${Math.round(chars / 100) / 10}k characters written)` : " (Claude is thinking…)"}
    </span>
  );
}

function StatusBadge({ s }: { s: string }) {
  const text = s === "todo" ? "Not started" : s === "approved" ? "Approved" : s === "stale" ? "Needs refresh" : "Draft";
  return <span className={`badge badge-${s}`}>{text}</span>;
}

export default function BuildPage() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<PortfolioProject | null>(null);
  const [step, setStep] = useState<StepId>("resume");
  const [busy, setBusy] = useState<string>("");
  const [chars, setChars] = useState(0);
  const [error, setError] = useState("");
  const loaded = useRef(false);

  useEffect(() => {
    const proj = getProject(id);
    setP(proj);
    if (proj) {
      const firstOpen = STEPS.find((s) => proj.steps[s.id] !== "approved");
      setStep(firstOpen?.id ?? "deploy");
    }
    loaded.current = true;
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

  const approve = (s: StepId) => {
    update((prev) => ({ ...prev, steps: { ...prev.steps, [s]: "approved" } }));
    const i = STEPS.findIndex((x) => x.id === s);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1].id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!loaded.current && !p) return null;
  if (!p) {
    return (
      <>
        <Topbar />
        <main className="page">
          <p>
            This portfolio isn't saved in this browser. <Link href="/">Go back</Link>
          </p>
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

  const head = (title: string, intro: string, extra?: React.ReactNode) => (
    <div className="main-head">
      <div>
        <div className="row" style={{ marginBottom: 6 }}>
          <span className="muted small">
            Step {stepIndex + 1} of {STEPS.length}
          </span>
          <StatusBadge s={p.steps[step]} />
        </div>
        <h1>{title}</h1>
        <p className="muted" style={{ maxWidth: 640 }}>
          {intro}
        </p>
      </div>
      {extra}
    </div>
  );

  const errorBox = error && <div className="notice notice-error" style={{ marginBottom: 16 }}>{error}</div>;
  const staleBox = p.steps[step] === "stale" && (
    <div className="notice notice-warn" style={{ marginBottom: 16 }}>
      You changed an earlier step after this one was made. Review it, regenerate it, or approve it as it is.
    </div>
  );

  return (
    <>
      <Topbar>
        <span className="muted small" style={{ marginRight: 8 }}>
          {p.content?.hero.name || p.profile?.name || "New portfolio"} · saved
        </span>
      </Topbar>
      <div className="builder">
        <aside className="sidebar">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              className={`step-link ${s.id === step ? "is-active" : ""} is-${p.steps[s.id]}`}
              disabled={!canOpen(s.id)}
              style={{ opacity: canOpen(s.id) ? 1 : 0.45 }}
              onClick={() => setStep(s.id)}
            >
              <span className="step-num">{p.steps[s.id] === "approved" ? "✓" : i + 1}</span>
              <span>
                <div className="step-title">{s.title}</div>
                <div className="step-hint">{p.steps[s.id] === "stale" ? "Needs refresh" : s.hint}</div>
              </span>
            </button>
          ))}
        </aside>

        <main className="main">
          {errorBox}
          {staleBox}

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
                    markChanged(
                      { ...prev, profile, resumeText: resumeText ?? "", resumeFileName: file?.name ?? "", name: profile.name || prev.name },
                      "resume"
                    )
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
                "Pick a starting look, then adjust colours, fonts, roundness and animation. The preview uses your own résumé details.",
                <button className="btn btn-primary" onClick={() => approve("design")}>
                  Approve design →
                </button>
              )}
              <div className="design-grid">
                <div className="card stack">
                  <DesignEditor design={p.design} onChange={(design) => update((prev) => markChanged({ ...prev, design }, "design"))} />
                  <AskBox
                    placeholder="Or describe it: “warmer colours, rounder corners, calmer animation”"
                    busy={busy}
                    chars={chars}
                    onAsk={async (instruction) => {
                      const design = await run<Design>("Updating the design", { task: "design", profile: p.profile, design: p.design, instruction });
                      if (design) update((prev) => markChanged({ ...prev, design }, "design"));
                    }}
                  />
                </div>
                <div className="sticky-preview">
                  {previewContent ? <Preview design={p.design} content={previewContent} /> : <div className="card muted">Add your résumé first to see a preview.</div>}
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
                const res = await run<{ questions: Omit<Question, "answer">[] }>("Writing questions about you", {
                  task: "questions",
                  profile: p.profile,
                  design: p.design,
                });
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
                const content = await run<PortfolioContent>("Writing your portfolio", {
                  task: "build",
                  profile: p.profile,
                  design: p.design,
                  questions: p.questions,
                });
                if (content) {
                  update((prev) => ({
                    ...prev,
                    content,
                    history: [...(prev.content ? [{ at: new Date().toISOString(), label: "Before rebuild", content: prev.content }] : []), ...prev.history].slice(0, 10),
                    steps: { ...prev.steps, build: "draft", deploy: prev.steps.deploy === "approved" ? "stale" : prev.steps.deploy },
                  }));
                }
              }}
              onRevise={async (instruction) => {
                if (!p.profile || !p.content) return;
                const content = await run<PortfolioContent>("Applying your change", {
                  task: "revise",
                  profile: p.profile,
                  design: p.design,
                  content: p.content,
                  instruction,
                });
                if (content) {
                  update((prev) =>
                    markChanged(
                      { ...prev, content, history: [{ at: new Date().toISOString(), label: instruction.slice(0, 60), content: prev.content! }, ...prev.history].slice(0, 10) },
                      "build"
                    )
                  );
                }
              }}
              onEdit={(content) => update((prev) => markChanged({ ...prev, content }, "build"))}
              onUndo={(i) =>
                update((prev) =>
                  markChanged(
                    { ...prev, content: prev.history[i].content, history: [{ at: new Date().toISOString(), label: "Before undo", content: prev.content! }, ...prev.history.filter((_, j) => j !== i)].slice(0, 10) },
                    "build"
                  )
                )
              }
              onApprove={() => approve("build")}
            />
          )}

          {step === "deploy" && <DeployStep p={p} head={head} onDone={() => approve("deploy")} />}
        </main>
      </div>
    </>
  );
}

type Head = (title: string, intro: string, extra?: React.ReactNode) => React.ReactNode;

function AskBox({ placeholder, busy, chars, onAsk }: { placeholder: string; busy: string; chars: number; onAsk: (s: string) => Promise<void> }) {
  const [text, setText] = useState("");
  return (
    <div className="stack" style={{ gap: 8 }}>
      <label className="lbl">Ask Claude to change it</label>
      <textarea rows={2} value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} />
      <div className="row">
        <button
          className="btn"
          disabled={!!busy || !text.trim()}
          onClick={async () => {
            await onAsk(text.trim());
            setText("");
          }}
        >
          Apply change
        </button>
        {busy && <Busy text={busy} chars={chars} />}
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
        "Upload a PDF or paste the text. Claude pulls out your details, and you can fix anything before moving on.",
        p.profile && (
          <button className="btn btn-primary" onClick={onApprove}>
            Looks right →
          </button>
        )
      )}
      <div className="stack">
        <div
          className={"dropzone " + (over ? "is-over" : "")}
          onClick={() => inputRef.current?.click()}
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
          <div style={{ fontSize: 28 }}>📄</div>
          <strong>{file ? file.name : p.resumeFileName ? `Last used: ${p.resumeFileName}` : "Drop your résumé here, or click to choose"}</strong>
          <div className="muted small">PDF, TXT or Markdown, up to about 10 MB</div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.md,application/pdf,text/plain"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <details>
          <summary className="muted small" style={{ cursor: "pointer" }}>
            Or paste the text instead
          </summary>
          <textarea rows={8} value={text} placeholder="Paste your résumé here" onChange={(e) => setText(e.target.value)} style={{ marginTop: 8 }} />
        </details>
        <div className="row">
          <button className="btn btn-primary" disabled={!ready || !!busy} onClick={() => onExtract(text, file)}>
            {p.profile ? "Read it again" : "Read my résumé"}
          </button>
          {busy && <Busy text={busy} chars={chars} />}
        </div>

        {p.profile && (
          <div className="card stack" style={{ marginTop: 8 }}>
            <div className="row between">
              <h2>What Claude found</h2>
              <span className="muted small">Edit anything that's wrong or missing</span>
            </div>
            <FieldsEditor value={p.profile} onChange={onEdit} />
            <div className="row">
              <button className="btn btn-primary" onClick={onApprove}>
                Looks right, continue →
              </button>
            </div>
          </div>
        )}
      </div>
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
        "Your answers shape the headline, what gets featured and the tone. Each one has a suggestion from your résumé; leave a box empty to use it.",
        p.questions.length > 0 && (
          <button className="btn btn-primary" disabled={!!busy} onClick={onApprove}>
            Done, build my portfolio →
          </button>
        )
      )}
      {busy && (
        <div style={{ marginBottom: 16 }}>
          <Busy text={busy} chars={chars} />
        </div>
      )}
      <div className="stack">
        {p.questions.map((q, i) => (
          <div className="card q-card" key={q.id}>
            <strong>
              {i + 1}. {q.question}
            </strong>
            <span className="muted small">{q.why}</span>
            <textarea rows={2} value={q.answer} placeholder={`Suggested: ${q.suggested}`} onChange={(e) => set(i, { answer: e.target.value })} />
            <div className="row">
              <button className="btn btn-sm" onClick={() => set(i, { answer: q.suggested })}>
                Use suggestion
              </button>
              <button className="btn btn-ghost btn-sm btn-danger" onClick={() => onChange(p.questions.filter((_, j) => j !== i))}>
                Skip this question
              </button>
            </div>
          </div>
        ))}
        {p.questions.length > 0 && (
          <div className="row wrap">
            <button
              className="btn"
              onClick={() =>
                onChange([...p.questions, { id: "custom" + Date.now(), question: "Anything else to include?", why: "Your own note to Claude.", suggested: "", answer: "" }])
              }
            >
              + Add your own note
            </button>
            <button className="btn btn-ghost" disabled={!!busy} onClick={onGenerate}>
              Ask different questions
            </button>
          </div>
        )}
      </div>
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
        "Preview it on desktop and phone. Edit any text directly, turn sections on or off, or ask Claude for changes.",
        c && (
          <button className="btn btn-primary" disabled={!!busy} onClick={onApprove}>
            Approve portfolio →
          </button>
        )
      )}
      {!c && (busy ? <Busy text={busy} chars={chars} /> : <button className="btn btn-primary" onClick={onBuild}>Build my portfolio</button>)}
      {c && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <AskBox placeholder="e.g. “Make the tagline punchier”, “Feature the remittance app first”, “Add a stat for years of experience”" busy={busy} chars={chars} onAsk={onRevise} />
            <div className="row wrap" style={{ marginTop: 10 }}>
              <button className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => confirm("Rewrite the whole portfolio from scratch? You can undo it.") && onBuild()}>
                Rewrite from scratch
              </button>
              {p.history.length > 0 && (
                <select
                  style={{ width: "auto", minHeight: 30, fontSize: 13 }}
                  value=""
                  onChange={(e) => e.target.value !== "" && onUndo(Number(e.target.value))}
                >
                  <option value="">Undo: restore an earlier version…</option>
                  {p.history.map((h, i) => (
                    <option key={i} value={i}>
                      {new Date(h.at).toLocaleTimeString()} · {h.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="tabs">
            {(["preview", "content", "sections"] as const).map((t) => (
              <button key={t} className={"tab " + (tab === t ? "is-on" : "")} onClick={() => setTab(t)}>
                {t === "preview" ? "Preview" : t === "content" ? "Edit text" : "Sections"}
              </button>
            ))}
          </div>
          {tab === "preview" && <Preview design={p.design} content={c} />}
          {tab === "content" && (
            <div className="design-grid" style={{ gridTemplateColumns: "minmax(0, 420px) minmax(0, 1fr)" }}>
              <div className="card">
                <FieldsEditor value={c} onChange={onEdit} skip={["sections"]} />
              </div>
              <div className="sticky-preview">
                <Preview design={p.design} content={c} />
              </div>
            </div>
          )}
          {tab === "sections" && (
            <div className="design-grid">
              <div className="card stack" style={{ gap: 8 }}>
                <p className="muted small">Tick the sections to show, and use the arrows to change their order.</p>
                {[...c.sections, ...ALL_SECTIONS.map((s) => s.id).filter((s) => !c.sections.includes(s))].map((sid) => {
                  const on = c.sections.includes(sid);
                  const idx = c.sections.indexOf(sid);
                  const label = ALL_SECTIONS.find((s) => s.id === sid)?.label ?? sid;
                  const empty = sid !== "contact" && sid !== "about" && Array.isArray(c[sid]) && (c[sid] as unknown[]).length === 0;
                  return (
                    <div className="section-row" key={sid}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => onEdit({ ...c, sections: on ? c.sections.filter((x) => x !== sid) : [...c.sections.filter((x) => x !== "contact"), sid, ...(c.sections.includes("contact") ? (["contact"] as SectionId[]) : [])] })}
                      />
                      <span className="grow">
                        {label} {empty && <span className="muted small">(no content yet, add it in Edit text)</span>}
                      </span>
                      {on && (
                        <>
                          <button className="btn btn-ghost btn-sm" disabled={idx === 0} onClick={() => onEdit({ ...c, sections: swap(c.sections, idx, idx - 1) })}>
                            ↑
                          </button>
                          <button className="btn btn-ghost btn-sm" disabled={idx === c.sections.length - 1} onClick={() => onEdit({ ...c, sections: swap(c.sections, idx, idx + 1) })}>
                            ↓
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
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
        "Download your portfolio as a React project, then publish it free on Vercel. No coding needed.",
        <button className="btn btn-primary" onClick={onDone}>
          Mark as done ✓
        </button>
      )}
      <div className="stack">
        <div className="card row wrap between">
          <div>
            <h2>1. Download your site</h2>
            <p className="muted small" style={{ margin: 0 }}>
              A ready React (Vite) project. All your text and colours are in <code>src/portfolio-data.json</code>.
            </p>
          </div>
          <div className="row">
            <button className="btn btn-primary" onClick={() => downloadZip(p)}>
              Download .zip
            </button>
            <button
              className="btn"
              onClick={() => saveBlob(new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }), `${p.id}-portfolio-builder.json`)}
            >
              Save builder file
            </button>
          </div>
        </div>
        <div className="card">
          <h2>2. Publish on Vercel (free)</h2>
          <ol className="howto">
            <li>
              Unzip the download. You'll get a folder with files like <code>package.json</code> and a <code>src</code> folder.
            </li>
            <li>
              Sign in at <a href="https://github.com" target="_blank" rel="noreferrer">github.com</a> (create a free account if needed) and click <b>New repository</b>. Name it <code>portfolio</code>, keep it Public, and click <b>Create repository</b>.
            </li>
            <li>
              On the new repository page click <b>uploading an existing file</b>. Open the unzipped folder, select <b>everything inside it</b> (including the <code>src</code> folder) and drag it into the browser. Click <b>Commit changes</b>.
            </li>
            <li>
              Go to <a href="https://vercel.com/new" target="_blank" rel="noreferrer">vercel.com/new</a>, choose <b>Continue with GitHub</b>, and click <b>Import</b> next to your <code>portfolio</code> repository.
            </li>
            <li>
              Leave every setting as it is (Vercel recognises it as a Vite project) and click <b>Deploy</b>. After about a minute you get a live link like <code>portfolio-yourname.vercel.app</code>.
            </li>
            <li>
              To change something later, edit it here, download again and upload the changed files to GitHub. Vercel republishes automatically. You can also add your own domain in Vercel under <b>Settings → Domains</b>.
            </li>
          </ol>
        </div>
        <div className="card">
          <h2>Adding a photo or your résumé PDF</h2>
          <p className="muted" style={{ margin: 0 }}>
            In your GitHub repository, create a folder called <code>public</code> and upload <code>photo.jpg</code> and <code>resume.pdf</code> into it. Then, back here in <b>Portfolio → Edit text → hero</b>, set Photo Url to <code>/photo.jpg</code> and Resume Url to <code>/resume.pdf</code>, and download again. Or paste a link to an image that's already online.
          </p>
        </div>
      </div>
    </>
  );
}
