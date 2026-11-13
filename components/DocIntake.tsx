"use client";

import { useRef, useState } from "react";
import Icon from "@/components/Icon";
import { CATEGORIES, categoryById } from "@/lib/categories";
import { saveBlob } from "@/lib/export";
import { TONES } from "@/lib/questions";
import { type Brief, parseRequirements, projectFromBrief, reviseBrief } from "@/lib/requirements";
import { REQUIREMENTS_TEMPLATE, SAMPLE_PRD } from "@/lib/requirements-sample";
import { fileToText } from "@/lib/resume";
import type { Project } from "@/lib/types";
import "./doc-intake.css";

// Upload a requirements document (PRD, BRD or a plain brief) and get a website from it.
// The file is read on this device, turned into answers by rules, shown back for a check,
// and handed to the host page as a ready project. Nothing is uploaded and no AI is used.

const MAX_BYTES = 15 * 1024 * 1024;

export default function DocIntake({ onProject, compact = false }: { onProject: (p: Project, mode: "build" | "check") => void; compact?: boolean }) {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pasted, setPasted] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const take = (text: string, fileName: string) => {
    if (text.replace(/\s+/g, " ").trim().length < 80) throw new Error("There isn't enough text in that to work from. If it is a scanned document, paste the text instead.");
    setBrief(parseRequirements(text, fileName));
    setError("");
  };

  const readFile = async (f: File) => {
    setError("");
    if (f.size > MAX_BYTES) return setError("That file is over 15 MB. Export just the text, or paste it below.");
    setBusy(true);
    try {
      take(await fileToText(f, { headings: true }), f.name);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "That file couldn't be read. Try a PDF, a Word .docx file, or paste the text.");
    } finally {
      setBusy(false);
    }
  };

  if (!brief) {
    return (
      <div className="doc-intake">
        <div
          className={"dropzone doc-drop" + (over ? " is-over" : "") + (busy ? " is-busy" : "")}
          role="button"
          tabIndex={0}
          aria-label="Choose a requirements document"
          onClick={() => input.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              input.current?.click();
            }
          }}
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
          <Icon name="upload" size={26} />
          <strong>{busy ? "Reading your document..." : "Drop your requirements document here, or choose a file"}</strong>
          <span className="small muted">PDF, Word (.docx), Markdown or plain text. Read on this device, never uploaded.</span>
          <input
            ref={input}
            type="file"
            accept=".pdf,.docx,.txt,.md,.markdown,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) readFile(f);
              e.target.value = "";
            }}
          />
        </div>
        {error && (
          <div className="notice notice-error" role="alert">
            <strong>That didn&apos;t work.</strong> {error}
          </div>
        )}
        <div className="doc-under">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              try {
                take(SAMPLE_PRD, "sample-prd.md");
              } catch {}
            }}
          >
            Try a sample document
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => saveBlob(new Blob([REQUIREMENTS_TEMPLATE], { type: "text/markdown" }), "website-requirements-template.md")}>
            <Icon name="download" size={16} />
            Get a blank template
          </button>
          {!compact && <span className="hint">Works best when the document has headings such as Overview, Features, Pricing and Contact.</span>}
        </div>
        <details className="disclosure doc-paste">
          <summary>Paste the text instead</summary>
          <textarea value={pasted} placeholder="Paste your requirements here" aria-label="Requirements text" onChange={(e) => setPasted(e.target.value)} />
          <div className="row wrap" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="btn btn-sm"
              disabled={pasted.trim().length < 80}
              onClick={() => {
                try {
                  take(pasted, "");
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                }
              }}
            >
              Read this text
            </button>
          </div>
        </details>
      </div>
    );
  }

  const set = (id: string, value: string) => setBrief((b) => (b ? reviseBrief(b, b.category, { ...b.read, [id]: value }) : b));
  const basics = new Set(["name", "what", "city", "tone"]);
  const rest = brief.found.filter((f) => !basics.has(f.id));
  const go = (mode: "build" | "check") => onProject(projectFromBrief(brief, mode), mode);
  const field = (id: string, label: string, placeholder: string) => (
    <div>
      <label htmlFor={"doc-" + id}>{label}</label>
      <input id={"doc-" + id} type="text" value={brief.read[id] ?? ""} placeholder={placeholder} onChange={(e) => set(id, e.target.value)} />
    </div>
  );

  return (
    <div className="doc-intake doc-read" aria-live="polite">
      <div className="doc-read-head">
        <div>
          <h2>Here is what we read</h2>
          <p className="doc-file">
            <Icon name="check" size={16} />
            {brief.fileName || "Pasted text"}: {brief.words.toLocaleString()} words{brief.sections ? ` in ${brief.sections} sections` : ""}
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBrief(null)}>
          Use another document
        </button>
      </div>

      {brief.missing.length > 0 && (
        <div className="notice notice-warn">
          We couldn&apos;t find {brief.missing.join(", ")}. Fill in what you can here, or carry on and the usual wording for this kind of business is used until you change it.
        </div>
      )}

      <div className="panel">
        <div className="doc-basics">
          {field("name", "Name", "Your business or product")}
          {field("what", "What you offer, in a few words", "Family bakery")}
          {field("city", "City or area", "Lahore")}
          <div>
            <label htmlFor="doc-cat">Kind of business</label>
            <select id="doc-cat" value={brief.category} onChange={(e) => setBrief(reviseBrief(brief, e.target.value, brief.read))}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="doc-wide">
            <label id="doc-tone-l">How it should feel</label>
            <div className="doc-tones" role="radiogroup" aria-labelledby="doc-tone-l">
              {TONES.map((t) => (
                <button type="button" key={t} role="radio" aria-checked={brief.answers.tone === t} className={"chip" + (brief.answers.tone === t ? " is-on" : "")} onClick={() => set("tone", t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {rest.length > 0 && (
        <div>
          <h3 style={{ marginBottom: 10 }}>What goes on your site</h3>
          <ul className="doc-found">
            {rest.map((f) => (
              <li key={f.id}>
                <b>
                  <Icon name="check" size={14} />
                  {f.label}
                </b>
                <span>
                  {f.id === "colour" && <i className="doc-swatch" style={{ background: f.value }} aria-hidden="true" />}
                  {f.value}
                </span>
                <small>From {f.from}</small>
              </li>
            ))}
          </ul>
        </div>
      )}

      {brief.pages.length > 0 && (
        <div>
          <p className="small muted">Your document lists these pages. They become the sections of one scrolling site, each with its own link in the menu.</p>
          <div className="doc-pages">
            {brief.pages.map((p) => (
              <span key={p}>{p}</span>
            ))}
          </div>
        </div>
      )}

      <div className="doc-go">
        <button type="button" className="btn btn-primary" onClick={() => go("build")}>
          Build my {categoryById(brief.category).id === "product" ? "product site" : "site"}
          <Icon name="arrow" size={16} />
        </button>
        <button type="button" className="btn" onClick={() => go("check")}>
          Check every answer first
        </button>
        <span className="hint">Every word, picture, colour and section stays editable afterwards.</span>
      </div>
    </div>
  );
}
