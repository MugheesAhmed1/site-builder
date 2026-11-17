"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import PromptBox from "@/components/PromptBox";

// The stage and the experience engine load after the page is usable, so the words and the
// prompt paint and respond first on phones.
const LiveStage = dynamic(() => import("./LiveStage"), { ssr: false });

// The home page's opening (PRD section 61): no static SaaS hero. Behind the words runs the
// same stage a generated site runs, and it changes concept on its own every few seconds, so
// the background itself shows several interaction concepts. Scrolling walks the current
// concept through its story; the pointer and a tap play with it.

const SHOWCASE = [
  { concept: "liquid-world", label: "Liquid world", accent: "#8B5CF6" },
  { concept: "space-voyage", label: "Space voyage", accent: "#6EA8FE" },
  { concept: "digital-playground", label: "Playground", accent: "#F472B6" },
  { concept: "mountain-journey", label: "Mountain journey", accent: "#F59E0B" },
  { concept: "kinetic-type", label: "Kinetic type", accent: "#34D399" },
];

export default function HomeHero() {
  const [i, setI] = useState(0);
  const [held, setHeld] = useState(false); // the visitor picked one: stop rotating
  const [pos, setPos] = useState(0);
  const [ready, setReady] = useState(false);
  const box = useRef<HTMLElement>(null);

  useEffect(() => {
    // Phones open on the lighter space stage (the liquid one paints every pixel) and start it
    // on the first touch or scroll, or after a few seconds, so the page stays responsive.
    const phone = window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;
    if (phone) setI(1);
    let done = false;
    const go = () => !done && ((done = true), setReady(true));
    if (phone) {
      for (const ev of ["pointerdown", "scroll", "keydown"]) window.addEventListener(ev, go, { once: true, passive: true });
      setTimeout(go, 4500);
      return;
    }
    const w = window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number };
    const later = () => (w.requestIdleCallback ? w.requestIdleCallback(go, { timeout: 2500 }) : setTimeout(go, 1200));
    if (document.readyState === "complete") later();
    else window.addEventListener("load", later, { once: true });
  }, []);

  useEffect(() => {
    if (held || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => !document.hidden && setI((n) => (n + 1) % SHOWCASE.length), 7000);
    return () => clearInterval(t);
  }, [held]);

  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const el = box.current;
      if (!el) return;
      const h = el.offsetHeight || 1;
      setPos(Math.max(0, Math.min(3, (window.scrollY / h) * 3)));
    };
    const on = () => (raf ||= requestAnimationFrame(read));
    window.addEventListener("scroll", on, { passive: true });
    return () => (window.removeEventListener("scroll", on), cancelAnimationFrame(raf));
  }, []);

  const s = SHOWCASE[i];
  return (
    <section ref={box} className="hh" aria-labelledby="hh-title">
      <div className="hh-stage" aria-hidden="true">
        {ready && <LiveStage concept={s.concept} accent={s.accent} pos={pos} labels={["Your idea", "Moves", "Reacts", "Yours"]} />}
      </div>
      <div className="hh-inner">
        <h1 id="hh-title" className="hh-title">
          Build a website that moves.
        </h1>
        <p className="hh-sub">Describe your idea. Shape the experience. Make it yours.</p>
        <div id="start" className="hh-prompt">
          <PromptBox variant="hero" controls />
        </div>
        <div className="hh-ctas">
          <a className="btn hh-ghost" href="#gallery">
            Explore experiences
          </a>
        </div>
        <div className="hh-switch" role="radiogroup" aria-label="Background concept">
          {SHOWCASE.map((x, k) => (
            <button key={x.concept} type="button" role="radio" aria-checked={k === i} className={k === i ? "is-on" : ""} onClick={() => (setI(k), setHeld(true))}>
              {x.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
