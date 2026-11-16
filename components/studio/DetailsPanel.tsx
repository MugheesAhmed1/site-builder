"use client";

import { useRef, useState } from "react";
import FieldsEditor from "@/components/FieldsEditor";
import Icon from "@/components/Icon";
import PortfolioForm, { GROUPS, groupCount } from "@/components/PortfolioForm";
import { CATEGORIES } from "@/lib/categories";
import { profileToInput } from "@/lib/compose";
import { ROLES } from "@/lib/fit";
import { applyDetails, changeType, portfolioInput } from "@/lib/project";
import { questionsFor } from "@/lib/questions";
import { fileToText, parseResume } from "@/lib/resume";
import { SAMPLE_RESUME } from "@/lib/sample";
import type { PortfolioInput, Project, Question, SiteKind } from "@/lib/types";

// Details: the facts the site is written from. A business answers plain questions; a
// person fills the portfolio form, or drops a résumé in to fill it for them.

type Update = (fn: (prev: Project) => Project) => void;

function isEmpty(v: unknown) {
  return v === "" || v == null || (Array.isArray(v) && v.length === 0);
}

// Fills only what is empty, so typed details are never overwritten by an import.
function mergeInput(cur: PortfolioInput, add: PortfolioInput): PortfolioInput {
  const out = { ...cur } as Record<string, unknown>;
  for (const [k, v] of Object.entries(add)) if (isEmpty(out[k]) && !isEmpty(v)) out[k] = v;
  return out as unknown as PortfolioInput;
}

function TypeBox({ p, onChange }: { p: Project; onChange: (k: SiteKind, c: string) => void }) {
  return (
    <section className="pn-card">
      <div className="pn-card-head">
        <h3>Kind of site</h3>
      </div>
      <div className="seg pn-seg-fill" role="group" aria-label="Kind of site">
        {(["website", "portfolio"] as const).map((k) => (
          <button key={k} type="button" aria-pressed={p.kind === k} className={p.kind === k ? "is-on" : ""} onClick={() => onChange(k, k === "portfolio" ? "portfolio" : p.kind === "website" ? p.category : "general")}>
            {k === "portfolio" ? "Personal portfolio" : "Business website"}
          </button>
        ))}
      </div>
      {p.kind === "website" ? (
        <label className="pn-field">
          <span className="lbl">Type of business</span>
          <select value={p.category} onChange={(e) => onChange("website", e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className="pn-field">
          <span className="lbl">Your role</span>
          <select value={p.category} onChange={(e) => onChange("portfolio", e.target.value)}>
            {[...ROLES, { id: "portfolio", label: "Any role" }].map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </section>
  );
}

function QuestionField({ q, value, onChange }: { q: Question; value: string; onChange: (v: string) => void }) {
  const id = "q-" + q.id;
  if (q.type === "choice") {
    return (
      <div className="choices" role="radiogroup" aria-labelledby={id + "-l"}>
        {q.options!.map((o) => (
          <button type="button" key={o} role="radio" aria-checked={value === o} className={"chip" + (value === o ? " is-on" : "")} onClick={() => onChange(o)}>
            {o}
          </button>
        ))}
      </div>
    );
  }
  if (q.type === "textarea" || q.type === "list") {
    const lines = Math.max(3, (value || q.placeholder || "").split("\n").length);
    return <textarea id={id} rows={Math.min(lines, 8)} value={value} placeholder={q.placeholder} onChange={(e) => onChange(e.target.value)} />;
  }
  return <input id={id} type="text" value={value} placeholder={q.placeholder} onChange={(e) => onChange(e.target.value)} />;
}

function Questions({ p, update }: { p: Project; update: Update }) {
  const qs = questionsFor(p.kind, p.category);
  const [all, setAll] = useState(false);
  // The short list first: required questions and those already answered. The rest sit
  // behind one button so the panel never opens as a wall of fields.
  const core = qs.filter((q) => q.required || (p.answers[q.id] ?? "").trim() || ["city", "about", "services", "address", "hours", "phone", "whatsapp", "email", "cta", "tone"].includes(q.id));
  const shown = all ? qs : core;
  const set = (id: string, v: string) => update((prev) => applyDetails(prev, { answers: { ...prev.answers, [id]: v } }));
  return (
    <>
      <ol className="pn-questions">
        {shown.map((q) => {
          const v = p.answers[q.id] ?? "";
          const missing = q.required && !v.trim();
          return (
            <li key={q.id} className={missing ? "is-missing" : ""}>
              <label htmlFor={"q-" + q.id} id={"q-" + q.id + "-l"} className="pn-q-label">
                {q.label}
                {missing && <span className="pn-q-need">needed</span>}
              </label>
              {q.help && <p className="pn-q-help">{q.help}</p>}
              <QuestionField q={q} value={v} onChange={(val) => set(q.id, val)} />
              {q.suggest && v !== q.suggest && q.type !== "choice" && (
                <button type="button" className="pn-link" onClick={() => set(q.id, q.suggest!)}>
                  Use the suggestion
                </button>
              )}
            </li>
          );
        })}
      </ol>
      {qs.length > core.length && (
        <button type="button" className="btn btn-sm pn-more" onClick={() => setAll((v) => !v)}>
          <Icon name={all ? "up" : "plus"} size={15} />
          {all ? "Show fewer questions" : `${qs.length - core.length} more optional questions`}
        </button>
      )}
    </>
  );
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
    <section className="pn-card">
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
          <strong>{busy ? "Reading..." : fileName ? `Filled from ${fileName}. Drop another to add more.` : "Fill everything from your résumé"}</strong>
          <span className="small muted"> PDF or text. Read on this device, never uploaded.</span>
        </span>
        <input ref={ref} type="file" accept=".pdf,.txt,.md,.docx,application/pdf,text/plain" hidden onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
      </div>
      <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
        <details className="disclosure">
          <summary>Paste text instead</summary>
          <textarea rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} aria-label="Résumé text" style={{ marginTop: 8 }} />
          <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} disabled={paste.trim().length < 40} onClick={() => onImport(paste, "pasted text")}>
            Fill from this text
          </button>
        </details>
        {!fileName && (
          <button type="button" className="pn-link" onClick={() => onImport(SAMPLE_RESUME, "sample-resume.txt")}>
            Try a sample résumé
          </button>
        )}
      </div>
      {error && (
        <div className="notice notice-error" role="alert" style={{ marginTop: 10 }}>
          <strong>That didn&apos;t work.</strong> {error}
        </div>
      )}
    </section>
  );
}

function PortfolioDetails({ p, update }: { p: Project; update: Update }) {
  const [group, setGroup] = useState<string>("basics");
  const input = portfolioInput(p);
  const i = GROUPS.findIndex((g) => g.id === group);
  const current = GROUPS[i] ?? GROUPS[0];
  return (
    <>
      <ImportBox
        fileName={p.resumeFileName}
        onImport={(text, file) =>
          update((prev) => {
            const profile = parseResume(text);
            return applyDetails(prev, { profile, resumeText: text, resumeFileName: file, input: mergeInput(portfolioInput(prev), profileToInput(profile)) });
          })
        }
      />
      <nav className="pn-groups" aria-label="Form sections">
        {GROUPS.map((g) => {
          const n = groupCount(input, g.id);
          return (
            <button type="button" key={g.id} className={"pn-group" + (group === g.id ? " is-on" : "")} aria-current={group === g.id ? "true" : undefined} onClick={() => setGroup(g.id)}>
              {g.title}
              {n > 0 && <span className="pn-group-n mono">{n}</span>}
            </button>
          );
        })}
      </nav>
      <section className="pn-card">
        <div className="pn-card-head">
          <h3>{current.title}</h3>
          <p className="small muted">{current.hint}</p>
        </div>
        <PortfolioForm value={input} onChange={(v) => update((prev) => applyDetails(prev, { input: v }))} group={current.id} />
        <div className="row between" style={{ marginTop: 18 }}>
          <button type="button" className="btn btn-ghost btn-sm" disabled={i <= 0} onClick={() => setGroup(GROUPS[i - 1].id)}>
            Back
          </button>
          {i < GROUPS.length - 1 && (
            <button type="button" className="btn btn-sm" onClick={() => setGroup(GROUPS[i + 1].id)}>
              {GROUPS[i + 1].title}
              <Icon name="arrow" size={15} />
            </button>
          )}
        </div>
      </section>
      {p.profile && (
        <details className="disclosure pn-card">
          <summary>
            What we read from your résumé: {p.profile.experience.length} jobs, {p.profile.projects.length} projects, {p.profile.skills.length} skills
          </summary>
          <div style={{ marginTop: 12 }}>
            <FieldsEditor value={p.profile} onChange={(profile) => update((prev) => ({ ...prev, profile }))} />
          </div>
        </details>
      )}
    </>
  );
}

export default function DetailsPanel({ p, update }: { p: Project; update: Update }) {
  return (
    <div className="pn-stack">
      {p.docName && (
        <div className="notice" role="note">
          Filled in from <b>{p.docName}</b>. Check the answers below; anything left blank is skipped or uses a suggestion.
        </div>
      )}
      <TypeBox
        p={p}
        onChange={(kind, category) => {
          if (kind !== p.kind && !confirm("Switching between a business website and a portfolio writes a new page. Your current page is kept under Page, Versions. Continue?")) return;
          update((prev) => changeType(prev, kind, category));
        }}
      />
      {p.kind === "portfolio" ? <PortfolioDetails p={p} update={update} /> : <Questions p={p} update={update} />}
    </div>
  );
}
