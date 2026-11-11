import { useEffect, useMemo, useRef, useState } from "react";

// Studio blocks: techniques seen on award-level landing pages, rebuilt from scratch as
// reusable pieces. Smooth scrolling, a masked line loader, film grain, words that write in
// as you scroll, a scroll-scrubbed video with pinned chapters and hotspots, tiles that fly
// into a sentence, and a drag carousel. Each one respects reduced motion.

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The element that scrolls: the builder preview frame, or the page itself.
function scrollerOf(el) {
  return (el && el.closest && el.closest("[data-scroll-root]")) || null;
}
function viewH(sc) {
  return sc ? sc.getBoundingClientRect().height : window.innerHeight;
}
function topIn(el, sc) {
  const r = el.getBoundingClientRect();
  return sc ? r.top - sc.getBoundingClientRect().top : r.top;
}

// Calls fn on every scroll and resize (and once), with the element's progress through the
// viewport: 0 when its top meets the bottom of the screen, 1 when its bottom leaves the top.
export function useScrollProgress(ref, fn, deps = []) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sc = scrollerOf(el);
    const target = sc || window;
    let raf = 0;
    const run = () => {
      raf = 0;
      fn(el, sc);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(run);
    };
    run();
    target.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      cancelAnimationFrame(raf);
      target.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ------------------------------------------------------------------ smooth scrolling

export function SmoothScroll({ on, preview }) {
  useEffect(() => {
    if (!on || preview || reduced()) return;
    let lenis = null;
    let raf = 0;
    let dead = false;
    import("lenis").then(({ default: Lenis }) => {
      if (dead) return;
      lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 1, anchors: true });
      const loop = (t) => {
        lenis.raf(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      if (lenis) lenis.destroy();
    };
  }, [on, preview]);
  return null;
}

// ------------------------------------------------------------------ loader

// One line rises out of a mask, then the whole layer wipes upward to reveal the site.
export function LineLoader({ text, preview }) {
  const [stage, setStage] = useState(reduced() ? "gone" : "in");
  useEffect(() => {
    if (stage === "gone") return;
    const t1 = setTimeout(() => setStage("out"), preview ? 1100 : 1500);
    const t2 = setTimeout(() => setStage("gone"), preview ? 2000 : 2400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (stage === "gone") return null;
  return (
    <div className={"st-loader is-" + stage + (preview ? " is-preview" : "")} aria-hidden="true">
      <p className="st-loader-mask">
        <span>{text}</span>
      </p>
    </div>
  );
}

// ------------------------------------------------------------------ grain

export function Grain() {
  return (
    <>
      <div className="st-grain" aria-hidden="true" />
      <div className="st-vignette" aria-hidden="true" />
    </>
  );
}

// ------------------------------------------------------------------ words that write in on scroll

export function ScrollWords({ text, className = "", as: Tag = "p" }) {
  const ref = useRef(null);
  const words = useMemo(() => String(text || "").split(/\s+/).filter(Boolean), [text]);
  useScrollProgress(
    ref,
    (el, sc) => {
      if (reduced()) return;
      const vh = viewH(sc);
      const top = topIn(el, sc);
      // Starts writing when the paragraph is 85% down the screen, done by 40%.
      const p = clamp((vh * 0.85 - top) / (vh * 0.45 + el.offsetHeight * 0.4));
      const spans = el.children;
      const n = spans.length;
      for (let i = 0; i < n; i++) {
        const kk = clamp((p * 1.5 - i / n) * 4);
        spans[i].style.opacity = String(0.14 + 0.86 * kk);
        spans[i].style.filter = kk < 1 ? `blur(${((1 - kk) * 4).toFixed(2)}px)` : "";
      }
    },
    [words.join(" ")]
  );
  return (
    <Tag ref={ref} className={"st-words " + className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} aria-hidden="true">
          {w}{" "}
        </span>
      ))}
    </Tag>
  );
}

// ------------------------------------------------------------------ scroll-scrubbed video

// Plays the video once, muted and hidden, saving every frame as a small JPEG. Scrolling then
// draws the frame for that point, forwards or backwards, smoothly, with no slow seeking.
function useFrameCache(src) {
  const [state] = useState(() => ({ frames: [], count: 0, total: 0, listeners: new Set() }));
  useEffect(() => {
    if (!src) return;
    const st = state;
    st.frames = [];
    st.failed = false;
    st.count = 0;
    st.total = 0;
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.crossOrigin = "anonymous";
    v.preload = "auto";
    v.src = src;
    Object.assign(v.style, { position: "fixed", left: "0", top: "0", width: "2px", height: "2px", opacity: "0.01", pointerEvents: "none" });
    document.body.appendChild(v);
    const grab = document.createElement("canvas");
    const g = grab.getContext("2d");
    let dead = false;
    const FPS = 24;
    const store = (i) => {
      if (dead || st.frames[i]) return;
      try {
        g.drawImage(v, 0, 0, grab.width, grab.height);
      } catch {
        return;
      }
      st.frames[i] = "pending";
      grab.toBlob(
        (b) => {
          if (dead || !b) return;
          st.frames[i] = b;
          st.count++;
          st.listeners.forEach((f) => f());
        },
        "image/jpeg",
        0.86
      );
    };
    const start = () => {
      const w = Math.min(1600, v.videoWidth || 1280);
      grab.width = w;
      grab.height = Math.round(w * ((v.videoHeight || 720) / (v.videoWidth || 1280)));
      st.total = Math.max(2, Math.min(360, Math.round((v.duration || 5) * FPS)));
      store(0);
      if ("requestVideoFrameCallback" in v) {
        const cb = (_now, meta) => {
          store(Math.min(st.total - 1, Math.round(meta.mediaTime * FPS)));
          if (!v.ended && !dead) v.requestVideoFrameCallback(cb);
        };
        v.requestVideoFrameCallback(cb);
        v.playbackRate = 1;
        v.play().catch(() => stepSeek());
      } else stepSeek();
    };
    let i = 0;
    const stepSeek = () => {
      const next = () => {
        if (dead || i >= st.total) return;
        v.currentTime = Math.min(i / FPS, v.duration - 0.01);
      };
      v.addEventListener("seeked", () => {
        store(i);
        i++;
        next();
      });
      next();
    };
    v.addEventListener("error", () => {
      st.failed = true;
      st.listeners.forEach((f) => f());
    });
    if (v.readyState >= 2) start();
    else v.addEventListener("loadeddata", start, { once: true });
    return () => {
      dead = true;
      v.pause();
      v.remove();
    };
  }, [src, state]);
  return state;
}

function twoLines(t) {
  const w = String(t || "").split(/\s+/).filter(Boolean);
  if (w.length < 3) return [w.join(" ")];
  const h = Math.ceil(w.length / 2);
  return [w.slice(0, h).join(" "), w.slice(h).join(" ")];
}

function nearest(frames, want, total) {
  for (let k = 0; k < total; k++) {
    if (frames[want - k] instanceof Blob) return want - k;
    if (frames[want + k] instanceof Blob) return want + k;
  }
  return -1;
}

export function Film({ src, steps = [], title = "", highlights = [], preview, path, kicker = "" }) {
  const sec = useRef(null);
  const cv = useRef(null);
  const cache = useFrameCache(src);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(-1);
  const [failed, setFailed] = useState(false);
  const prog = useRef(0);
  useEffect(() => {
    const f = () => cache.failed && setFailed(true);
    cache.listeners.add(f);
    setFailed(false);
    return () => cache.listeners.delete(f);
  }, [cache, src]);
  const reduce = reduced();
  const panels = steps.slice(0, 3);
  const spots = highlights.slice(0, 4);

  // Draw loop: eases a playhead toward the scroll position and paints that cached frame.
  useEffect(() => {
    if (!src) return;
    const canvas = cv.current;
    const g = canvas.getContext("2d");
    let raf = 0;
    let cur = 0;
    let shown = -1;
    let busy = false;
    let last = performance.now();
    const size = () => {
      const r = canvas.getBoundingClientRect();
      const d = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.max(2, Math.round(r.width * d));
      canvas.height = Math.max(2, Math.round(r.height * d));
      shown = -1;
    };
    const draw = (i) => {
      if (busy) return;
      const b = cache.frames[i];
      if (!(b instanceof Blob)) return;
      busy = true;
      createImageBitmap(b)
        .then((bm) => {
          const s = Math.max(canvas.width / bm.width, canvas.height / bm.height);
          const w = bm.width * s;
          const h = bm.height * s;
          g.drawImage(bm, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
          bm.close();
          shown = i;
          busy = false;
          if (!ready) setReady(true);
        })
        .catch(() => (busy = false));
    };
    const tick = (now) => {
      const dt = Math.min(64, now - last);
      last = now;
      const total = cache.total || 1;
      const target = clamp(prog.current / 0.85) * (total - 1);
      cur += (target - cur) * (1 - Math.pow(1 - 0.22, dt / 16.7));
      if (Math.abs(target - cur) < 0.02) cur = target;
      const want = Math.round(reduce ? 0 : cur);
      const have = nearest(cache.frames, want, total);
      if (have >= 0 && have !== shown) draw(have);
      raf = requestAnimationFrame(tick);
    };
    const ro = new ResizeObserver(size);
    ro.observe(canvas);
    size();
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // Scroll drives the playhead, the chapter panels, the dashes and the hotspots.
  useScrollProgress(
    sec,
    (el, sc) => {
      const vh = viewH(sc);
      const top = topIn(el, sc);
      const p = clamp(-top / Math.max(1, el.offsetHeight - vh));
      prog.current = p;
      const n = Math.max(1, panels.length);
      el.style.setProperty("--fp", p.toFixed(4));
      el.querySelectorAll(".st-film-panel").forEach((pn, i) => {
        const a = i === n - 1 ? seg(p, i / n + 0.05, i / n + 0.12) : seg(p, i / n + 0.05, i / n + 0.12) * (1 - seg(p, (i + 1) / n - 0.04, (i + 1) / n + 0.02));
        const e = reduce ? (a > 0.5 ? 1 : 0) : ease(a);
        pn.style.opacity = String(reduce ? e : a);
        pn.style.visibility = a <= 0.001 ? "hidden" : "visible";
        pn.querySelectorAll(".st-film-line > span").forEach((ln, j) => (ln.style.transform = `translateY(${((1 - e) * (105 + j * 20)).toFixed(1)}%)`));
        const para = pn.querySelector("p");
        if (para) para.style.transform = `translateY(${((1 - e) * 24).toFixed(1)}px)`;
      });
      el.querySelectorAll(".st-film-dash i").forEach((d, i) => (d.style.transform = `scaleX(${seg(p, i / n, (i + 1) / n).toFixed(3)})`));
      el.querySelectorAll(".st-spot").forEach((s, i) => {
        const k = reduce ? (p > 0.8 ? 1 : 0) : ease(seg(p, 0.78 + i * 0.03, 0.84 + i * 0.03));
        s.style.transform = `translate(-50%, -50%) scale(${k.toFixed(3)})`;
      });
    },
    [src, panels.length]
  );

  if (!src || failed) {
    if (!preview) return null;
    return (
      <section className="pf-section st-film-empty">
        <div className="pf-container">
          <div className="st-film-slot" data-video={path} data-img-empty="">
            <b>{failed ? "This video would not play here" : "Scroll-scrubbed video"}</b>
            <span>{failed ? "Try an MP4 (H.264) or WebM file. Click Edit on page, then click here to swap it. " : ""}Add a short video (5 to 10 seconds, one smooth camera move works best). Scrolling plays it forwards and backwards. Click Edit on page, then click here.</span>
          </div>
        </div>
      </section>
    );
  }

  const SPOT_AT = [
    [18, 62],
    [36, 42],
    [70, 66],
    [84, 46],
  ];
  return (
    <section ref={sec} className="st-film" style={{ height: `${Math.max(2, panels.length) * 100 + 120}vh` }} aria-label={title || "Story"}>
      <div className="st-film-pin">
        <canvas ref={cv} className={"st-film-cv" + (ready ? " is-on" : "")} aria-hidden="true" data-video={path} />
        <div className="st-film-shade" aria-hidden="true" />
        {kicker && <p className="st-film-kicker pf-mono">{kicker}</p>}
        <div className="pf-container st-film-panels">
          {panels.map((s, i) => (
            <article className={"st-film-panel" + (i % 2 ? " is-right" : "")} key={i}>
              <span className="st-film-num pf-mono">{String(i + 1).padStart(2, "0")} /</span>
              <h3 className="st-film-h">
                {twoLines(s.title).map((ln, j) => (
                    <span className="st-film-line" key={j}>
                      <span>{ln}</span>
                    </span>
                  ))}
              </h3>
              {s.text && <p>{s.text}</p>}
            </article>
          ))}
          <div className="st-film-dash" aria-hidden="true">
            {panels.map((_, i) => (
              <span key={i}>
                <i />
              </span>
            ))}
          </div>
        </div>
        {spots.map((h, i) => (
          <button
            key={i}
            type="button"
            className={"st-spot" + (open === i ? " is-on" : "")}
            style={{ left: SPOT_AT[i][0] + "%", top: SPOT_AT[i][1] + "%" }}
            onClick={() => setOpen(open === i ? -1 : i)}
            aria-expanded={open === i}
          >
            <span className="st-spot-dot" aria-hidden="true" />
            <span className="st-spot-label">
              {h.label}
              <em>{h.value}</em>
            </span>
          </button>
        ))}
        <div className="st-film-bar" aria-hidden="true">
          <i />
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ tiles that fly into a sentence

// A tray of tiles sits above a sentence with empty slots. Scrolling down while the sentence
// is on screen sends each tile flying (with a wobble) into its slot; scrolling up sends
// them home. The tiles stay in the tray in the page, so nothing jumps.
export function Flight({ sentence, tiles, title }) {
  const ref = useRef(null);
  const where = useRef("tray");
  const words = String(sentence || "").split(/\s+/).filter(Boolean);
  const n = Math.min(tiles.length, 5, Math.max(1, Math.floor(words.length / 3)));
  const slotAfter = new Set(Array.from({ length: n }, (_, i) => Math.max(0, Math.round(((i + 1) * words.length) / (n + 1)) - 1)));

  const fly = (to, snap = false) => {
    const el = ref.current;
    if (!el || where.current === to) return;
    where.current = to;
    const blocks = el.querySelectorAll(".st-fly-block");
    const slots = el.querySelectorAll(".st-fly-slot");
    const instant = snap || reduced();
    blocks.forEach((b, i) => {
      const box = b.parentElement.getBoundingClientRect();
      const slot = slots[i] && slots[i].getBoundingClientRect();
      if (!slot) return;
      // The block's untransformed box: its offset inside its home, which also holds a caption.
      const bw = b.offsetWidth;
      const bh = b.offsetHeight;
      const bx = box.left + b.offsetLeft;
      const by = box.top + b.offsetTop;
      const s = slot.width / bw;
      const x = slot.left - bx + (slot.width - bw) / 2;
      const y = slot.top - by + (slot.height - bh) / 2;
      const inT = `translate(${x}px, ${y}px) scale(${s})`;
      const outT = "translate(0px, 0px) scale(1)";
      const cur = getComputedStyle(b).transform;
      const end = to === "slot" ? inT : outT;
      const r = (Math.random() * 30 - 15).toFixed(1);
      b.getAnimations().forEach((a) => a.cancel());
      if (instant) {
        b.style.transform = end;
        return;
      }
      const mid = to === "slot" ? `translate(${x / 2}px, ${y / 2}px) scale(${(1 + s) / 2}) rotate(${r}deg)` : `translate(${x / 2}px, ${y / 2}px) scale(${(1 + s) / 2}) rotate(${-r}deg)`;
      b.animate([{ transform: cur === "none" ? outT : cur }, { transform: mid, offset: 0.5 }, { transform: end }], {
        duration: 1400,
        delay: (to === "slot" ? 100 : 50) * i,
        easing: "cubic-bezier(0.65, 0, 0.35, 1)",
        fill: "both",
      }).finished.then(() => (b.style.transform = end)).catch(() => {});
    });
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sc = scrollerOf(el);
    const target = sc || window;
    const read = () => (sc ? sc.scrollTop : window.scrollY);
    let last = read();
    const on = () => {
      const y = read();
      const dir = y > last ? 1 : y < last ? -1 : 0;
      last = y;
      const sent = el.querySelector(".st-fly-sentence");
      if (!sent || !dir) return;
      const vh = viewH(sc);
      const t = topIn(sent, sc);
      const visible = t < vh * 0.9 && t + sent.offsetHeight > vh * 0.1;
      if (visible && dir > 0) fly("slot");
      if (dir < 0 && (!visible || t > vh * 0.55)) fly("tray");
    };
    const re = () => {
      const was = where.current;
      where.current = "";
      el.querySelectorAll(".st-fly-block").forEach((b) => {
        b.getAnimations().forEach((a) => a.cancel());
        b.style.transform = "";
      });
      where.current = "tray";
      if (was === "slot") fly("slot", true);
    };
    target.addEventListener("scroll", on, { passive: true });
    // The sentence can reflow without a window resize (fonts arriving, a wider column), so
    // watch its size and re-aim any tiles sitting in their slots.
    let lastW = 0;
    let lastH = 0;
    const ro = new ResizeObserver(() => {
      const sent = el.querySelector(".st-fly-sentence");
      if (!sent || (sent.offsetWidth === lastW && sent.offsetHeight === lastH)) return;
      const first = !lastW;
      lastW = sent.offsetWidth;
      lastH = sent.offsetHeight;
      if (!first) re();
    });
    ro.observe(el);
    const sentEl = el.querySelector(".st-fly-sentence");
    if (sentEl) ro.observe(sentEl);
    document.fonts && document.fonts.ready.then(() => where.current === "slot" && re());
    return () => {
      target.removeEventListener("scroll", on);
      ro.disconnect();
    };
  }, []);

  let k = 0;
  return (
    <section id="pf-flight" className="pf-section st-fly" ref={ref} aria-label={title}>
      <div className="pf-container">
        <div className="st-fly-tray">
          {tiles.slice(0, n).map((t, i) => (
            <div className="st-fly-home" key={i} style={{ "--r": (i % 2 ? 1 : -1) * (4 + i * 2) + "deg" }}>
              <div className="st-fly-block">
                <div className="st-fly-tile" style={t.image ? { backgroundImage: `url("${t.image}")` } : { "--h": i }}>
                  {!t.image && <span>{t.label}</span>}
                </div>
              </div>
              <span className="st-fly-cap pf-mono">{t.label}</span>
            </div>
          ))}
        </div>
        <p className="st-fly-sentence">
          {words.map((w, i) => (
            <span key={i}>
              {w}{" "}
              {slotAfter.has(i) && k < n && (
                <>
                  <span className="st-fly-slot" aria-hidden="true" data-k={k++} />{" "}
                </>
              )}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ drag carousel

// Drag (or swipe) to move through the pictures. It drifts on its own until someone touches
// it. Each card is quiet until hovered, then shows full colour and its caption.
export function Carousel({ items, label, preview, pathOf }) {
  const track = useRef(null);
  const bar = useRef(null);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0;
    let drifting = !reduced();
    let last = performance.now();
    let down = null;
    const stop = () => (drifting = false);
    const loop = (now) => {
      const dt = now - last;
      last = now;
      if (drifting && el.scrollWidth > el.clientWidth) {
        el.scrollLeft += dt * 0.03;
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 1) el.scrollLeft = 0;
      }
      const vis = el.clientWidth / el.scrollWidth;
      const f = el.scrollLeft / Math.max(1, el.scrollWidth - el.clientWidth);
      if (bar.current) bar.current.style.transform = `scaleX(${(vis + (1 - vis) * f).toFixed(4)})`;
      raf = requestAnimationFrame(loop);
    };
    const pd = (e) => {
      stop();
      if (e.pointerType !== "mouse") return;
      down = { x: e.clientX, s: el.scrollLeft, moved: false };
      el.classList.add("is-drag");
    };
    const pm = (e) => {
      if (!down) return;
      const dx = e.clientX - down.x;
      if (Math.abs(dx) > 4) down.moved = true;
      el.scrollLeft = down.s - dx;
    };
    const pu = () => {
      if (down && down.moved) el.addEventListener("click", (ev) => ev.preventDefault(), { capture: true, once: true });
      down = null;
      el.classList.remove("is-drag");
    };
    el.addEventListener("pointerdown", pd);
    window.addEventListener("pointermove", pm);
    window.addEventListener("pointerup", pu);
    el.addEventListener("wheel", stop, { passive: true });
    el.addEventListener("touchstart", stop, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerdown", pd);
      window.removeEventListener("pointermove", pm);
      window.removeEventListener("pointerup", pu);
      el.removeEventListener("wheel", stop);
      el.removeEventListener("touchstart", stop);
    };
  }, []);
  return (
    <div className="st-car">
      <div className="st-car-track" ref={track} role="list" aria-label={label}>
        {items.map((it, i) => (
          <figure className="st-car-card" role="listitem" key={i}>
            {it.image ? (
              <img src={it.image} alt={it.title} draggable={false} loading="lazy" data-img={pathOf ? pathOf(i) : undefined} />
            ) : (
              <div className="st-car-ph" data-img={pathOf ? pathOf(i) : undefined} data-img-empty="">
                <span>{preview ? "Add a photo" : it.title}</span>
              </div>
            )}
            <figcaption>
              <b>{it.title}</b>
              {it.note && <span>{it.note}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="st-car-bar" aria-hidden="true">
        <i ref={bar} />
      </div>
    </div>
  );
}
