"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useStartSite } from "@/components/PromptBox";
import { CONCEPTS } from "@/packages/experience-core";
import type { Concept } from "@/packages/experience-core/concepts";
import { categoryLabel } from "@/lib/fit";
import { CATEGORIES } from "@/lib/categories";
import LiveStage from "./LiveStage";
import { TEMPLATES, businessLabel, templateBase, type TemplateInfo } from "@/lib/templates";

// The Experience Gallery (PRD section 62). Every card is the concept's own stage, live, not a
// screenshot: scrolling the page walks it through its story, and hovering or tapping a card
// plays it and hands it the pointer. Cards mount their stage only near the screen.

const CATS = ["All", "Templates", "Cinematic", "3D", "Interactive", "Scroll", "Characters", "WebGL", "Editorial", "Playful", "Product", "Experimental"] as const;
type Cat = (typeof CATS)[number];

function inCat(c: Concept, cat: Cat): boolean {
  switch (cat) {
    case "All":
      return true;
    case "Templates":
      return false;
    case "Cinematic":
      return c.modes.includes("cinematic");
    case "3D":
      return c.flags.webgl || c.engine === "orbit" || c.engine === "morph";
    case "Interactive":
      return c.modes.includes("world") || c.flags.object;
    case "Scroll":
      return c.flags.scroll;
    case "Characters":
      return c.flags.character;
    case "WebGL":
      return c.flags.webgl;
    case "Editorial":
      return c.modes.includes("editorial");
    case "Playful":
      return c.modes.includes("playful");
    case "Product":
      return c.modes.includes("product");
    case "Experimental":
      return c.motionIntensity >= 8 || c.engine === "kinetic" || c.engine === "playground";
  }
}

function Card({ c }: { c: Concept }) {
  const el = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);
  const [play, setPlay] = useState(false);
  const [pos, setPos] = useState(0);
  const start = useStartSite();

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const io = new IntersectionObserver(([x]) => setNear(x.isIntersecting), { rootMargin: "200px 0px" });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  // Scroll demonstrates the story: the card's trip up the screen walks its beats.
  useEffect(() => {
    if (!near) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const r = el.current?.getBoundingClientRect();
      if (!r) return;
      const t = 1 - (r.top + r.height / 2) / (window.innerHeight + r.height);
      setPos(Math.max(0, Math.min(1, t)) * (c.beats.length - 1));
    };
    read();
    const on = () => (raf ||= requestAnimationFrame(read));
    window.addEventListener("scroll", on, { passive: true });
    return () => (window.removeEventListener("scroll", on), cancelAnimationFrame(raf));
  }, [near, c.beats.length]);

  const industry = c.compatibleIndustries.find((x) => !x.startsWith("role-") && x !== "general");
  const query = industry ? `Website for my ${categoryLabel("website", industry).toLowerCase()} business` : "Website for my business";
  const tags = [c.flags.webgl && "3D", c.flags.character && "Character", c.flags.scroll && "Scroll story", c.flags.object && "Interactive"].filter(Boolean) as string[];

  return (
    <article ref={el} className={"xg-card" + (play ? " is-play" : "")} onPointerEnter={() => setPlay(true)} onPointerLeave={() => setPlay(false)} onFocus={() => setPlay(true)} onBlur={() => setPlay(false)}>
      <div className="xg-view" aria-hidden="true" onClick={() => setPlay(true)}>
        {near && <LiveStage concept={c.id} pos={pos} still={!play} intensity={Math.max(6, c.motionIntensity)} labels={[c.name, "Scroll", "Hover", "Tap"]} />}
      </div>
      <div className="xg-text">
        <h3>{c.name}</h3>
        <p>{c.pitch}</p>
        <ul className="xg-tags" aria-label="What it does">
          {tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <button type="button" className="btn btn-sm xg-use" onClick={() => start({ query, concept: c.id })}>
          Use this experience
        </button>
      </div>
    </article>
  );
}

// A whole project someone supplied (docs/TEMPLATES.md), running as itself in a frame. Light
// templates play when near the screen; heavy ones (real WebGL) show a still until hovered or tapped.
export function TemplateCard({ t }: { t: TemplateInfo }) {
  const el = useRef<HTMLElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [play, setPlay] = useState(false);
  const [scale, setScale] = useState(0.25);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const io = new IntersectionObserver(([x]) => setNear(x.isIntersecting), { rootMargin: "200px 0px" });
    io.observe(node);
    const v = view.current;
    const ro = new ResizeObserver(() => v && setScale(Math.max(v.clientWidth / 1440, v.clientHeight / 900)));
    if (v) ro.observe(v);
    return () => (io.disconnect(), ro.disconnect());
  }, []);

  const live = near && (!t.heavy || play);
  return (
    <article ref={el} className={"xg-card xg-tpl" + (play ? " is-play" : "")} onPointerEnter={() => setPlay(true)} onPointerLeave={() => setPlay(false)} onFocus={() => setPlay(true)} onBlur={() => setPlay(false)}>
      <div className="xg-view" ref={view} aria-hidden="true" onClick={() => setPlay(true)}>
        <span className="xg-badge">Full template</span>
        {t.poster ? <img src={`${templateBase(t.id)}/poster.webp`} alt="" loading="lazy" decoding="async" /> : <div className="xg-poster">{t.name}</div>}
        {live && <iframe className="xg-frame" src={`${templateBase(t.id)}/site/preview.html`} title={t.name} tabIndex={-1} loading="lazy" sandbox="allow-scripts" style={{ transform: `scale(${scale})` }} />}
      </div>
      <div className="xg-text">
        <h3>{t.name}</h3>
        <p className="xg-biz">{businessLabel(t.business[0])}</p>
        <p>{t.pitch}</p>
        <ul className="xg-tags" aria-label="What it does">
          {(t.features || []).slice(0, 4).map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <Link className="btn btn-sm xg-use" href={`/templates/${t.id}`}>
          Use this template
        </Link>
      </div>
    </article>
  );
}

const tplIn = (t: TemplateInfo, cat: Cat) => cat === "All" || cat === "Templates" || t.categories.includes(cat);

// Business types that at least one template or experience suits, in the builder's own order.
const BUSINESSES = CATEGORIES.filter((b) => b.id !== "general" && (TEMPLATES.some((t) => t.business.includes(b.id)) || CONCEPTS.some((c) => c.compatibleIndustries.includes(b.id))));

export default function ExperienceGallery() {
  const [cat, setCat] = useState<Cat>("All");
  const [biz, setBiz] = useState("");
  const list = CONCEPTS.filter((c) => inCat(c, cat) && (!biz || c.compatibleIndustries.includes(biz)));
  const tpls = TEMPLATES.filter((t) => tplIn(t, cat) && (!biz || t.business.includes(biz)));
  return (
    <div className="xg">
      <div className="xg-cats" role="tablist" aria-label="Experience categories">
        {CATS.map((x) => (
          <button key={x} type="button" role="tab" aria-selected={cat === x} className={"chip" + (cat === x ? " is-on" : "")} onClick={() => setCat(x)}>
            {x}
          </button>
        ))}
      </div>
      <div className="xg-biz-pick">
        <label>
          <span>Business type</span>
          <select value={biz} onChange={(e) => setBiz(e.target.value)}>
            <option value="">Every business</option>
            {BUSINESSES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        <span className="muted small">
          {tpls.length + list.length} {tpls.length + list.length === 1 ? "match" : "matches"}
          {tpls.length > 0 && ` · ${tpls.length} full template${tpls.length === 1 ? "" : "s"}`}
        </span>
      </div>
      <div className="xg-grid">
        {tpls.map((t) => (
          <TemplateCard key={t.id} t={t} />
        ))}
        {list.map((c) => (
          <Card key={c.id} c={c} />
        ))}
      </div>
      {tpls.length + list.length === 0 && <p className="muted xg-none">Nothing in this style for that business yet. Try another style, or every business.</p>}
      <p className="xg-lab">
        <Link href="/templates">Browse full templates by business type</Link> · Want to mix your own? <Link href="/lab">Open the Experience Lab</Link>
      </p>
    </div>
  );
}
