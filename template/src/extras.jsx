import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";

// Optional touches, each one a technique seen on award-winning studio sites, rebuilt from
// scratch: an opening counter with a curtain wipe, buttons that lean toward the pointer,
// and a soft custom cursor. All are skipped for reduced motion and touch screens
// (except the intro, which becomes a short fade).

function finePointer() {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function Intro({ label, preview }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (reduce) {
      const t = setTimeout(() => setDone(true), 300);
      return () => clearTimeout(t);
    }
    const start = performance.now();
    const len = preview ? 900 : 1300;
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / len);
      setN(Math.round((1 - Math.pow(1 - p, 3)) * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => setDone(true), 120);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce, preview]);
  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className={"px-intro" + (preview ? " is-preview" : "")}
          aria-hidden="true"
          initial={{ clipPath: "inset(0% 0% 0% 0%)" }}
          exit={reduce ? { opacity: 0 } : { clipPath: "inset(0% 0% 100% 0%)" }}
          transition={{ duration: 0.7, ease: [0.77, 0, 0.175, 1] }}
        >
          <span className="px-intro-name">{label}</span>
          <span className="px-intro-count pf-mono">{String(n).padStart(3, "0")}</span>
          <span className="px-intro-bar">
            <i style={{ transform: `scaleX(${n / 100})` }} />
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Cursor({ rootRef }) {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const rx = useSpring(x, { stiffness: 380, damping: 32 });
  const ry = useSpring(y, { stiffness: 380, damping: 32 });
  const [big, setBig] = useState(false);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.classList.add("px-has-cursor");
    const move = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setShown(true);
      setBig(!!e.target.closest("a, button, .pf-card, .cw"));
    };
    const leave = () => setShown(false);
    root.addEventListener("pointermove", move, { passive: true });
    root.addEventListener("pointerleave", leave);
    return () => {
      root.classList.remove("px-has-cursor");
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", leave);
    };
  }, [rootRef, x, y]);
  return (
    <>
      <motion.span className="px-cursor-dot" style={{ x, y, opacity: shown ? 1 : 0 }} aria-hidden="true" />
      <motion.span className={"px-cursor-ring" + (big ? " is-big" : "")} style={{ x: rx, y: ry, opacity: shown ? 1 : 0 }} aria-hidden="true" />
    </>
  );
}

function useMagnetic(rootRef, on) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !on) return;
    let last = null;
    const reset = (el) => {
      el.style.translate = "";
      el.classList.remove("px-mag-on");
    };
    const move = (e) => {
      const el = e.target.closest(".pf-btn, .pf-icon-btn");
      if (last && last !== el) reset(last);
      last = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      el.classList.add("px-mag-on");
      el.style.translate = `${(dx * 10).toFixed(1)}px ${(dy * 8).toFixed(1)}px`;
    };
    const leave = () => last && reset(last);
    root.addEventListener("pointermove", move, { passive: true });
    root.addEventListener("pointerleave", leave);
    return () => {
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", leave);
      if (last) reset(last);
    };
  }, [rootRef, on]);
}

// Cards and widget tiles tilt toward the pointer in 3D, using the separate rotate property
// so it never fights the entrance or hover transforms.
function useTilt(rootRef, on) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !on) return;
    let last = null;
    const reset = (el) => {
      el.style.rotate = "";
      el.style.transition = "";
    };
    const move = (e) => {
      const el = e.target.closest("[data-tilt], .pf-card, .cs-wall-item");
      if (last && last !== el) reset(last);
      last = el;
      if (!el) return;
      if (el.parentElement && !el.parentElement.style.perspective) el.parentElement.style.perspective = "1000px";
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      const ang = Math.min(1, Math.hypot(dx, dy) * 1.6) * 7;
      el.style.transition = "rotate 0.15s cubic-bezier(0.23, 1, 0.32, 1)";
      el.style.rotate = `${(-dy).toFixed(3)} ${dx.toFixed(3)} 0 ${ang.toFixed(2)}deg`;
    };
    const leave = () => last && reset(last);
    root.addEventListener("pointermove", move, { passive: true });
    root.addEventListener("pointerleave", leave);
    return () => {
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", leave);
      if (last) reset(last);
    };
  }, [rootRef, on]);
}

export function Extras({ rootRef, design, label, preview }) {
  const reduce = useReducedMotion();
  const [fine, setFine] = useState(false);
  useEffect(() => setFine(finePointer()), []);
  useMagnetic(rootRef, !!design.magnetic && fine && !reduce);
  useTilt(rootRef, design.tilt !== false && fine && !reduce);
  return (
    <>
      {design.intro && <Intro label={label} preview={preview} />}
      {design.cursor && fine && !reduce && <Cursor rootRef={rootRef} />}
    </>
  );
}
