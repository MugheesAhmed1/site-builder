"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { BLOCKS, FONTS_USED, KIND_LABEL, MEDIA, PALETTES, blockPreview, type LibraryBlock } from "@/lib/library-blocks";
import { TEMPLATES, templateById } from "@/lib/templates";

// The shared library: every block with a live preview, filtered by kind, business type and the
// template it came from, then the pictures, films, fonts and palettes. The filters are in the
// address (?kind=scene&business=dentist) so a link can open a filtered list.
const KINDS = ["section", "scene", "effect"] as const;
const TYPES = CATEGORIES.filter((c) => BLOCKS.some((b) => b.business.includes(c.id)));
const FROM = [...new Set(BLOCKS.map((b) => b.from))].filter(Boolean);

function Preview({ b }: { b: LibraryBlock }) {
  const [play, setPlay] = useState(!b.heavy);
  return (
    <div className="lib-frame">
      {play ? (
        <iframe src={blockPreview(b.id)} title={`${b.name} preview`} loading="lazy" sandbox="allow-scripts" />
      ) : (
        <button type="button" className="lib-play" onClick={() => setPlay(true)}>
          <span className="btn btn-sm">Play the 3D scene</span>
        </button>
      )}
    </div>
  );
}

export default function LibraryIndex() {
  const [kind, setKind] = useState("");
  const [biz, setBiz] = useState("");
  const [from, setFrom] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setKind(p.get("kind") || "");
    setBiz(p.get("business") || "");
    setFrom(p.get("from") || "");
  }, []);

  useEffect(() => {
    const u = new URL(location.href);
    for (const [k, v] of [["kind", kind], ["business", biz], ["from", from]]) v ? u.searchParams.set(k, v) : u.searchParams.delete(k);
    history.replaceState(null, "", u);
  }, [kind, biz, from]);

  const list = useMemo(() => {
    const words = q.trim().toLowerCase();
    return BLOCKS.filter(
      (b) =>
        (!kind || b.kind === kind) &&
        (!biz || b.business.includes(biz)) &&
        (!from || b.from === from) &&
        (!words || [b.name, b.description, ...b.tags].join(" ").toLowerCase().includes(words)),
    );
  }, [kind, biz, from, q]);

  const media = MEDIA.filter((m) => !biz || m.business.includes(biz) || m.from.includes("library"));

  return (
    <div className="lib">
      <div className="lib-filters">
        <div className="xg-cats" role="group" aria-label="Kind">
          <button type="button" aria-pressed={!kind} className={"chip" + (!kind ? " is-on" : "")} onClick={() => setKind("")}>
            Everything
          </button>
          {KINDS.map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} className={"chip" + (kind === k ? " is-on" : "")} onClick={() => setKind(kind === k ? "" : k)}>
              {KIND_LABEL[k]}s <span className="muted">{BLOCKS.filter((b) => b.kind === k).length}</span>
            </button>
          ))}
        </div>
        <div className="lib-selects">
          <label className="lab-field">
            <span>Business</span>
            <select value={biz} onChange={(e) => setBiz(e.target.value)}>
              <option value="">Any business</option>
              {TYPES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="lab-field">
            <span>Taken from</span>
            <select value={from} onChange={(e) => setFrom(e.target.value)}>
              <option value="">Any template</option>
              {FROM.map((id) => (
                <option key={id} value={id}>
                  {templateById(id)?.name || id}
                </option>
              ))}
            </select>
          </label>
          <label className="lab-field">
            <span>Search</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="pricing, 3D, cursor…" />
          </label>
        </div>
      </div>

      <p className="muted small" aria-live="polite">
        {list.length} block{list.length === 1 ? "" : "s"}
      </p>
      <ul className="lib-grid">
        {list.map((b) => (
          <li key={b.id} className="lib-card" id={b.id}>
            <Preview b={b} />
            <div className="lib-body">
              <p className="small muted">
                {KIND_LABEL[b.kind]} · from {templateById(b.from)?.name || b.from} · {b.fields.length} settings
              </p>
              <h2>{b.name}</h2>
              <p className="small">{b.description}</p>
              <ul className="xg-tags">
                {b.tags.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>

      <h2 style={{ marginTop: 56 }}>Add one to a template</h2>
      <p className="muted" style={{ maxWidth: 640 }}>
        Open any template, then use its <strong>Library blocks</strong> group: pick a block, add it, and change every setting. The downloads carry it.
      </p>
      <ul className="lib-templates">
        {TEMPLATES.map((t) => (
          <li key={t.id}>
            <Link href={`/templates/${t.id}`} className="chip">
              {t.name}
            </Link>
          </li>
        ))}
      </ul>

      <h2 style={{ marginTop: 56 }}>Pictures and films</h2>
      <p className="muted small">Every one is in the Library button beside any picture or video setting.</p>
      <ul className="lib-media">
        {media.map((m) => (
          <li key={m.src} title={`${m.label} · ${m.from.map((x) => templateById(x)?.name || x).join(", ")}`}>
            {m.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.src} alt={m.label} loading="lazy" />
            ) : (
              <video src={m.src} muted playsInline preload="none" aria-label={m.label} />
            )}
          </li>
        ))}
      </ul>

      <h2 style={{ marginTop: 56 }}>Fonts</h2>
      <ul className="lib-fonts">
        {FONTS_USED.map((f) => (
          <li key={f.family}>
            <strong>{f.family}</strong> <span className="muted small">{f.from.map((x) => templateById(x)?.name || x).join(", ")}</span>
          </li>
        ))}
      </ul>

      <h2 style={{ marginTop: 56 }}>Palettes</h2>
      <ul className="lib-palettes">
        {PALETTES.map((p) => (
          <li key={p.from + p.name}>
            <span className="lib-swatches">
              {Object.entries(p.colors).map(([k, c]) => (
                <i key={k} style={{ background: c }} title={`${k} ${c}`} />
              ))}
            </span>
            <span className="small">
              {templateById(p.from)?.name || p.from} <span className="muted">{p.name}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
