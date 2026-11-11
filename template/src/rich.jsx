import { useEffect, useMemo, useRef, useState } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";

// Rich motion pieces for the opening section and the "At a glance" tiles: an animated
// character, floating glass widgets, live tiles and animated backgrounds. All original
// artwork drawn in SVG and played by Motion. Reduced motion keeps everything still.

const ease = [0.16, 1, 0.3, 1];

function hash(s) {
  let h = 2166136261;
  for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

// Pointer position over the whole window as springy values from -1 to 1.
function usePointer() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 120, damping: 20, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 120, damping: 20, mass: 0.6 });
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const on = (e) => {
      x.set((e.clientX / window.innerWidth) * 2 - 1);
      y.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => window.removeEventListener("pointermove", on);
  }, [x, y]);
  return { x: sx, y: sy };
}

function useBlink(ref, still) {
  useEffect(() => {
    if (still || !ref.current) return;
    let t;
    const loop = () => {
      t = setTimeout(() => {
        if (ref.current) animate(ref.current, { scaleY: [1, 0.08, 1] }, { duration: 0.18, ease: "easeOut" });
        loop();
      }, 2400 + Math.random() * 2600);
    };
    loop();
    return () => clearTimeout(t);
  }, [ref, still]);
}

const SKIN = ["#F2D3B8", "#E8BB96", "#C98E66", "#A86F4C", "#7D5137", "#5A3A27"];
const HAIR = ["#1F1A17", "#3B2A20", "#6B4530", "#A0703F", "#2B2B33", "#8C3B2E"];

// A friendly person drawn in SVG: blinks, breathes, follows the pointer with its eyes and
// waves when it arrives or when pointed at.
export function Character({ name, kind = "person", size = 300, still = false }) {
  const h = hash(name || "x");
  const reduce = useReducedMotion() || still;
  const p = usePointer();
  const eyeX = useTransform(p.x, (v) => v * 3.2);
  const eyeY = useTransform(p.y, (v) => v * 2.4);
  const headX = useTransform(p.x, (v) => v * 4);
  const headR = useTransform(p.x, (v) => v * 3);
  const eyes = useRef(null);
  const arm = useRef(null);
  useBlink(eyes, reduce);
  const wave = () => {
    if (!reduce && arm.current) animate(arm.current, { rotate: [0, -22, 6, -22, 6, 0] }, { duration: 1.4, ease: "easeInOut" });
  };
  useEffect(() => {
    const t = setTimeout(wave, 900);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (kind === "blob") return <Mascot name={name} size={size} still={reduce} p={p} />;

  const skin = SKIN[h % SKIN.length];
  const hair = HAIR[(h >> 3) % HAIR.length];
  const style = (h >> 6) % 5;
  const initials = String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <motion.svg
      className="pf-char"
      width={size}
      height={size}
      viewBox="0 0 240 240"
      role="img"
      aria-label={"Illustration of " + (name || "the owner")}
      onPointerEnter={wave}
      initial={reduce ? false : { opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", visualDuration: 0.7, bounce: 0.25 }}
    >
      <circle cx="120" cy="120" r="112" className="pf-char-disc" />
      <motion.g animate={reduce ? undefined : { y: [0, -2.5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
        {/* body */}
        <path d="M44 236c4-46 36-70 76-70s72 24 76 70z" className="pf-char-shirt" />
        <path d="M100 168h40l-20 22z" fill={skin} />
        <text x="120" y="222" textAnchor="middle" className="pf-char-badge">
          {initials}
        </text>
        {/* waving arm */}
        <motion.g ref={arm} style={{ originX: "182px", originY: "196px" }}>
          <path d="M176 200c10-18 18-40 22-62" className="pf-char-sleeve" strokeWidth="18" strokeLinecap="round" fill="none" />
          <circle cx="199" cy="132" r="11" fill={skin} />
        </motion.g>
        {/* head */}
        <motion.g style={{ x: headX, rotate: headR, originX: "120px", originY: "150px" }}>
          {style === 1 && <path d="M70 92c0-34 22-54 50-54s50 20 50 54v58c-10 6-22 4-26-6H96c-4 10-16 12-26 6z" fill={hair} />}
          <rect x="108" y="140" width="24" height="26" rx="10" fill={skin} />
          <ellipse cx="120" cy="100" rx="40" ry="46" fill={skin} />
          <ellipse cx="80" cy="104" rx="7" ry="10" fill={skin} />
          <ellipse cx="160" cy="104" rx="7" ry="10" fill={skin} />
          {style === 0 && <path d="M78 92c0-30 18-48 42-48s42 18 42 48c-8-14-22-22-42-22s-34 8-42 22z" fill={hair} />}
          {style === 1 && <path d="M80 96c2-30 18-46 40-46s38 16 40 46c-14-12-28-18-40-18s-28 6-40 18z" fill={hair} />}
          {style === 2 && (
            <>
              <circle cx="120" cy="40" r="16" fill={hair} />
              <path d="M80 92c0-28 18-44 40-44s40 16 40 44c-10-12-24-18-40-18s-30 6-40 18z" fill={hair} />
            </>
          )}
          {style === 3 && (
            <g fill={hair}>
              {[[86, 70], [100, 58], [118, 54], [136, 58], [152, 70], [80, 86], [158, 86]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="14" />
              ))}
            </g>
          )}
          {style === 4 && <path d="M82 84c4-24 20-36 38-36s34 12 38 36c-10-6-24-8-38-8s-28 2-38 8z" fill={hair} opacity="0.9" />}
          {/* face */}
          <motion.g ref={eyes} style={{ x: eyeX, y: eyeY, originY: "104px" }}>
            <ellipse cx="104" cy="104" rx="4.6" ry="5.6" className="pf-char-eye" />
            <ellipse cx="136" cy="104" rx="4.6" ry="5.6" className="pf-char-eye" />
          </motion.g>
          <path d="M96 92c4-3 10-3 14 0M130 92c4-3 10-3 14 0" stroke={hair} strokeWidth="3" strokeLinecap="round" fill="none" />
          <circle cx="96" cy="120" r="7" fill="#F08A7E" opacity="0.28" />
          <circle cx="144" cy="120" r="7" fill="#F08A7E" opacity="0.28" />
          <path d="M108 124c6 6 18 6 24 0" stroke="#5B3326" strokeWidth="3" strokeLinecap="round" fill="none" />
        </motion.g>
      </motion.g>
    </motion.svg>
  );
}

// A soft blob mascot for businesses. Its outline breathes and its eyes follow the pointer.
function Mascot({ name, size, still, p }) {
  const eyes = useRef(null);
  useBlink(eyes, still);
  const eyeX = useTransform(p.x, (v) => v * 5);
  const eyeY = useTransform(p.y, (v) => v * 4);
  const A = "M120 40c44 0 80 30 80 78s-30 86-80 86-80-36-80-86 36-78 80-78z";
  const B = "M120 46c48 2 76 34 74 76s-34 80-74 80-78-30-76-80 28-78 76-76z";
  return (
    <motion.svg
      className="pf-char"
      width={size}
      height={size}
      viewBox="0 0 240 240"
      role="img"
      aria-label={"Mascot for " + (name || "the business")}
      initial={still ? false : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", visualDuration: 0.7, bounce: 0.3 }}
    >
      <circle cx="120" cy="120" r="112" className="pf-char-disc" />
      <motion.path d={A} className="pf-char-blob" animate={still ? undefined : { d: [A, B, A] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
      <motion.g ref={eyes} style={{ x: eyeX, y: eyeY, originY: "112px" }}>
        <ellipse cx="98" cy="112" rx="9" ry="12" className="pf-char-eye-bg" />
        <ellipse cx="142" cy="112" rx="9" ry="12" className="pf-char-eye-bg" />
        <circle cx="100" cy="114" r="5" className="pf-char-eye" />
        <circle cx="144" cy="114" r="5" className="pf-char-eye" />
      </motion.g>
      <path d="M106 146c8 8 20 8 28 0" stroke="currentColor" className="pf-char-mouth" strokeWidth="4" strokeLinecap="round" fill="none" />
      <motion.path
        d="M188 50l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"
        className="pf-char-spark"
        animate={still ? undefined : { scale: [0.6, 1.1, 0.6], rotate: [0, 45, 0], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{ originX: "188px", originY: "64px" }}
      />
    </motion.svg>
  );
}

// ---------------------------------------------------------------- Widgets

function Spark({ seed, on }) {
  const pts = useMemo(() => {
    let v = 20;
    const r = hash(seed);
    return Array.from({ length: 9 }, (_, i) => {
      v = Math.max(4, Math.min(36, v + (((r >> i) & 7) - 2.6) * 3));
      return [i * 12, 40 - v];
    });
  }, [seed]);
  const d = "M" + pts.map((p) => p.join(" ")).join(" L");
  return (
    <svg className="pf-w-spark" viewBox="0 0 96 40" preserveAspectRatio="none" aria-hidden="true">
      <motion.path d={d} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: on ? 0 : 1 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease, delay: 0.9 }} />
    </svg>
  );
}

function Typing({ text, still }) {
  const [shown, setShown] = useState(still ? text : "");
  useEffect(() => {
    if (still) return setShown(text);
    let i = 0;
    let t;
    const start = setTimeout(function tick() {
      i++;
      setShown(text.slice(0, i));
      if (i < text.length) t = setTimeout(tick, 28);
    }, 1400);
    return () => {
      clearTimeout(start);
      clearTimeout(t);
    };
  }, [text, still]);
  return (
    <span>
      {shown}
      {shown.length < text.length && <span className="pf-w-caret" aria-hidden="true" />}
    </span>
  );
}

const SPOTS = [
  { left: "-6%", top: "8%", depth: 18 },
  { right: "-8%", top: "22%", depth: -24 },
  { left: "-10%", bottom: "16%", depth: -14 },
  { right: "-4%", bottom: "4%", depth: 22 },
];

// Glass cards that float around the character, bob gently and drift with the pointer.
export function Widgets({ items, still }) {
  const reduce = useReducedMotion() || still;
  const p = usePointer();
  return (
    <>
      {items.slice(0, 4).map((w, i) => {
        const s = SPOTS[i];
        return <Widget key={i} w={w} i={i} spot={s} p={p} still={reduce} />;
      })}
    </>
  );
}

function Widget({ w, i, spot, p, still }) {
  const x = useTransform(p.x, (v) => v * spot.depth);
  const y = useTransform(p.y, (v) => v * spot.depth * 0.6);
  const { depth, ...pos } = spot;
  return (
    <motion.div className="pf-w-anchor" style={{ ...pos, x, y }}>
      <motion.div
        className={"pf-w pf-w-" + w.type}
        initial={still ? false : { opacity: 0, scale: 0.86, y: 18, filter: "blur(6px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        transition={{ type: "spring", visualDuration: 0.6, bounce: 0.28, delay: 0.5 + i * 0.14 }}
      >
        <motion.div animate={still ? undefined : { y: [0, -7, 0] }} transition={{ duration: 4.5 + i * 0.7, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}>
          {w.type === "stat" && (
            <>
              <span className="pf-w-label">{w.label}</span>
              <strong className="pf-w-value">{w.value}</strong>
              <Spark seed={w.label + w.value} on={!still} />
            </>
          )}
          {w.type === "chat" && (
            <p className="pf-w-chat">
              <Typing text={w.text} still={still} />
            </p>
          )}
          {w.type === "rating" && (
            <>
              <span className="pf-w-stars" aria-label={w.value + " out of 5"}>
                {[0, 1, 2, 3, 4].map((k) => (
                  <motion.span key={k} initial={still ? false : { scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", bounce: 0.5, delay: 1 + k * 0.08 }}>
                    ★
                  </motion.span>
                ))}
              </span>
              <span className="pf-w-label">{w.label}</span>
            </>
          )}
          {w.type === "status" && (
            <span className="pf-w-status">
              <span className="pf-w-pulse" aria-hidden="true" />
              {w.text}
            </span>
          )}
          {w.type === "tags" && (
            <span className="pf-w-taglist">
              {w.items.slice(0, 3).map((t, k) => (
                <motion.span key={t} initial={still ? false : { opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.1 + k * 0.12, duration: 0.4, ease }}>
                  {t}
                </motion.span>
              ))}
            </span>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// The "stage": character in the middle, an orbit ring and floating widgets.
export function Stage({ name, kind, widgets, still }) {
  const reduce = useReducedMotion() || still;
  return (
    <div className="pf-stage" aria-hidden={false}>
      <motion.div className="pf-stage-ring" animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }}>
        <span className="pf-stage-dot" />
      </motion.div>
      <div className="pf-stage-char">
        <Character name={name} kind={kind} size={280} still={reduce} />
      </div>
      <Widgets items={widgets} still={reduce} />
    </div>
  );
}

// ---------------------------------------------------------------- Live tiles

function TileShell({ children, i, className }) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, amount: 0.3 });
  const reduce = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      className={"pf-tile pf-card " + (className || "")}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
      animate={seen ? { opacity: 1, y: 0, scale: 1 } : undefined}
      transition={{ type: "spring", visualDuration: 0.6, bounce: 0.18, delay: i * 0.07 }}
    >
      {typeof children === "function" ? children(seen && !reduce) : children}
    </motion.div>
  );
}

function CountUp({ to, suffix, play }) {
  const [v, setV] = useState(play ? 0 : to);
  useEffect(() => {
    if (!play) return setV(to);
    const c = animate(0, to, { duration: 1.4, ease, onUpdate: setV });
    return () => c.stop();
  }, [to, play]);
  const dec = Number.isInteger(to) ? 0 : 1;
  return (
    <>
      {v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec })}
      {suffix}
    </>
  );
}

function Cycler({ words, play }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!play || words.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % words.length), 2200);
    return () => clearInterval(t);
  }, [play, words.length]);
  return (
    <span className="pf-tile-cycle">
      <motion.span key={i} initial={play ? { y: "100%", opacity: 0 } : false} animate={{ y: "0%", opacity: 1 }} transition={{ duration: 0.45, ease }}>
        {words[i]}
      </motion.span>
    </span>
  );
}

function Bars({ seed, play }) {
  const r = hash(seed);
  const vals = Array.from({ length: 7 }, (_, i) => 30 + ((r >> (i * 3)) & 63));
  return (
    <div className="pf-tile-bars" aria-hidden="true">
      {vals.map((v, i) => (
        <motion.span key={i} initial={{ scaleY: play ? 0 : 1 }} animate={{ scaleY: 1 }} transition={{ type: "spring", bounce: 0.3, visualDuration: 0.6, delay: 0.2 + i * 0.06 }} style={{ height: v + "%" }} />
      ))}
    </div>
  );
}

function Toggle({ label, play }) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    if (!play) return;
    const t = setInterval(() => setOn((x) => !x), 2600);
    return () => clearInterval(t);
  }, [play]);
  return (
    <div className="pf-tile-toggle">
      <span>{label}</span>
      <span className={"pf-switch" + (on ? " is-on" : "")} aria-hidden="true">
        <motion.span layout transition={{ type: "spring", visualDuration: 0.3, bounce: 0.3 }} />
      </span>
    </div>
  );
}

function Clock({ place }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="pf-tile-clock">
      <span className="pf-tile-pin" aria-hidden="true">
        <span />
      </span>
      <div>
        <strong>{place}</strong>
        <span className="pf-mono pf-muted">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} your time</span>
      </div>
    </div>
  );
}

// "At a glance": a bento of tiles that each animate on their own once scrolled into view.
export function LiveTiles({ stats = [], words = [], place = "", status = "", title = "At a glance" }) {
  const num = (v) => {
    const m = /^\s*([\d.,]+)\s*(.*)$/.exec(String(v));
    return m ? { n: parseFloat(m[1].replace(/,/g, "")), s: m[2] } : null;
  };
  const tiles = [];
  stats.slice(0, 2).forEach((s, i) => {
    const n = typeof s.value === "number" ? { n: s.value, s: s.suffix || "" } : num(s.value);
    tiles.push(
      <TileShell key={"s" + i} i={tiles.length} className={i === 0 ? "is-wide" : ""}>
        {(play) => (
          <>
            <span className="pf-tile-label">{s.label}</span>
            <strong className="pf-tile-num">{n ? <CountUp to={n.n} suffix={n.s} play={play} /> : s.value}</strong>
            {i === 0 ? <Bars seed={s.label} play={play} /> : <Spark seed={s.label} on={play} />}
          </>
        )}
      </TileShell>
    );
  });
  if (words.length)
    tiles.push(
      <TileShell key="w" i={tiles.length}>
        {(play) => (
          <>
            <span className="pf-tile-label">Good at</span>
            <strong className="pf-tile-big">
              <Cycler words={words} play={play} />
            </strong>
          </>
        )}
      </TileShell>
    );
  if (status)
    tiles.push(
      <TileShell key="t" i={tiles.length}>
        {(play) => <Toggle label={status} play={play} />}
      </TileShell>
    );
  if (place)
    tiles.push(
      <TileShell key="c" i={tiles.length}>
        <Clock place={place} />
      </TileShell>
    );
  if (tiles.length && tiles.length < 5)
    tiles.push(
      <TileShell key="go" i={tiles.length} className="pf-tile-go">
        <a href="#pf-contact" className="pf-tile-link">
          <span className="pf-tile-label">Next step</span>
          <strong className="pf-tile-big">Say hello</strong>
          <motion.span className="pf-tile-arrow" aria-hidden="true" animate={{ x: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
            →
          </motion.span>
        </a>
      </TileShell>
    );
  if (!tiles.length) return null;
  return (
    <section id="pf-tiles" className="pf-section" aria-label={title}>
      <div className="pf-container">
        <div className="pf-tiles">{tiles}</div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Backgrounds

// Drifting dots joined by faint lines. Pauses when off screen; still with reduced motion.
export function Particles() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let hgt = 0;
    let raf = 0;
    let visible = true;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const pts = [];
    const color = getComputedStyle(cv).color || "#888";
    const size = () => {
      const r = cv.getBoundingClientRect();
      w = r.width;
      hgt = r.height;
      cv.width = w * dpr;
      cv.height = hgt * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(70, (w * hgt) / 16000));
      pts.length = 0;
      for (let i = 0; i < n; i++) pts.push({ x: Math.random() * w, y: Math.random() * hgt, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3 });
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, hgt);
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      for (const p of pts) {
        if (!reduce) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > hgt) p.vy *= -1;
        }
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d = dx * dx + dy * dy;
          if (d < 12000) {
            ctx.globalAlpha = 0.18 * (1 - d / 12000);
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      if (!reduce && visible) raf = requestAnimationFrame(draw);
    };
    size();
    draw();
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !reduce) raf = requestAnimationFrame(draw);
    });
    io.observe(cv);
    const ro = new ResizeObserver(() => {
      size();
      if (reduce) draw();
    });
    ro.observe(cv);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, []);
  return <canvas ref={ref} className="pf-particles" aria-hidden="true" />;
}

// Three soft colour blobs drifting slowly behind the opening section.
export function Mesh() {
  return (
    <div className="pf-mesh" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

export function Backdrop({ kind }) {
  if (kind === "particles") return <Particles />;
  if (kind === "mesh") return <Mesh />;
  return null;
}
