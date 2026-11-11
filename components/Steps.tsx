"use client";

import { useEffect, useState } from "react";
import FieldsEditor from "@/components/FieldsEditor";
import Icon from "@/components/Icon";
import Preview from "@/components/Preview";
import { downloadZip, saveBlob, siteName, slug as slugOf } from "@/lib/export";
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
        "Check it on desktop and phone, in light and dark. Press Edit on page to click any words or picture and change it, or upload and paste your own photos. Nothing here is written by AI; it comes from your answers.",
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
      {tab === "preview" && <Preview kind={p.kind} design={p.design} content={c} onContentChange={onEdit} />}
      {tab === "content" && (
        <div className="design-grid" style={{ gridTemplateColumns: "minmax(0, 400px) minmax(0, 1fr)" }}>
          <div className="panel">
            <FieldsEditor value={c} onChange={onEdit} skip={["sections"]} />
          </div>
          <div className="sticky-preview">
            <Preview kind={p.kind} design={p.design} content={c} onContentChange={onEdit} />
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
            <Preview kind={p.kind} design={p.design} content={c} onContentChange={onEdit} />
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
  const [busy, setBusy] = useState<"" | "ready" | "source">("");
  const [error, setError] = useState("");
  const [got, setGot] = useState(false);
  if (!p.content) return null;
  const images = missingImages(p);
  const repo = p.kind === "portfolio" ? "portfolio" : "my-site";
  const download = async (kind: "ready" | "source") => {
    if (busy) return;
    setBusy(kind);
    setError("");
    try {
      await downloadZip(p, kind);
      if (kind === "ready") setGot(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The download could not be made. Please try again.");
    } finally {
      setBusy("");
    }
  };
  return (
    <>
      {head(
        "Put it online",
        "Download your finished site and drop it onto a free host. No account is needed to try it, and there is no code to touch.",
        <button className="btn btn-primary" onClick={onDone}>
          <Icon name="check" size={16} />
          Mark as published
        </button>
      )}
      <div className="deploy-grid">
        <section>
          <h2>1. Download your site</h2>
          <p className="muted" style={{ margin: "8px 0 18px" }}>
            The finished site for <b>{siteName(p)}</b>, ready to host: one folder with the page, its pictures, a browser icon and a share picture for when the link is posted.
          </p>
          <div className="row wrap">
            <button className="btn btn-primary" onClick={() => download("ready")} disabled={!!busy} aria-busy={busy === "ready"}>
              <Icon name="download" size={16} />
              {busy === "ready" ? "Packing your site…" : "Download site (.zip)"}
            </button>
            <button className="btn" onClick={() => saveBlob(new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }), `${p.id}-site-builder.json`)}>
              Save a backup
            </button>
          </div>
          <p className="small muted" role="status" aria-live="polite" style={{ marginTop: 10, minHeight: 20 }}>
            {error ? <span className="err-text">{error}</span> : got ? "Downloaded. Unzip it, then follow the steps on the right." : ""}
          </p>
          {images.length > 0 && (
            <>
              <h2 style={{ marginTop: 28 }}>Photos you still need</h2>
              <ul className="plain-list">
                {images.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className="muted" style={{ marginTop: 8 }}>
                Add them in <b>Your site</b> with <b>Edit on page</b>: click a picture slot and upload from your device. They are saved inside the download.
              </p>
            </>
          )}
          <details className="dev-details">
            <summary>For developers: get the React source instead</summary>
            <p className="muted" style={{ margin: "10px 0 14px" }}>
              The same site as an editable React (Vite) project. Every word, colour and setting lives in <code>src/site-data.json</code>. It needs a build, so publish it through GitHub.
            </p>
            <button className="btn" onClick={() => download("source")} disabled={!!busy} aria-busy={busy === "source"}>
              <Icon name="download" size={16} />
              {busy === "source" ? "Packing the project…" : "Download React project (.zip)"}
            </button>
            <ol className="howto" style={{ marginTop: 14 }}>
              <li>
                <span>
                  Unzip it, then create a repository called <code>{repo}</code> on{" "}
                  <a href="https://github.com/new" target="_blank" rel="noreferrer">
                    GitHub
                  </a>{" "}
                  and upload everything inside the folder, including <code>src</code>.
                </span>
              </li>
              <li>
                <span>
                  Open{" "}
                  <a href="https://vercel.com/new" target="_blank" rel="noreferrer">
                    vercel.com/new
                  </a>
                  , continue with GitHub and choose <b>Import</b> next to <code>{repo}</code>. Vercel recognises Vite; choose <b>Deploy</b>.
                </span>
              </li>
              <li>
                <span>
                  Each time you change a file on GitHub, Vercel republishes the site. To run it yourself: <code>npm install</code>, then <code>npm run dev</code>.
                </span>
              </li>
            </ol>
          </details>
        </section>
        <section>
          <h2>2. Publish it for free</h2>
          <ol className="howto" style={{ marginTop: 14 }}>
            <li>
              <span>
                Unzip the download. You get one folder with <code>index.html</code> inside. Double-click <code>index.html</code> if you want to look at the site first.
              </span>
            </li>
            <li>
              <span>
                Open{" "}
                <a href="https://app.netlify.com/drop" target="_blank" rel="noreferrer">
                  Netlify Drop
                </a>{" "}
                and drag the whole folder onto the page. Your site is live in a few seconds, on a link you can share.
              </span>
            </li>
            <li>
              <span>
                Sign up for free on that page to keep the site and give it a name, such as <code>{slugOf(siteName(p))}.netlify.app</code>. Your own domain goes under <b>Domain management</b>.
              </span>
            </li>
            <li>
              <span>
                To update it, change things here, download again and drag the new folder onto your site&apos;s <b>Deploys</b> page.
              </span>
            </li>
          </ol>
          <p className="small muted" style={{ marginTop: 14 }}>
            Any host works the same way: Cloudflare Pages (<b>Upload assets</b>), GitHub Pages, or your own hosting. Upload what is inside the folder.
          </p>
        </section>
      </div>
    </>
  );
}
