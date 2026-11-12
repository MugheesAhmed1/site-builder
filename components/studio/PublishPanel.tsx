"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { downloadZip, saveBlob, siteName, slug as slugOf } from "@/lib/export";
import { readiness, type PanelId } from "@/lib/flow";
import type { Project } from "@/lib/types";

// Publish: a launch check, the download, and the short road to a free host.

export default function PublishPanel({ p, onDownloaded, go }: { p: Project; onDownloaded: () => void; go: (panel: PanelId) => void }) {
  const [busy, setBusy] = useState<"" | "ready" | "source">("");
  const [error, setError] = useState("");
  const [got, setGot] = useState(false);
  const { checks, ready } = readiness(p);
  const open = checks.filter((c) => !c.done && c.id !== "download");
  const repo = p.kind === "portfolio" ? "portfolio" : "my-site";
  const download = async (kind: "ready" | "source") => {
    if (busy) return;
    setBusy(kind);
    setError("");
    try {
      await downloadZip(p, kind);
      if (kind === "ready") {
        setGot(true);
        onDownloaded();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The download could not be made. Please try again.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="sp-stack">
      <section className="sp-card">
        <div className="sp-card-head">
          <h3>Launch check</h3>
          <p className="small muted">{open.length === 0 ? "Everything is in place." : ready ? "Good to go. These would make it better." : "A few things are still missing."}</p>
        </div>
        <ul className="sp-checks">
          {checks
            .filter((c) => c.id !== "download")
            .map((c) => (
              <li key={c.id} className={c.done ? "is-done" : c.must ? "is-must" : ""}>
                <span className="sp-check-dot" aria-hidden="true">
                  {c.done && <Icon name="check" size={12} />}
                </span>
                <span className="grow">{c.label}</span>
                {!c.done && (
                  <button type="button" className="sp-link" onClick={() => go(c.panel)}>
                    {c.must ? "Add it" : "Open"}
                  </button>
                )}
              </li>
            ))}
        </ul>
      </section>

      <section className="sp-card sp-card-accent">
        <div className="sp-card-head">
          <h3>Download {siteName(p)}</h3>
          <p className="small muted">One folder: the page, its pictures, a browser icon and a share picture. Opens straight from the folder and runs on any host.</p>
        </div>
        <div className="row wrap">
          <button type="button" className="btn btn-primary" onClick={() => download("ready")} disabled={!!busy} aria-busy={busy === "ready"}>
            <Icon name="download" size={16} />
            {busy === "ready" ? "Packing your site…" : "Download site (.zip)"}
          </button>
          <button type="button" className="btn" onClick={() => saveBlob(new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }), `${p.id}-site-builder.json`)}>
            Save a backup
          </button>
        </div>
        <p className="small muted" role="status" aria-live="polite" style={{ marginTop: 10, minHeight: 20 }}>
          {error ? <span className="err-text">{error}</span> : got ? "Downloaded. Unzip it, then follow the steps below." : ""}
        </p>
      </section>

      <section className="sp-card">
        <div className="sp-card-head">
          <h3>Put it online for free</h3>
        </div>
        <ol className="howto">
          <li>
            <span>
              Unzip the download. Double-click <code>index.html</code> if you want to look at the site first.
            </span>
          </li>
          <li>
            <span>
              Open{" "}
              <a href="https://app.netlify.com/drop" target="_blank" rel="noreferrer">
                Netlify Drop
              </a>{" "}
              and drag the whole folder onto the page. Your site is live in a few seconds.
            </span>
          </li>
          <li>
            <span>
              Sign up for free there to keep it and name it, such as <code>{slugOf(siteName(p))}.netlify.app</code>. Your own domain goes under <b>Domain management</b>.
            </span>
          </li>
          <li>
            <span>
              To update it, change things here, download again and drag the new folder onto your site&apos;s <b>Deploys</b> page.
            </span>
          </li>
        </ol>
        <p className="small muted" style={{ marginTop: 12 }}>
          Cloudflare Pages, GitHub Pages or your own hosting work the same way: upload what is inside the folder.
        </p>
      </section>

      <details className="sp-card disclosure">
        <summary>For developers: the React source</summary>
        <p className="small muted" style={{ margin: "10px 0 12px" }}>
          The same site as a Vite and React project. Every word, colour and setting lives in <code>src/site-data.json</code>.
        </p>
        <button type="button" className="btn btn-sm" onClick={() => download("source")} disabled={!!busy} aria-busy={busy === "source"}>
          <Icon name="code" size={15} />
          {busy === "source" ? "Packing the project…" : "Download React project (.zip)"}
        </button>
        <ol className="howto" style={{ marginTop: 12 }}>
          <li>
            <span>
              Unzip it, create a repository called <code>{repo}</code> on{" "}
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
              , choose <b>Import</b> next to <code>{repo}</code>, then <b>Deploy</b>.
            </span>
          </li>
          <li>
            <span>
              To run it yourself: <code>npm install</code>, then <code>npm run dev</code>.
            </span>
          </li>
        </ol>
      </details>
    </div>
  );
}
