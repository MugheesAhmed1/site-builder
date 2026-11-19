import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import type { Block, BlockRequirement, HeroAsset, SectionSpec } from "../content/blocks";
import { direct, ENV_LOOK, type DirectorTokens } from "../director";
import { useReducedMotion } from "../motion/runtime";
import type { ModelOptions, ModelView } from "../scenes/webgl/model";
import { Headline } from "./Text";
import type { Ctx } from "./sections";

// A dynamic section (PRD journey). The block's SectionSpec says how it is generated: layout,
// hero asset, background, animation and the Director cut. Every PRD requirement the block
// carries is drawn with data-req="<id>", so the coverage check can prove it is on the page;
// the section itself carries data-prd="<PRD section id>". Words and pictures keep their
// content paths, so Edit on page reaches each of them.

type Mount = (canvas: HTMLCanvasElement, o: ModelOptions) => ModelView | null;

/** The model view: already loaded, a downloaded site's site-3d.js, or a code-split import in the builder. */
function loadModel(): Promise<Mount | null> {
  const w = window as Window & { __xp3dModel?: Mount; __XP_3D_SRC?: string; __xp3dLoading?: Promise<void> };
  if (w.__xp3dModel) return Promise.resolve(w.__xp3dModel);
  if (w.__XP_3D_SRC) {
    w.__xp3dLoading ??= new Promise<void>((done) => {
      const s = document.createElement("script");
      s.src = w.__XP_3D_SRC!;
      s.async = true;
      s.onload = () => done();
      s.onerror = () => done();
      document.head.appendChild(s);
    });
    return w.__xp3dLoading.then(() => w.__xp3dModel ?? null);
  }
  return import("../scenes/webgl/model").then((m) => (m.default as Mount | null) ?? null).catch(() => null);
}

function webgl() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function luminance(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** Whether the section's words sit on a dark ground. */
export function sectionTone(spec: SectionSpec, d: DirectorTokens): "dark" | "light" | "page" {
  const bg = spec.background;
  if (bg.tone === "dark" || bg.tone === "light") return bg.tone;
  if (bg.type === "environment") return ENV_LOOK[bg.environment ?? d.asset.environment]?.dark ? "dark" : "light";
  if (bg.type === "image" || bg.type === "video") return "dark";
  if (bg.type === "solid" && bg.color) return luminance(bg.color) < 0.3 ? "dark" : "light";
  if (bg.type === "gradient" && bg.gradient) return (luminance(bg.gradient[0]) + luminance(bg.gradient[1])) / 2 < 0.3 ? "dark" : "light";
  return d.tone;
}

const TEXT_FACE: Record<NonNullable<NonNullable<SectionSpec["text"]>["face"]>, string> = {
  display: "var(--font-display)",
  serif: 'ui-serif, "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
  body: "var(--font-body)",
  rounded: 'ui-rounded, "SF Pro Rounded", "Nunito", var(--font-body)',
  mono: "var(--font-mono)",
};
const FACE: Record<DirectorTokens["type"]["face"], string> = {
  display: "var(--font-display)",
  body: "var(--font-body)",
  mono: "var(--font-mono)",
  serif: 'ui-serif, "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
};

function vars(spec: SectionSpec, d: DirectorTokens, tone: string): CSSProperties {
  const bg = spec.background;
  const env = ENV_LOOK[bg.environment ?? d.asset.environment] ?? ENV_LOOK.lab;
  const v: Record<string, string | number> = {
    "--xb-space": d.space,
    "--xb-scale": d.type.scale,
    "--xb-weight": d.type.weight,
    "--xb-track": d.type.tracking + "em",
    "--xb-case": d.type.caps ? "uppercase" : "none",
    "--xb-face": FACE[d.type.face],
    "--xb-lead": d.type.lead,
    "--xb-measure": d.measure + "ch",
    "--xb-energy": d.intensity,
    "--xb-glow": d.asset.glow,
    "--xb-env": env.base,
    "--xb-env-glow": env.glow,
    "--xb-env-floor": env.floor,
    "--xb-dim": Math.max(0, Math.min(0.85, bg.dim ?? 0.35)),
  };
  const t = spec.text;
  if (t) {
    if (t.size) v["--xb-scale"] = +(d.type.scale * Math.max(0.6, Math.min(1.8, t.size))).toFixed(3);
    if (t.weight) v["--xb-weight"] = Math.max(300, Math.min(900, t.weight));
    if (t.face) v["--xb-face"] = TEXT_FACE[t.face];
    if (t.width) v["--xb-measure"] = (t.width === "narrow" ? Math.round(d.measure * 0.75) : t.width === "wide" ? Math.round(d.measure * 1.35) : d.measure) + "ch";
    if (t.caps != null) v["--xb-case"] = t.caps ? "uppercase" : "none";
  }
  const cols = spec.items?.columns;
  if (cols) v["--xb-cols"] = Math.max(1, Math.min(4, cols));
  if (tone === "dark") Object.assign(v, { "--bg": bg.type === "solid" && bg.color ? bg.color : bg.type === "environment" ? env.base : "#0b0d12", "--text": "#f4f5f7", "--muted": "#aab1bd", "--surface": "rgba(255,255,255,0.06)", "--border": "rgba(255,255,255,0.14)" });
  else if (tone === "light") Object.assign(v, { "--bg": bg.type === "solid" && bg.color ? bg.color : bg.type === "environment" ? env.base : "#ffffff", "--text": "#14161a", "--muted": "#5b6270", "--surface": "rgba(0,0,0,0.035)", "--border": "rgba(0,0,0,0.12)" });
  if (bg.type === "solid" && bg.color) v["--bg"] = bg.color;
  if (bg.type === "gradient") {
    const [a, b, deg] = bg.gradient ?? ["var(--bg)", "color-mix(in srgb, var(--accent) 30%, var(--bg))", 160];
    v["--xb-gradient"] = `linear-gradient(${deg}deg, ${a}, ${b})`;
  }
  return v as CSSProperties;
}

// ------------------------------------------------------------------ particles

function Particles({ count = 70, mode = "drift", reduced }: { count?: number; mode?: "drift" | "burst" | "field"; reduced: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const g = cv?.getContext("2d");
    if (!cv || !g) return;
    const accent = getComputedStyle(cv).getPropertyValue("--accent").trim() || "#7c3aed";
    const text = getComputedStyle(cv).getPropertyValue("--text").trim() || "#ffffff";
    let w = 0;
    let h = 0;
    let raf = 0;
    let on = true;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const n = Math.round(count * (window.innerWidth < 760 ? 0.5 : 1));
    const ps = Array.from({ length: n }, () => ({ x: rnd(), y: rnd(), r: 0.6 + rnd() * 2.2, s: 0.2 + rnd(), a: rnd() * Math.PI * 2, c: rnd() > 0.6 }));
    const size = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const t0 = performance.now();
    const draw = () => {
      const t = reduced ? 0 : (performance.now() - t0) / 1000;
      g.clearRect(0, 0, w, h);
      const p = Number(getComputedStyle(cv).getPropertyValue("--p")) || 0.5;
      for (const q of ps) {
        let x = q.x * w;
        let y = q.y * h;
        if (mode === "drift") {
          x += Math.sin(t * 0.3 * q.s + q.a) * 18;
          y = ((q.y - t * 0.012 * q.s) % 1 + 1) % 1 * h;
        } else if (mode === "burst") {
          // The particle transition: particles gather into the frame as the section arrives, then scatter.
          const k = Math.min(1, Math.abs(p - 0.5) * 2.4);
          x = w / 2 + (x - w / 2) * (0.25 + k * 1.4) + Math.cos(q.a + t * 0.4) * 10;
          y = h / 2 + (y - h / 2) * (0.25 + k * 1.4) + Math.sin(q.a + t * 0.4) * 10;
        } else {
          x += Math.cos(t * 0.5 + q.a) * 6;
          y += Math.sin(t * 0.4 + q.a) * 6;
        }
        g.globalAlpha = 0.25 + q.s * 0.5;
        g.fillStyle = q.c ? accent : text;
        g.beginPath();
        g.arc(x, y, q.r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    };
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (on && !document.hidden) draw();
    };
    size();
    draw();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => (size(), draw())) : null;
    ro?.observe(cv);
    const io = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver((es) => (on = es[0]?.isIntersecting ?? true)) : null;
    io?.observe(cv);
    if (!reduced) raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      io?.disconnect();
    };
  }, [count, mode, reduced]);
  return <canvas ref={ref} className="xb-particles" aria-hidden="true" />;
}

// ------------------------------------------------------------------ illustrations (original, drawn in SVG)

function Illustration({ kind }: { kind: string }) {
  if (kind === "waves")
    return (
      <svg className="xb-ill is-waves" viewBox="0 0 400 300" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={`M0 ${150 + i * 18} C 80 ${110 + i * 18}, 160 ${190 + i * 18}, 240 ${150 + i * 18} S 360 ${110 + i * 18}, 400 ${150 + i * 18}`} style={{ ["--i" as string]: i }} />
        ))}
      </svg>
    );
  if (kind === "blob")
    return (
      <svg className="xb-ill is-blob" viewBox="0 0 400 400" aria-hidden="true">
        <defs>
          <radialGradient id="xbg" cx="35%" cy="30%">
            <stop offset="0" stopColor="#fff" stopOpacity=".55" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d="M312 230c-10 68-78 110-142 96S56 260 70 188s82-118 148-110 104 84 94 152z" />
        <path className="xb-ill-shine" d="M312 230c-10 68-78 110-142 96S56 260 70 188s82-118 148-110 104 84 94 152z" fill="url(#xbg)" />
      </svg>
    );
  if (kind === "grid")
    return (
      <svg className="xb-ill is-grid" viewBox="0 0 400 400" aria-hidden="true">
        {Array.from({ length: 36 }, (_, i) => (
          <rect key={i} x={30 + (i % 6) * 58} y={30 + Math.floor(i / 6) * 58} width="40" height="40" rx="10" style={{ ["--i" as string]: (i % 6) + Math.floor(i / 6) }} />
        ))}
      </svg>
    );
  if (kind === "rings")
    return (
      <svg className="xb-ill is-rings" viewBox="0 0 400 400" aria-hidden="true">
        {[150, 120, 90, 60, 30].map((r, i) => (
          <circle key={r} cx="200" cy="200" r={r} style={{ ["--i" as string]: i }} />
        ))}
      </svg>
    );
  return (
    <svg className="xb-ill is-orbits" viewBox="0 0 400 400" aria-hidden="true">
      <circle className="xb-ill-core" cx="200" cy="200" r="44" />
      {[90, 130, 170].map((r, i) => (
        <g key={r} className="xb-ill-orbit" style={{ ["--i" as string]: i }}>
          <ellipse cx="200" cy="200" rx={r} ry={r * 0.42} />
          <circle cx={200 + r} cy="200" r={8 - i * 1.5} />
        </g>
      ))}
    </svg>
  );
}

// ------------------------------------------------------------------ the 3D model

function ModelCanvas({ hero, d, env, editing, path }: { hero: HeroAsset; d: DirectorTokens; env: { base: string; glow: string } | null; editing: boolean; path: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const view = useRef<ModelView | null>(null);
  const reduced = useReducedMotion();
  const [state, setState] = useState<"wait" | "on" | "off">("wait");
  const opts = (): ModelOptions => ({
    src: hero.src || "",
    scale: hero.scale ?? 1,
    rotation: hero.rotation ?? [0, 0, 0],
    position: hero.position ?? [0, 0],
    camera: hero.camera ?? d.camera.move,
    lighting: hero.lighting ?? d.asset.lighting,
    motion: hero.motion ?? d.asset.motion,
    speed: d.camera.speed,
    distance: d.camera.distance,
    fov: d.camera.fov,
    accent: (ref.current && getComputedStyle(ref.current).getPropertyValue("--accent").trim()) || "#7c3aed",
    env,
    reduced: reduced || editing,
  });
  const latest = useRef(opts);
  latest.current = opts;
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    let gone = false;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      if (!webgl()) return setState("off");
      loadModel().then((mount) => {
        if (gone || !mount || !ref.current) return setState("off");
        view.current = mount(ref.current, latest.current());
        setState(view.current ? "on" : "off");
      });
    };
    // Models load once the section comes near the screen, never with the first paint.
    const io = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && start(), { rootMargin: "400px 0px" }) : null;
    if (io) io.observe(cv);
    else start();
    // Scroll progress drives "scroll" camera moves.
    const scene = cv.closest(".xp-scene") as HTMLElement | null;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (view.current && scene) view.current.progress(Number(scene.style.getPropertyValue("--p")) || 0.5);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      gone = true;
      io?.disconnect();
      cancelAnimationFrame(raf);
      view.current?.dispose();
      view.current = null;
    };
  }, []);
  useEffect(() => {
    view.current?.update(latest.current());
  });
  return (
    <div className="xb-model" data-state={state} data-model={path}>
      <canvas ref={ref} aria-label={hero.alt || hero.subject || "3D model"} role="img" />
      {state === "off" && <Illustration kind="blob" />}
    </div>
  );
}

// ------------------------------------------------------------------ the hero asset

function HeroVisual({ b, i, ctx, d, env }: { b: Block; i: number; ctx: Ctx; d: DirectorTokens; env: { base: string; glow: string } | null }) {
  const h = b.spec.hero;
  const reduced = useReducedMotion();
  const path = `blocks.${i}.spec.hero.src`;
  const style = {
    ["--xb-s" as string]: h.scale ?? 1,
    ["--xb-r" as string]: (h.rotation?.[2] ?? 0) + "deg",
    ["--xb-x" as string]: (h.position?.[0] ?? 0) + "%",
    ["--xb-y" as string]: (h.position?.[1] ?? 0) + "%",
    ["--xb-radius" as string]: h.radius != null ? h.radius + "px" : undefined,
  } as CSSProperties;
  let inner = null;
  if (h.type === "glb") inner = <ModelCanvas hero={h} d={d} env={env} editing={ctx.editing} path={path} />;
  else if (h.type === "image")
    inner = h.src ? (
      <div className="xp-pic xb-pic" data-img={path}>
        <img src={h.src} alt={h.alt || b.heading} loading={b.lead ? "eager" : "lazy"} decoding="async" style={{ objectPosition: `${h.focus?.[0] ?? 50}% ${h.focus?.[1] ?? 50}%`, scale: String(h.zoom ?? 1) }} />
      </div>
    ) : ctx.preview ? (
      <div className="xp-pic xp-pic-empty xb-pic" data-img={path} data-img-empty="">
        <span>Add a picture</span>
      </div>
    ) : (
      <Illustration kind={h.illustration || "orbits"} />
    );
  else if (h.type === "video")
    inner = h.src ? (
      <div className="xb-video" data-video={path}>
        <video src={h.src} autoPlay={!reduced} muted loop playsInline preload="metadata" aria-label={h.alt || b.heading} />
      </div>
    ) : ctx.preview ? (
      <div className="xp-pic xp-pic-empty xb-pic" data-video={path}>
        <span>Add a video</span>
      </div>
    ) : null;
  else if (h.type === "illustration") inner = <Illustration kind={h.illustration || "orbits"} />;
  else if (h.type === "particles") inner = <Particles count={110} mode="field" reduced={reduced || ctx.editing} />;
  if (!inner) return null;
  return (
    <div className="xb-asset" data-asset={h.type} style={style}>
      <div className="xb-asset-in">{inner}</div>
    </div>
  );
}

// ------------------------------------------------------------------ background

function BackgroundLayer({ b, i, ctx }: { b: Block; i: number; ctx: Ctx }) {
  const bg = b.spec.background;
  const reduced = useReducedMotion();
  const path = `blocks.${i}.spec.background.src`;
  if (bg.type === "image")
    return (
      <div className="xb-bg" data-bg="image" data-img={path}>
        {bg.src ? <img src={bg.src} alt="" loading="lazy" decoding="async" /> : null}
        <span className="xb-dim" />
      </div>
    );
  if (bg.type === "video")
    return (
      <div className="xb-bg" data-bg="video" data-video={path}>
        {bg.src ? <video src={bg.src} autoPlay={!reduced} muted loop playsInline preload="metadata" aria-hidden="true" /> : null}
        <span className="xb-dim" />
      </div>
    );
  if (bg.type === "environment")
    return (
      <div className="xb-bg" data-bg="environment" data-env={bg.environment}>
        <span className="xb-env-sky" />
        <span className="xb-env-floor" />
        <Particles count={40} mode="drift" reduced={reduced || ctx.editing} />
      </div>
    );
  if (bg.type === "particles")
    return (
      <div className="xb-bg" data-bg="particles">
        <Particles count={90} mode="drift" reduced={reduced || ctx.editing} />
      </div>
    );
  return <div className="xb-bg" data-bg={bg.type} />;
}

// ------------------------------------------------------------------ functional requirements

function contactEmail(c: any): string {
  return (c?.contact?.email || "").trim();
}

function Form({ r, ctx }: { r: BlockRequirement; ctx: Ctx }) {
  const [sent, setSent] = useState(false);
  const fields = r.fields?.length ? r.fields : ["Name", "Email", "Message"];
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (ctx.editing) return;
    const data = new FormData(e.currentTarget);
    const to = contactEmail(ctx.c);
    const body = fields.map((f) => `${f}: ${data.get(f) ?? ""}`).join("\n");
    if (to) window.location.href = `mailto:${to}?subject=${encodeURIComponent(r.action || "Website enquiry")}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };
  const typeOf = (f: string) => (/e-?mail/i.test(f) ? "email" : /phone|mobile|whats/i.test(f) ? "tel" : /date|day/i.test(f) ? "date" : /time/i.test(f) ? "time" : /guests|people|number|qty|quantity/i.test(f) ? "number" : "text");
  return (
    <form className="xb-form" onSubmit={submit}>
      {fields.map((f) =>
        /message|notes?|details|question|comment/i.test(f) ? (
          <label key={f} className="is-wide">
            <span>{f}</span>
            <textarea name={f} rows={3} />
          </label>
        ) : (
          <label key={f}>
            <span>{f}</span>
            <input name={f} type={typeOf(f)} required={/name|e-?mail/i.test(f)} autoComplete={/e-?mail/i.test(f) ? "email" : /name/i.test(f) ? "name" : "off"} />
          </label>
        ),
      )}
      <button type="submit" className="xp-btn xp-btn-main">
        {r.action || "Send"}
      </button>
      {sent && (
        <p className="xb-sent" role="status">
          Thank you. We will be in touch soon.
        </p>
      )}
    </form>
  );
}

function Search({ b }: { b: Block }) {
  const [q, setQ] = useState("");
  const pool = b.items.length ? b.items : b.reqs.map((r) => ({ title: r.text, text: "" }));
  const hits = pool.filter((x) => (x.title + " " + x.text).toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="xb-search">
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search this section" />
      <ul>
        {hits.slice(0, 12).map((x, k) => (
          <li key={k}>
            <b>{x.title}</b>
            {x.text && <span>{x.text}</span>}
          </li>
        ))}
        {!hits.length && <li className="xb-none">Nothing matches that yet.</li>}
      </ul>
    </div>
  );
}

function Explore({ b }: { b: Block }) {
  const [on, setOn] = useState(0);
  const items = b.items.length ? b.items : [{ title: b.heading, text: b.body }];
  const cur = items[Math.min(on, items.length - 1)];
  return (
    <div className="xb-explore">
      <div role="tablist" aria-label={b.heading}>
        {items.map((x, k) => (
          <button key={k} type="button" role="tab" aria-selected={k === on} onClick={() => setOn(k)}>
            <span className="mono">{String(k + 1).padStart(2, "0")}</span> {x.title}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="xb-explore-panel">
        <b>{cur.title}</b>
        <p>{cur.text}</p>
      </div>
    </div>
  );
}

function Widget({ r, b, i, k, ctx }: { r: BlockRequirement; b: Block; i: number; k: number; ctx: Ctx }) {
  const items = b.items;
  switch (r.widget) {
    case "form":
      return <Form r={r} ctx={ctx} />;
    case "faq":
      return (
        <div className="xb-faq">
          {(items.length ? items : [{ title: r.text, text: "" }]).map((x, n) => (
            <details key={n}>
              <summary>{x.title}</summary>
              <p>{x.text}</p>
            </details>
          ))}
        </div>
      );
    case "pricing":
      return (
        <div className="xb-pricing">
          {items.map((x, n) => (
            <article key={n} className={n === 1 ? "is-featured" : ""}>
              <h4>{x.title}</h4>
              {x.value && <p className="xb-price">{x.value}</p>}
              <p>{x.text}</p>
              <a className="xp-btn" href={b.cta?.href || "#pf-contact"}>
                {r.action || "Choose"}
              </a>
            </article>
          ))}
        </div>
      );
    case "gallery":
      return (
        <div className="xb-gallery">
          {(items.length ? items : [{ title: r.text, text: "" }]).map((x, n) =>
            x.imageUrl ? (
              <figure key={n} className="xp-pic" data-img={`blocks.${i}.items.${n}.imageUrl`}>
                <img src={x.imageUrl} alt={x.title} loading="lazy" decoding="async" />
                <figcaption>{x.title}</figcaption>
              </figure>
            ) : ctx.preview ? (
              <figure key={n} className="xp-pic xp-pic-empty" data-img={`blocks.${i}.items.${n}.imageUrl`} data-img-empty="">
                <span>{x.title || "Add a picture"}</span>
              </figure>
            ) : null,
          )}
        </div>
      );
    case "map": {
      const addr = ctx.c?.visit?.address || r.src || "";
      return (
        <div className="xb-map">
          <p>{addr || r.text}</p>
          {addr && (
            <a className="xp-btn" href={"https://www.openstreetmap.org/search?query=" + encodeURIComponent(addr)} target="_blank" rel="noreferrer">
              {r.action || "Open the map"}
            </a>
          )}
        </div>
      );
    }
    case "video":
      return r.src ? (
        <div className="xb-video" data-video={`blocks.${i}.reqs.${k}.src`}>
          <video src={r.src} controls playsInline preload="metadata" aria-label={r.text} />
        </div>
      ) : ctx.preview ? (
        <div className="xp-pic xp-pic-empty xb-pic" data-video={`blocks.${i}.reqs.${k}.src`}>
          <span>Add the video</span>
        </div>
      ) : null;
    case "stats":
      return (
        <div className="xb-stats">
          {items.map((x, n) => (
            <div key={n}>
              <b data-count="">{x.value || x.title}</b>
              <span>{x.value ? x.title : x.text}</span>
            </div>
          ))}
        </div>
      );
    case "compare":
      return (
        <table className="xb-compare">
          <tbody>
            {items.map((x, n) => (
              <tr key={n}>
                <th scope="row">{x.title}</th>
                <td>{x.text}</td>
                {x.value && <td>{x.value}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "search":
      return <Search b={b} />;
    case "explore":
      return <Explore b={b} />;
    case "download":
    case "button":
      return (
        <a className="xp-btn xp-btn-main" href={r.src || b.cta?.href || "#pf-contact"} {...(r.widget === "download" ? { download: "" } : {})}>
          {r.action || b.cta?.label || "Continue"}
        </a>
      );
    default:
      return null;
  }
}

// ------------------------------------------------------------------ the section

const SAYS = /^(state|say|summari[sz]e|introduce|describe|explain|open with|tell)\b/i;
const LISTS = /^(list|show (each|every|all)|name (each|every|the))\b/i;

export function BlockBody({ b, i, ctx }: { b: Block; i: number; ctx: Ctx }) {
  const d = direct(b.spec.director, b.spec.secondary);
  const tone = sectionTone(b.spec, d);
  const reduced = useReducedMotion();
  const envId = b.spec.background.type === "environment" ? b.spec.background.environment ?? d.asset.environment : null;
  const env = envId ? ENV_LOOK[envId] : null;
  const enter = ctx.enter === "fade" ? "fade" : b.spec.animation === "reveal" ? "reveal" : d.entrance;
  const c2: Ctx = { ...ctx, enter };
  const widgets = b.reqs.filter((r) => r.kind === "functional" && r.widget && r.widget !== "list");
  const usedByWidget = new Set(widgets.map((r) => r.widget));
  const showItems = b.items.length > 0 && !["faq", "pricing", "gallery", "stats", "compare", "search", "explore"].some((w) => usedByWidget.has(w as never));
  // A content requirement written as an instruction ("State the main promise", "List every role")
  // is met by the words it asks for, so it is marked on them rather than printed as a bullet.
  const byCopy = b.body.trim() ? b.reqs.filter((r) => r.kind === "content" && SAYS.test(r.text)) : [];
  const byItems = showItems ? b.reqs.filter((r) => r.kind === "content" && LISTS.test(r.text)) : [];
  const met = new Set([...byCopy, ...byItems].map((r) => r.id));
  const points = b.reqs.filter((r) => !met.has(r.id) && (r.kind === "content" || !r.widget || r.widget === "list"));

  const H = b.lead ? "h1" : "h2";
  const kicker = d.type.kicker !== "none" && b.kicker;
  const numbered = d.hierarchy.numbered;
  return (
    <div
      className={"xb" + (b.lead ? " is-lead" : "")}
      data-prd={b.prd}
      data-block={b.id}
      data-layout={b.spec.layout}
      data-director={b.spec.director}
      data-director2={b.spec.secondary || undefined}
      data-anim={b.spec.animation}
      data-tone={tone}
      data-bg={b.spec.background.type}
      data-flip={i % 2 ? "" : undefined}
      data-align={d.hierarchy.align}
      data-talign={b.spec.text?.align || undefined}
      data-items={b.spec.items?.style || undefined}
      data-tr={d.transition}
      style={vars(b.spec, d, tone)}
    >
      <BackgroundLayer b={b} i={i} ctx={ctx} />
      {b.spec.animation === "particles" && !reduced && <Particles count={80} mode="burst" reduced={ctx.editing} />}
      <div className="xb-grid">
        <div className="xb-copy" data-reqs={byCopy.map((r) => r.id).join(" ") || undefined}>
          {(kicker || (numbered && !b.lead)) && (
            <p className={"xb-kicker is-" + (d.type.kicker === "none" ? "plain" : d.type.kicker)} data-enter={enter}>
              {numbered && <span className="xb-num">{String(i + 1).padStart(2, "0")}</span>}
              {kicker ? <span>{b.kicker}</span> : null}
            </p>
          )}
          {d.hierarchy.rule && <span className="xb-rule" aria-hidden="true" />}
          <Headline as={H} className="xb-h" text={b.heading} primitive={ctx.text} />
          {b.body && (
            <p className="xb-body" data-enter={enter} style={{ ["--i" as string]: 1 }}>
              {b.body}
            </p>
          )}
          {points.length > 0 && (
            <ul className="xb-points">
              {points.map((r) => (
                <li key={r.id} data-req={r.id} data-req-kind={r.kind} data-enter={enter} style={{ ["--i" as string]: 2 }}>
                  {r.text}
                </li>
              ))}
            </ul>
          )}
          {b.cta?.label && !widgets.some((w) => w.widget === "button") && (
            <div className="xp-actions" data-enter={enter} style={{ ["--i" as string]: 3 }}>
              <a className="xp-btn xp-btn-main" href={b.cta.href || "#pf-contact"} data-magnetic="">
                {b.cta.label}
              </a>
            </div>
          )}
        </div>
        <HeroVisual b={b} i={i} ctx={ctx} d={d} env={env} />
      </div>
      {(showItems || widgets.length > 0) && (
        <div className="xb-more">
          {showItems && (
            <div className="xb-items" data-reqs={byItems.map((r) => r.id).join(" ") || undefined}>
              {b.items.map((x, n) => (
                <article key={n} className="xb-item" data-enter={enter} style={{ ["--i" as string]: n }}>
                  {x.imageUrl && b.spec.items?.images !== false ? (
                    <div className="xp-pic" data-img={`blocks.${i}.items.${n}.imageUrl`}>
                      <img src={x.imageUrl} alt={x.title} loading="lazy" decoding="async" />
                    </div>
                  ) : b.spec.items?.images && ctx.editing ? (
                    <div className="xp-pic xb-pic-empty" data-img={`blocks.${i}.items.${n}.imageUrl`} aria-hidden="true" />
                  ) : null}
                  {numbered && <span className="xb-num">{String(n + 1).padStart(2, "0")}</span>}
                  <h3>{x.title}</h3>
                  {x.value && <p className="xb-value">{x.value}</p>}
                  <p>{x.text}</p>
                </article>
              ))}
            </div>
          )}
          {widgets.map((r) => (
            <div key={r.id} className={"xb-widget is-" + r.widget} data-req={r.id} data-req-kind="functional" data-enter={enter}>
              {r.widget !== "button" && <p className="xb-widget-label">{r.text}</p>}
              <Widget r={r} b={b} i={i} k={b.reqs.indexOf(r)} ctx={ctx} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
