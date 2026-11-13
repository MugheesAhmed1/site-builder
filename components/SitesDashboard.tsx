"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import PromptBox from "@/components/PromptBox";
import Topbar from "@/components/Topbar";
import { saveBlob, siteName } from "@/lib/export";
import { categoryLabel } from "@/lib/fit";
import { describe, readiness } from "@/lib/flow";
import { duplicateProject, studioPath } from "@/lib/project";
import { deleteProject, importProjects, listProjects, saveProject } from "@/lib/store";
import type { Project } from "@/lib/types";
import { platePath } from "@/template/src/plates.js";

// Your sites: everything made in this browser, with a way to start another, copy one,
// back them up and bring a backup in.

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "S"
  );
}

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 90) return "just now";
  if (s < 3600) return Math.round(s / 60) + " min ago";
  if (s < 86400) return Math.round(s / 3600) + " h ago";
  if (s < 86400 * 7) return Math.round(s / 86400) + " d ago";
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function SiteCard({ p, onCopy, onDelete }: { p: Project; onCopy: () => void; onDelete: () => void }) {
  const name = p.content ? siteName(p) : p.name;
  const state = readiness(p);
  // The card wears the site's own scene photo and accent, so sites are told apart at a glance.
  const plate = platePath(p.design.plate || (p.kind === "website" ? p.category : "portfolio"), categoryLabel("portfolio", p.category));
  return (
    <motion.li layout className="site-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}>
      <Link href={studioPath(p)} className="site-card-art" style={{ ["--a" as string]: p.design.accent }} aria-label={"Open " + name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {plate && <img src={plate} alt="" loading="lazy" decoding="async" />}
        <span className="site-card-initials" aria-hidden="true">
          {initials(name)}
        </span>
        <span className={"site-card-state" + (state.published ? " is-live" : "")}>{state.published ? "Downloaded" : state.ready ? "Ready to publish" : "Draft"}</span>
      </Link>
      <div className="site-card-body">
        <h3>
          <Link href={studioPath(p)}>{name}</Link>
        </h3>
        <p className="small muted">
          {describe(p)} · {p.design.preset.replace(" (edited)", "")}
        </p>
        <div className="site-card-foot">
          <span className="small muted">Edited {ago(p.updatedAt)}</span>
          <span className="row" style={{ gap: 2 }}>
            <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={onCopy} aria-label={"Duplicate " + name} title="Duplicate">
              <Icon name="copy" size={15} />
            </button>
            <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => saveBlob(new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }), `${p.id}-site-builder.json`)} aria-label={"Back up " + name} title="Save a backup">
              <Icon name="download" size={15} />
            </button>
            <button type="button" className="btn btn-ghost btn-sm btn-icon btn-danger" onClick={onDelete} aria-label={"Delete " + name} title="Delete">
              <Icon name="trash" size={15} />
            </button>
            <Link className="btn btn-sm" href={studioPath(p)}>
              Open
            </Link>
          </span>
        </div>
      </div>
    </motion.li>
  );
}

export default function SitesDashboard() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const refresh = () => setProjects(listProjects());
  useEffect(refresh, []);

  const bringIn = async (f: File) => {
    try {
      const data = JSON.parse(await f.text());
      const n = importProjects(Array.isArray(data) ? data : [data]);
      if (!n) throw new Error("none");
      setNote(n === 1 ? "1 site brought in." : n + " sites brought in.");
      refresh();
    } catch {
      setNote("That file isn't a Site Builder backup. Choose the .json file you saved from this app.");
    }
  };

  return (
    <>
      <Topbar />
      <main className="sites">
        <header className="sites-head">
          <div>
            <h1>Your sites</h1>
            <p className="muted">Saved in this browser only. Nothing is uploaded, so keep a backup of anything you care about.</p>
          </div>
          <div className="row wrap">
            <Link className="btn btn-sm" href="/document">
              <Icon name="doc" size={15} />
              Start from a document
            </Link>
            <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={15} />
              Import a backup
            </button>
            {projects && projects.length > 0 && (
              <button type="button" className="btn btn-sm" onClick={() => saveBlob(new Blob([JSON.stringify(projects, null, 2)], { type: "application/json" }), "site-builder-backup.json")}>
                <Icon name="download" size={15} />
                Back up all
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) bringIn(f);
                e.target.value = "";
              }}
            />
          </div>
        </header>
        <p className="small sites-note" role="status" aria-live="polite">
          {note}
        </p>

        <section className="sites-new" aria-label="Start a new site">
          <h2>Start a new one</h2>
          <PromptBox id="q-sites" />
        </section>

        {projects && projects.length === 0 && (
          <div className="sites-empty">
            <h2>No sites here yet</h2>
            <p className="muted">Type one line above and your first site opens, already written and animated. If you made sites in another browser, import their backup.</p>
          </div>
        )}

        {projects && projects.length > 0 && (
          <ul className="site-grid">
            <AnimatePresence initial={false}>
              {projects.map((p) => (
                <SiteCard
                  key={p.id}
                  p={p}
                  onCopy={() => {
                    saveProject(duplicateProject(p));
                    refresh();
                  }}
                  onDelete={() => {
                    if (confirm(`Delete "${p.content ? siteName(p) : p.name}" from this browser? This can't be undone unless you have a backup.`)) {
                      deleteProject(p.id);
                      refresh();
                    }
                  }}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </main>
    </>
  );
}
