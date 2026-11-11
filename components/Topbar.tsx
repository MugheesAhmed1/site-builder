"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { STORAGE_EVENT } from "@/lib/store";

// Shown once when the browser refuses to save (storage full or blocked), and cleared when
// saving works again.
function StorageNotice() {
  const [off, setOff] = useState(false);
  useEffect(() => {
    const on = (e: Event) => setOff(!(e as CustomEvent<{ ok: boolean }>).detail.ok);
    window.addEventListener(STORAGE_EVENT, on);
    return () => window.removeEventListener(STORAGE_EVENT, on);
  }, []);
  if (!off) return null;
  return (
    <div className="storage-notice" role="alert">
      <b>Changes are not being saved.</b> This browser&apos;s storage is full or blocked. Keep this tab open and download your site or a backup now. Removing large pictures or old sites frees space.
    </div>
  );
}

export default function Topbar({ children }: { children?: React.ReactNode }) {
  return (
    <>
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
    <StorageNotice />
    </>
  );
}
