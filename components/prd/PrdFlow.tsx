"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { studioPath } from "@/lib/project";
import { localDraft, normalizePrd, prdFromText, type Prd } from "@/lib/prd";
import { fileToText } from "@/lib/resume";
import { saveProject } from "@/lib/store";
import { isDirector } from "@/template/src/director";
import PrdEditor from "./PrdEditor";
import "./prd.css";

// The PRD journey (the only way a site starts now):
//   1. one line: what will be made,
//   2. Gemini drafts the PRD (the rules draft it when Gemini is not available),
//   3. the person edits the PRD: every section, word and requirement,
//   4. they submit it and the site is generated from it, every PRD section and requirement included.
// A PRD document can be uploaded instead of the one line. The draft is kept in this browser
// until it is submitted, so a refresh loses nothing.

const EXAMPLES = ["How the human heart works", "Dentist clinic in Islamabad", "Launch page for our new trail running shoe", "Boutique hotel in Murree", "Portfolio for a 3D motion designer", "Bakery in Lahore with online cake orders"];
const KEY = "prd-draft";
type Phase = "idea" | "draft" | "edit" | "build";

function saved(): Prd | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalizePrd(JSON.parse(raw), "") : null;
  } catch {
    return null;
  }
}
function keep(prd: Prd | null) {
  try {
    if (prd) localStorage.setItem(KEY, JSON.stringify(prd));
    else localStorage.removeItem(KEY);
  } catch {
    /* private window: the draft just lives in memory */
  }
}

export default function PrdFlow() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idea");
  const [idea, setIdea] = useState("");
  const [prd, setPrd] = useState<Prd | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const run = useRef(0);

  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const q = qs.get("q");
    const dir = qs.get("director");
    if (q) {
      setIdea(q);
      void draft(q, isDirector(dir) ? dir : undefined);
      return;
    }
    const s = saved();
    if (s && s.sections.length) {
      setPrd(s);
      setIdea(s.idea);
      setPhase("edit");
      setNote("Your unfinished PRD is back where you left it.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const change = (p: Prd) => {
    setPrd(p);
    keep(p);
  };

  async function draft(line: string, director?: Prd["director"]) {
    const text = line.trim();
    if (text.length < 3) return setError("Say in a few words what the website is for.");
    const id = ++run.current;
    setError("");
    setNote("");
    setPhase("draft");
    let next: Prd;
    try {
      const r = await fetch("/api/prd", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ step: "draft", idea: text }) });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || "The PRD could not be drafted.");
      next = normalizePrd(data.prd, text, data.ai ? "gemini" : "rules");
      setNote(data.ai ? `Gemini drafted this PRD${data.model ? " (" + data.model + ")" : ""}. Change anything, then build.` : data.note || "The rules drafted this PRD. Change anything, then build.");
    } catch {
      next = localDraft(text);
      setNote("Gemini could not be reached, so the rules drafted this PRD. Change anything, then build.");
    }
    if (id !== run.current) return;
    if (director) next = { ...next, director, sections: next.sections.map((s, i) => (i === 0 ? { ...s, visual: { ...s.visual, director } } : s)) };
    change(next);
    setPhase("edit");
    history.replaceState(null, "", "/create");
  }

  async function upload(f: File | undefined) {
    if (!f) return;
    setError("");
    try {
      const text = await fileToText(f, { headings: true });
      if (text.replace(/\s+/g, " ").trim().length < 60) throw new Error("There isn't enough text in that file. If it is a scan, paste the text instead.");
      const p = prdFromText(text, f.name);
      change(p);
      setIdea(p.idea);
      setPhase("edit");
      setNote(`Read ${p.sections.length} sections and ${p.sections.reduce((n, s) => n + s.requirements.length, 0)} requirements from ${f.name}. Check them, then build.`);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "That file couldn't be read. Try a PDF, a Word .docx file or Markdown.");
    }
  }

  async function submit() {
    if (!prd) return;
    const empty = prd.sections.flatMap((s) => s.requirements.filter((r) => !r.text.trim()).map((r) => r.id));
    if (empty.length) return setError(`Write or remove the empty requirement${empty.length > 1 ? "s" : ""} ${empty.join(", ")} first.`);
    setError("");
    setPhase("build");
    try {
      const { buildFromPrd } = await import("@/lib/prd-build");
      const { checkCoverage } = await import("@/lib/prd-coverage");
      const p = buildFromPrd(prd);
      const cov = checkCoverage(p.prd!, p.content as never, p.experience);
      if (!cov.ok) throw new Error("The site is missing " + cov.problems.join("; "));
      saveProject(p);
      keep(null);
      router.push(studioPath(p));
    } catch (e) {
      setPhase("edit");
      setError((e as Error).message || "The site could not be built.");
    }
  }

  const steps: [Phase, string][] = [
    ["idea", "1. Say what it is"],
    ["draft", "2. Gemini drafts the PRD"],
    ["edit", "3. Edit the PRD"],
    ["build", "4. Your site"],
  ];
  const at = steps.findIndex(([p]) => p === phase);

  return (
    <div className="prd-start">
      <p className="eyebrow">
        <span className="mono">Start with a PRD</span>
      </p>
      <h1>Say what you are making. Own every part of it.</h1>
      <p className="lede" style={{ maxWidth: 700 }}>
        One line becomes a full product requirements document. You edit it, then the site is built from it: every section and every requirement in the PRD ends up on the page, and every word, picture, 3D model, background and animation stays yours to change.
      </p>
      <ol className="prd-steps" aria-label="Steps">
        {steps.map(([p, label], i) => (
          <li key={p} className={i === at ? "is-on" : i < at ? "is-done" : ""} aria-current={i === at ? "step" : undefined}>
            {i < at && <Icon name="check" size={12} />} {label}
          </li>
        ))}
      </ol>

      {(phase === "idea" || phase === "draft") && (
        <>
          <form
            className="prd-idea"
            onSubmit={(e) => {
              e.preventDefault();
              void draft(idea);
            }}
          >
            <input value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="How the human heart works" aria-label="What will the website be?" autoFocus disabled={phase === "draft"} />
            <button type="submit" className="btn btn-primary" disabled={phase === "draft"}>
              <Icon name="sparkle" size={16} />
              {phase === "draft" ? "Drafting the PRD" : "Draft the PRD"}
            </button>
          </form>
          {phase === "idea" && (
            <>
              <div className="prd-examples">
                {EXAMPLES.map((x) => (
                  <button key={x} type="button" className="btn btn-sm btn-ghost" onClick={() => (setIdea(x), void draft(x))}>
                    {x}
                  </button>
                ))}
              </div>
              <div className="prd-or">
                <p className="small muted">Already have a PRD, BRD or brief? Upload it and edit it here instead.</p>
                <button type="button" className="btn btn-sm" onClick={() => file.current?.click()}>
                  <Icon name="upload" size={14} />
                  Upload a document
                </button>
                <input ref={file} type="file" hidden accept=".pdf,.docx,.md,.markdown,.txt,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => upload(e.target.files?.[0])} />
              </div>
            </>
          )}
          {phase === "draft" && (
            <p className="prd-note" role="status" aria-live="polite">
              Writing the sections, the content and the requirements for &ldquo;{idea}&rdquo;. This takes about 10 to 30 seconds.
            </p>
          )}
        </>
      )}

      {error && (
        <p className="prd-note" role="alert" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      {(phase === "edit" || phase === "build") && prd && (
        <>
          {note && <p className="prd-note">{note}</p>}
          <div style={{ marginTop: 18 }}>
            <PrdEditor prd={prd} onChange={change} />
          </div>
          <div className="prd-bar">
            <span className="small muted">
              {prd.sections.length} sections and {prd.sections.reduce((n, s) => n + s.requirements.length, 0)} requirements will be built. You can change the PRD later in the studio.
            </span>
            <div className="row" style={{ gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  if (confirm("Start again with a new line? This PRD will be cleared.")) {
                    keep(null);
                    setPrd(null);
                    setPhase("idea");
                    setNote("");
                  }
                }}
              >
                Start again
              </button>
              <button type="button" className="btn btn-primary" onClick={submit} disabled={phase === "build"}>
                <Icon name="rocket" size={16} />
                {phase === "build" ? "Building your site" : "Submit the PRD and build"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
