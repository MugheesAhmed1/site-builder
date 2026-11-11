"use client";

import { SCENES } from "@/template/src/scenes.js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
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
import { CastCharacter } from "@/template/src/Cast.jsx";
import Showreel from "@/components/Showreel";
import { CATEGORY_GROUPS, ROLES, classifyRole, iconFor } from "@/lib/fit";

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
  const startKind = (k: SiteKind, cat?: string, label?: string) => {
    const q = label ? (k === "portfolio" ? "Portfolio for a " + label.toLowerCase() : "Website for a " + label.toLowerCase()) : k === "portfolio" ? "A personal portfolio" : "A website for my business";
    const p = newProject(q, k, cat ?? (k === "portfolio" ? "portfolio" : "general"), "");
    p.answers = defaultAnswers(k, p.category, { name: "", city: "" });
    p.design = keepCast(p.design, personalDesign(p.query + Date.now(), p.query, undefined, p.category));
    saveProject(p);
    router.push(k === "portfolio" ? `/portfolio/${p.id}` : `/build/${p.id}`);
  };
  const reduce = useReducedMotion();
  const rise = (i: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 18, filter: "blur(6px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const, delay: 0.08 + i * 0.07 },
  });

  return (
    <>
      <Topbar />
      <main className="page">
        <section className="home-hero">
          <div className="home-hero-text">
            <motion.p className="home-kicker" {...rise(0)}>
              <span className="avatar-stack" aria-hidden="true">
                {["SM", "AK", "HR", "ZN"].map((x, i) => (
                  <span key={x} className="mono-avatar" style={{ ["--h" as string]: 158 + i * 55 }}>
                    {x}
                  </span>
                ))}
              </span>
              No AI, no sign up. Everything stays in your browser.
            </motion.p>
            <h1 className="home-title" aria-label="Say what you need. Get a site you own.">
              {["Say", "what", "you", "need."].map((w, i) => (
                <span className="hl-word" key={i} aria-hidden="true">
                  <motion.span className="hl-part" initial={reduce ? { opacity: 0 } : { y: "105%" }} animate={reduce ? { opacity: 1 } : { y: "0%" }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 + i * 0.06 }}>
                    {w}
                  </motion.span>
                </span>
              ))}
              <br />
              {["Get", "a", "site", "you", "own."].map((w, i) => (
                <span className="hl-word" key={i} aria-hidden="true">
                  <motion.span className={"hl-part" + (w === "own." ? " hl-accent" : "")} initial={reduce ? { opacity: 0 } : { y: "105%" }} animate={reduce ? { opacity: 1 } : { y: "0%" }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.34 + i * 0.06 }}>
                    {w}
                  </motion.span>
                </span>
              ))}
            </h1>
            <motion.p className="lede" {...rise(3)}>
              Describe it in one line or pick your category. Choose from {LIBRARY.length} design systems, {MOTIONS.length - 1} animation styles, {CHARACTERS.length} characters, {WIDGETS.length} widgets and {SCENES.length} live scenes you can touch, then download a React site you can publish for free.
            </motion.p>
          <motion.form
            className="ask"
            {...rise(4)}
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
          </motion.form>
          </div>
          <motion.div className="home-reel" initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}>
            <Showreel />
          </motion.div>
        </section>

        <section className="cat-section" aria-labelledby="cat-title">
          <div className="cat-head">
            <h2 id="cat-title">Start from your category</h2>
            <p className="muted">Each one comes with characters, widgets, live scenes and animations that suit it. You can still choose from everything later.</p>
          </div>
          <div className="cat-groups">
            {CATEGORY_GROUPS.map((g, gi) => (
              <div key={g.title} className="cat-group">
                <h3 className="cat-group-title">
                  {g.title}
                  <span className="mono muted"> {g.items.length}</span>
                </h3>
                <div className="cat-grid">
                  {g.items.map((c, i) => (
                    <motion.button
                      key={c.id}
                      type="button"
                      className="cat-chip"
                      onClick={() => startKind(g.kind, c.id, c.id === "portfolio" ? undefined : c.label)}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1], delay: Math.min(i * 0.03, 0.4) + gi * 0.05 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <span className="cat-chip-art" aria-hidden="true">
                        <CastCharacter def={iconFor(c.id)} size={48} />
                      </span>
                      <span className="cat-chip-label">{c.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="entry-grid" aria-label="Choose a builder">
          {(
            [
              {
                k: "portfolio" as const,
                title: "Portfolio Studio",
                text: "A full form for your experience, projects, results, skills, services, testimonials, awards and your own sections. Import a résumé to fill it in seconds.",
                points: ["Résumé import", "17 roles", "Case studies or card grid"],
              },
              {
                k: "website" as const,
                title: "Website Builder",
                text: "For a shop, clinic, studio, café or any business. Plain questions with suggested answers, set by the kind of business you run.",
                points: ["22 business types", "Menu, prices, team, hours", "WhatsApp and maps"],
              },
            ]
          ).map((c, i) => (
            <motion.button
              key={c.k}
              type="button"
              className={"entry-card entry-" + c.k}
              onClick={() => startKind(c.k)}
              onPointerMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty("--mx", e.clientX - r.left + "px");
                e.currentTarget.style.setProperty("--my", e.clientY - r.top + "px");
              }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.45 + i * 0.1 }}
              whileHover={reduce ? undefined : { y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="entry-art" aria-hidden="true">
                {c.k === "portfolio" ? (
                  <>
                    <span className="art-avatar">SM</span>
                    <span className="art-line w70" />
                    <span className="art-line w45" />
                    <span className="art-cards">
                      <span />
                      <span />
                      <span />
                    </span>
                  </>
                ) : (
                  <>
                    <span className="art-bar" />
                    <span className="art-line w60" />
                    <span className="art-menu">
                      <span />
                      <span />
                      <span />
                    </span>
                  </>
                )}
              </span>
              <span className="entry-body">
                <span className="entry-title">{c.title}</span>
                <span className="entry-text">{c.text}</span>
                <span className="entry-points">
                  {c.points.map((x) => (
                    <span key={x}>{x}</span>
                  ))}
                </span>
                <span className="entry-go">
                  Start {c.k === "portfolio" ? "a portfolio" : "a website"}
                  <Icon name="arrow" size={16} />
                </span>
              </span>
            </motion.button>
          ))}
        </section>

        <section className="ds-marquee" aria-label="Some of the design systems">
          <div className="ds-track">
            {[0, 1].map((r) => (
              <ul key={r} aria-hidden={r === 1 || undefined}>
                {LIBRARY.slice(0, 24).map((d) => (
                  <li key={d.id}>
                    <span className="ds-swatch" style={{ background: d.accent }} />
                    {d.preset}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </section>

        <section className="char-marquee" aria-label="Some of the characters">
          <div className="char-track">
            {[0, 1].map((r) => (
              <ul key={r} aria-hidden={r === 1 || undefined}>
                {CHARACTERS.filter((_, i) => i % 19 === 0).map((c) => (
                  <li key={c.id}>
                    <CastCharacter def={c} size={64} />
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </section>

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
