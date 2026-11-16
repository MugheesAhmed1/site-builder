import { useLayoutEffect } from "react";

// Section flow: how each section arrives as it scrolls into view, and the small scroll-linked
// details inside it. One passive scroll listener measures every section once per frame and
// writes two numbers to it: --sp (0 when the section's top is at the bottom of the screen,
// 1 once it has risen a quarter of the way up) and --sx (how far the next section has
// covered it, for the stacking style). The look of each style lives in flow.css, so the
// numbers are all the script has to provide. Without the script (or with reduced motion)
// both stay at their resting values and every section is simply there.

const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

// Sections that pin or scrub their own content keep their own motion: moving them would
// fight their sticky layout.
function hasSticky(el) {
  const all = el.querySelectorAll("*");
  const n = Math.min(all.length, 600);
  for (let i = 0; i < n; i++) if (!all[i].classList.contains("pf-split-head") && getComputedStyle(all[i]).position === "sticky") return true;
  return false;
}

export function sectionFx(design) {
  if (!design || design.motion === "none" || design.anim === "M-000") return "none";
  return design.sectionFx || "rise";
}

export function useSectionFlow(rootRef, key, design, editing) {
  const fx = sectionFx(design);
  const extras = fx !== "none" || (design && design.motion !== "none" && design.anim !== "M-000") ? design.scrollFx !== false : false;
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === "undefined") return;
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const off = editing || reduced || (fx === "none" && !extras);
    root.setAttribute("data-flow", off ? "off" : "on");
    root.setAttribute("data-sfx", off ? "none" : fx);
    root.setAttribute("data-sxtra", !off && extras ? "on" : "off");
    const sections = Array.from(root.querySelectorAll(":scope > section:not(#pf-top), :scope > .pf-band, :scope > footer"));
    const clear = () =>
      sections.forEach((s) => {
        s.classList.remove("pf-flow");
        s.style.removeProperty("--sp");
        s.style.removeProperty("--sx");
        s.style.removeProperty("--stick");
        s.style.removeProperty("--side");
      });
    if (off) {
      clear();
      return;
    }
    const scroller = root.closest("[data-scroll-root]");
    const target = scroller || window;
    const flows = sections.filter((s) => !hasSticky(s));
    flows.forEach((s, i) => {
      s.classList.add("pf-flow");
      s.style.setProperty("--side", i % 2 ? "-1" : "1");
      s.querySelectorAll(".pf-card, .pf-stat, .ws-member, .pf-process-row, .pf-index-row, .ws-menu-row, .pf-custom-item").forEach((c, j) => c.style.setProperty("--ci", String((j % 4) + 1)));
    });
    let raf = 0;
    const measure = () => {
      raf = 0;
      const vh = scroller ? scroller.clientHeight : window.innerHeight;
      const top0 = scroller ? scroller.getBoundingClientRect().top : 0;
      const rects = flows.map((s) => s.getBoundingClientRect());
      flows.forEach((s, i) => {
        const r = rects[i];
        const top = r.top - top0;
        const sp = easeOut(clamp((vh - top) / (vh * 0.75)));
        s.style.setProperty("--sp", sp.toFixed(3));
        if (fx === "stack") {
          s.style.setProperty("--stick", Math.min(0, Math.round(vh - r.height)) + "px");
          const next = rects[i + 1];
          const sx = next ? clamp(1 - (next.top - top0) / vh) : 0;
          s.style.setProperty("--sx", sx.toFixed(3));
        }
      });
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    target.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      target.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      clear();
    };
  }, [rootRef, key, fx, extras, editing]);
}
