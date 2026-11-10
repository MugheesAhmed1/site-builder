"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import Topbar from "@/components/Topbar";
import { CATEGORIES, categoryById, classify, extractHints } from "@/lib/categories";
import { personalDesign } from "@/lib/designs";
import { saveBlob, siteName } from "@/lib/export";
import { defaultAnswers } from "@/lib/questions";
import { deleteProject, importProjects, listProjects, newProject, saveProject } from "@/lib/store";
import type { Project, SiteKind } from "@/lib/types";
import { STEPS } from "@/lib/types";

const EXAMPLES = [
  "Portfolio for me, I'm a product manager",
  "Website for my bakery called Crumb House in Lahore",
  "Site for my dental clinic in Karachi",
  "Landing page for my invoicing app",
  "I'm a UX designer and want to show my work",
  "Wedding photography business in Islamabad",
];

export default function Home() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [kindOverride, setKindOverride] = useState<SiteKind | null>(null);
  const [catOverride, setCatOverride] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => setProjects(listProjects()), []);

  const detected = useMemo(() => classify(query), [query]);
  const kind = kindOverride ?? detected.kind;
  const category = kind === "portfolio" ? "portfolio" : (catOverride ?? (detected.kind === "website" ? detected.category : "general"));
  const hints = useMemo(() => extractHints(query), [query]);

  const start = () => {
    const q = query.trim() || (kind === "portfolio" ? "A personal portfolio" : "A website for my business");
    const p = newProject(q, kind, category, hints.name);
    p.answers = defaultAnswers(kind, category, hints);
    p.design = personalDesign(hints.name || q, q);
    saveProject(p);
    router.push(`/build/${p.id}`);
  };

  return (
    <>
      <Topbar />
      <main className="page">
        <section className="home-hero">
          <div>
            <h1>
              Say what you need.
              <br />
              Get a site you own.
            </h1>
            <p className="lede">Describe it in one line. Answer a few plain questions, pick from 240 design systems or make your own, and download a React site you can publish for free.</p>
            <form
              className="ask"
              onSubmit={(e) => {
                e.preventDefault();
                start();
              }}
            >
              <label className="lbl" htmlFor="q">
                What do you want to build?
              </label>
              <div className="ask-row">
                <input id="q" autoFocus value={query} placeholder="Website for my bakery in Lahore" onChange={(e) => setQuery(e.target.value)} />
                <button className="btn btn-primary" type="submit">
                  Start
                  <Icon name="arrow" size={16} />
                </button>
              </div>
              <div className="examples" aria-label="Examples">
                {EXAMPLES.map((x) => (
                  <button
                    type="button"
                    key={x}
                    className="chip"
                    onClick={() => {
                      setQuery(x);
                      setKindOverride(null);
                      setCatOverride(null);
                    }}
                  >
                    {x}
                  </button>
                ))}
              </div>
              <div className="detect" aria-live="polite">
                <span className="small muted">We&apos;ll build</span>
                <div className="seg" role="group" aria-label="Kind of site">
                  {(["portfolio", "website"] as const).map((k) => (
                    <button type="button" key={k} aria-pressed={kind === k} className={kind === k ? "is-on" : ""} onClick={() => setKindOverride(k)}>
                      {k === "portfolio" ? "A personal portfolio" : "A business website"}
                    </button>
                  ))}
                </div>
                {kind === "website" && (
                  <select aria-label="Type of business" value={category} onChange={(e) => setCatOverride(e.target.value)}>
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </form>
            <div className="row wrap" style={{ marginTop: 18 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
                Import a backup
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const data = JSON.parse(await f.text());
                    importProjects(Array.isArray(data) ? data : [data]);
                    setProjects(listProjects());
                  } catch {
                    alert("That file isn't a Site Builder backup. Choose the .json file you saved from this app.");
                  }
                }}
              />
            </div>
          </div>
          <ol className="home-steps" aria-label="How it works">
            {STEPS.map((s, i) => (
              <li key={s.id}>
                <span className="mono muted">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <b>{s.title}</b>
                  <span className="muted">. {s.hint}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {projects.length > 0 && (
          <section className="home-section">
            <div className="row between" style={{ marginBottom: 12 }}>
              <h2>Your sites</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => saveBlob(new Blob([JSON.stringify(projects, null, 2)], { type: "application/json" }), "site-builder-backup.json")}>
                <Icon name="download" size={16} />
                Back up all
              </button>
            </div>
            <ul className="project-list">
              {projects.map((p) => {
                const done = STEPS.filter((s) => p.steps[s.id] === "approved").length;
                return (
                  <li className="project-item" key={p.id}>
                    <div>
                      <h3>{p.content ? siteName(p) : p.answers.name || p.name}</h3>
                      <p className="small muted" style={{ marginTop: 4 }}>
                        <span className="progress-dots" aria-label={`${done} of ${STEPS.length} steps approved`}>
                          {STEPS.map((s, i) => (
                            <span key={s.id} className={i < done ? "on" : ""} />
                          ))}
                        </span>
                        {p.kind === "portfolio" ? "Portfolio" : categoryById(p.category).label} · {p.design.preset} · edited {new Date(p.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="row">
                      <button
                        className="btn btn-ghost btn-sm btn-danger"
                        onClick={() => {
                          if (confirm("Delete this site from this browser? This can't be undone unless you have a backup.")) {
                            deleteProject(p.id);
                            setProjects(listProjects());
                          }
                        }}
                      >
                        Delete
                      </button>
                      <Link className="btn btn-sm" href={`/build/${p.id}`}>
                        Continue
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
