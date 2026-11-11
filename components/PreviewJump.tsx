"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";

// On narrow screens the live preview sits below the options, so a change is easy to miss.
// This floating button jumps to the preview and back to where the person was.
export default function PreviewJump({ step }: { step: string }) {
  const [has, setHas] = useState(false);
  const [inView, setInView] = useState(false);
  const [back, setBack] = useState<number | null>(null);

  useEffect(() => {
    setHas(false);
    setInView(false);
    setBack(null);
    let io: IntersectionObserver | null = null;
    let tries = 0;
    // The preview mounts a moment after the step changes (the step fades in), so look for it
    // a few times instead of once.
    const look = () => {
      const el = document.querySelector(".sticky-preview");
      if (!el) {
        if (++tries < 30) timer = window.setTimeout(look, 150);
        return;
      }
      setHas(true);
      if (typeof IntersectionObserver === "undefined") return;
      io = new IntersectionObserver(([e]) => setInView(e.isIntersecting && e.intersectionRatio > 0.25), { threshold: [0, 0.25, 0.5] });
      io.observe(el);
    };
    let timer = window.setTimeout(look, 0);
    return () => {
      window.clearTimeout(timer);
      io?.disconnect();
    };
  }, [step]);

  if (!has) return null;
  const smooth: ScrollBehavior = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  const toPreview = () => {
    const el = document.querySelector(".sticky-preview");
    if (!el) return;
    setBack(window.scrollY);
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120, behavior: smooth });
  };
  const toOptions = () => {
    window.scrollTo({ top: back ?? 0, behavior: smooth });
    setBack(null);
  };
  return (
    <button type="button" className="btn btn-primary preview-jump" onClick={inView ? toOptions : toPreview}>
      <Icon name={inView ? "arrow" : "eye"} size={16} />
      {inView ? "Back to options" : "See preview"}
    </button>
  );
}
