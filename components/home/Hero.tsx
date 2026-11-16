"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import PromptBox from "@/components/PromptBox";
import type { SceneDef } from "@/template/src/scenes.js";

// The opening: a film scene fills the first screen, the headline sits in the open sky and
// the prompt floats on glass. The night sky is drawn here; the other backdrops are the
// product's own scene concepts, running live, so the first thing a visitor touches is the
// thing they will get.

const Scene = dynamic(() => import("@/template/src/Scenes.jsx").then((m) => m.Scene as React.ComponentType<{ def: SceneDef; text?: string; words?: string[]; className?: string }>), { ssr: false });

function Stars() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let raf = 0;
    let on = true;
    const stars = Array.from({ length: 150 }, () => ({ x: Math.random(), y: Math.random() * 0.62, r: Math.random() * 1.1 + 0.25, p: Math.random() * 6.28, s: 0.4 + Math.random() * 1.3 }));
    let shoot: { x: number; y: number; t: number } | null = null;
    let nextShoot = 2.5;
    const size = () => {
      const d = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = w * d;
      cv.height = h * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    const draw = (ms: number) => {
      const t = ms / 1000;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        ctx.globalAlpha = still ? 0.7 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.s + s.p));
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, 6.28);
        ctx.fill();
      }
      if (!still) {
        if (!shoot && t > nextShoot) shoot = { x: 0.15 + Math.random() * 0.6, y: 0.05 + Math.random() * 0.2, t };
        if (shoot) {
          const k = (t - shoot.t) / 0.9;
          if (k > 1) {
            shoot = null;
            nextShoot = t + 4 + Math.random() * 6;
          } else {
            const x = (shoot.x + k * 0.22) * w;
            const y = (shoot.y + k * 0.1) * h;
            const g = ctx.createLinearGradient(x, y, x - 130, y - 60);
            g.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - k)})`);
            g.addColorStop(1, "rgba(255,255,255,0)");
            ctx.globalAlpha = 1;
            ctx.strokeStyle = g;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 130, y - 60);
            ctx.stroke();
          }
        }
        if (on) raf = requestAnimationFrame(draw);
      }
    };
    size();
    raf = requestAnimationFrame(draw);
    const ro = new ResizeObserver(() => (size(), still && draw(0)));
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => {
      const was = on;
      on = e.isIntersecting && !document.hidden;
      if (on && !was && !still) raf = requestAnimationFrame(draw);
    });
    io.observe(cv);
    return () => {
      on = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);
  return <canvas ref={ref} className="hero-stars" aria-hidden="true" />;
}

export default function Hero({ stats, concepts }: { stats: { value: string; label: string }[]; concepts: SceneDef[] }) {
  const root = useRef<HTMLElement>(null);
  const [scene, setScene] = useState<string>("night");
  const live = concepts.find((s) => s.id === scene);

  // The scene leans a little toward the pointer, like a camera on a slow head.
  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !window.matchMedia("(pointer: fine)").matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        el.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
    };
    el.addEventListener("pointermove", move);
    return () => {
      el.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="hero" ref={root} id="start">
      <div className="hero-back" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="hero-plate" src="/real/cinema/dev.webp" alt="" fetchPriority="high" decoding="async" />
        {!live && <Stars />}
        {live && (
          <div className="hero-live" key={live.id}>
            <Scene def={live} text="Site Builder" words={["Say it", "Shape it", "Own it"]} />
          </div>
        )}
        <div className="hero-scrim" />
      </div>

      <div className="hero-inner">
        <p className="hero-badge">
          <span className="hero-badge-dot" />
          No sign up. No monthly fee. Nothing leaves your browser.
        </p>
        <h1 className="hero-title">
          <span className="hero-line">
            <span>Say it in one line.</span>
          </span>
          <span className="hero-line">
            <span>
              Get a site that <em className="serif-i">moves.</em>
            </span>
          </span>
        </h1>
        <p className="hero-sub">A finished, animated website for your business or yourself, written and designed in seconds. Then it is yours to keep.</p>
        <PromptBox variant="hero" />
        <p className="hero-or">
          or <a href="#categories">pick your kind of business</a>, or <a href="/document">start from a document</a>
        </p>
      </div>

      <div className="hero-foot">
        <dl className="hero-stats">
          {stats.map((s) => (
            <div key={s.label}>
              <dt>{s.value}</dt>
              <dd>{s.label}</dd>
            </div>
          ))}
        </dl>
        <div className="hero-scenes" role="group" aria-label="Change the scene behind this page">
          <span className="hero-scenes-label">Scene</span>
          <button type="button" aria-pressed={scene === "night"} className={scene === "night" ? "is-on" : ""} onClick={() => setScene("night")}>
            Night sky
          </button>
          {concepts.map((s) => (
            <button type="button" key={s.id} aria-pressed={scene === s.id} className={scene === s.id ? "is-on" : ""} onClick={() => setScene(s.id)}>
              {s.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
