"use client";

import { SCENES } from "@/template/src/scenes.js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import Topbar from "@/components/Topbar";
import { CATEGORIES, categoryById, classify, extractHints } from "@/lib/categories";
import { LIBRARY, personalDesign } from "@/lib/designs";
import { saveBlob, siteName } from "@/lib/export";
import { defaultAnswers } from "@/lib/questions";
import { deleteProject, importProjects, keepCast, listProjects, newProject, saveProject } from "@/lib/store";
import type { Project, SiteKind } from "@/lib/types";
import { STEPS } from "@/lib/types";
import { MOTIONS } from "@/template/src/motion.js";
import { CHARACTERS, WIDGETS } from "@/template/src/cast.js";
import dynamic from "next/dynamic";

// Everything below the first screen hydrates on its own, after the form is usable.
const HomeBelow = dynamic(() => import("@/components/HomeBelow"));
// The animated centrepiece is heavy (characters, widgets, live scenes), so it loads after the
// words and the form are on screen. The placeholder keeps its space.
const Showreel = dynamic(() => import("@/components/Showreel"), { ssr: false, loading: () => <div className="reel" aria-hidden="true"><div className="reel-stage" /></div> });
import { ROLES, classifyRole } from "@/lib/fit";

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
  const [roleOverride, setRoleOverride] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => setProjects(listProjects()), []);

  const detected = useMemo(() => classify(query), [query]);
  const kind = kindOverride ?? detected.kind;
  const category = kind === "portfolio" ? (roleOverride ?? classifyRole(query)) : (catOverride ?? (detected.kind === "website" ? detected.category : "general"));
  const hints = useMemo(() => extractHints(query), [query]);

  const start = () => {
    const q = query.trim() || (kind === "portfolio" ? "A personal portfolio" : "A website for my business");
    const p = newProject(q, kind, category, hints.name);
    p.answers = defaultAnswers(kind, category, hints);
    p.design = keepCast(p.design, personalDesign(hints.name || q, q, undefined, category));
    saveProject(p);
    router.push(kind === "portfolio" ? `/portfolio/${p.id}` : `/build/${p.id}`);
  };
  const startKind = (k: SiteKind, cat?: string, label?: string, sceneId?: string) => {
    const q = label ? (k === "portfolio" ? "Portfolio for a " + label.toLowerCase() : "Website for a " + label.toLowerCase()) : k === "portfolio" ? "A personal portfolio" : "A website for my business";
    const p = newProject(q, k, cat ?? (k === "portfolio" ? "portfolio" : "general"), "");
    p.answers = defaultAnswers(k, p.category, { name: "", city: "" });
    p.design = keepCast(p.design, personalDesign(p.query + Date.now(), p.query, undefined, p.category));
    const picked = sceneId ? SCENES.find((s) => s.id === sceneId) : undefined;
    if (picked) p.design = { ...p.design, scene: picked, sceneMode: "backdrop" };
    saveProject(p);
    router.push(k === "portfolio" ? `/portfolio/${p.id}` : `/build/${p.id}`);
  };

  return (
    <>
      <Topbar />
      <main className="page">
        <section className="home-hero">
          <div className="home-hero-text">
            <p className="home-kicker rise" style={{ ["--i" as string]: 0 }}>
              <span className="avatar-stack" aria-hidden="true">
                {["SM", "AK", "HR", "ZN"].map((x, i) => (
                  <span key={x} className="mono-avatar" style={{ ["--h" as string]: 158 + i * 55 }}>
                    {x}
                  </span>
                ))}
              </span>
              No AI, no sign up. Everything stays in your browser.
            </p>
            <h1 className="home-title" aria-label="Say what you need. Get a site you own.">
              {["Say", "what", "you", "need."].map((w, i) => (
                <span className="hl-word" key={i} aria-hidden="true">
                  <span className="hl-part hl-up" style={{ animationDelay: 0.1 + i * 0.06 + "s" }}>
                    {w}
                  </span>
                </span>
              ))}
              <br />
              {["Get", "a", "site", "you", "own."].map((w, i) => (
                <span className="hl-word" key={i} aria-hidden="true">
                  <span className={"hl-part hl-up" + (w === "own." ? " hl-accent" : "")} style={{ animationDelay: 0.34 + i * 0.06 + "s" }}>
                    {w}
                  </span>
                </span>
              ))}
            </h1>
            <p className="lede rise" style={{ ["--i" as string]: 3 }}>
              Describe it in one line or pick your category. Choose from {LIBRARY.length} design systems, {MOTIONS.length - 1} animation styles, {SCENES.filter((s) => s.group === "concept").length} scene concepts (a parrot that flies in, a whale swimming past, a jungle walk), {CHARACTERS.length} characters, {WIDGETS.length} widgets and {SCENES.filter((s) => s.group !== "concept").length} live scenes you can touch, then download a finished site you can put online for free.
            </p>
          <form
            className="ask rise"
            style={{ ["--i" as string]: 4 }}
            onSubmit={(e) => {
              e.preventDefault();
              start();
            }}
          >
            <label className="lbl" htmlFor="q">
              Or just tell us what you want
            </label>
            <div className="ask-row">
              <input id="q" value={query} placeholder="Website for my bakery in Lahore" onChange={(e) => setQuery(e.target.value)} />
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
                    setRoleOverride(null);
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
              {kind === "portfolio" && (
                <select aria-label="Your role" value={category} onChange={(e) => setRoleOverride(e.target.value)}>
                  {[...ROLES, { id: "portfolio", label: "Any role" }].map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              )}
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
          </div>
          <div className="home-reel rise-reel">
            <Showreel />
          </div>
        </section>

        <HomeBelow startKind={startKind} />

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
                const n = importProjects(Array.isArray(data) ? data : [data]);
                if (!n) throw new Error("no projects");
                setProjects(listProjects());
              } catch {
                alert("That file isn't a Site Builder backup. Choose the .json file you saved from this app.");
              }
              e.target.value = "";
            }}
          />
        </div>

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
                    <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
                      <span className="mono-avatar is-lg" style={{ background: p.design.accent }} aria-hidden="true">
                        {(p.content ? siteName(p) : p.answers.name || p.name || "S").split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}
                      </span>
                      <div>
                      <h3>{p.content ? siteName(p) : p.answers.name || p.name}</h3>
                      <p className="small muted" style={{ marginTop: 4 }}>
                        <span className="progress-dots" aria-label={`${done} of ${STEPS.length} steps approved`}>
                          {STEPS.map((s, i) => (
                            <span key={s.id} className={i < done ? "on" : ""} />
                          ))}
                        </span>
                        {p.kind === "portfolio" ? "Portfolio" + (ROLES.find((r) => r.id === p.category) ? ", " + ROLES.find((r) => r.id === p.category)!.label.toLowerCase() : "") : categoryById(p.category).label} · {p.design.preset} · edited {new Date(p.updatedAt).toLocaleDateString()}
                      </p>
                      </div>
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
                      <Link className="btn btn-sm" href={p.kind === "portfolio" ? `/portfolio/${p.id}` : `/build/${p.id}`}>
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
