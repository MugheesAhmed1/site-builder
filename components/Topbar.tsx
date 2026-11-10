"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSettings, saveSettings, type Settings } from "@/lib/store";

export default function Topbar({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<Settings>({ apiKey: "", accessCode: "" });
  useEffect(() => setS(getSettings()), [open]);
  return (
    <>
      <header className="topbar">
        <Link href="/" className="logo">
          <span className="logo-mark">◆</span> Portfolio Builder
        </Link>
        <div className="row">
          {children}
          <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
            Settings
          </button>
        </div>
      </header>
      {open && (
        <div className="modal-bg" onClick={() => setOpen(false)}>
          <div className="modal stack" onClick={(e) => e.stopPropagation()}>
            <h2>Settings</h2>
            <p className="muted small">
              Only needed if the person who set up this builder asked you to add them. Both stay in this browser.
            </p>
            <div>
              <label className="lbl">Your Anthropic API key (optional)</label>
              <input type="password" value={s.apiKey} placeholder="sk-ant-..." onChange={(e) => setS({ ...s, apiKey: e.target.value })} />
              <div className="small muted">Used instead of the server's key. Get one at console.anthropic.com.</div>
            </div>
            <div>
              <label className="lbl">Access code (optional)</label>
              <input type="password" value={s.accessCode} onChange={(e) => setS({ ...s, accessCode: e.target.value })} />
            </div>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  saveSettings(s);
                  setOpen(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
