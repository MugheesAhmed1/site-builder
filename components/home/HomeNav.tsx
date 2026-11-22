"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Topbar";
import { listProjects } from "@/lib/store";

// The home page menu: a glass pill that floats over the opening and tightens once the page
// scrolls. It shows "Your sites" with a count when this browser has any. Its accent is the
// character's, like the rest of the page.
export default function HomeNav() {
  const [scrolled, setScrolled] = useState(false);
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(listProjects().length);
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={"hnav" + (scrolled ? " is-scrolled" : "")}>
      <div className="hnav-pill">
        <Logo />
        <nav className="hnav-links" aria-label="Main">
          <a href="#journey">How it works</a>
          <a href="#photo">Photo to 3D</a>
          <a href="#models">3D library</a>
          <a href="#gallery">Templates</a>
          <a href="#faq">Questions</a>
        </nav>
        <div className="hnav-end">
          <Link href="/sites" className="hnav-sites">
            Your sites
            {count > 0 && <span className="mono">{count}</span>}
          </Link>
          <a href="#start" className="btn btn-sm hnav-cta">
            Create your website
          </a>
        </div>
      </div>
    </header>
  );
}
