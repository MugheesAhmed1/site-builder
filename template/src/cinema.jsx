import { useEffect, useMemo, useRef, useState } from "react";
import { Marquee } from "./shared.jsx";

// Cinema: the film-like opening and the pieces around it.
//   CinemaHero    a full-bleed scene behind centred words, with a slow push-in on scroll,
//                 depth that follows the pointer, drifting light motes and a stats row
//   ScatterHero   giant words scattered around a subject, each at its own depth
//   CinemaStrip   a quiet strip of names right under the opening
//   Silk          a WebGL backdrop of flowing ribbons of light, tinted by the accent
//   GlassCta      a call to action on a glass card over a scene
//   CurtainMenu   a full-screen menu that opens as a circle from the menu button
//   WordmarkFooter a footer card with the brand name set huge underneath
// Original code. Every effect stops when the visitor prefers less motion.

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

// Writes --cp (how far the block has scrolled away, 0..1), --mx and --my (pointer offset from
// the centre, -0.5..0.5, eased) onto the element. CSS turns them into motion.
function useDepth(ref, on) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !on || reduced()) return;
    const sc = el.closest("[data-scroll-root]");
    const target = sc || window;
    let raf = 0;
    let px = 0;
    let py = 0;
    let tx = 0;
    let ty = 0;
    const tick = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const top = sc ? r.top - sc.getBoundingClientRect().top : r.top;
      const p = Math.min(1, Math.max(0, -top / Math.max(1, r.height)));
      tx += (px - tx) * 0.09;
      ty += (py - ty) * 0.09;
      el.style.setProperty("--cp", p.toFixed(4));
      el.style.setProperty("--mx", tx.toFixed(4));
      el.style.setProperty("--my", ty.toFixed(4));
      if (Math.abs(px - tx) > 0.001 || Math.abs(py - ty) > 0.001) raf = requestAnimationFrame(tick);
    };
    const req = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const move = (e) => {
      const r = el.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width - 0.5;
      py = (e.clientY - r.top) / r.height - 0.5;
      req();
    };
    const leave = () => {
      px = 0;
      py = 0;
      req();
    };
    target.addEventListener("scroll", req, { passive: true });
    if (finePointer()) {
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
    }
    req();
    return () => {
      cancelAnimationFrame(raf);
      target.removeEventListener("scroll", req);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [on]);
}

// Soft motes of light that rise slowly through the scene. Pauses off screen.
function Motes({ count = 46 }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || reduced()) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let w = 0;
    let h = 0;
    let raf = 0;
    let seen = true;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const fit = () => {
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = Math.max(1, w * dpr);
      cv.height = Math.max(1, h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const motes = Array.from({ length: count }, () => ({ x: rnd(), y: rnd(), r: 0.6 + rnd() * 1.8, v: 0.004 + rnd() * 0.012, ph: rnd() * 6.28, sway: 0.2 + rnd() * 0.8 }));
    let last = performance.now();
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (!seen) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        m.y -= m.v * dt * 2.2;
        if (m.y < -0.05) {
          m.y = 1.05;
          m.x = rnd();
        }
        const x = (m.x + Math.sin(now / 2400 + m.ph) * 0.012 * m.sway) * w;
        const y = m.y * h;
        const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(now / 900 + m.ph));
        const g = ctx.createRadialGradient(x, y, 0, x, y, m.r * 4);
        g.addColorStop(0, `rgba(255,248,232,${a})`);
        g.addColorStop(1, "rgba(255,248,232,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, m.r * 4, 0, 6.283);
        ctx.fill();
      }
    };
    const io = new IntersectionObserver(([e]) => (seen = e.isIntersecting));
    io.observe(cv);
    const ro = new ResizeObserver(fit);
    ro.observe(cv);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, [count]);
  return <canvas ref={ref} className="cn-motes" aria-hidden="true" />;
}

function initials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

/** A small pill above the headline: a stack of faces (or initials) and a line of text. */
export function Badge({ text, people = [] }) {
  if (!text) return null;
  const faces = people.filter((p) => p && (p.photo || p.name)).slice(0, 4);
  return (
    <p className="cn-badge pf-enter" style={{ "--i": 0 }}>
      {faces.length > 0 && (
        <span className="cn-faces" aria-hidden="true">
          {faces.map((p, i) => (p.photo ? <img key={i} src={p.photo} alt="" /> : <span key={i} style={{ "--k": i }}>{initials(p.name)}</span>))}
        </span>
      )}
      {faces.length === 0 && <span className="cn-badge-tag">New</span>}
      <span>{text}</span>
    </p>
  );
}

function StatsRow({ stats }) {
  const list = (stats || []).filter((s) => s && s.value).slice(0, 4);
  if (!list.length) return null;
  return (
    <dl className="cn-stats pf-enter" style={{ "--i": 5 }}>
      {list.map((s, i) => (
        <div key={i}>
          <dd>{s.value}</dd>
          <dt>{s.label}</dt>
        </div>
      ))}
    </dl>
  );
}

/**
 * The film-like opening. `children` are the words (badge, headline, sub line, buttons).
 * `plate` is the scene picture; a `video` link plays instead when given.
 */
export function CinemaHero({ plate, video, still, stats, path, children }) {
  const ref = useRef(null);
  useDepth(ref, !still);
  return (
    <div ref={ref} className={"cn-hero" + (still ? " is-still" : "")}>
      <div className="cn-plate" aria-hidden={video ? "true" : undefined}>
        {video ? <video src={video} poster={plate} autoPlay muted loop playsInline /> : <img src={plate} alt="" data-img={path} fetchPriority="high" />}
      </div>
      {!still && <Motes />}
      <div className="cn-veil" aria-hidden="true" />
      <div className="pf-container cn-copy">{children}</div>
      <div className="pf-container cn-foot">
        <StatsRow stats={stats} />
      </div>
    </div>
  );
}

// Splits a headline into up to three lines of similar length.
function threeLines(text) {
  const words = String(text || "").replace(/\*/g, "").split(/\s+/).filter(Boolean);
  if (words.length <= 3) return words;
  const n = Math.min(3, words.length);
  const total = words.join(" ").length;
  const out = [];
  let cur = [];
  for (const w of words) {
    cur.push(w);
    if (out.length < n - 1 && cur.join(" ").length >= total / n) {
      out.push(cur.join(" "));
      cur = [];
    }
  }
  if (cur.length) out.push(cur.join(" "));
  return out;
}

/**
 * Giant words scattered around a subject. The middle line sits behind the subject and the
 * others in front, and each layer moves with the pointer at its own depth.
 */
export function ScatterHero({ text, subject, plate, props = [], stats, still, children }) {
  const ref = useRef(null);
  useDepth(ref, !still);
  const lines = useMemo(() => threeLines(text), [text]);
  const list = (stats || []).filter((s) => s && s.value).slice(0, 2);
  return (
    <div ref={ref} className={"cn-scatter" + (subject ? "" : " has-arch") + (still ? " is-still" : "")}>
      <div className="cn-scatter-bg" aria-hidden="true">
        <img src={plate} alt="" />
      </div>
      <h1 className="cn-words" aria-label={lines.join(" ")} style={{ "--len": Math.max(6, ...lines.map((l) => l.length)) }}>
        {lines.map((l, i) => (
          <span key={i} className={"cn-word cn-word-" + i} style={{ "--i": i }} aria-hidden="true">
            {l}
          </span>
        ))}
      </h1>
      <div className="cn-subject" aria-hidden="true">
        {subject ? <img className="cn-cutout" src={subject} alt="" /> : <span className="cn-arch"><img src={plate} alt="" /></span>}
      </div>
      {props.slice(0, 5).map((src, i) => (
        <img key={src + i} className={"cn-orbit cn-orbit-" + i} src={src} alt="" aria-hidden="true" style={{ "--i": i }} />
      ))}
      {list.map((s, i) => (
        <p key={i} className={"cn-corner cn-corner-" + i}>
          <b>{s.value}</b>
          <span>{s.label}</span>
        </p>
      ))}
      <div className="cn-scatter-copy">{children}</div>
    </div>
  );
}

/** Names that drift past under the opening, faded at both ends. */
export function CinemaStrip({ label, items }) {
  const list = (items || []).filter(Boolean);
  if (list.length < 3) return null;
  return (
    <div className="cn-strip">
      <div className="pf-container cn-strip-inner">
        {label && <p className="cn-strip-label">{label}</p>}
        <Marquee items={list} label={label || "Highlights"} />
      </div>
    </div>
  );
}

const SILK_VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
const SILK_FS = `precision mediump float;
uniform vec2 r;uniform float t;uniform vec3 a;uniform vec3 b;uniform float k;
void main(){
  vec2 uv=gl_FragCoord.xy/r;
  float ar=r.x/r.y;
  vec3 col=vec3(0.);
  for(int i=0;i<7;i++){
    float f=float(i);
    float x=uv.x*ar;
    float y=0.30+f*0.035+0.13*sin(x*1.15+t*0.22+f*1.31)+0.05*sin(x*2.9-t*0.37+f*2.1)+(uv.x-0.5)*0.42;
    float d=abs(uv.y-y);
    float w=0.006+0.045*(0.5+0.5*sin(x*1.7+f*0.9+t*0.31));
    float g=w/(d+w*0.55);
    vec3 c=mix(a,b,0.5+0.5*sin(f*1.7+uv.x*2.4+t*0.15));
    col+=c*g*0.15;
  }
  col=1.-exp(-col*1.6);
  float m=max(col.r,max(col.g,col.b));
  gl_FragColor=vec4(col*k,m*k);
}`;

function hexRgb(hex) {
  const m = /^#?([\da-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) return [0.4, 0.5, 1];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// The second colour of the ribbons: the accent turned part way round the colour wheel.
function turn([r, g, b], deg) {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const m = [
    0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
  ];
  const cl = (v) => Math.min(1, Math.max(0, v));
  return [cl(m[0] * r + m[1] * g + m[2] * b), cl(m[3] * r + m[4] * g + m[5] * b), cl(m[6] * r + m[7] * g + m[8] * b)];
}

/** Flowing ribbons of light behind the opening, in the accent colour and its neighbour. */
export function Silk() {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const gl = cv.getContext("webgl", { premultipliedAlpha: true, antialias: false, alpha: true });
    if (!gl) {
      setFailed(true);
      return;
    }
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, SILK_VS));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, SILK_FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) {
      setFailed(true);
      return;
    }
    gl.useProgram(pr);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n) => gl.getUniformLocation(pr, n);
    const host = cv.closest(".pf") || document.documentElement;
    const colours = () => {
      const acc = hexRgb(getComputedStyle(host).getPropertyValue("--pf-accent"));
      gl.uniform3fv(u("a"), acc);
      gl.uniform3fv(u("b"), turn(acc, 70));
      gl.uniform1f(u("k"), host.classList.contains("pf-scheme-light") ? 0.85 : 1);
    };
    colours();
    const scale = 0.5;
    const fit = () => {
      cv.width = Math.max(1, cv.clientWidth * scale);
      cv.height = Math.max(1, cv.clientHeight * scale);
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform2f(u("r"), cv.width, cv.height);
    };
    fit();
    const still = reduced();
    let raf = 0;
    let seen = true;
    const t0 = performance.now();
    const draw = (now) => {
      gl.uniform1f(u("t"), still ? 8 : (now - t0) / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (seen) draw(now);
    };
    const io = new IntersectionObserver(([e]) => (seen = e.isIntersecting));
    io.observe(cv);
    const ro = new ResizeObserver(() => {
      fit();
      if (still) draw(0);
    });
    ro.observe(cv);
    const mo = new MutationObserver(colours);
    mo.observe(host, { attributes: true, attributeFilter: ["class", "style"] });
    if (still) draw(0);
    else raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
    };
  }, []);
  return failed ? <div className="cn-silk cn-silk-css" aria-hidden="true" /> : <canvas ref={ref} className="cn-silk" aria-hidden="true" />;
}

/** A call to action on a frosted glass card over a scene. */
export function GlassCta({ plate, heading, text, button, href, newTab, path }) {
  return (
    <section id="pf-cta" className="cn-cta">
      <div className="pf-container">
        <div className="cn-cta-frame pf-reveal">
          <img className="cn-cta-img" src={plate} alt="" data-img={path} loading="lazy" />
          <div className="cn-cta-card">
            <h2 className="cn-cta-title">{heading}</h2>
            {text && <p className="cn-cta-text">{text}</p>}
            {button && (
              <a className="pf-btn cn-cta-btn" href={href} target={newTab ? "_blank" : undefined} rel="noreferrer">
                {button}
                <span aria-hidden="true"> →</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** A full-screen menu that opens as a growing circle from the top right corner. */
export function CurtainMenu({ open, onClose, links, brand, cta }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const key = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    const first = ref.current && ref.current.querySelector("a");
    if (first) first.focus({ preventScroll: true });
    return () => window.removeEventListener("keydown", key);
  }, [open]);
  return (
    <div ref={ref} className={"cn-curtain" + (open ? " is-open" : "")} role="dialog" aria-modal="true" aria-label="Menu" aria-hidden={!open} inert={!open}>
      <div className="cn-curtain-top">
        <span className="pf-brand">{brand}</span>
        <button className="cn-curtain-close" onClick={onClose}>
          Close
        </button>
      </div>
      <nav className="cn-curtain-links" aria-label="Sections">
        {links.map((l, i) => (
          <a key={l.href} href={l.href} onClick={onClose} style={{ "--i": i }}>
            <span>{l.label}</span>
            <span aria-hidden="true">→</span>
          </a>
        ))}
      </nav>
      {cta && (
        <a className="pf-btn pf-btn-primary cn-curtain-cta" href={cta.href} onClick={onClose}>
          {cta.label}
        </a>
      )}
    </div>
  );
}

/** A footer card with links, and the brand name set huge underneath, fading into the page. */
export function WordmarkFooter({ brand, blurb, links = [], contact = [] }) {
  const name = String(brand || "").trim();
  return (
    <footer className="cn-footer">
      <div className="pf-container">
        <div className="cn-footer-card">
          <div className="cn-footer-about">
            <strong className="pf-brand">{name}</strong>
            {blurb && <p className="pf-muted pf-small">{blurb}</p>}
          </div>
          {links.length > 0 && (
            <nav className="cn-footer-col" aria-label="Footer">
              <p className="cn-footer-head">Explore</p>
              {links.map((l) => (
                <a key={l.href} href={l.href}>
                  {l.label}
                </a>
              ))}
            </nav>
          )}
          {contact.length > 0 && (
            <div className="cn-footer-col">
              <p className="cn-footer-head">Say hello</p>
              {contact.map((l) => (
                <a key={l.href} href={l.href} target={/^https?:/.test(l.href) ? "_blank" : undefined} rel="noreferrer">
                  {l.label}
                </a>
              ))}
            </div>
          )}
          <p className="cn-footer-copy pf-small pf-muted">
            © {new Date().getFullYear()} {name} · <a href="#pf-top">Back to top</a>
          </p>
        </div>
      </div>
      <div className="cn-mark" aria-hidden="true" style={{ "--n": Math.max(3, name.length) }}>
        {name}
      </div>
    </footer>
  );
}
