import { useEffect, useMemo, useRef, useState } from "react";
import { propsFor } from "./props.js";
export { propsFor };

// Showpieces: one big interactive set piece per site, the kind of moment people remember.
// - Sphere: a drag-to-spin globe of tiles with a count, circle, collapse and burst opening.
// - Arc: cards curve around a stage; whichever settles in front is scanned into place.
// - Track: a story that slides sideways while a character pushes every line out of its way.
// Plus two site-wide touches: a fog surge that hides the light and dark switch, and titles
// whose letters resolve out of random symbols. All original code; no libraries beyond React.

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const backOut = (t) => {
  const c = 1.7;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

function scrollerOf(el) {
  return el && el.closest ? el.closest("[data-scroll-root]") : null;
}

/** Runs fn every frame while the element is on screen. */
function useFrames(ref, fn, deps = []) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let on = false;
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(64, now - last) / 1000;
      last = now;
      fn(dt, now / 1000);
      if (on) raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !on) {
          on = true;
          last = performance.now();
          raf = requestAnimationFrame(loop);
        } else if (!e.isIntersecting && on) {
          on = false;
          cancelAnimationFrame(raf);
        }
      },
      { root: scrollerOf(el), rootMargin: "120px" }
    );
    io.observe(el);
    return () => {
      on = false;
      cancelAnimationFrame(raf);
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Pads a short list by repeating it, so a sphere or arc never looks sparse. */
function fill(items, min, max) {
  const src = items.filter((x) => x && (x.title || x.image));
  if (!src.length) return [];
  const out = [];
  for (let i = 0; out.length < Math.max(min, Math.min(max, src.length)); i++) out.push({ ...src[i % src.length], k: i });
  return out;
}

function Tile({ it, i, className = "", props }) {
  if (it.image) return <img className={className} src={it.image} alt="" draggable={false} loading="lazy" />;
  const prop = props && props.length ? props[i % props.length] : "";
  return (
    <div className={className + " sp-faux" + (prop ? " has-prop" : "")} style={{ "--h": i % 6 }}>
      <b>{String((i % 99) + 1).padStart(2, "0")}</b>
      {prop && <img className="sp-prop" src={prop} alt="" draggable={false} loading="lazy" />}
      <span>{it.title}</span>
    </div>
  );
}

// ------------------------------------------------------------------ sphere

export function Sphere({ items, title = "", label = "Drag to explore", props }) {
  const list = useMemo(() => fill(items, 14, 20), [items]);
  const n = list.length;
  const stage = useRef(null);
  const cards = useRef([]);
  const counter = useRef(null);
  const state = useRef(null);
  const [hover, setHover] = useState(-1);
  const [zoom, setZoom] = useState(-1);
  const [intro, setIntro] = useState(true);
  if (!state.current) {
    // Fibonacci points on a unit sphere.
    const base = list.map((_, i) => {
      const y = i * (2 / n) - 1 + 1 / n;
      const r = Math.sqrt(1 - y * y);
      const a = Math.PI * (3 - Math.sqrt(5)) * i;
      return [Math.cos(a) * r, y, Math.sin(a) * r];
    });
    state.current = { base, m: [1, 0, 0, 0, 1, 0, 0, 0, 1], vx: 0, vy: 0, auto: true, t: -1, drag: null, hover: -1, zoom: -1 };
  }

  const rotate = (m, yaw, pitch) => {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    // R = Ry(yaw) * Rx(pitch) * m, about world axes.
    const r = [cy, sy * sp, sy * cp, 0, cp, -sp, -sy, cy * sp, cy * cp];
    const o = new Array(9);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[i * 3 + j] = r[i * 3] * m[j] + r[i * 3 + 1] * m[3 + j] + r[i * 3 + 2] * m[6 + j];
    return o;
  };

  useFrames(
    stage,
    (dt) => {
      const st = state.current;
      const el = stage.current;
      if (!el) return;
      const W = el.clientWidth;
      const H = el.clientHeight;
      const R = W < 640 ? Math.min(W / 2 - 50, H * 0.36) : Math.min(H * 0.42, W * 0.3);
      const plane = W < 640 ? Math.max(58, R * 0.4) : clamp(R * 0.4, 72, 132);
      const f = R * 3.2;
      const k = dt * 60;
      if (st.t < 0) st.t = reduced() ? 9 : 0;
      st.t += dt;
      const t = st.t;
      if (!st.drag) {
        st.m = rotate(st.m, st.vx * k + (st.auto ? 0.0035 * k : 0), st.vy * k + (st.auto ? 0.0011 * k : 0));
        st.vx *= Math.pow(0.94, k);
        st.vy *= Math.pow(0.94, k);
      }
      const m = st.m;
      const introDone = t > 4.6;
      if (introDone && intro) setIntro(false);
      if (counter.current) {
        const c = Math.round(clamp(t / 1.6) * 100);
        counter.current.textContent = String(c).padStart(3, "0");
        counter.current.style.opacity = String(1 - clamp((t - 2.3) / 0.4));
      }
      const zoomed = st.zoom;
      for (let i = 0; i < n; i++) {
        const node = cards.current[i];
        if (!node) continue;
        const b = st.base[i];
        const x = m[0] * b[0] + m[1] * b[1] + m[2] * b[2];
        const y = m[3] * b[0] + m[4] * b[1] + m[5] * b[2];
        const z = m[6] * b[0] + m[7] * b[1] + m[8] * b[2];
        let s = f / (f - z * R);
        let px = x * R * s;
        let py = y * R * s;
        let op = 0.28 + 0.72 * ((z + 1) / 2);
        let sc = s;
        if (!introDone) {
          // Opening: tiles on a spinning circle, collapse into a stack, then burst to the sphere.
          const lead = i < 10;
          const ang = -Math.PI / 2 + (i % 10) * ((Math.PI * 2) / 10) + t * 0.5 + Math.pow(Math.max(0, t - 1.3), 2) * 2.6;
          const cr = Math.min(W, H) * 0.3;
          let ix = lead ? Math.cos(ang) * cr : 0;
          let iy = lead ? Math.sin(ang) * cr : 0;
          let isc = lead ? 0.01 + 0.99 * backOut(clamp((t - 0.25 - i * 0.08) / 0.7)) : 0.01;
          let iop = lead ? clamp((t - 0.2 - i * 0.08) / 0.5) : 0;
          const col = easeInOut(clamp((t - 2.5 - i * 0.03) / 1.0));
          ix = mix(ix, 0, col);
          iy = mix(iy, -i * 1.5 * col, col);
          isc = mix(isc, 1.25, col);
          const ex = easeOut3(clamp((t - 3.55) / 1.0));
          const over = 1 + 0.1 * Math.sin(Math.PI * ex);
          px = mix(ix, px * over, ex);
          py = mix(iy, py * over, ex);
          sc = mix(isc, s, ex);
          op = mix(iop, op, ex);
        }
        if (zoomed >= 0 && zoomed !== i) {
          px *= 1.6;
          py *= 1.6;
          op *= 0.12;
        }
        node.style.transform = `translate3d(${(px - plane / 2).toFixed(1)}px, ${(py - plane / 2).toFixed(1)}px, 0) scale(${sc.toFixed(3)})`;
        node.style.opacity = zoomed === i ? "0" : op.toFixed(3);
        node.style.zIndex = String(Math.round(z * 100) + 200);
        node.style.width = node.style.height = plane + "px";
      }
    },
    [n, intro]
  );

  // Drag to spin with inertia; a short press on a tile opens it.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const st = state.current;
    const down = (e) => {
      if (e.button > 0 || st.zoom >= 0) return;
      st.drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, path: 0, id: e.pointerId };
      st.auto = false;
      el.classList.add("is-grabbing");
    };
    const move = (e) => {
      const d = st.drag;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      d.path += Math.abs(dx) + Math.abs(dy);
      d.x = e.clientX;
      d.y = e.clientY;
      st.vx = clamp(dx * 0.0045, -0.12, 0.12);
      st.vy = clamp(-dy * 0.0045, -0.12, 0.12);
      st.m = rotate(st.m, st.vx, st.vy);
    };
    const up = (e) => {
      const d = st.drag;
      if (!d || d.id !== e.pointerId) return;
      st.drag = null;
      el.classList.remove("is-grabbing");
      if (d.path < 10) {
        const hit = e.target.closest && e.target.closest(".sp-card");
        if (hit) open(Number(hit.dataset.i));
      }
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = (i) => {
    state.current.zoom = i;
    state.current.auto = false;
    setZoom(i);
  };
  const close = () => {
    state.current.zoom = -1;
    setZoom(-1);
  };
  useEffect(() => {
    if (zoom < 0) return;
    const k = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [zoom]);

  if (!n) return null;
  const cap = zoom >= 0 ? -1 : hover;
  const z = zoom >= 0 ? list[zoom] : null;
  return (
    <section className="pf-section sp-sphere-sec" aria-label={title || "Work"}>
      {title && (
        <div className="pf-container">
          <h2 className="pf-h2 sp-title">{title}</h2>
        </div>
      )}
      <div ref={stage} className={"sp-sphere" + (zoom >= 0 ? " is-zoom" : "") + (intro ? " is-intro" : "")}>
        <span ref={counter} className="sp-count pf-mono" aria-hidden="true">
          000
        </span>
        {list.map((it, i) => (
          <button
            key={i}
            type="button"
            className="sp-card"
            data-i={i}
            ref={(el) => (cards.current[i] = el)}
            aria-label={"Open " + (it.title || "item " + (i + 1))}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover((h) => (h === i ? -1 : h))}
            onFocus={() => setHover(i)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), open(i))}
          >
            <Tile it={it} i={i} className="sp-media" props={props} />
          </button>
        ))}
        <p className="sp-cap" aria-live="polite">
          {cap >= 0 ? (
            <span key={cap} className="sp-cap-in">
              <b>{list[cap].title}</b> {list[cap].note && <em>{list[cap].note}</em>}
            </span>
          ) : (
            <span key="hint" className="sp-cap-in sp-hint pf-mono">
              {label}
            </span>
          )}
        </p>
        {z && (
          <div className="sp-zoom" role="dialog" aria-label={z.title} onClick={(e) => e.target === e.currentTarget && close()}>
            <div className="sp-zoom-card">
              <Tile it={z} i={zoom} className="sp-zoom-media" props={props} />
              <div className="sp-zoom-text">
                <b>{z.title}</b>
                {z.note && <p>{z.note}</p>}
              </div>
              <button type="button" className="sp-close" onClick={close} aria-label="Close">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ arc

const XS = [0, 0.215, 0.345, 0.432, 0.49, 0.52];
const XS_PHONE = [0, 0.36, 0.5, 0.56, 0.6, 0.62];
const xAt = (tab, a) => {
  const i = Math.min(tab.length - 2, Math.floor(a));
  return mix(tab[i], tab[i + 1], clamp(a - i));
};

export function Arc({ items, title = "", action = "View", props }) {
  const real = useMemo(() => items.filter((x) => x && (x.title || x.image)).slice(0, 12), [items]);
  const L = real.length < 3 ? 0 : Math.max(10, real.length * 2);
  const list = useMemo(() => Array.from({ length: L }, (_, i) => ({ ...real[i % real.length], r: i % real.length })), [real, L]);
  const stage = useRef(null);
  const cards = useRef([]);
  const st = useRef({ pos: 0, target: 0, intro: reduced() ? 1 : 0, sx: 0, sy: 0, tx: 0, ty: 0, drag: null, shown: -1 });
  const [shown, setShown] = useState(0);
  const [next, setNext] = useState(-1);
  const scanKey = useRef(0);
  const nextEl = useRef(null);
  const scanEl = useRef(null);
  const gridEl = useRef(null);

  const step = (d) => (st.current.target = Math.round(st.current.target) + d);

  useFrames(
    stage,
    (dt, time) => {
      const s = st.current;
      const el = stage.current;
      if (!el || !L) return;
      const W = el.clientWidth;
      const H = el.clientHeight;
      const k = dt * 60;
      const phone = W < 768;
      const tab = (phone ? XS_PHONE : XS).map((v) => v * W);
      if (!s.drag) s.pos += (s.target - s.pos) * (reduced() ? 1 : 1 - Math.pow(1 - 0.11, k));
      s.intro = Math.min(1, s.intro + 0.012 * k);
      const ie = 1 - Math.pow(1 - s.intro, 3);
      s.sx += (s.tx - s.sx) * 0.06 * k;
      s.sy += (s.ty - s.sy) * 0.06 * k;
      el.style.setProperty("--sx", s.sx.toFixed(3));
      el.style.setProperty("--sy", s.sy.toFixed(3));
      el.style.setProperty("--ie", ie.toFixed(3));
      for (let i = 0; i < L; i++) {
        const node = cards.current[i];
        if (!node) continue;
        const u = ((((i - s.pos + L / 2) % L) + L) % L) - L / 2;
        const a = Math.abs(u);
        const sg = Math.sign(u);
        const x = sg * xAt(tab, Math.min(a, 5)) * ie;
        let sc, z, op, ry, blur = 0;
        if (a < 1) {
          sc = 0.55 + 0.45 * a;
          z = -260 * (1 - a);
          op = a;
          ry = -sg * 16 * a;
        } else {
          sc = 1 / (1 + 0.3 * Math.pow(a - 1, 1.15));
          z = -110 * (a - 1);
          op = 1;
          ry = -sg * (16 + 9 * Math.min(2, a - 1));
          blur = Math.max(0, a - 1.6) * 2.4;
        }
        if (a > 3.4) op = 1 - (a - 3.4) / 0.8;
        op = clamp(op) * ie;
        const bob = reduced() ? 0 : Math.sin(time * 1.1 + i * 1.7) * H * 0.006 * Math.min(1, a);
        const y = bob - (1 - sc) * H * 0.04;
        ry += s.sx * 10;
        node.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) perspective(1300px) translateZ(${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) rotateX(${(-s.sy * 6).toFixed(2)}deg) scale(${(sc * (0.6 + 0.4 * ie)).toFixed(3)})`;
        node.style.opacity = op.toFixed(3);
        node.style.visibility = op < 0.01 ? "hidden" : "visible";
        node.style.zIndex = String(a < 1 ? 1 : Math.round(100 - 10 * a));
        node.style.filter = blur > 0.05 ? `blur(${blur.toFixed(1)}px)` : "";
      }
      // Settled on a new item: scan it into the stage.
      const want = ((Math.round(s.target) % real.length) + real.length) % real.length;
      if (!s.drag && Math.abs(s.target - s.pos) < 0.02 && want !== s.shown) {
        s.shown = want;
        scan(want);
      }
    },
    [L]
  );

  const scan = (i) => {
    const nx = nextEl.current;
    if (reduced() || !nx || st.current.first === undefined) {
      st.current.first = false;
      setShown(i);
      setNext(-1);
      return;
    }
    setNext(i);
    const key = ++scanKey.current;
    requestAnimationFrame(() => {
      const e = "cubic-bezier(.65,0,.35,1)";
      const a1 = nextEl.current.animate([{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)" }], { duration: 950, easing: e, fill: "forwards" });
      gridEl.current.animate([{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0 0)", offset: 0.5 }, { clipPath: "inset(100% 0 0 0)" }], { duration: 1092, easing: e, fill: "forwards" });
      scanEl.current.animate(
        [
          { top: "0%", transform: "scaleX(.2)", opacity: 0 },
          { top: "6%", transform: "scaleX(1)", opacity: 1, offset: 0.08 },
          { top: "94%", transform: "scaleX(1)", opacity: 1, offset: 0.92 },
          { top: "100%", transform: "scaleX(.2)", opacity: 0 },
        ],
        { duration: 950, easing: e, fill: "forwards" }
      );
      nextEl.current.animate([{ transform: "scale(1.012)" }, { transform: "scale(1)" }], { duration: 1250, easing: "cubic-bezier(.2,.8,.2,1)" });
      a1.finished
        .then(() => {
          if (key !== scanKey.current) return;
          setShown(i);
          setNext(-1);
        })
        .catch(() => {});
    });
  };

  // Drag, flick, keys and pointer tilt.
  useEffect(() => {
    const el = stage.current;
    if (!el || !L) return;
    const s = st.current;
    const unit = () => (el.clientWidth < 768 ? XS_PHONE : XS)[1] * el.clientWidth;
    const down = (e) => {
      if (e.button > 0) return;
      s.drag = { x0: e.clientX, p0: s.pos, last: e.clientX, lt: performance.now(), v: 0, moved: 0, id: e.pointerId };
      el.classList.add("is-grabbing");
    };
    const move = (e) => {
      const r = el.getBoundingClientRect();
      s.tx = clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5);
      s.ty = clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5);
      const d = s.drag;
      if (!d || d.id !== e.pointerId) return;
      const now = performance.now();
      d.v = (e.clientX - d.last) / Math.max(1, now - d.lt);
      d.last = e.clientX;
      d.lt = now;
      d.moved = Math.max(d.moved, Math.abs(e.clientX - d.x0));
      s.pos = d.p0 - (e.clientX - d.x0) / unit();
    };
    const up = (e) => {
      const d = s.drag;
      if (!d || d.id !== e.pointerId) return;
      s.drag = null;
      el.classList.remove("is-grabbing");
      if (d.moved < 6) {
        const hit = e.target.closest && e.target.closest(".sp-arc-card");
        if (hit) {
          const i = Number(hit.dataset.i);
          const u = ((((i - s.pos + L / 2) % L) + L) % L) - L / 2;
          s.target = Math.round(s.pos + u);
        } else s.target = Math.round(s.pos);
        return;
      }
      s.target = Math.round(s.pos - clamp(d.v, -1.2, 1.2) * 2.2);
    };
    const key = (e) => {
      if (e.key === "ArrowRight") (e.preventDefault(), step(1));
      if (e.key === "ArrowLeft") (e.preventDefault(), step(-1));
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    el.addEventListener("keydown", key);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      el.removeEventListener("keydown", key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L]);

  if (!L) return null;
  const cur = real[shown];
  const nx = next >= 0 ? real[next] : null;
  const info = nx || cur;
  return (
    <section className="pf-section sp-arc-sec" aria-label={title || "Showcase"}>
      {title && (
        <div className="pf-container">
          <h2 className="pf-h2 sp-title">{title}</h2>
        </div>
      )}
      <div ref={stage} className="sp-arc" tabIndex={0} aria-roledescription="carousel" aria-label={(title || "Showcase") + ". Use the arrow keys to browse."}>
        <p className="sp-ghost" aria-hidden="true">
          {String(info.title || "").split(" ")[0]}
        </p>
        <div className="sp-arc-track">
          {list.map((it, i) => (
            <div key={i} className="sp-arc-card" data-i={i} ref={(el) => (cards.current[i] = el)} aria-hidden="true">
              <Tile it={it} i={it.r} className="sp-arc-media" props={props} />
              <span className="sp-arc-name">{it.title}</span>
            </div>
          ))}
        </div>
        <div className="sp-arc-focus">
          <div className="sp-arc-cur">
            <Tile it={cur} i={shown} className="sp-arc-big" props={props} />
          </div>
          {nx && (
            <div className="sp-arc-next" ref={nextEl} style={{ clipPath: "inset(0 0 100% 0)" }}>
              <Tile it={nx} i={next} className="sp-arc-big" props={props} />
            </div>
          )}
          <div className="sp-arc-grid" ref={gridEl} aria-hidden="true" />
          <div className="sp-arc-scan" ref={scanEl} aria-hidden="true" />
        </div>
        <div className="sp-arc-info">
          <button type="button" className="sp-arc-btn" aria-label="Previous" onClick={() => step(-1)}>
            ‹
          </button>
          <div className="sp-arc-roll" aria-live="polite">
            <span key={"t" + (next >= 0 ? next : shown)} className="sp-roll">
              <b>{info.title}</b>
            </span>
            {info.note && (
              <span key={"n" + (next >= 0 ? next : shown)} className="sp-roll sp-roll-note">
                {info.note}
              </span>
            )}
          </div>
          {info.href ? (
            <a className="sp-arc-cta" href={info.href}>
              {action}
            </a>
          ) : null}
          <button type="button" className="sp-arc-btn" aria-label="Next" onClick={() => step(1)}>
            ›
          </button>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ track

/** Greedy wrap by characters; good enough to split a paragraph into display lines. */
function wrap(text, max) {
  const out = [];
  let line = "";
  for (const w of String(text || "").split(/\s+/).filter(Boolean)) {
    if (line && (line + " " + w).length > max) {
      out.push(line);
      line = w;
    } else line = line ? line + " " + w : w;
  }
  if (line) out.push(line);
  return out;
}

/**
 * A pinned story that slides sideways as you scroll. A character floats in the middle and
 * owns an oval of space: every line it passes slides up or down out of the way, nearest
 * lines first, then settles back. blocks: [{kind: "text"|"list"|"quote"|"stats", head, lines|text}].
 */
export function Track({ blocks, mascot = null, title = "" }) {
  const sec = useRef(null);
  const pin = useRef(null);
  const rail = useRef(null);
  const bot = useRef(null);
  const geo = useRef({ lines: [], L: 0, ready: false });
  const [h, setH] = useState(400);
  const still = typeof window !== "undefined" && reduced();
  const prepared = useMemo(
    () =>
      blocks.map((b) => ({
        ...b,
        rows: b.kind === "text" ? wrap(b.text, 30) : b.kind === "quote" ? wrap(b.text, 26) : b.lines || [],
      })),
    [blocks]
  );

  // Measure every line once (and on resize) relative to the rail.
  useEffect(() => {
    const measure = () => {
      const r = rail.current;
      const p = pin.current;
      if (!r || !p) return;
      const vw = p.clientWidth;
      const lines = [];
      r.querySelectorAll(".sp-tr-block").forEach((blk) => {
        const above = blk.classList.contains("is-up");
        const rows = [...blk.querySelectorAll(".sp-tr-line")];
        const items = rows.map((el) => ({ el, x: blk.offsetLeft + el.offsetLeft, w: el.offsetWidth, top: blk.offsetTop + el.offsetTop, hgt: el.offsetHeight, above, shift: 0 }));
        // Nearest the centre line first: bottom lines of upper blocks, top lines of lower ones.
        if (above) items.reverse();
        lines.push(items);
      });
      const L = r.scrollWidth + vw * 0.5;
      geo.current = { lines, L, vw, ready: true };
      setH(Math.round(Math.max(0, r.scrollWidth - vw) * 0.9 + p.clientHeight));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (pin.current) ro.observe(pin.current);
    document.fonts && document.fonts.ready.then(measure);
    return () => ro.disconnect();
  }, [prepared]);

  useFrames(
    sec,
    (dt) => {
      const g = geo.current;
      const s = sec.current;
      const p = pin.current;
      const r = rail.current;
      if (!g.ready || !s || !p || !r || still) return;
      const sc = scrollerOf(s);
      const vh = sc ? sc.clientHeight : window.innerHeight;
      const top = s.getBoundingClientRect().top - (sc ? sc.getBoundingClientRect().top : 0);
      const prog = clamp(-top / Math.max(1, s.offsetHeight - Math.min(vh, p.offsetHeight)));
      const off = -prog * Math.max(0, r.scrollWidth - g.vw);
      r.style.transform = `translate3d(${off.toFixed(1)}px, 0, 0)`;
      const ph = p.clientHeight;
      const cx = g.vw / 2;
      const cy = ph / 2;
      const b = bot.current;
      const bw = b ? b.offsetWidth : 160;
      const bh = b ? b.offsetHeight : 160;
      const Rx = bw * 0.95 + 30;
      const Ry = bh * 0.62 + 12;
      const k = dt * 60;
      for (const block of g.lines) {
        let inner = 0;
        block.forEach((ln, idx) => {
          const left = ln.x + off;
          const right = left + ln.w;
          const d = cx >= left && cx <= right ? 0 : Math.min(Math.abs(cx - left), Math.abs(cx - right));
          let need = 0;
          if (d < Rx) {
            const hh = Ry * Math.sqrt(1 - (d / Rx) * (d / Rx)) + 10;
            const edge = ln.above ? cy - (ln.top + ln.hgt) : ln.top - cy;
            need = Math.max(0, hh - edge);
          }
          need = Math.max(need, inner);
          const ease = Math.max(0.1, 0.14 - 0.012 * idx);
          ln.shift += (need - ln.shift) * (1 - Math.pow(1 - ease, k));
          inner = ln.shift;
          ln.el.style.transform = `translate3d(0, ${(ln.above ? -ln.shift : ln.shift).toFixed(1)}px, 0)`;
        });
      }
      if (b) b.style.setProperty("--tp", prog.toFixed(3));
    },
    [prepared, still]
  );

  if (!prepared.length) return null;
  return (
    <section ref={sec} className={"sp-track-sec" + (still ? " is-still" : "")} style={still ? undefined : { height: h + "px" }} aria-label={title || "Story"}>
      <div ref={pin} className="sp-tr-pin">
        {title && <p className="sp-tr-title pf-mono">{title}</p>}
        <div ref={bot} className="sp-tr-bot" aria-hidden="true">
          {mascot || <span className="sp-orb" />}
        </div>
        <div ref={rail} className="sp-tr-rail">
          {prepared.map((b, i) => (
            <div key={i} className={"sp-tr-block sp-tr-" + b.kind + (i % 2 ? " is-down" : " is-up")}>
              {b.head && <p className="sp-tr-line sp-tr-head pf-mono">{b.head}</p>}
              {b.rows.map((row, j) => (
                <p key={j} className="sp-tr-line">
                  {b.kind === "quote" && j === 0 ? "“" : ""}
                  {row}
                  {b.kind === "quote" && j === b.rows.length - 1 ? "”" : ""}
                </p>
              ))}
            </div>
          ))}
        </div>
        {!still && <p className="sp-tr-hint pf-mono" aria-hidden="true">Scroll</p>}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ fog switch

const FOG_VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
const FOG_FS = `precision mediump float;
uniform vec2 R;uniform float T,S,K;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;p=mat2(.8,.6,-.6,.8)*p+5.3;
for(int i=0;i<5;i++){v+=a*n(p);p=mat2(1.6,1.2,-1.2,1.6)*p;a*=.5;}return v;}
void main(){vec2 uv=gl_FragCoord.xy/R;float y=1.-uv.y;vec2 q=vec2(uv.x*R.x/R.y,uv.y)*2.2;float t=T*.05;
vec2 w=vec2(fbm(q+t),fbm(q-t+3.1));float d=fbm(q+w*1.4+vec2(t*2.,0.));
float front=1.02-S*1.12;float rise=smoothstep(front-.02,front+.26,y+(d-.5)*.5);
float haze=S*(.3+.46*d);float a=max(rise*.98,haze);
vec3 lo=mix(vec3(.79,.78,.71),vec3(.15,.19,.29),K);vec3 hi=mix(vec3(.97,.93,.84),vec3(.40,.45,.57),K);
vec3 c=mix(lo,hi,d);gl_FragColor=vec4(c*a,a);}`;

/**
 * A fog bank that surges up from the bottom, hides a change at its thickest point, then
 * thins away. run(change, toDark) plays it and calls change() at the peak.
 */
export function useFogSwitch() {
  const canvas = useRef(null);
  const busy = useRef(false);
  const run = (change, toDark) => {
    const cv = canvas.current;
    if (busy.current) return;
    if (reduced() || !cv) return change();
    const gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true });
    if (!gl) return change();
    busy.current = true;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, FOG_VS));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FOG_FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) {
      busy.current = false;
      return change();
    }
    gl.useProgram(pr);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n) => gl.getUniformLocation(pr, n);
    const w = Math.min(960, window.innerWidth);
    cv.width = w;
    cv.height = Math.round(w * (window.innerHeight / window.innerWidth));
    gl.viewport(0, 0, cv.width, cv.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const SINK = 420;
    const RISE = 900;
    const sm = (a, b, x) => {
      const t = clamp((x - a) / (b - a));
      return t * t * (3 - 2 * t);
    };
    const t0 = performance.now();
    let swapped = false;
    cv.style.display = "block";
    const from = toDark ? 0 : 1;
    const frame = (now) => {
      const d = now - t0;
      const S = sm(0, SINK * 0.92, d) * (1 - sm(SINK + 70, SINK + RISE * 0.92, d));
      const K = mix(from, 1 - from, sm(120, 620, d));
      if (!swapped && d >= SINK) {
        swapped = true;
        change();
      }
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U("R"), cv.width, cv.height);
      gl.uniform1f(U("T"), now / 1000);
      gl.uniform1f(U("S"), S);
      gl.uniform1f(U("K"), K);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (d < SINK + RISE) requestAnimationFrame(frame);
      else {
        cv.style.display = "none";
        busy.current = false;
      }
    };
    requestAnimationFrame(frame);
  };
  const layer = <canvas ref={canvas} className="sp-fog" aria-hidden="true" />;
  return { run, layer };
}

// ------------------------------------------------------------------ scramble titles

const GLYPHS = ".:·,;_/+*";

/** Section titles resolve out of random symbols the first time they scroll into view. */
export function useScramble(rootRef, on, key) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !on || reduced()) return;
    const els = [...root.querySelectorAll(".pf-h2")].filter((el) => el.childElementCount === 0 && !el.dataset.scrambled);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target;
          io.unobserve(el);
          if (el.dataset.scrambled) return;
          el.dataset.scrambled = "1";
          const text = el.textContent || "";
          const chars = [...text];
          const n = chars.length;
          const at = chars.map((_, i) => 0.7 * (i / Math.max(1, n)) + 0.3 * Math.random());
          el.setAttribute("aria-label", text);
          const t0 = performance.now();
          const tick = (now) => {
            const p = easeOut3(clamp((now - t0) / 1100));
            el.textContent = chars.map((c, i) => (c === " " || p >= at[i] ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join("");
            if (p < 1) requestAnimationFrame(tick);
            else {
              el.textContent = text;
              el.removeAttribute("aria-label");
            }
          };
          requestAnimationFrame(tick);
        });
      },
      { root: scrollerOf(root), threshold: 0.6 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, key]);
}

export const SHOWPIECES = ["none", "sphere", "arc", "track"];
export { finePointer };
