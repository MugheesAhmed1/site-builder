"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { getSettings, saveSettings, type Settings } from "@/lib/store";

export default function Topbar({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<Settings>({ apiKey: "", accessCode: "" });
  useEffect(() => setS(getSettings()), [open]);
  return (
    <>
      <header className="topbar">
        <Link href="/" className="logo">
          <span className="logo-mark" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 20V4h7a5 5 0 0 1 0 10H7" />
            </svg>
          </span>
          Portfolio Builder
        </Link>
        <div className="row">
          {children}
          <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
            <Icon name="settings" size={16} />
            Settings
          </button>
        </div>
      </header>
      {open && (
        <div className="modal-bg" onClick={() => setOpen(false)} onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
          <div className="modal stack" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="settings-title">Settings</h2>
            <p className="muted small">
              You only need these if whoever set up this builder asked you to add them. Both stay in this browser.
            </p>
            <div>
              <label className="lbl">Your Anthropic API key (optional)</label>
              <input autoFocus type="password" value={s.apiKey} placeholder="sk-ant-..." onChange={(e) => setS({ ...s, apiKey: e.target.value })} />
              <p className="small muted" style={{ marginTop: 6 }}>Used instead of the server&apos;s key. Create one at console.anthropic.com.</p>
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
                Save settings
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
