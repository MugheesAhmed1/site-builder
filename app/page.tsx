"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
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
        <section className="home-hero">
          <div>
            <h1>
              Your résumé in.
              <br />A portfolio site out.
            </h1>
            <p className="lede">
              Upload your résumé, choose a look, answer a few questions, and get an animated React portfolio you can edit and publish for free.
            </p>
            <div className="row wrap home-actions">
              <button className="btn btn-primary" onClick={start}>
                Start a portfolio
                <Icon name="arrow" size={16} />
              </button>
              <button className="btn" onClick={() => fileRef.current?.click()}>
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
                    alert("That file isn't a Portfolio Builder backup. Choose the .json file you saved from this app.");
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
              <h2>Your portfolios</h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => saveBlob(new Blob([JSON.stringify(projects, null, 2)], { type: "application/json" }), "portfolio-builder-backup.json")}
              >
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
                      <h3>{p.content?.hero.name || p.profile?.name || p.name}</h3>
                      <p className="small muted" style={{ marginTop: 4 }}>
                        <span className="progress-dots" aria-label={`${done} of ${STEPS.length} steps approved`}>
                          {STEPS.map((s, i) => (
                            <span key={s.id} className={i < done ? "on" : ""} />
                          ))}
                        </span>
                        {p.design.preset} · edited {new Date(p.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="row">
                      <button
                        className="btn btn-ghost btn-sm btn-danger"
                        onClick={() => {
                          if (confirm("Delete this portfolio from this browser? This can't be undone unless you have a backup.")) {
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
