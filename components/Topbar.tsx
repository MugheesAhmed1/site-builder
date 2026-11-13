"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { STORAGE_EVENT } from "@/lib/store";

// Shown once when the browser refuses to save (storage full or blocked), and cleared when
// saving works again.
export function StorageNotice() {
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

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="logo">
      <span className="logo-mark" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 19 12 5l7 14M8.5 13h7" />
        </svg>
      </span>
      Site Builder
    </Link>
  );
}

// The app's top bar (Your sites, the document intake and other inner pages). The home page
// has its own floating menu and the studio has its own bar.
export default function Topbar({ children }: { children?: React.ReactNode }) {
  const path = usePathname();
  return (
    <>
      <header className="topbar">
        <div className="row" style={{ gap: 22 }}>
          <Logo />
          <nav className="topbar-nav" aria-label="Main">
            <Link href="/sites" aria-current={path === "/sites" ? "page" : undefined}>
              Your sites
            </Link>
            <Link href="/#scenes">Scenes</Link>
            <Link href="/#how">How it works</Link>
          </nav>
        </div>
        <div className="row">
          {children}
          <ThemeToggle />
          <Link href="/#start" className="btn btn-primary btn-sm">
            New site
          </Link>
        </div>
      </header>
      <StorageNotice />
    </>
  );
}
