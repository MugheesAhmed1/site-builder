"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { ExperienceAsset } from "@/template/src/experiences/types";

// The 3D asset view of the library (docs/ASSETS.md): every model and HDR light the builder can
// put on a page, with its still, what it is, how heavy it is, what it can do and its licence.
// "Turn it in 3D" opens the same renderer the generated sites use.

const AssetViewer = dynamic(() => import("./AssetViewer"), { ssr: false });

export interface AssetCard {
  spec: ExperienceAsset;
  category: string;
  subcategory: string;
  tags: string[];
  style: string[];
  triangles: number;
  sizeMB: number;
  texture: string;
  license: string;
  attribution: boolean;
  creator: string;
  source: string;
  animation: string;
  modifications?: string;
  /** False until the licence is confirmed: shown here, never put on a generated site. */
  shippable: boolean;
}

const LABEL: Record<string, string> = { product: "Products", vehicle: "Vehicles", character: "Characters", nature: "Nature", architecture: "Architecture", environment: "Environments", prop: "Props", abstract: "Abstract", hdri: "Lighting (HDR)" };

export default function AssetLibrary({ cards }: { cards: AssetCard[] }) {
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [lic, setLic] = useState("");
  const [moving, setMoving] = useState(false);
  const [open, setOpen] = useState<AssetCard | null>(null);
  const cats = useMemo(() => [...new Set(cards.map((c) => c.category))], [cards]);
  const studio = useMemo(() => cards.find((c) => c.spec.id === "hdri-studio-small-03")?.spec, [cards]);
  const list = useMemo(() => {
    const words = q.trim().toLowerCase();
    return cards.filter(
      (c) =>
        (!cat || c.category === cat) &&
        (!lic || c.license === lic) &&
        (!moving || c.spec.clips.length > 0) &&
        (!words || [c.spec.name, c.category, c.subcategory, ...c.tags, ...c.style].join(" ").toLowerCase().includes(words)),
    );
  }, [cards, cat, q, lic, moving]);

  return (
    <section className="al" aria-labelledby="assets-3d">
      <h2 id="assets-3d">3D models and lighting</h2>
      <p className="muted" style={{ maxWidth: 700 }}>
        {cards.filter((c) => c.spec.kind === "model").length} models and {cards.filter((c) => c.spec.kind === "hdri").length} HDR lights, each with its licence checked one by one (CC0 or CC BY 4.0, or our own; your own uploads stay marked until their licence is confirmed). The generator picks from these by meaning, never by file name, and a site only carries the ones it uses.
      </p>
      <div className="lib-filters">
        <div className="xg-cats" role="group" aria-label="Category">
          <button type="button" aria-pressed={!cat} className={"chip" + (!cat ? " is-on" : "")} onClick={() => setCat("")}>
            All <span className="muted">{cards.length}</span>
          </button>
          {cats.map((c) => (
            <button key={c} type="button" aria-pressed={cat === c} className={"chip" + (cat === c ? " is-on" : "")} onClick={() => setCat(cat === c ? "" : c)}>
              {LABEL[c] ?? c} <span className="muted">{cards.filter((x) => x.category === c).length}</span>
            </button>
          ))}
        </div>
        <div className="lib-selects">
          <label className="lab-field">
            <span>Licence</span>
            <select value={lic} onChange={(e) => setLic(e.target.value)}>
              <option value="">Any licence</option>
              <option value="CC0-1.0">CC0 (no credit needed)</option>
              <option value="CC-BY-4.0">CC BY 4.0 (credited)</option>
              <option value="original">Original</option>
              <option value="owner-cleared">Your uploads (cleared)</option>
              <option value="owner-supplied">Your uploads (licence to confirm)</option>
            </select>
          </label>
          <label className="lab-field">
            <span>Search</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="sunglasses, robot, chrome…" />
          </label>
          <label className="av-check small">
            <input type="checkbox" checked={moving} onChange={(e) => setMoving(e.target.checked)} /> Animated only
          </label>
        </div>
      </div>
      <p className="muted small" aria-live="polite">
        {list.length} asset{list.length === 1 ? "" : "s"}
      </p>
      <ul className="al-grid">
        {list.map((c) => (
          <li key={c.spec.id} className="al-card" id={c.spec.id}>
            <div className="al-still">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.spec.preview} alt={`${c.spec.name}, ${c.subcategory}`} loading="lazy" width={384} height={384} />
              {c.spec.kind === "model" && (
                <button type="button" className="btn btn-sm al-open" onClick={() => setOpen(c)}>
                  Turn it in 3D
                </button>
              )}
            </div>
            <div className="al-body">
              <p className="small muted">
                {LABEL[c.category] ?? c.category} · {c.subcategory}
              </p>
              <h3>{c.spec.name}</h3>
              <dl className="al-facts small">
                <dt>Size</dt>
                <dd>{c.sizeMB < 0.1 ? Math.round(c.sizeMB * 1000) + " KB" : c.sizeMB.toFixed(1) + " MB"}</dd>
                {c.spec.kind === "model" && (
                  <>
                    <dt>Triangles</dt>
                    <dd>{c.triangles.toLocaleString("en")}</dd>
                  </>
                )}
                <dt>Textures</dt>
                <dd>{c.texture}</dd>
                <dt>Weight</dt>
                <dd>{c.spec.tier}{c.spec.mobile ? ", phones get 3D" : ""}</dd>
                <dt>Moves</dt>
                <dd>{c.spec.clips.length ? c.spec.clips.join(", ") : c.animation}</dd>
                {c.spec.variants.length > 1 && (
                  <>
                    <dt>Colourways</dt>
                    <dd>{c.spec.variants.join(", ")}</dd>
                  </>
                )}
                <dt>Style</dt>
                <dd>{c.style.join(", ")}</dd>
                <dt>Licence</dt>
                <dd>
                  {/^https:/.test(c.source) ? (
                    <a href={c.source} target="_blank" rel="noreferrer">
                      {c.license === "original" ? "Original" : c.license.replace("-1.0", "").replace("-4.0", " 4.0").replace("-", " ")}
                    </a>
                  ) : (
                    c.license === "owner-cleared" ? "Your upload, cleared" : c.license.replace("-", " ")
                  )}{" "}
                  by {c.creator}
                  {c.attribution ? ", credited in the site" : ""}
                </dd>
                {!c.shippable && (
                  <>
                    <dt>Status</dt>
                    <dd className="al-hold">Licence to confirm: not used on generated sites yet</dd>
                  </>
                )}
              </dl>
              <ul className="xg-tags">
                {c.tags.slice(0, 6).map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
      {open && <AssetViewer asset={open.spec} hdri={studio} onClose={() => setOpen(null)} />}
    </section>
  );
}
