import { useEffect, useRef, useState } from "react";
import { atmosById } from "./catalog.js";
import { atmosStill, mountAtmos } from "./engine.js";
import "./atmos.css";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// What the intensity dial (1 to 10) does to an atmosphere.
//   1-2  a still frame: the look without the motion
//   3-4  slow drift
//   5-7  full motion, follows the pointer, focus-pull on scroll
//   8-10 denser, faster, deeper scroll moves
export function atmosLevel(intensity) {
  const n = Math.max(1, Math.min(10, Math.round(Number(intensity) || 7)));
  return { n, still: n <= 2, amount: Math.min(1, 0.25 + (n - 1) * 0.085), pointer: n >= 5, focus: n >= 4 };
}

/** The living background on its own: a canvas that fills its parent. */
export function Atmosphere({ id, accent, intensity = 7, host, className = "", still: forceStill }) {
  const ref = useRef(null);
  const ctl = useRef(null);
  const lv = atmosLevel(intensity);
  const meta = atmosById(id);
  const still = !!forceStill || lv.still || reducedMotion();
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const m = mountAtmos(c, { id: meta.id, accent, amount: lv.amount, still, noPointer: !lv.pointer, host: host && host.current });
    ctl.current = m;
    if (!m) c.parentElement && c.parentElement.classList.add("at-nogl");
    return () => {
      if (m) m.destroy();
      ctl.current = null;
    };
    // A new canvas only when the renderer itself must change; everything else is an update.
  }, []);
  useEffect(() => {
    if (ctl.current) ctl.current.update({ id: meta.id, accent, amount: lv.amount, still, noPointer: !lv.pointer });
  }, [meta.id, accent, lv.amount, still, lv.pointer]);
  const [a, b, c] = meta.swatch;
  return (
    <div className={"at-stage " + className} data-atmos={meta.id} style={{ "--at-a": a, "--at-b": b, "--at-c": c }} aria-hidden="true">
      <canvas ref={ref} className="at-canvas" />
      <div className="at-grain" />
    </div>
  );
}

// Focus-pull: as the opening scrolls away, the background softens and pushes in and the words
// rise and fade. Written to CSS variables, read by atmos.css.
function useFocusPull(ref, on) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !on || reducedMotion()) return;
    const scroller = el.closest("[data-scroll-root]");
    const target = scroller || window;
    let raf = 0;
    const read = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const top = scroller ? r.top - scroller.getBoundingClientRect().top : r.top;
      const s = Math.max(0, Math.min(1, -top / Math.max(1, r.height)));
      el.style.setProperty("--at-s", s.toFixed(4));
    };
    const on2 = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    target.addEventListener("scroll", on2, { passive: true });
    window.addEventListener("resize", on2);
    return () => {
      cancelAnimationFrame(raf);
      target.removeEventListener("scroll", on2);
      window.removeEventListener("resize", on2);
    };
  }, [ref, on]);
}

/**
 * A full opening built on an atmosphere: the living background, grain and vignette, the words
 * centred over it (or low, high, in a glass panel, or under a giant debossed word), a stats row
 * along the foot and a scroll cue. Children are the badge, headline, sub line and buttons.
 */
export function AtmosHero({ id, accent, intensity = 7, layout, wordmark, stats = [], cue = "Scroll to explore", still, className = "", children, sectionId, extra }) {
  const ref = useRef(null);
  const meta = atmosById(id);
  const lv = atmosLevel(intensity);
  const lay = layout || meta.layout;
  useFocusPull(ref, lv.focus && !still);
  const shown = stats.filter((s) => s && s.value).slice(0, 4);
  return (
    <section ref={ref} id={sectionId} className={`at-hero at-tone-${meta.tone} at-lay-${lay} ${className}`} data-atmos={meta.id}>
      <Atmosphere id={meta.id} accent={accent} intensity={intensity} host={ref} still={still} />
      <div className="at-vignette" aria-hidden="true" />
      {lay === "wordmark" && wordmark && (
        <div className="at-wordmark" aria-hidden="true">
          {wordmark}
        </div>
      )}
      <div className="at-content">{lay === "panel" ? <div className="at-panel">{children}</div> : children}</div>
      {extra}
      {shown.length > 0 && (
        <dl className="at-stats">
          {shown.map((s, i) => (
            <div key={i}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {cue && (
        <div className="at-cue" aria-hidden="true">
          <span>{cue}</span>
          <i />
        </div>
      )}
    </section>
  );
}

/** A picture of an atmosphere for pickers, drawn once by a shared renderer. */
export function AtmosThumb({ id, accent, className = "" }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let alive = true;
    const run = () => alive && setSrc(atmosStill(id, accent));
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 30));
    idle(run);
    return () => {
      alive = false;
    };
  }, [id, accent]);
  const [a, b, c] = atmosById(id).swatch;
  return (
    <span className={"at-thumb " + className} style={{ background: `radial-gradient(120% 90% at 30% 20%, ${b}55, transparent 60%), linear-gradient(160deg, ${a}, ${c}33)` }}>
      {src && <img src={src} alt="" loading="lazy" />}
    </span>
  );
}
