"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { useLibrary } from "@/lib/library";
import { ALL_FONTS, HUES, TYPE_PAIRINGS, colourOptions, contrastReport, fontsHref, fromBrandColour, moodFor, remix, shuffle, styleOf } from "@/lib/designs";
import { removeSavedDesign, saveDesign, savedDesigns } from "@/lib/store";
import type { Design, DesignPart, SiteKind } from "@/lib/types";
import { oklchToHex, palette } from "@/template/src/theme.js";

function Seg<T extends string>({ value, options, labels, onChange, label }: { value: T; options: T[]; labels?: Partial<Record<T, string>>; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o} aria-pressed={o === value} className={o === value ? "is-on" : ""} onClick={() => onChange(o)}>
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}

function Group({ title, hint, children, part, locks, onLock, onRemix }: { title: string; hint?: string; children: React.ReactNode; part?: DesignPart; locks?: Partial<Record<DesignPart, boolean>>; onLock?: (p: DesignPart) => void; onRemix?: (p: DesignPart) => void }) {
  return (
    <div className="control-group">
      <div className="row between">
        <div>
          <h3>{title}</h3>
          {hint && <p className="hint">{hint}</p>}
        </div>
        {part && (
          <div className="row" style={{ gap: 4 }}>
            <button className={"btn btn-ghost btn-sm lock" + (locks?.[part] ? " is-on" : "")} aria-pressed={!!locks?.[part]} onClick={() => onLock?.(part)} title="Locked parts stay the same when you shuffle">
              <Icon name={locks?.[part] ? "lock" : "unlock"} size={15} />
              {locks?.[part] ? "Locked" : "Lock"}
            </button>
            <button className="btn btn-sm" onClick={() => onRemix?.(part)} disabled={!!locks?.[part]}>
              <Icon name="shuffle" size={15} />
              Remix
            </button>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function Mini({ d, active, onPick, onRemove }: { d: Design; active: boolean; onPick: () => void; onRemove?: () => void }) {
  const scheme = d.mode === "dark" ? "dark" : "light";
  const pl = palette(d, scheme);
  return (
    <div className={"lib-card" + (active ? " is-active" : "")}>
      <button className="lib-pick" onClick={onPick} aria-pressed={active} aria-label={`Use ${d.preset}`}>
        <span className="lib-swatch" style={{ background: pl.bg, color: pl.text, borderRadius: Math.min(d.radius, 14) }}>
          <span className="lib-aa" style={{ fontFamily: `'${d.fonts.display}', sans-serif` }}>
            Aa
          </span>
          <span className="lib-bar" style={{ background: pl.accent, borderRadius: Math.min(d.radius, 8) }} />
          <span className="lib-lines" style={{ background: pl.muted }} />
        </span>
        <span className="lib-name">{d.preset}</span>
        <span className="lib-meta mono">
          {d.id} · {d.fonts.display}
        </span>
      </button>
      {onRemove && (
        <button className="btn btn-ghost btn-sm btn-icon lib-remove" aria-label={`Remove ${d.preset}`} onClick={onRemove}>
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  );
}

function Ratio({ label, value, min }: { label: string; value: number; min: number }) {
  const ok = value >= min;
  return (
    <span className={"ratio" + (ok ? " is-ok" : " is-bad")} title={`${label}: ${value.toFixed(2)} to 1, needs ${min}`}>
      {label} {value.toFixed(1)}
    </span>
  );
}

export default function DesignEditor({
  kind,
  design,
  locks,
  personal,
  onChange,
  onLocks,
}: {
  kind: SiteKind;
  design: Design;
  locks: Partial<Record<DesignPart, boolean>>;
  personal: Design;
  onChange: (d: Design) => void;
  onLocks: (l: Partial<Record<DesignPart, boolean>>) => void;
}) {
  const [tab, setTab] = useState<"tune" | "library">("tune");
  const { list: LIBRARY, source } = useLibrary();
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"any" | "light" | "dark">("any");
  const [style, setStyle] = useState<"any" | "grotesk" | "geometric" | "humanist" | "serif">("any");
  const [corners, setCorners] = useState<"any" | "sharp" | "round">("any");
  const [limit, setLimit] = useState(36);
  const [mine, setMine] = useState<Design[]>([]);
  const [brand, setBrand] = useState("");
  useEffect(() => setMine(savedDesigns()), []);

  const set = (patch: Partial<Design>) => onChange({ ...design, ...patch, preset: design.preset.endsWith("(edited)") ? design.preset : design.preset + " (edited)" });
  const lockToggle = (p: DesignPart) => onLocks({ ...locks, [p]: !locks[p] });
  const doRemix = (p: DesignPart) => onChange(remix(design, p));
  const report = contrastReport(design);
  const options = useMemo(() => colourOptions(design), [design]);
  const validAccent = /^#[0-9a-f]{6}$/i.test(design.accent);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return LIBRARY.filter((d) => {
      if (mode !== "any" && d.mode !== mode) return false;
      if (style !== "any" && styleOf(d) !== style) return false;
      if (corners === "sharp" && d.radius > 4) return false;
      if (corners === "round" && d.radius < 10) return false;
      if (term && !`${d.preset} ${d.id} ${d.fonts.display} ${d.fonts.body} ${moodFor(d)}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [LIBRARY, q, mode, style, corners]);

  return (
    <div className="design-controls">
      {tab === "library" && <link rel="stylesheet" href={fontsHref(ALL_FONTS, "600")} />}
      <div className="sys-head">
        <div>
          <span className="small muted mono">{design.id}</span>
          <h3 className="sys-name">{design.preset}</h3>
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          <button className="btn btn-primary btn-sm" onClick={() => onChange(shuffle(design, locks))} title="A brand new system. Locked parts are kept.">
            <Icon name="shuffle" size={15} />
            Shuffle
          </button>
          <button
            className="btn btn-sm"
            onClick={() => {
              const saved = { ...design, id: design.id.startsWith("MY-") ? design.id : "MY-" + Math.random().toString(36).slice(2, 6).toUpperCase(), preset: design.preset.replace(/ \(edited\)$/, "") };
              saveDesign(saved);
              setMine(savedDesigns());
              onChange(saved);
            }}
          >
            Save to my systems
          </button>
          {design.id !== personal.id && (
            <button className="btn btn-ghost btn-sm" onClick={() => onChange(personal)}>
              <Icon name="undo" size={15} />
              Back to yours
            </button>
          )}
        </div>
      </div>

      <div className="tabs" role="tablist" style={{ marginBottom: 0 }}>
        <button role="tab" aria-selected={tab === "tune"} className={"tab" + (tab === "tune" ? " is-on" : "")} onClick={() => setTab("tune")}>
          Tune
        </button>
        <button role="tab" aria-selected={tab === "library"} className={"tab" + (tab === "library" ? " is-on" : "")} onClick={() => setTab("library")}>
          Library ({LIBRARY.length + mine.length})
        </button>
      </div>

      {tab === "tune" && (
        <>
          <Group title="Colour" hint="One accent and a tinted neutral. Light and dark are worked out for you." part="colour" locks={locks} onLock={lockToggle} onRemix={doRemix}>
            <div>
              <label className="lbl">Optimize the scheme</label>
              <div className="opts">
                {options.map((o) => {
                  const pl = palette({ ...design, accent: o.accent, hue: o.hue, tint: o.tint }, "light");
                  const pd = palette({ ...design, accent: o.accent, hue: o.hue, tint: o.tint }, "dark");
                  return (
                    <button key={o.label} className="opt" title={o.note} onClick={() => set({ accent: o.accent, hue: o.hue, tint: o.tint })}>
                      <span className="opt-sw" aria-hidden="true">
                        <span style={{ background: pl.bg }} />
                        <span style={{ background: pl.accent }} />
                        <span style={{ background: pd.bg }} />
                        <span style={{ background: pd.accent }} />
                      </span>
                      <span className="small">{o.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="accent-row">
              <input type="color" value={validAccent ? design.accent : "#000000"} onChange={(e) => set({ accent: e.target.value.toUpperCase() })} aria-label="Accent colour" />
              <input type="text" value={design.accent} onChange={(e) => set({ accent: e.target.value })} aria-label="Accent hex code" />
            </div>
            <form
              className="row"
              style={{ gap: 6 }}
              onSubmit={(e) => {
                e.preventDefault();
                const hex = brand.trim().startsWith("#") ? brand.trim() : "#" + brand.trim();
                if (/^#[0-9a-f]{6}$/i.test(hex)) onChange({ ...fromBrandColour(design, hex), preset: design.preset });
              }}
            >
              <input type="text" value={brand} placeholder="Your brand colour, like #E4572E" onChange={(e) => setBrand(e.target.value)} aria-label="Brand colour" />
              <button className="btn btn-sm" type="submit" disabled={!/^#?[0-9a-f]{6}$/i.test(brand.trim())}>
                Build around it
              </button>
            </form>
            <div>
              <label className="lbl">Neutral tint</label>
              <div className="hues" role="group" aria-label="Neutral tint">
                {HUES.map((h) => (
                  <button key={h.name} className="hue" title={h.name} aria-label={h.name} aria-pressed={design.hue === h.hue} style={{ background: oklchToHex(0.72, 0.06, h.hue) }} onClick={() => set({ hue: h.hue })} />
                ))}
              </div>
            </div>
            <div className="row" style={{ gap: 12 }}>
              <div className="grow">
                <label className="lbl">Hue {design.hue}°</label>
                <input type="range" min={0} max={359} value={design.hue} onChange={(e) => set({ hue: Number(e.target.value) })} aria-label="Neutral hue" />
              </div>
              <div className="grow">
                <label className="lbl">Tint strength</label>
                <input type="range" min={0} max={0.04} step={0.002} value={design.tint} onChange={(e) => set({ tint: Number(e.target.value) })} aria-label="Tint strength" />
              </div>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              {report.map((r) => {
                const pl = palette(design, r.scheme);
                return (
                  <div key={r.scheme} className="stack" style={{ gap: 4 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <span className="small muted" style={{ width: 40, textTransform: "capitalize" }}>
                        {r.scheme}
                      </span>
                      <div className="swatch-strip grow" aria-hidden="true">
                        {[pl.bg, pl.surface, pl.border, pl.muted, pl.text, pl.accent, pl.onAccent].map((c, i) => (
                          <span key={i} style={{ background: c }} title={c} />
                        ))}
                      </div>
                    </div>
                    <div className="row wrap" style={{ gap: 4, paddingLeft: 48 }}>
                      <Ratio label="Text" value={r.text} min={4.5} />
                      <Ratio label="Muted" value={r.muted} min={4.5} />
                      <Ratio label="Accent" value={r.accent} min={4.5} />
                      <Ratio label="Button" value={r.button} min={4.5} />
                    </div>
                  </div>
                );
              })}
              <p className="hint">Numbers are contrast ratios. 4.5 or more passes WCAG AA. If an accent is too faint, it is darkened or lightened automatically for that theme.</p>
            </div>
            <div>
              <label className="lbl">Theme visitors see first</label>
              <Seg label="Theme" value={design.mode} options={["auto", "light", "dark"]} labels={{ auto: "Match device" }} onChange={(m) => set({ mode: m })} />
            </div>
          </Group>

          <Group title="Type" part="type" locks={locks} onLock={lockToggle} onRemix={doRemix}>
            <div>
              <label className="lbl">Pairing</label>
              <select
                value={TYPE_PAIRINGS.findIndex((t) => t.display === design.fonts.display && t.body === design.fonts.body)}
                onChange={(e) => {
                  const t = TYPE_PAIRINGS[Number(e.target.value)];
                  if (t) set({ fonts: { display: t.display, body: t.body, mono: t.mono } });
                }}
                aria-label="Font pairing"
              >
                <option value={-1}>Custom mix</option>
                {TYPE_PAIRINGS.map((t, i) => (
                  <option key={i} value={i}>
                    {t.display} and {t.body} ({t.mood})
                  </option>
                ))}
              </select>
            </div>
            {(["display", "body", "mono"] as const).map((k) => (
              <div className="font-row" key={k}>
                <span className="small muted">{k === "display" ? "Headings" : k === "body" ? "Text" : "Numbers"}</span>
                <select value={design.fonts[k]} onChange={(e) => set({ fonts: { ...design.fonts, [k]: e.target.value } })} aria-label={`${k} font`}>
                  {Array.from(new Set([design.fonts[k], ...TYPE_PAIRINGS.map((t) => t[k])])).map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </div>
            ))}
          </Group>

          <Group title="Shape" part="shape" locks={locks} onLock={lockToggle} onRemix={doRemix}>
            <div>
              <label className="lbl">Corner roundness: {design.radius}px</label>
              <input type="range" min={0} max={24} value={design.radius} onChange={(e) => set({ radius: Number(e.target.value) })} aria-label="Corner roundness" />
            </div>
            <div>
              <label className="lbl">Spacing</label>
              <Seg label="Spacing" value={design.density} options={["compact", "regular", "airy"]} onChange={(density) => set({ density })} />
            </div>
          </Group>

          <Group title="Layout" hint="How the sections are arranged. Animation has its own step next." part="layout" locks={locks} onLock={lockToggle} onRemix={doRemix}>
            <div>
              <label className="lbl">Opening</label>
              <Seg
                label="Opening"
                value={design.heroStyle}
                options={["stage", "statement", "portrait", "split", "centered"]}
                labels={{ stage: "Character and widgets", statement: "Big statement", portrait: "With photo", split: "With side panel", centered: "Centred" }}
                onChange={(heroStyle) => set({ heroStyle })}
              />
            </div>
            {kind === "portfolio" && (
              <>
                <div>
                  <label className="lbl">Work</label>
                  <Seg label="Work" value={design.projectStyle} options={["grid", "case", "index"]} labels={{ grid: "Card grid", case: "Case studies", index: "Index list" }} onChange={(projectStyle) => set({ projectStyle })} />
                </div>
                <div>
                  <label className="lbl">Experience</label>
                  <Seg label="Experience" value={design.experienceStyle} options={["ledger", "timeline", "list"]} onChange={(experienceStyle) => set({ experienceStyle })} />
                </div>
              </>
            )}
            <div>
              <label className="lbl">Services</label>
              <Seg label="Services" value={design.serviceStyle} options={["menu", "bento", "rows"]} labels={{ menu: "Price menu", bento: "Bento grid", rows: "Numbered rows" }} onChange={(serviceStyle) => set({ serviceStyle })} />
            </div>
          </Group>
        </>
      )}

      {tab === "library" && (
        <div className="stack" style={{ gap: 14 }}>
          <p className="hint">{source === "github" ? "Up to date with the library on GitHub." : "Built-in library. The latest from GitHub loads when you're online."}</p>
          <input type="text" value={q} placeholder="Search by name, font or mood (warm, tech, editorial)" onChange={(e) => setQ(e.target.value)} aria-label="Search design systems" />
          <div className="row wrap" style={{ gap: 6 }}>
            <Seg label="Theme" value={mode} options={["any", "light", "dark"]} labels={{ any: "Any theme" }} onChange={setMode} />
            <Seg label="Corners" value={corners} options={["any", "sharp", "round"]} labels={{ any: "Any corners" }} onChange={setCorners} />
          </div>
          <Seg label="Type style" value={style} options={["any", "grotesk", "geometric", "serif"]} labels={{ any: "Any type" }} onChange={setStyle} />
          {mine.length > 0 && (
            <>
              <h3>My systems</h3>
              <div className="lib-grid">
                {mine.map((d) => (
                  <Mini
                    key={d.id}
                    d={d}
                    active={d.id === design.id}
                    onPick={() => onChange(d)}
                    onRemove={() => {
                      removeSavedDesign(d.id);
                      setMine(savedDesigns());
                    }}
                  />
                ))}
              </div>
            </>
          )}
          <p className="small muted">{filtered.length} systems</p>
          <div className="lib-grid">
            {filtered.slice(0, limit).map((d) => (
              <Mini key={d.id} d={d} active={d.id === design.id} onPick={() => onChange(d)} />
            ))}
          </div>
          {filtered.length > limit && (
            <button className="btn" onClick={() => setLimit(limit + 48)}>
              Show more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
