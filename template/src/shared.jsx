import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, inView, scroll, stagger } from "motion";
import { REST, motionById } from "./motion.js";

// Pieces shared by Portfolio.jsx and Website.jsx.

export function fontsHref(fonts) {
  const fams = Array.from(new Set([fonts.display, fonts.body, fonts.mono])).filter(Boolean);
  const q = fams.map((f) => "family=" + encodeURIComponent(f).replace(/%20/g, "+") + ":wght@400;500;600;700").join("&");
  return "https://fonts.googleapis.com/css2?" + q + "&display=swap";
}

// Words and links come from a form (or a backup file), so a link is only kept when it is
// something a visitor can safely open: web, mail, phone, WhatsApp, a page anchor, a relative
// file or a picture. Anything else ("javascript:", "data:text/html", ...) is dropped.
const SAFE_LINK = /^(https?:|mailto:|tel:|sms:|whatsapp:|#|\/|\.\/|\.\.\/)/i;
const NO_SCHEME = /^[^:]*$/;
export function safeUrl(v, image) {
  if (typeof v !== "string") return v;
  const t = v.trim();
  if (!t) return v;
  if (image && /^data:image\/(png|jpe?g|webp|gif|avif);base64,/i.test(t)) return v;
  return SAFE_LINK.test(t) || NO_SCHEME.test(t) ? v : "";
}

// Returns a copy of the content with every link-like field made safe.
export function cleanContent(node, key) {
  if (Array.isArray(node)) return node.map((x) => cleanContent(x, key));
  if (node && typeof node === "object") return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, cleanContent(v, k)]));
  if (typeof node === "string" && key && /(url|href|link|linkedin|github|website|instagram|facebook|twitter|whatsapp|map)s?$/i.test(key)) return safeUrl(node, /(photo|image|img|avatar|logo|poster)/i.test(key));
  return node;
}

export function useSystemDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const on = (e) => setDark(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return dark;
}

// Plays the chosen animation style with Motion (motion.dev, the library behind Framer Motion).
// Hero pieces (.pf-enter) and the split headline play on load; .pf-reveal blocks play the
// first time they scroll into view. The builder's preview scrolls inside its own box,
// so the observer watches that box. Reduced motion keeps a short fade only.
function reduced() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function settle(el) {
  for (const k of ["opacity", "transform", "filter", "clipPath"]) el.style[k] = "";
  el.classList.add("is-in");
}

function play(el, m, delay) {
  if (reduced()) {
    return animate(el, { opacity: [0, 1] }, { duration: 0.3, delay: Math.min(delay, 0.3) }).then(() => settle(el));
  }
  const from = m.from;
  const kf = {};
  for (const [k, v] of Object.entries(from)) kf[k] = k === "transformPerspective" ? [v, v] : [v, REST[k]];
  if (!("opacity" in kf)) kf.opacity = [1, 1];
  return animate(el, kf, { ...m.transition, delay }).then(() => settle(el));
}

const HEAD_FROM = {
  words: { opacity: [0, 1], y: ["0.45em", "0em"], filter: ["blur(6px)", "blur(0px)"] },
  mask: { y: ["105%", "0%"] },
  letters: { opacity: [0, 1], y: ["0.35em", "0em"] },
  block: { opacity: [0, 1], y: [24, 0] },
};

function playHeadline(root, m) {
  const h = root.querySelector(".pf-hl");
  if (!h) return;
  const parts = h.querySelectorAll(".pf-hl-part:not(.is-in)");
  if (!parts.length) return;
  const mode = m.headline;
  if (reduced()) {
    animate(parts, { opacity: [0, 1] }, { duration: 0.3 }).then(() => parts.forEach(settle));
    return;
  }
  const each = mode === "letters" ? Math.min(0.03, 0.9 / Math.max(1, parts.length)) : m.stagger * 1.1;
  animate(parts, HEAD_FROM[mode] || HEAD_FROM.block, { ...m.transition, delay: stagger(each, { startDelay: 0.08 }) }).then(() => parts.forEach(settle));
}

export function useReveal(rootRef, key, design) {
  const id = design ? (design.motion === "none" ? "M-000" : design.anim) : "M-002";
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const m = motionById(id);
    const still = id === "M-000" || !m.from;
    const enters = root.querySelectorAll(".pf-enter:not(.is-in)");
    const reveals = root.querySelectorAll(".pf-reveal:not(.is-in)");
    if (still) {
      root.querySelectorAll(".pf-enter, .pf-reveal, .pf-hl-part").forEach(settle);
      return;
    }
    playHeadline(root, m);
    enters.forEach((el) => play(el, m, 0.12 + Number(el.style.getPropertyValue("--i") || 0) * m.stagger * 1.4));
    if (typeof IntersectionObserver === "undefined") {
      reveals.forEach(settle);
      return;
    }
    const scroller = root.closest("[data-scroll-root]");
    const stops = [];
    reveals.forEach((el) => {
      const i = Math.min(6, Number(el.style.getPropertyValue("--i") || 0));
      stops.push(inView(el, () => void play(el, m, i * m.stagger), { root: scroller || undefined, amount: 0.12, margin: "0px 0px -6% 0px" }));
    });
    return () => stops.forEach((s) => s());
  }, [rootRef, key, id]);
}

// "Spotlight" hover: a soft light follows the pointer across cards.
export function useSpotlight(rootRef, on) {
  useEffect(() => {
    const root = rootRef.current;
    if (!on || !root || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const move = (e) => {
      const card = e.target.closest && e.target.closest(".pf-card");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", e.clientX - r.left + "px");
      card.style.setProperty("--my", e.clientY - r.top + "px");
    };
    root.addEventListener("pointermove", move, { passive: true });
    return () => root.removeEventListener("pointermove", move);
  }, [rootRef, on]);
}

// Highlights the nav link of the section in view.
export function useActiveSection(rootRef, key, setActive) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !("IntersectionObserver" in window)) return;
    const scroller = root.closest("[data-scroll-root]");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id.replace("pf-", ""));
      },
      { root: scroller || null, rootMargin: "-45% 0px -50% 0px" }
    );
    root.querySelectorAll(".pf-section, .pf-band").forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [rootRef, key, setActive]);
}

// Thin bar at the top that fills as you read, linked to scroll by Motion.
export function Progress({ on }) {
  const ref = useRef(null);
  useEffect(() => {
    const bar = ref.current;
    if (!on || !bar) return;
    const scroller = bar.closest("[data-scroll-root]");
    return scroll(animate(bar, { scaleX: [0, 1] }, { ease: "linear" }), scroller ? { container: scroller } : undefined);
  }, [on]);
  if (!on) return null;
  return <div className="pf-progress" ref={ref} aria-hidden="true" />;
}

// Counts up to the number when it scrolls into view.
export function Counter({ value, suffix, animate: on }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(on ? 0 : value);
  useEffect(() => {
    const el = ref.current;
    if (!on || reduced() || !el || typeof IntersectionObserver === "undefined") {
      setShown(value);
      return;
    }
    let ctl;
    const stop = inView(
      el,
      () => {
        ctl = animate(0, value, { duration: 1.1, ease: [0.16, 1, 0.3, 1], onUpdate: setShown });
      },
      { root: el.closest("[data-scroll-root]") || undefined }
    );
    return () => {
      stop();
      if (ctl) ctl.stop();
    };
  }, [value, on]);
  const decimals = Number.isInteger(value) ? 0 : 1;
  return (
    <span ref={ref}>
      {shown.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

// The big headline, split so each word or letter can enter on its own.
export function Headline({ text, mode, className }) {
  const t = String(text || "");
  if (!mode || mode === "none" || mode === "block") {
    return (
      <h1 className={className + " pf-hl pf-hl-block"}>
        <span className="pf-hl-part" style={{ "--w": 0 }}>
          {t}
        </span>
      </h1>
    );
  }
  const words = t.split(/\s+/).filter(Boolean);
  let n = 0;
  return (
    <h1 className={className + " pf-hl pf-hl-" + mode} aria-label={t}>
      {words.map((w, i) => (
        <span className="pf-hl-word" key={i} aria-hidden="true">
          {mode === "letters" ? (
            Array.from(w).map((ch, j) => (
              <span className="pf-hl-part" key={j} style={{ "--w": n++ }}>
                {ch}
              </span>
            ))
          ) : (
            <span className="pf-hl-part" style={{ "--w": i }}>
              {w}
            </span>
          )}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </h1>
  );
}

// A strip of words that drifts past and whips faster while the page scrolls, then eases
// back. Pauses on hover; still when motion is reduced.
export function Marquee({ items, label }) {
  const list = items.filter(Boolean);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const track = el.firstChild;
    el.classList.add("is-js");
    const sc = el.closest("[data-scroll-root]");
    const target = sc || window;
    const read = () => (sc ? sc.scrollTop : window.scrollY);
    let lastY = read();
    let boost = 0;
    let x = 0;
    let raf = 0;
    let last = performance.now();
    let hover = false;
    let seen = true;
    const onScroll = () => {
      const y = read();
      boost = Math.min(900, boost + Math.abs(y - lastY) * 2.2);
      lastY = y;
    };
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (seen && !hover) {
        x -= (60 + boost) * dt;
        const w = track.firstChild.offsetWidth;
        if (w && -x >= w) x += w;
        track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      }
      boost *= Math.pow(0.04, dt);
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => (seen = e.isIntersecting));
    io.observe(el);
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const enter = () => (hover = fine);
    const leave = () => (hover = false);
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    target.addEventListener("scroll", onScroll, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      target.removeEventListener("scroll", onScroll);
      el.classList.remove("is-js");
    };
  }, [list.join("|")]);
  if (!list.length) return null;
  const row = (hidden) => (
    <ul className="pf-marquee-row" aria-hidden={hidden || undefined}>
      {list.map((x, i) => (
        <li key={i}>
          <span>{x}</span>
          <span className="pf-marquee-dot" aria-hidden="true" />
        </li>
      ))}
    </ul>
  );
  return (
    <div ref={ref} className="pf-marquee" aria-label={label} style={{ "--pf-mq-dur": Math.max(18, list.length * 3.2) + "s" }}>
      <div className="pf-marquee-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

// A monogram used when no photo is given.
export function Avatar({ name, size = 56 }) {
  const initials = String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return (
    <span className="pf-avatar" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {initials}
    </span>
  );
}

export function Icon({ name }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (name === "sun")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  if (name === "moon")
    return (
      <svg {...common}>
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
    );
  if (name === "menu")
    return (
      <svg {...common}>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    );
  if (name === "arrow")
    return (
      <svg {...common} width={16} height={16}>
        <path d="M7 17 17 7M8 7h9v9" />
      </svg>
    );
  if (name === "left")
    return (
      <svg {...common}>
        <path d="m15 6-6 6 6 6" />
      </svg>
    );
  if (name === "right")
    return (
      <svg {...common}>
        <path d="m9 6 6 6-6 6" />
      </svg>
    );
  return null;
}

export function Section({ id, title, children, kicker }) {
  return (
    <section id={"pf-" + id} className="pf-section">
      <div className="pf-container pf-split">
        <div className="pf-split-head pf-reveal">
          {kicker && <p className="pf-kicker">{kicker}</p>}
          <h2 className="pf-h2">{title}</h2>
        </div>
        <div className="pf-split-body">{children}</div>
      </div>
    </section>
  );
}

export function Wide({ id, title, intro, children, className }) {
  return (
    <section id={"pf-" + id} className={"pf-section " + (className || "")}>
      <div className="pf-container">
        <div className="pf-wide-head pf-reveal">
          <h2 className="pf-h2">{title}</h2>
          {intro && <p className="pf-muted pf-wide-intro">{intro}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

// One quote at a time with previous and next buttons. Never moves on its own.
export function QuoteSlider({ items }) {
  const [i, setI] = useState(0);
  const n = items.length;
  if (!n) return null;
  const q = items[i % n];
  return (
    <div className="pf-slider pf-reveal">
      <figure className="pf-big-quote" key={i}>
        <blockquote>“{q.quote}”</blockquote>
        <figcaption>
          <strong>{q.name}</strong>
          {q.role ? <span className="pf-muted">, {q.role}</span> : null}
        </figcaption>
      </figure>
      {n > 1 && (
        <div className="pf-slider-controls">
          <button className="pf-icon-btn pf-ring" aria-label="Previous quote" onClick={() => setI((i - 1 + n) % n)}>
            <Icon name="left" />
          </button>
          <span className="pf-mono pf-small pf-muted" aria-live="polite">
            {i + 1} of {n}
          </span>
          <button className="pf-icon-btn pf-ring" aria-label="Next quote" onClick={() => setI((i + 1) % n)}>
            <Icon name="right" />
          </button>
        </div>
      )}
    </div>
  );
}

// CSS variables for one design system, colour scheme and animation style.
export function themeStyle(d, pal, scheme) {
  return {
    "--pf-bg": pal.bg,
    "--pf-surface": pal.surface,
    "--pf-text": pal.text,
    "--pf-muted": pal.muted,
    "--pf-border": pal.border,
    "--pf-accent": pal.accent,
    "--pf-on-accent": pal.onAccent,
    "--pf-radius": d.radius + "px",
    "--pf-font-display": `'${d.fonts.display}', ui-sans-serif, system-ui, sans-serif`,
    "--pf-font-body": `'${d.fonts.body}', ui-sans-serif, system-ui, sans-serif`,
    "--pf-font-mono": `'${d.fonts.mono}', ui-monospace, monospace`,
    colorScheme: scheme,
  };
}

// Attributes for the root element that switch the animation CSS on.
export function motionAttrs(d) {
  const still = d.motion === "none" || d.anim === "M-000";
  const m = still ? null : motionById(d.anim);
  return {
    "data-anim": still ? "still" : "on",
    "data-headline": m ? m.headline : "none",
    "data-hover": d.hover || (m ? m.hover : "none"),
    "data-density": d.density || "regular",
    "data-backdrop": d.backdrop || "none",
  };
}
