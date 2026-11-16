"use client";

import { useInView } from "motion/react";
import { useEffect, useRef } from "react";
import type { Swatch } from "@/components/home/HowDemos";
import { fontsHref } from "@/lib/designs";

// A wall of real design systems from the library, each set in its own typefaces. The
// fonts load only when the wall comes near the screen.
export default function DesignWall({ designs }: { designs: Swatch[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const near = useInView(ref, { once: true, margin: "400px 0px" });
  useEffect(() => {
    if (!near || document.getElementById("wall-fonts")) return;
    const l = document.createElement("link");
    l.id = "wall-fonts";
    l.rel = "stylesheet";
    l.href = fontsHref(Array.from(new Set(designs.flatMap((d) => [d.display, d.body]))));
    document.head.appendChild(l);
  }, [near, designs]);
  return (
    <ul className="wall" ref={ref}>
      {designs.map((d) => {
        const bg = d.bg;
        const fg = d.text;
        const r = Math.min(d.radius, 18);
        return (
          <li key={d.id} className="wall-card" style={{ background: bg, color: fg, borderRadius: r + 8 }}>
            <span className="wall-meta mono">
              {d.id} · {d.dark ? "dark" : "light"}
            </span>
            <span className="wall-name" style={{ fontFamily: `"${d.display}", var(--font-display)` }}>
              {d.preset}
            </span>
            <span className="wall-body" style={{ fontFamily: `"${d.body}", var(--font-ui)` }}>
              {d.display} with {d.body}
            </span>
            <span className="wall-row">
              <span className="wall-btn" style={{ background: d.accent, color: d.onAccent, borderRadius: r, fontFamily: `"${d.body}", var(--font-ui)` }}>
                Get started
              </span>
              <span className="wall-dot" style={{ background: d.accent }} />
              <span className="wall-dot" style={{ background: fg, opacity: 0.85 }} />
              <span className="wall-dot" style={{ background: fg, opacity: 0.25 }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
