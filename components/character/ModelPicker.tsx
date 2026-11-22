"use client";

import { useMemo, useState } from "react";
import { ASSETS, creditOf, isShippable, resolveAsset, type AssetRecord } from "@/packages/asset-library";
import type { ModelInfo } from "@/lib/character/apply";

// Every licensed 3D model in the library, characters first, searchable by what it is.

const TABS = [
  { id: "all", label: "All" },
  { id: "character", label: "Characters" },
  { id: "animal", label: "Animals" },
  { id: "product", label: "Products" },
  { id: "vehicle", label: "Vehicles" },
  { id: "nature", label: "Nature" },
  { id: "place", label: "Places" },
  { id: "thing", label: "Things" },
] as const;

const tabOf = (a: AssetRecord): (typeof TABS)[number]["id"] =>
  a.category === "character" ? "character" : a.subcategory === "animal" || a.id.startsWith("animal-") ? "animal" : a.category === "product" ? "product" : a.category === "vehicle" ? "vehicle" : a.category === "nature" ? "nature" : a.category === "architecture" || a.category === "environment" ? "place" : "thing";

export const MODELS = ASSETS.filter((a) => a.type === "3d" && isShippable(a)).sort((a, b) => Number(b.category === "character") - Number(a.category === "character") || Number(!!b.clips?.length) - Number(!!a.clips?.length) || a.name.localeCompare(b.name));

/** What content.character needs from a library model. */
export function modelInfo(a: AssetRecord): ModelInfo {
  const d = (a.display || {}) as { tint?: string; screen?: string };
  return { asset: a.asset, preview: a.preview, name: a.name, clips: a.clips, display: { tint: d.tint || "", screen: d.screen || "" }, credit: a.license.attributionRequired ? creditOf(a) : "", category: a.category };
}

/** Library models for words ("a friendly robot"): the best match and its closest alternatives. */
export function modelsFor(words: string, n = 4): AssetRecord[] {
  const q = words.replace(/^(a|an|the|our|my)\s+/i, "").trim();
  if (!q) return MODELS.slice(0, n);
  const r = resolveAsset({ query: q, type: "3d" });
  const ids = [r.id, ...r.alternatives.map((x) => x.id)].filter(Boolean);
  const out = ids.map((id) => MODELS.find((m) => m.id === id)).filter((x): x is AssetRecord => !!x);
  for (const m of MODELS) if (out.length < n && !out.includes(m) && m.category === "character") out.push(m);
  return out.slice(0, n);
}

export default function ModelPicker({ value, onPick, compact = false }: { value?: string; onPick: (a: AssetRecord) => void; compact?: boolean }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return MODELS.filter((a) => (tab === "all" || tabOf(a) === tab) && words.every((w) => [a.name, ...a.tags, a.category, a.subcategory].join(" ").toLowerCase().includes(w)));
  }, [tab, q]);
  return (
    <div className={`mp ${compact ? "mp--compact" : ""}`}>
      <div className="mp-bar">
        <input type="search" className="mp-search" placeholder="Search: robot, car, fox, shoe…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the 3D library" />
        <div className="seg mp-tabs" role="tablist" aria-label="Kind of model">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "is-on" : ""} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mp-grid" role="listbox" aria-label="3D models">
        {list.map((a) => (
          <button key={a.id} type="button" role="option" aria-selected={value === a.asset} className={`mp-item ${value === a.asset ? "is-on" : ""}`} onClick={() => onPick(a)} title={`${a.name} · ${a.license.type}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.preview} alt="" loading="lazy" />
            <span>{a.name}</span>
            {!!a.clips?.length && <em className="mp-badge">Animated</em>}
          </button>
        ))}
        {list.length === 0 && <p className="muted small">Nothing matches. Try another word, or make one from a photo.</p>}
      </div>
    </div>
  );
}
