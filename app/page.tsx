"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Topbar from "@/components/Topbar";
import { saveBlob } from "@/lib/export";
import { deleteProject, importProjects, listProjects, newProject, saveProject } from "@/lib/store";
import type { PortfolioProject } from "@/lib/types";
import { STEPS } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => setProjects(listProjects()), []);

  const start = () => {
    const p = newProject("New portfolio");
    saveProject(p);
    router.push(`/build/${p.id}`);
  };

  return (
    <>
      <Topbar />
      <main className="page">
        <section className="hero-home">
          <h1>Your résumé in, a portfolio website out.</h1>
          <p className="muted" style={{ fontSize: 17, maxWidth: 640 }}>
            Upload your résumé, pick a look, answer a few questions, and get a modern animated React portfolio you can
            edit and put online for free. You approve every step, and you can change anything.
          </p>
          <div className="steps-mini">
            {STEPS.map((s, i) => (
              <div key={s.id}>
                <b>
                  {i + 1}. {s.title}
                </b>
                <span className="muted">{s.hint}</span>
              </div>
            ))}
          </div>
          <div className="row wrap">
            <button className="btn btn-primary" onClick={start}>
              Start a new portfolio
            </button>
            <button className="btn" onClick={() => fileRef.current?.click()}>
              Import a saved one
            </button>
            {projects.length > 0 && (
              <button
                className="btn btn-ghost"
                onClick={() => saveBlob(new Blob([JSON.stringify(projects, null, 2)], { type: "application/json" }), "portfolio-builder-backup.json")}
              >
                Back up all
              </button>
            )}
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
                  alert("That file isn't a Portfolio Builder backup.");
                }
              }}
            />
          </div>
        </section>

        {projects.length > 0 && (
          <section>
            <h2 style={{ marginBottom: 14 }}>Your portfolios</h2>
            <div className="project-list">
              {projects.map((p) => {
                const done = STEPS.filter((s) => p.steps[s.id] === "approved").length;
                return (
                  <div className="card stack" key={p.id}>
                    <div>
                      <h3>{p.content?.hero.name || p.profile?.name || p.name}</h3>
                      <div className="muted small">
                        {done} of {STEPS.length} steps approved · {p.design.preset} · edited {new Date(p.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="row">
                      <Link className="btn btn-primary btn-sm" href={`/build/${p.id}`}>
                        Open
                      </Link>
                      <button
                        className="btn btn-ghost btn-sm btn-danger"
                        onClick={() => {
                          if (confirm("Delete this portfolio from this browser?")) {
                            deleteProject(p.id);
                            setProjects(listProjects());
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
