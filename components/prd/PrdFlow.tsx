"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { studioPath } from "@/lib/project";
import { localDraft, normalizePrd, prdFromText, type Prd } from "@/lib/prd";
import { fileToText } from "@/lib/resume";
import { saveProject } from "@/lib/store";
import type { Project } from "@/lib/types";
import { isDirector } from "@/template/src/director";
import PrdEditor from "./PrdEditor";

import "./prd.css";

// The journey (the only way a site starts now):
//   1. one line says what will be made, or, for a portfolio, the person uploads a resume,
//   2. Gemini drafts the PRD (the rules draft it when Gemini is not available),
//   3. the person edits and confirms the PRD: every section, word and requirement,
//   4. they set the site up: the look of every section (text, items and pictures, layout,
//      hero asset, background, animation, Director) and of the whole site, with a live preview,
//   5. the first version is generated, every PRD section and requirement included, and opens in
//      the studio, where everything can be edited and the site downloaded.
// A PRD document can be uploaded instead of the one line. The draft and the setup are kept in
// this browser until the first version is generated, so a refresh loses nothing.

// The setup step carries the live preview (the whole site renderer), so it loads when reached.
const SiteSetup = dynamic(() => import("./SiteSetup"), { ssr: false, loading: () => <p className="prd-note">Laying out your site…</p> });

const EXAMPLES = ["How the human heart works", "Dentist clinic in Islamabad", "Launch page for our new trail running shoe", "Boutique hotel in Murree", "Portfolio for a 3D motion designer", "Bakery in Lahore with online cake orders"];
const KEY = "prd-draft";
const SETUP = "prd-setup";
type Phase = "idea" | "draft" | "edit" | "setup" | "build";
type Kind = "website" | "portfolio";

function saved(): Prd | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalizePrd(JSON.parse(raw), "") : null;
  } catch {
    return null;
  }
}
function savedSetup(): Project | null {
  try {
    const raw = localStorage.getItem(SETUP);
    return raw ? (JSON.parse(raw) as Project) : null;
  } catch {
    return null;
  }
}
function keepSetup(p: Project | null) {
  try {
    if (p) localStorage.setItem(SETUP, JSON.stringify(p));
    else localStorage.removeItem(SETUP);
  } catch {
    /* too big for this browser's storage (large uploads): the setup just lives in memory */
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
  const [kind, setKind] = useState<Kind>("website");
  const [idea, setIdea] = useState("");
  const [prd, setPrd] = useState<Prd | null>(null);
  const [setup, setSetup] = useState<Project | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pasted, setPasted] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const resume = useRef<HTMLInputElement>(null);
  const run = useRef(0);

  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const q = qs.get("q");
    const dir = qs.get("director");
    if (qs.get("kind") === "portfolio" || (q && /^\s*(portfolio|my portfolio|resume|cv)\b|\bportfolio for me\b|\bi'?m an? /i.test(q))) {
      setKind("portfolio");
      if (q) setIdea(q);
      history.replaceState(null, "", "/create?kind=portfolio");
      return;
    }
    if (q) {
      setIdea(q);
      void draft(q, isDirector(dir) ? dir : undefined);
      return;
    }
    const s = saved();
    if (s && s.sections.length) {
      setPrd(s);
      setIdea(s.idea);
      setKind(s.kind === "portfolio" ? "portfolio" : "website");
      const st = savedSetup();
      if (st && st.prd) {
        setSetup(st);
        setPhase("setup");
        setNote("Your site setup is back where you left it.");
      } else {
        setPhase("edit");
        setNote("Your unfinished PRD is back where you left it.");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const change = (p: Prd) => {
    setPrd(p);
    keep(p);
  };
  const changeSetup = (p: Project) => {
    setSetup(p);
    keepSetup(p);
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
      setNote(data.ai ? `Gemini drafted this PRD${data.model ? " (" + data.model + ")" : ""}. Change anything, then confirm it.` : data.note || "The rules drafted this PRD. Change anything, then confirm it.");
    } catch {
      next = localDraft(text);
      setNote("Gemini could not be reached, so the rules drafted this PRD. Change anything, then confirm it.");
    }
    if (id !== run.current) return;
    if (director) next = { ...next, director, sections: next.sections.map((s, i) => (i === 0 ? { ...s, visual: { ...s.visual, director } } : s)) };
    keepSetup(null);
    setSetup(null);
    change(next);
    setPhase("edit");
    history.replaceState(null, "", "/create");
  }

  // Portfolio: the resume is read in this browser, then Gemini drafts the portfolio PRD from its text.
  async function fromResume(text0: string, fileName = "") {
    const text = text0.replace(/[ \t]+/g, " ").trim();
    if (text.length < 60) return setError("There isn't enough text in that resume. If it is a scan, paste the text instead.");
    const id = ++run.current;
    setError("");
    setNote("");
    setPhase("draft");
    let next: Prd;
    try {
      const r = await fetch("/api/prd", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ step: "resume", text: text.slice(0, 20_000) }) });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || "The PRD could not be drafted.");
      next = normalizePrd({ ...data.prd, kind: "portfolio" }, data.prd?.idea || "Portfolio", data.ai ? "gemini" : "rules");
      setNote((data.ai ? `Gemini drafted this portfolio PRD from ${fileName || "your resume"}` + (data.model ? " (" + data.model + ")" : "") + "." : data.note || "The rules drafted this PRD from your resume.") + " Change anything, then confirm it.");
    } catch {
      const { parseResume } = await import("@/lib/resume");
      const { prdFromProfile } = await import("@/lib/prd");
      next = prdFromProfile(parseResume(text));
      setNote("Gemini could not be reached, so the rules drafted this PRD from your resume. Change anything, then confirm it.");
    }
    if (id !== run.current) return;
    keepSetup(null);
    setSetup(null);
    change(next);
    setIdea(next.idea);
    setPhase("edit");
  }

  async function uploadResume(f: File | undefined) {
    if (!f) return;
    setError("");
    try {
      void fromResume(await fileToText(f), f.name);
    } catch {
      setError("That file couldn't be read. Try a PDF, a Word .docx file or plain text, or paste the text.");
    }
  }

  async function upload(f: File | undefined) {
    if (!f) return;
    setError("");
    try {
      const text = await fileToText(f, { headings: true });
      if (text.replace(/\s+/g, " ").trim().length < 60) throw new Error("There isn't enough text in that file. If it is a scan, paste the text instead.");
      const p = prdFromText(text, f.name);
      keepSetup(null);
      setSetup(null);
      change(p);
      setIdea(p.idea);
      setPhase("edit");
      setNote(`Read ${p.sections.length} sections and ${p.sections.reduce((n, s) => n + s.requirements.length, 0)} requirements from ${f.name}. Check them, then confirm the PRD.`);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "That file couldn't be read. Try a PDF, a Word .docx file or Markdown.");
    }
  }

  // Step 3 to 4: the confirmed PRD is laid out as a first draft to set up. Choices already made
  // in the setup are kept when the person goes back to change the PRD and confirms it again.
  async function confirmPrd() {
    if (!prd) return;
    const empty = prd.sections.flatMap((s) => s.requirements.filter((r) => !r.text.trim()).map((r) => r.id));
    if (empty.length) return setError(`Write or remove the empty requirement${empty.length > 1 ? "s" : ""} ${empty.join(", ")} first.`);
    setError("");
    try {
      const { buildFromPrd } = await import("@/lib/prd-build");
      const p = buildFromPrd(prd, setup);
      changeSetup({ ...p, history: [] });
      setPhase("setup");
      setNote("Your PRD is confirmed. Now set up how the site looks: the whole site first, then each section. Every change shows in the preview.");
      scrollTo({ top: 0 });
    } catch (e) {
      setError((e as Error).message || "The PRD could not be laid out.");
    }
  }

  // Step 4 to 5: generate the first version from the PRD and the setup, then open the studio.
  async function generate() {
    if (!setup || !prd) return;
    setError("");
    setPhase("build");
    try {
      const { prdExperience } = await import("@/lib/prd-build");
      const { checkCoverage } = await import("@/lib/prd-coverage");
      const p: Project = { ...setup, experience: prdExperience(setup, setup.experience), steps: { ...setup.steps, design: "approved" } as Project["steps"] };
      const cov = checkCoverage(p.prd!, p.content as never, p.experience);
      if (!cov.ok) throw new Error("The site is missing " + cov.problems.join("; "));
      saveProject(p);
      keep(null);
      keepSetup(null);
      router.push(studioPath(p));
    } catch (e) {
      setPhase("setup");
      setError((e as Error).message || "The site could not be generated.");
    }
  }

  const steps: [Phase, string][] = [
    ["idea", kind === "portfolio" ? "1. Upload your resume" : "1. Say what it is"],
    ["draft", "2. Gemini drafts the PRD"],
    ["edit", "3. Edit and confirm the PRD"],
    ["setup", "4. Set up the site"],
    ["build", "5. First version, edit, download"],
  ];
  const at = steps.findIndex(([p]) => p === phase);
  const reqCount = prd ? prd.sections.reduce((n, s) => n + s.requirements.length, 0) : 0;

  return (
    <div className={"prd-start" + (phase === "setup" || phase === "build" ? " is-wide" : "")}>
      <p className="eyebrow">
        <span className="mono">{kind === "portfolio" ? "Portfolio from your resume" : "Start with a PRD"}</span>
      </p>
      {phase === "setup" || phase === "build" ? (
        <h1>Set up {prd?.name || "your site"}.</h1>
      ) : (
        <h1>{kind === "portfolio" ? "Upload your resume. Own every part of your portfolio." : "Say what you are making. Own every part of it."}</h1>
      )}
      {(phase === "idea" || phase === "draft") && (
        <p className="lede" style={{ maxWidth: 700 }}>
          {kind === "portfolio"
            ? "Your resume becomes a full PRD for your portfolio. You edit and confirm it, choose how every section looks, and the first version is built from it. Every word, picture, 3D model, background and animation stays yours to change, and you download it at the end."
            : "One line becomes a full product requirements document. You edit and confirm it, choose how every section looks, and the first version is built from it with every requirement on the page. Every word, picture, 3D model, background and animation stays yours to change, and you download it at the end."}
        </p>
      )}
      <ol className="prd-steps" aria-label="Steps">
        {steps.map(([p, label], i) => (
          <li key={p} className={i === at ? "is-on" : i < at ? "is-done" : ""} aria-current={i === at ? "step" : undefined}>
            {i < at && <Icon name="check" size={12} />} {label}
          </li>
        ))}
      </ol>

      {(phase === "idea" || phase === "draft") && (
        <>
          <div className="seg prd-kind" role="group" aria-label="What are you making?">
            <button type="button" className={kind === "website" ? "is-on" : ""} aria-pressed={kind === "website"} onClick={() => setKind("website")} disabled={phase === "draft"}>
              A website
            </button>
            <button type="button" className={kind === "portfolio" ? "is-on" : ""} aria-pressed={kind === "portfolio"} onClick={() => setKind("portfolio")} disabled={phase === "draft"}>
              A portfolio from my resume
            </button>
          </div>
          {kind === "website" ? (
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
          ) : (
            <div className="prd-or" style={{ marginTop: 18 }}>
              <button type="button" className="btn btn-primary" onClick={() => resume.current?.click()} disabled={phase === "draft"}>
                <Icon name="upload" size={16} />
                {phase === "draft" ? "Drafting your portfolio PRD" : "Upload your resume"}
              </button>
              <input ref={resume} type="file" hidden accept=".pdf,.docx,.txt,.md,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => uploadResume(e.target.files?.[0])} />
              <p className="small muted">PDF, Word .docx or text. It is read in your browser; only its text is sent to draft the PRD.</p>
              {phase === "idea" && (
                <details>
                  <summary className="small">Or paste the text of your resume</summary>
                  <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={8} style={{ width: "100%", marginTop: 8 }} aria-label="Resume text" />
                  <button type="button" className="btn btn-sm" onClick={() => fromResume(pasted)} disabled={pasted.trim().length < 60}>
                    Draft from this text
                  </button>
                </details>
              )}
            </div>
          )}
          {phase === "idea" && kind === "website" && (
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
              {kind === "portfolio" ? "Writing your portfolio's sections and requirements from your resume." : <>Writing the sections, the content and the requirements for &ldquo;{idea}&rdquo;.</>} This takes about 10 to 30 seconds.
            </p>
          )}
        </>
      )}

      {error && (
        <p className="prd-note" role="alert" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      {note && phase !== "idea" && phase !== "draft" && <p className="prd-note">{note}</p>}

      {phase === "edit" && prd && (
        <>
          <div style={{ marginTop: 18 }}>
            <PrdEditor prd={prd} onChange={change} />
          </div>
          <div className="prd-bar">
            <span className="small muted">{prd.sections.length} sections and {reqCount} requirements. Confirm the PRD to choose how each section looks.</span>
            <div className="row" style={{ gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  if (confirm("Start again? This PRD will be cleared.")) {
                    keep(null);
                    keepSetup(null);
                    setSetup(null);
                    setPrd(null);
                    setPhase("idea");
                    setNote("");
                  }
                }}
              >
                Start again
              </button>
              <button type="button" className="btn btn-primary" onClick={confirmPrd}>
                <Icon name="check" size={16} />
                Confirm the PRD
              </button>
            </div>
          </div>
        </>
      )}

      {(phase === "setup" || phase === "build") && setup && prd && (
        <>
          <SiteSetup project={setup} onChange={changeSetup} />
          <div className="prd-bar">
            <span className="small muted">
              All {prd.sections.length} sections and {reqCount} requirements will be in the first version. After that you can edit every element in the studio and download the site.
            </span>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => (setPhase("edit"), setNote("Change the PRD, then confirm it again. Your setup choices are kept."))} disabled={phase === "build"}>
                Back to the PRD
              </button>
              <button type="button" className="btn btn-primary" onClick={generate} disabled={phase === "build"}>
                <Icon name="rocket" size={16} />
                {phase === "build" ? "Generating the first version" : "Generate the first version"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
