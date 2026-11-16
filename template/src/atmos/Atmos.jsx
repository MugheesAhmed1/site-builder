import { useEffect, useRef, useState } from "react";
import { atmosById, posterOf, thumbOf } from "./catalog.js";
import { mountAtmos, noGpu } from "./engine.js";
import { mountPaper } from "./paper-mount.js";
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

const BLEND_OUT = 420; // ms: the old scene sinks into its flat colour
const BLEND_HOLD = 140; // ms: the flat colour turns into the next scene's
const BLEND_IN = 900; // ms: the next scene rises out of it

/**
 * The living background on its own: fills its parent. Changing the scene blends the old one
 * out into its flat colour, morphs that colour into the new scene's, and blends the new one in.
 * The first scene rises out of its flat colour the same way once it has drawn.
 */
export function Atmosphere({ id, accent, intensity = 7, host, className = "", still: forceStill, tint = "scene" }) {
  const canvasRef = useRef(null);
  const paperRef = useRef(null);
  const flatRef = useRef(null);
  const gl = useRef(null); // the WebGL renderer (plates, signature, okaybabe)
  const pp = useRef(null); // the Paper renderer
  const lv = atmosLevel(intensity);
  const want = atmosById(id);
  const [shown, setShown] = useState(want.id);
  const meta = atmosById(shown);
  const still = !!forceStill || lv.still || reducedMotion();
  const live = useRef({});
  live.current = { accent, amount: lv.amount, still, noPointer: !lv.pointer, tint: tint === "brand" ? accent : "" };
  const [ready, setReady] = useState(false);
  const [nogl, setNogl] = useState(false);

  const cover = (on, ms, colour) => {
    const f = flatRef.current;
    if (!f) return;
    f.style.transitionDuration = ms + "ms, " + BLEND_HOLD + "ms";
    if (colour) f.style.backgroundColor = colour;
    f.style.opacity = on ? "1" : "0";
  };

  // Mount or switch the renderer for the scene being shown.
  useEffect(() => {
    let alive = true;
    const m = atmosById(shown);
    const reveal = () => alive && requestAnimationFrame(() => alive && setReady(true));
    setReady(false);
    // No graphics card: the scene's still picture on a plain 2D canvas, with a slow CSS drift.
    // It costs the page almost nothing, and a canvas never counts as its largest paint.
    if (noGpu()) {
      const box = canvasRef.current;
      if (!box) return;
      box.querySelectorAll("canvas").forEach((x) => x.remove());
      box.style.visibility = "visible";
      const c = document.createElement("canvas");
      c.className = "at-canvas at-poster";
      box.appendChild(c);
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        if (!alive) return;
        const r = box.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        c.width = Math.max(2, Math.round(r.width * dpr));
        c.height = Math.max(2, Math.round(r.height * dpr));
        const k = Math.max(c.width / img.naturalWidth, c.height / img.naturalHeight);
        const w = img.naturalWidth * k, h = img.naturalHeight * k;
        c.getContext("2d").drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
        reveal();
      };
      img.onerror = () => alive && reveal();
      img.src = posterOf(m.id);
      return () => {
        alive = false;
      };
    }
    if (m.family === "paper") {
      if (gl.current) {
        gl.current.destroy();
        gl.current = null;
      }
      const go = pp.current ? pp.current.update({ def: m.paper, ...live.current }).then(() => pp.current) : mountPaper(paperRef.current, { def: m.paper, ...live.current });
      Promise.resolve(go).then((r) => {
        if (!alive) {
          if (r && r !== pp.current) r.destroy();
          return;
        }
        if (!r) setNogl(true);
        pp.current = r;
        setTimeout(reveal, 60);
      });
    } else {
      if (pp.current) {
        pp.current.destroy();
        pp.current = null;
        paperRef.current && paperRef.current.querySelectorAll("canvas").forEach((c) => c.remove());
      }
      const opts = { id: m.id, ...live.current, host: host && host.current, onReady: reveal };
      if (gl.current) {
        gl.current.update(opts);
      } else {
        // A fresh canvas every time: a canvas that handed its context back cannot draw again.
        const box = canvasRef.current;
        let c = null;
        if (box) {
          box.querySelectorAll("canvas").forEach((x) => x.remove());
          c = document.createElement("canvas");
          c.className = "at-canvas";
          box.appendChild(c);
        }
        gl.current = c ? mountAtmos(c, opts) : null;
        if (!gl.current) setNogl(true);
      }
      if (gl.current && gl.current.ready()) setTimeout(reveal, 40);
      else if (!gl.current) reveal();
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  useEffect(
    () => () => {
      if (gl.current) gl.current.destroy();
      if (pp.current) pp.current.destroy();
      gl.current = pp.current = null;
      canvasRef.current && canvasRef.current.querySelectorAll("canvas").forEach((x) => x.remove());
      paperRef.current && paperRef.current.querySelectorAll("canvas").forEach((x) => x.remove());
    },
    []
  );

  // Settings that do not change the scene are plain updates.
  useEffect(() => {
    if (gl.current) gl.current.update(live.current);
    if (pp.current) pp.current.update(live.current);
  }, [accent, lv.amount, still, lv.pointer, tint]);

  // A new scene was asked for: blend out to the old flat colour, then swap.
  useEffect(() => {
    if (want.id === shown) return;
    const quick = reducedMotion();
    cover(true, quick ? 120 : BLEND_OUT, meta.flat);
    const t1 = setTimeout(() => {
      cover(true, quick ? 120 : BLEND_OUT, want.flat);
      const t2 = setTimeout(() => setShown(want.id), BLEND_HOLD);
      return () => clearTimeout(t2);
    }, quick ? 120 : BLEND_OUT);
    return () => clearTimeout(t1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [want.id]);

  // Drawn: rise out of the flat colour.
  useEffect(() => {
    if (ready && want.id === shown) cover(false, reducedMotion() ? 200 : BLEND_IN);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, shown]);

  return (
    <div className={"at-stage " + (nogl ? "at-nogl " : "") + className} data-atmos={meta.id} data-family={meta.family} style={{ "--at-flat": meta.flat }} aria-hidden="true">
      <div ref={canvasRef} className="at-gl" style={meta.family === "paper" ? { visibility: "hidden" } : undefined} />
      <div ref={paperRef} className="at-paper" data-paper-shader="" />
      <div ref={flatRef} className="at-flat" style={{ backgroundColor: meta.flat }} />
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
export function AtmosHero({ id, accent, intensity = 7, layout, wordmark, stats = [], cue = "Scroll to explore", still, className = "", children, sectionId, extra, tint }) {
  const ref = useRef(null);
  const meta = atmosById(id);
  const lv = atmosLevel(intensity);
  const lay = layout || meta.layout;
  useFocusPull(ref, lv.focus && !still);
  const shown = stats.filter((s) => s && s.value).slice(0, 4);
  return (
    <section ref={ref} id={sectionId} className={`at-hero at-tone-${meta.tone} at-lay-${lay} ${className}`} data-atmos={meta.id}>
      <Atmosphere id={meta.id} accent={accent} intensity={intensity} host={ref} still={still} tint={tint} />
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

/** A picture of a scene for pickers: a small pre-rendered image, over its flat colour. */
export function AtmosThumb({ id, className = "" }) {
  const m = atmosById(id);
  return (
    <span className={"at-thumb " + className} style={{ background: m.flat }}>
      <img src={thumbOf(m.id)} alt="" loading="lazy" decoding="async" width="240" height="150" />
    </span>
  );
}
