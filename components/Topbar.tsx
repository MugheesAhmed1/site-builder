"use client";

import Link from "next/link";

export default function Topbar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="topbar">
      <Link href="/" className="logo">
        <span className="logo-mark" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 19 12 5l7 14M8.5 13h7" />
          </svg>
        </span>
        Site Builder
      </Link>
      <div className="row">
        {children}
        <span className="badge badge-approved" title="Everything runs in this browser. Nothing is uploaded.">Works offline, no AI</span>
      </div>
    </header>
  );
}
