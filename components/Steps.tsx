"use client";

import { useEffect, useState } from "react";
import FieldsEditor from "@/components/FieldsEditor";
import Icon from "@/components/Icon";
import Preview from "@/components/Preview";
import { downloadZip, saveBlob, siteName } from "@/lib/export";
import type { PortfolioContent, Project, SiteContent, WebsiteContent } from "@/lib/types";

// Steps shared by the Website Builder and the Portfolio Studio.

export type Head = (title: string, intro: string, action?: React.ReactNode) => React.ReactNode;

export const PORTFOLIO_SECTIONS: Record<string, string> = {
  tiles: "Live tiles",
  stats: "Impact numbers",
  about: "About",
  process: "How I work",
  experience: "Experience",
  projects: "Work",
  skills: "Skills",
  services: "Services",
  testimonials: "Testimonials",
  awards: "Awards",
  certifications: "Certifications",
  languages: "Languages",
  custom: "Your own sections",
  cta: "Call to action band",
  education: "Education",
  contact: "Contact",
};
export const WEBSITE_SECTIONS: Record<string, string> = {
  tiles: "Live tiles",
  highlights: "Numbers",
  clients: "Trusted by strip",
  services: "Services or menu",
  about: "About",
  process: "How it works",
  gallery: "Gallery",
  team: "Team",
  pricing: "Prices",
  testimonials: "Reviews",
  faq: "Questions",
  custom: "Your own section",
  cta: "Call to action band",
  visit: "Address and hours",
  contact: "Contact",
};

export function StatusBadge({ s }: { s: string }) {
  const text = s === "todo" ? "Not started" : s === "approved" ? "Approved" : s === "stale" ? "Needs a look" : "Draft";
  return <span className={`badge badge-${s}`}>{text}</span>;
}

export function BuildStep({
  p,
  head,
  word,
  onRebuild,
  onEdit,
  onUndo,
  onApprove,
}: {
  p: Project;
  head: Head;
  word: string;
  onRebuild: () => void;
  onEdit: (c: SiteContent) => void;
  onUndo: (i: number) => void;
  onApprove: () => void;
}) {
  const [tab, setTab] = useState<"preview" | "content" | "sections">("preview");
  useEffect(() => {
    if (!p.content) onRebuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const c = p.content;
  if (!c) return null;
  const labels = p.kind === "portfolio" ? PORTFOLIO_SECTIONS : WEBSITE_SECTIONS;
  const sections = c.sections as string[];
  const setSections = (s: string[]) => onEdit({ ...c, sections: s } as SiteContent);
  return (
    <>
      {head(
        "Your " + word,
        "Check it on desktop and phone, in light and dark. Edit any text, show, hide or reorder sections. Nothing here is written by AI; it comes from your answers.",
        <button className="btn btn-primary" onClick={onApprove}>
          Approve {word}
          <Icon name="arrow" size={16} />
        </button>
      )}
      <div className="row wrap" style={{ gap: 8, marginBottom: 18 }}>
        <button className="btn btn-sm" onClick={() => (p.steps.build !== "stale" ? confirm("Rebuild from your answers? Text you edited by hand is replaced. You can restore this version afterwards.") : true) && onRebuild()}>
          <Icon name="undo" size={15} />
          Rebuild from answers
        </button>
        {p.history.length > 0 && (
          <select style={{ width: "auto", minHeight: 34, fontSize: 14 }} value="" onChange={(e) => e.target.value !== "" && onUndo(Number(e.target.value))} aria-label="Restore an earlier version">
            <option value="">Restore an earlier version</option>
            {p.history.map((h, i) => (
              <option key={i} value={i}>
                {new Date(h.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}, {h.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="tabs" role="tablist">
        {(["preview", "content", "sections"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={"tab" + (tab === t ? " is-on" : "")} onClick={() => setTab(t)}>
            {t === "preview" ? "Preview" : t === "content" ? "Edit text" : "Sections"}
          </button>
        ))}
      </div>
      {tab === "preview" && <Preview kind={p.kind} design={p.design} content={c} />}
      {tab === "content" && (
        <div className="design-grid" style={{ gridTemplateColumns: "minmax(0, 400px) minmax(0, 1fr)" }}>
          <div className="panel">
            <FieldsEditor value={c} onChange={onEdit} skip={["sections"]} />
          </div>
          <div className="sticky-preview">
            <Preview kind={p.kind} design={p.design} content={c} />
          </div>
        </div>
      )}
      {tab === "sections" && (
        <div className="design-grid">
          <div>
            <p className="hint" style={{ marginBottom: 10 }}>
              Tick the sections to show and use the arrows to set their order.
            </p>
            {[...sections, ...Object.keys(labels).filter((s) => !sections.includes(s))].map((sid) => {
              const on = sections.includes(sid);
              const idx = sections.indexOf(sid);
              const label = labels[sid] ?? sid;
              const v = (c as unknown as Record<string, unknown>)[sid];
              const empty = Array.isArray(v) && v.length === 0;
              return (
                <label className="section-row" key={sid}>
                  <input type="checkbox" checked={on} onChange={() => setSections(on ? sections.filter((x) => x !== sid) : [...sections.filter((x) => x !== "contact"), sid, ...(sections.includes("contact") ? ["contact"] : [])])} />
                  <span className="grow">
                    {label}
                    {empty && <span className="small muted">. Empty, add content in Edit text</span>}
                  </span>
                  {on && (
                    <>
                      <button className="btn btn-ghost btn-sm btn-icon" aria-label={`Move ${label} up`} disabled={idx === 0} onClick={(e) => (e.preventDefault(), setSections(swap(sections, idx, idx - 1)))}>
                        <Icon name="up" size={16} />
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" aria-label={`Move ${label} down`} disabled={idx === sections.length - 1} onClick={(e) => (e.preventDefault(), setSections(swap(sections, idx, idx + 1)))}>
                        <Icon name="down" size={16} />
                      </button>
                    </>
                  )}
                </label>
              );
            })}
          </div>
          <div className="sticky-preview">
            <Preview kind={p.kind} design={p.design} content={c} />
          </div>
        </div>
      )}
    </>
  );
}

function swap<T>(a: T[], i: number, j: number): T[] {
  const out = a.slice();
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

// Images the person still has to supply, so nothing ships with an unexplained empty slot.
export function missingImages(p: Project): string[] {
  const c = p.content;
  if (!c) return [];
  if (p.kind === "portfolio") {
    const pc = c as PortfolioContent;
    return p.design.heroStyle === "portrait" && !pc.hero.photoUrl ? ["A photo of you for the opening section (optional, hidden until added)"] : [];
  }
  const wc = c as WebsiteContent;
  const out: string[] = [];
  if (!wc.hero.imageUrl) out.push("A main photo for the opening section (optional, hidden until added)");
  if (wc.sections.includes("gallery")) for (const g of wc.gallery) if (!g.imageUrl) out.push(`Gallery photo: ${g.caption} (shows a labelled slot until added)`);
  return out;
}

export function DeployStep({ p, head, onDone }: { p: Project; head: Head; onDone: () => void }) {
  if (!p.content) return null;
  const images = missingImages(p);
  const repo = p.kind === "portfolio" ? "portfolio" : "my-site";
  return (
    <>
      {head(
        "Put it online",
        "Download your site as a React project, then publish it on Vercel for free. No coding needed.",
        <button className="btn btn-primary" onClick={onDone}>
          <Icon name="check" size={16} />
          Mark as published
        </button>
      )}
      <div className="deploy-grid">
        <section>
          <h2>1. Download your site</h2>
          <p className="muted" style={{ margin: "8px 0 18px" }}>
            A ready React (Vite) project for <b>{siteName(p)}</b>. Every word, colour and setting lives in <code>src/site-data.json</code>.
          </p>
          <div className="row wrap">
            <button className="btn btn-primary" onClick={() => downloadZip(p)}>
              <Icon name="download" size={16} />
              Download site (.zip)
            </button>
            <button className="btn" onClick={() => saveBlob(new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }), `${p.id}-site-builder.json`)}>
              Save a backup
            </button>
          </div>
          {images.length > 0 && (
            <>
              <h2 style={{ marginTop: 40 }}>Photos you still need</h2>
              <ul className="plain-list">
                {images.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className="muted" style={{ marginTop: 8 }}>
                Paste a link to an image that&apos;s already online in <b>Your site, Edit text</b>, or upload images to a <code>public</code> folder in your GitHub repository and use a link like <code>/photo.jpg</code>.
              </p>
            </>
          )}
        </section>
        <section>
          <h2>2. Publish on Vercel</h2>
          <ol className="howto" style={{ marginTop: 14 }}>
            <li>
              <span>
                Unzip the download. You&apos;ll get a folder with <code>package.json</code> and a <code>src</code> folder inside.
              </span>
            </li>
            <li>
              <span>
                Sign in to{" "}
                <a href="https://github.com/new" target="_blank" rel="noreferrer">
                  GitHub
                </a>{" "}
                (free) and create a repository called <code>{repo}</code>. Keep it public.
              </span>
            </li>
            <li>
              <span>
                On the new repository page, choose <b>uploading an existing file</b>. Drag in everything inside the unzipped folder, including <code>src</code>, then choose <b>Commit changes</b>.
              </span>
            </li>
            <li>
              <span>
                Open{" "}
                <a href="https://vercel.com/new" target="_blank" rel="noreferrer">
                  vercel.com/new
                </a>
                , continue with GitHub, and choose <b>Import</b> next to <code>{repo}</code>.
              </span>
            </li>
            <li>
              <span>
                Leave the settings as they are (Vercel recognises Vite) and choose <b>Deploy</b>. About a minute later you get a link like <code>{repo}-yourname.vercel.app</code>.
              </span>
            </li>
            <li>
              <span>
                To update it, edit here, download again and upload the changed files to GitHub. Vercel republishes on its own. Add your own domain under <b>Settings, Domains</b>.
              </span>
            </li>
          </ol>
        </section>
      </div>
    </>
  );
}
