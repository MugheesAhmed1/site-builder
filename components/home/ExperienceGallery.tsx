"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { TEMPLATES, businessLabel, templateBase, type TemplateInfo } from "@/lib/templates";

// The Gallery (PRD section 62): every full template, running live in its card. The older scene
// cards were taken out of the gallery on 2026-11-19; new ones will be added as full templates.

// Styles that at least one template has, so every chip finds something.
const STYLES = ["Cinematic", "3D", "Interactive", "Scroll", "WebGL", "Editorial", "Playful", "Product", "Experimental"];
const CATS = ["All", ...STYLES.filter((x) => TEMPLATES.some((t) => t.categories.includes(x)))];

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

const tplIn = (t: TemplateInfo, cat: string) => cat === "All" || t.categories.includes(cat);

// Business types that at least one template suits, in the builder's own order.
const BUSINESSES = CATEGORIES.filter((b) => b.id !== "general" && TEMPLATES.some((t) => t.business.includes(b.id)));

export default function ExperienceGallery() {
  const [cat, setCat] = useState("All");
  const [biz, setBiz] = useState("");
  const tpls = TEMPLATES.filter((t) => tplIn(t, cat) && (!biz || t.business.includes(biz)));
  return (
    <div className="xg">
      <div className="xg-cats" role="tablist" aria-label="Template styles">
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
          {tpls.length} full template{tpls.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="xg-grid">
        {tpls.map((t) => (
          <TemplateCard key={t.id} t={t} />
        ))}
      </div>
      {tpls.length === 0 && <p className="muted xg-none">Nothing in this style for that business yet. Try another style, or every business.</p>}
      <p className="xg-lab">
        <Link href="/templates">Browse full templates by business type</Link> · Want to mix your own? <Link href="/lab">Open the Experience Lab</Link>
      </p>
    </div>
  );
}
