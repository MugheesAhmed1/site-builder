import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Experience, ExperienceScene } from "./experiences/types";
import { cleanContent, fontsHref } from "./content/clean";
import { visibleSections } from "./content/sections";
import { Conductor } from "./motion/scroll";
import { deviceCaps, useMagnetic, useReducedMotion, useReveal, useRipple, useSystemDark } from "./motion/runtime";
import { Stage } from "./scenes/Stage";
import type { Palette } from "./scenes/frame";
import { SECTION_NAV, SectionBody, type Ctx } from "./components/sections";
import { contrast, palette, resolveScheme } from "./theme.js";
import { useEdits } from "./edits.js";

// The renderer (PRD sections 4, 12 and 45): it reads the Experience JSON and the content and
// draws the site as a sequence of scenes over one stage. The same code runs in the builder's
// preview, in the downloaded site, and at download time to write the finished HTML.

export interface SiteProps {
  kind: "website" | "portfolio";
  design: any;
  content: any;
  experience?: Experience;
  /** Inside the builder: the page scrolls in a box and shows empty picture slots. */
  preview?: boolean;
  scheme?: "light" | "dark";
  editing?: boolean;
  /** Studio preview modes (PRD section 48): play the site as with reduced motion, or on a low-power device. */
  simulate?: "reduced" | "low";
}

/** Worlds that read best at night; with the theme on auto they open dark. */
const DARK_WORLDS = new Set(["space", "planets", "spacecraft", "holo", "neon", "underwater", "future-city"]);

/** Stages that paint their own night sky or deep water read best on a dark page whatever the theme. */
export function needsDark(e: Experience | undefined) {
  return !!e && (e.stage.engine === "depths" || (e.stage.engine === "cosmos" && e.stage.params.style !== "data") || (e.stage.engine === "interface" && e.stage.params.style === "holo"));
}

export function prefersDark(e: Experience | undefined) {
  return !!e && (DARK_WORLDS.has(e.world) || needsDark(e));
}

/** A calm experience for data saved before experiences existed: words first, one drawn line. */
function basicExperience(sections: string[]): Experience {
  return {
    version: 2,
    seed: 1,
    mode: "editorial",
    concept: "basic",
    name: "Calm",
    pitch: "",
    metaphor: "reveal",
    world: "paper",
    intensity: 3,
    interactionLevel: 2,
    primaryInteraction: "scroll",
    secondaryInteraction: "hover",
    heroMechanic: "line-draw",
    transitionMechanic: "fade",
    visualAnchor: "line",
    motionLanguage: "restrained",
    tier: "light",
    profile: "minimal",
    technologies: ["css"],
    stage: { engine: "kinetic", params: { style: "luxury" } },
    scenes: sections.map((s, i) => sceneFor(s, i, null)),
    channels: { scroll: 1, cursor: 1, hover: 1, click: 0, transitions: 1, typography: 1, characters: 0, environment: 0 },
    cursor: "standard",
    smooth: false,
    sound: false,
    budget: { particles: 40, dpr: 1.5, timelines: 4, texture: 512, lowFps: 30 },
    fallbacks: { mobile: "", reducedMotion: "", lowPower: "" },
    directions: [],
    control: "smart",
  } as unknown as Experience;
}

function sceneFor(section: string, i: number, prev: ExperienceScene | null): ExperienceScene {
  return {
    id: "auto-" + section,
    section,
    kind: section === "hero" ? "hero" : section === "cta" ? "cta" : "content",
    title: section,
    note: "",
    duration: 1,
    layer: "2d",
    composition: section === "hero" || section === "cta" ? "center" : i % 2 ? "right" : "left",
    beat: prev ? prev.beat : { draw: Math.min(1, 0.25 + i * 0.15), step: Math.min(3, i) },
    objects: [],
    scroll: [],
    interactions: [],
    transitions: [],
    entrance: prev?.entrance ?? "entrance.rise",
    text: prev?.text ?? "text.words",
  } as unknown as ExperienceScene;
}

/** The scenes in page order: each shown section takes its storyboard scene, in order. */
function sceneList(e: Experience, sections: string[]): ExperienceScene[] {
  const pool = e.scenes.slice();
  const out: ExperienceScene[] = [];
  for (const [i, s] of sections.entries()) {
    const k = pool.findIndex((x) => x.section === s);
    if (k >= 0) {
      const [sc] = pool.splice(k, 1);
      if (!sc.hidden) out.push(sc);
    } else out.push(sceneFor(s, i, out[out.length - 1] ?? null));
  }
  return out.length ? out : [sceneFor("hero", 0, null)];
}

function Cursor({ mode }: { mode: string }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = el.current;
    if (!c || !deviceCaps().finePointer) return;
    let x = -100;
    let y = -100;
    let cx = x;
    let cy = y;
    let raf = 0;
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      c.toggleAttribute("data-on", true);
      const t = e.target as HTMLElement | null;
      c.toggleAttribute("data-hot", !!t?.closest?.("a,button,summary,[data-magnetic]"));
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const tick = () => {
      raf = 0;
      const k = mode === "dot" ? 1 : 0.2;
      cx += (x - cx) * k;
      cy += (y - cy) * k;
      c.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
      if (Math.abs(x - cx) + Math.abs(y - cy) > 0.3) raf = requestAnimationFrame(tick);
    };
    const leave = () => c.removeAttribute("data-on");
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
    };
  }, [mode]);
  return <div ref={el} className={"xp-cursor is-" + mode} aria-hidden="true" />;
}

export default function Site({ kind, design, content, experience, preview = false, scheme: forced, editing = false, simulate }: SiteProps) {
  const root = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const conductor = useRef<Conductor | null>(null);
  const reduced = useReducedMotion() || simulate === "reduced";
  const systemDark = useSystemDark();
  const c = useMemo(() => cleanContent(content), [content]);
  const sections = useMemo(() => visibleSections(kind, c, preview), [kind, c, preview]);
  const e = useMemo(() => experience ?? basicExperience(sections), [experience, sections]);
  const scenes = useMemo(() => sceneList(e, sections), [e, sections]);

  const scheme = forced ?? ((design.mode === "auto" && prefersDark(e)) || needsDark(e) ? "dark" : resolveScheme(design, systemDark));
  const p = palette(design, scheme);
  // Button words must read on the accent (WCAG AA at button size), whatever the theme picked.
  if (contrast(p.onAccent, p.accent) < 4.5) p.onAccent = contrast("#FFFFFF", p.accent) >= contrast("#111111", p.accent) ? "#FFFFFF" : "#111111";
  const pal: Palette = { bg: p.bg, surface: p.surface, text: p.text, muted: p.muted, accent: p.accent, onAccent: p.onAccent, dark: scheme === "dark" };
  const brand: string = kind === "website" ? c.brand?.name || "" : c.hero?.name || "";
  const labels = useMemo(() => {
    const words: string[] = [brand];
    if (kind === "website") for (const s of c.services || []) words.push(s.name);
    else {
      for (const g of c.skills || []) words.push(...g.items);
      for (const pr of c.projects || []) words.push(pr.name);
    }
    return words.filter(Boolean).slice(0, 12);
  }, [c, kind, brand]);

  const key = scenes.map((s) => s.id).join("|") + ":" + e.seed;
  const animate = !reduced && e.intensity > 1 && !editing;
  useReveal(page, key, animate);
  useMagnetic(page, animate && (e.cursor === "magnetic" || e.channels.hover >= 2), key);
  useRipple(page, animate && e.channels.click > 0);
  useEdits(root, design.edits, editing);

  // The conductor turns scroll into the stage position; scenes get their own progress too
  // (scroll mappings to typography read --p).
  useEffect(() => {
    const el = page.current;
    if (!el) return;
    const scroller = el.closest("[data-scroll-root]") as HTMLElement | null;
    const setVh = () => el.style.setProperty("--vh", (scroller ? scroller.clientHeight : window.innerHeight) + "px");
    setVh();
    const cd = new Conductor(scroller, { ease: reduced ? 1 : 0.1 });
    cd.step = reduced;
    const els = Array.from(el.querySelectorAll<HTMLElement>(":scope > .xp-scenes > .xp-scene"));
    cd.setScenes(els);
    const off = cd.subscribe((s) => {
      for (let i = 0; i < els.length; i++) els[i].style.setProperty("--p", (s.local[i] ?? 0).toFixed(3));
      el.style.setProperty("--page", s.page.toFixed(4));
      const active = Math.round(s.pos);
      for (let i = 0; i < els.length; i++) els[i].toggleAttribute("data-active", i === active);
    });
    cd.start();
    conductor.current = cd;
    const ro = typeof ResizeObserver !== "undefined" && scroller ? new ResizeObserver(setVh) : null;
    if (scroller) ro?.observe(scroller);
    window.addEventListener("resize", setVh);
    return () => {
      off();
      cd.stop();
      ro?.disconnect();
      window.removeEventListener("resize", setVh);
      conductor.current = null;
    };
  }, [key, reduced]);

  // Weighted scrolling on the page itself (not inside the builder's preview box).
  useEffect(() => {
    if (preview || reduced || !e.smooth || !deviceCaps().finePointer) return;
    let lenis: { raf(t: number): void; destroy(): void } | null = null;
    let raf = 0;
    let gone = false;
    import("lenis").then(({ default: Lenis }) => {
      if (gone) return;
      lenis = new Lenis({ lerp: 0.12, anchors: true } as any) as any;
      const loop = (t: number) => {
        lenis?.raf(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });
    return () => {
      gone = true;
      cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, [preview, reduced, e.smooth]);

  const [sound, setSound] = useState(false);
  const nav = sections.filter((s) => SECTION_NAV[s]).slice(0, 5);
  const ctaLabel = (kind === "website" ? c.hero?.primaryCta : c.cta?.button) || "Get in touch";
  const radius = Number(design.radius ?? 14);
  const style = {
    "--bg": p.bg,
    "--surface": p.surface,
    "--text": p.text,
    "--muted": p.muted,
    "--border": p.border,
    "--accent": p.accent,
    "--on-accent": p.onAccent,
    "--radius": radius + "px",
    "--font-display": `"${design.fonts?.display || "Inter"}", ui-sans-serif, system-ui, sans-serif`,
    "--font-body": `"${design.fonts?.body || "Inter"}", ui-sans-serif, system-ui, sans-serif`,
    "--font-mono": `"${design.fonts?.mono || "JetBrains Mono"}", ui-monospace, monospace`,
    "--space": design.density === "compact" ? "0.82" : design.density === "airy" ? "1.2" : "1",
    background: p.bg,
    color: p.text,
  } as CSSProperties;
  const enterOf = (s: ExperienceScene) => (e.intensity <= 1 ? "fade" : s.entrance.replace(/^entrance\./, ""));

  return (
    <div
      ref={root}
      className={"pf xp-root" + (preview ? " is-preview" : "")}
      data-scheme={scheme}
      data-concept={e.concept}
      data-engine={e.stage.engine}
      data-align={design.align === "left" ? "left" : "center"}
      style={style}
    >
      {!design.fontsLocal && design.fonts && <link rel="stylesheet" href={fontsHref(design.fonts)} />}
      <div ref={page} className="xp-page">
        <Stage experience={e} scenes={scenes} pal={pal} labels={labels} conductor={conductor} reduced={reduced} lowPower={simulate === "low"} editing={editing} sound={sound} />
        <header className="xp-nav">
          <a className="xp-brand" href="#pf-top">
            {brand}
          </a>
          <nav aria-label="Sections">
            <ul className="xp-links">
              {nav.map((s) => (
                <li key={s}>
                  <a href={"#pf-" + s}>{SECTION_NAV[s]}</a>
                </li>
              ))}
            </ul>
          </nav>
          <a className="xp-btn xp-btn-main xp-btn-small" href="#pf-contact">
            {ctaLabel}
          </a>
          <details className="xp-menu">
            <summary aria-label="Menu">
              <span />
              <span />
            </summary>
            <ul>
              {nav.map((s) => (
                <li key={s}>
                  <a href={"#pf-" + s}>{SECTION_NAV[s]}</a>
                </li>
              ))}
            </ul>
          </details>
        </header>
        <main className="xp-scenes">
          {scenes.map((s, i) => {
            const ctx: Ctx = { kind, c, preview, editing, enter: enterOf(s), text: s.text };
            const pinned = (s.kind === "hero" || s.kind === "cta") && s.duration > 1 && !reduced;
            return (
              <section
                key={s.id}
                id={s.section === "hero" ? "pf-top" : "pf-" + s.section}
                className={"xp-scene is-" + s.composition + " xp-kind-" + s.kind + (pinned ? " is-pinned" : "")}
                data-scene={i}
                data-section={s.section}
                style={{ ["--dur" as string]: pinned ? s.duration : 1 }}
                aria-label={s.section === "hero" ? undefined : s.title}
              >
                <div className="xp-pin">
                  <div className="xp-veil">
                    <SectionBody id={s.section} ctx={ctx} />
                  </div>
                </div>
              </section>
            );
          })}
        </main>
        <footer className="xp-foot">
          <p>
            © {new Date().getFullYear()} {brand}
          </p>
          {e.channels.click > 0 && (
            <button type="button" className="xp-sound" aria-pressed={sound} onClick={() => setSound(!sound)}>
              Sound {sound ? "on" : "off"}
            </button>
          )}
          <a href="#pf-top">Back to top</a>
        </footer>
      </div>
      {e.cursor !== "standard" && e.cursor !== "magnetic" && !editing && !reduced && <Cursor mode={e.cursor} />}
    </div>
  );
}
