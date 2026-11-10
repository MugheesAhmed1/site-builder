"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DesignEditor from "@/components/DesignEditor";
import FieldsEditor from "@/components/FieldsEditor";
import Icon from "@/components/Icon";
import Preview from "@/components/Preview";
import Topbar from "@/components/Topbar";
import { CATEGORIES } from "@/lib/categories";
import { composePortfolio, composeWebsite } from "@/lib/compose";
import { personalDesign } from "@/lib/designs";
import { downloadZip, saveBlob, siteName } from "@/lib/export";
import { TONE_MOOD, defaultAnswers, questionsFor } from "@/lib/questions";
import { fileToText, parseResume } from "@/lib/resume";
import { SAMPLE_RESUME } from "@/lib/sample";
import { getProject, markChanged, saveProject } from "@/lib/store";
import type { PortfolioContent, Project, Question, SiteContent, SiteKind, StepId, WebsiteContent } from "@/lib/types";
import { STEPS } from "@/lib/types";

const PORTFOLIO_SECTIONS: Record<string, string> = {
  stats: "Impact numbers",
  about: "About",
  process: "How I work",
  experience: "Experience",
  projects: "Work",
  skills: "Skills",
  testimonials: "Testimonials",
  certifications: "Certifications",
  education: "Education",
  contact: "Contact",
};
const WEBSITE_SECTIONS: Record<string, string> = {
  highlights: "Numbers",
  services: "Services or menu",
  about: "About",
  process: "How it works",
  gallery: "Gallery",
  pricing: "Prices",
  testimonials: "Reviews",
  faq: "Questions",
  visit: "Address and hours",
  contact: "Contact",
};

function compose(p: Project): SiteContent {
  return p.kind === "portfolio" ? composePortfolio(p.profile, p.answers) : composeWebsite(p.category, p.answers);
}

function StatusBadge({ s }: { s: string }) {
  const text = s === "todo" ? "Not started" : s === "approved" ? "Approved" : s === "stale" ? "Needs a look" : "Draft";
  return <span className={`badge badge-${s}`}>{text}</span>;
}

export default function BuildPage() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<Project | null>(null);
  const [step, setStep] = useState<StepId>("questions");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const proj = getProject(id);
    setP(proj);
    if (proj) setStep(STEPS.find((s) => proj.steps[s.id] !== "approved")?.id ?? "deploy");
    setLoaded(true);
  }, [id]);

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

  const personal = useMemo(() => (p ? personalDesign(p.answers.name || p.name || p.query, p.query, TONE_MOOD[p.answers.tone ?? ""]) : null), [p?.answers.name, p?.answers.tone, p?.query, p?.name]);
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
          <div className="step-body" key={step}>
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
                    if (prev.steps.design === "todo") next.design = personalDesign(next.answers.name || next.name || next.query, next.query, TONE_MOOD[next.answers.tone ?? ""]);
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
                  <button className="btn btn-primary" onClick={() => approve("design", (prev) => (prev.content && prev.steps.build !== "stale" ? prev : rebuild(prev)))}>
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
                    onChange={(design) => update((prev) => markChanged({ ...prev, design }, "design"))}
                    onLocks={(locks) => update((prev) => ({ ...prev, locks }))}
                  />
                  <div className="sticky-preview">
                    <Preview kind={p.kind} design={p.design} content={p.content ?? draft} />
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
                onUndo={(i) =>
                  update((prev) =>
                    markChanged({ ...prev, content: prev.history[i].content, history: [{ at: new Date().toISOString(), label: "Before undo", content: prev.content! }, ...prev.history.filter((_, j) => j !== i)].slice(0, 10) }, "build")
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
          Please answer: {missing.map((q) => q.label.toLowerCase()).join(", ")}.
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

function BuildStep({
  p,
  head,
  word,
  onRebuild,
  onEdit,
  onUndo,
  onApprove,
}: {
  p: Project;
  head: Head;
  word: string;
  onRebuild: () => void;
  onEdit: (c: SiteContent) => void;
  onUndo: (i: number) => void;
  onApprove: () => void;
}) {
  const [tab, setTab] = useState<"preview" | "content" | "sections">("preview");
  useEffect(() => {
    if (!p.content) onRebuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const c = p.content;
  if (!c) return null;
  const labels = p.kind === "portfolio" ? PORTFOLIO_SECTIONS : WEBSITE_SECTIONS;
  const sections = c.sections as string[];
  const setSections = (s: string[]) => onEdit({ ...c, sections: s } as SiteContent);
  return (
    <>
      {head(
        "Your " + word,
        "Check it on desktop and phone, in light and dark. Edit any text, show, hide or reorder sections. Nothing here is written by AI; it comes from your answers.",
        <button className="btn btn-primary" onClick={onApprove}>
          Approve {word}
          <Icon name="arrow" size={16} />
        </button>
      )}
      <div className="row wrap" style={{ gap: 8, marginBottom: 18 }}>
        <button className="btn btn-sm" onClick={() => (p.steps.build !== "stale" ? confirm("Rebuild from your answers? Text you edited by hand is replaced. You can restore this version afterwards.") : true) && onRebuild()}>
          <Icon name="undo" size={15} />
          Rebuild from answers
        </button>
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
      </div>
      <div className="tabs" role="tablist">
        {(["preview", "content", "sections"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={"tab" + (tab === t ? " is-on" : "")} onClick={() => setTab(t)}>
            {t === "preview" ? "Preview" : t === "content" ? "Edit text" : "Sections"}
          </button>
        ))}
      </div>
      {tab === "preview" && <Preview kind={p.kind} design={p.design} content={c} />}
      {tab === "content" && (
        <div className="design-grid" style={{ gridTemplateColumns: "minmax(0, 400px) minmax(0, 1fr)" }}>
          <div className="panel">
            <FieldsEditor value={c} onChange={onEdit} skip={["sections"]} />
          </div>
          <div className="sticky-preview">
            <Preview kind={p.kind} design={p.design} content={c} />
          </div>
        </div>
      )}
      {tab === "sections" && (
        <div className="design-grid">
          <div>
            <p className="hint" style={{ marginBottom: 10 }}>
              Tick the sections to show and use the arrows to set their order.
            </p>
            {[...sections, ...Object.keys(labels).filter((s) => !sections.includes(s))].map((sid) => {
              const on = sections.includes(sid);
              const idx = sections.indexOf(sid);
              const label = labels[sid] ?? sid;
              const v = (c as unknown as Record<string, unknown>)[sid];
              const empty = Array.isArray(v) && v.length === 0;
              return (
                <label className="section-row" key={sid}>
                  <input type="checkbox" checked={on} onChange={() => setSections(on ? sections.filter((x) => x !== sid) : [...sections.filter((x) => x !== "contact"), sid, ...(sections.includes("contact") ? ["contact"] : [])])} />
                  <span className="grow">
                    {label}
                    {empty && <span className="small muted">. Empty, add content in Edit text</span>}
                  </span>
                  {on && (
                    <>
                      <button className="btn btn-ghost btn-sm btn-icon" aria-label={`Move ${label} up`} disabled={idx === 0} onClick={(e) => (e.preventDefault(), setSections(swap(sections, idx, idx - 1)))}>
                        <Icon name="up" size={16} />
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" aria-label={`Move ${label} down`} disabled={idx === sections.length - 1} onClick={(e) => (e.preventDefault(), setSections(swap(sections, idx, idx + 1)))}>
                        <Icon name="down" size={16} />
                      </button>
                    </>
                  )}
                </label>
              );
            })}
          </div>
          <div className="sticky-preview">
            <Preview kind={p.kind} design={p.design} content={c} />
          </div>
        </div>
      )}
    </>
  );
}

function swap<T>(a: T[], i: number, j: number): T[] {
  const out = a.slice();
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

// Images the person still has to supply, so nothing ships with an unexplained empty slot.
function missingImages(p: Project): string[] {
  const c = p.content;
  if (!c) return [];
  if (p.kind === "portfolio") {
    const pc = c as PortfolioContent;
    return p.design.heroStyle === "portrait" && !pc.hero.photoUrl ? ["A photo of you for the opening section (optional, hidden until added)"] : [];
  }
  const wc = c as WebsiteContent;
  const out: string[] = [];
  if (!wc.hero.imageUrl) out.push("A main photo for the opening section (optional, hidden until added)");
  if (wc.sections.includes("gallery")) for (const g of wc.gallery) if (!g.imageUrl) out.push(`Gallery photo: ${g.caption} (shows a labelled slot until added)`);
  return out;
}

function DeployStep({ p, head, onDone }: { p: Project; head: Head; onDone: () => void }) {
  if (!p.content) return null;
  const images = missingImages(p);
  const repo = p.kind === "portfolio" ? "portfolio" : "my-site";
  return (
    <>
      {head(
        "Put it online",
        "Download your site as a React project, then publish it on Vercel for free. No coding needed.",
        <button className="btn btn-primary" onClick={onDone}>
          <Icon name="check" size={16} />
          Mark as published
        </button>
      )}
      <div className="deploy-grid">
        <section>
          <h2>1. Download your site</h2>
          <p className="muted" style={{ margin: "8px 0 18px" }}>
            A ready React (Vite) project for <b>{siteName(p)}</b>. Every word, colour and setting lives in <code>src/site-data.json</code>.
          </p>
          <div className="row wrap">
            <button className="btn btn-primary" onClick={() => downloadZip(p)}>
              <Icon name="download" size={16} />
              Download site (.zip)
            </button>
            <button className="btn" onClick={() => saveBlob(new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }), `${p.id}-site-builder.json`)}>
              Save a backup
            </button>
          </div>
          {images.length > 0 && (
            <>
              <h2 style={{ marginTop: 40 }}>Photos you still need</h2>
              <ul className="plain-list">
                {images.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className="muted" style={{ marginTop: 8 }}>
                Paste a link to an image that&apos;s already online in <b>Your site, Edit text</b>, or upload images to a <code>public</code> folder in your GitHub repository and use a link like <code>/photo.jpg</code>.
              </p>
            </>
          )}
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
                (free) and create a repository called <code>{repo}</code>. Keep it public.
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
                , continue with GitHub, and choose <b>Import</b> next to <code>{repo}</code>.
              </span>
            </li>
            <li>
              <span>
                Leave the settings as they are (Vercel recognises Vite) and choose <b>Deploy</b>. About a minute later you get a link like <code>{repo}-yourname.vercel.app</code>.
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
