"use client";

import { useEffect } from "react";

// Shown when a page crashes. Projects live in this browser's storage, so they are safe:
// the person can retry, go home, or save a backup before doing anything else.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const backup = () => {
    try {
      const raw = localStorage.getItem("sb.projects.v2") || "[]";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
      a.download = "site-builder-backup.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch {
      /* storage is not readable; nothing to save */
    }
  };

  return (
    <main className="page" style={{ paddingTop: 64 }}>
      <div role="alert">
        <h1>Something went wrong on this page</h1>
        <p className="muted" style={{ marginTop: 10 }}>
          Your sites are still saved in this browser. Try again, or save a backup first to be safe.
        </p>
        <div className="row wrap" style={{ marginTop: 20 }}>
          <button className="btn btn-primary" onClick={reset}>
            Try again
          </button>
          <button className="btn" onClick={backup}>
            Save a backup
          </button>
          <a className="btn btn-ghost" href="/">
            Go to the start
          </a>
        </div>
      </div>
    </main>
  );
}
