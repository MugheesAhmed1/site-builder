"use client";

import { FONT_CHOICES, HUE_CHOICES, PRESETS, clonePreset } from "@/lib/presets";
import type { Design } from "@/lib/types";
import { oklchToHex, palette } from "@/template/src/theme.js";

function Seg<T extends string>({ value, options, labels, onChange }: { value: T; options: T[]; labels?: Partial<Record<T, string>>; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="group">
      {options.map((o) => (
        <button key={o} aria-pressed={o === value} className={o === value ? "is-on" : ""} onClick={() => onChange(o)}>
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="control-group">
      <div>
        <h3>{title}</h3>
        {hint && <p className="hint">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export default function DesignEditor({ design, onChange }: { design: Design; onChange: (d: Design) => void }) {
  const set = (patch: Partial<Design>) =>
    onChange({ ...design, ...patch, preset: design.preset.endsWith("(custom)") ? design.preset : design.preset + " (custom)" });
  const light = palette(design, "light");
  const dark = palette(design, "dark");
  const validAccent = /^#[0-9a-f]{6}$/i.test(design.accent);

  return (
    <div className="design-controls">
      <Group title="Start from a preset" hint="Each one is a full system. Change anything after.">
        <div className="presets">
          {PRESETS.map((p) => {
            const pl = palette(p, p.mode === "dark" ? "dark" : "light");
            const active = design.preset.split(" ")[0] === p.preset;
            return (
              <button key={p.preset} className={"preset" + (active ? " is-active" : "")} aria-pressed={active} onClick={() => onChange(clonePreset(p.preset))}>
                <span className="preset-chip" style={{ background: pl.bg, color: pl.accent, fontFamily: `'${p.fonts.display}', sans-serif`, boxShadow: `inset 0 0 0 1px ${pl.border}` }}>
                  Aa
                </span>
                <span>
                  <span className="preset-name">{p.preset}</span>
                  <span className="preset-blurb" style={{ display: "block" }}>
                    {p.blurb}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Colour" hint="Pick one accent and a neutral tint. Light and dark versions are worked out for you and kept readable.">
        <div className="accent-row">
          <input type="color" value={validAccent ? design.accent : "#000000"} onChange={(e) => set({ accent: e.target.value.toUpperCase() })} aria-label="Accent colour" />
          <input type="text" value={design.accent} onChange={(e) => set({ accent: e.target.value })} aria-label="Accent hex code" />
        </div>
        <div>
          <label className="lbl">Neutral tint</label>
          <div className="hues" role="group" aria-label="Neutral tint">
            {HUE_CHOICES.map((h) => (
              <button
                key={h.name}
                className="hue"
                title={h.name}
                aria-label={h.name}
                aria-pressed={design.hue === h.hue}
                style={{ background: oklchToHex(0.72, 0.06, h.hue) }}
                onClick={() => set({ hue: h.hue })}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="lbl">Tint strength</label>
          <input type="range" min={0} max={0.04} step={0.002} value={design.tint} onChange={(e) => set({ tint: Number(e.target.value) })} aria-label="Tint strength" />
        </div>
        <div className="stack" style={{ gap: 6 }}>
          {[
            ["Light", light],
            ["Dark", dark],
          ].map(([name, pl]) => {
            const p = pl as ReturnType<typeof palette>;
            return (
              <div key={name as string} className="row" style={{ gap: 8 }}>
                <span className="small muted" style={{ width: 40 }}>
                  {name as string}
                </span>
                <div className="swatch-strip grow" aria-hidden="true">
                  {[p.bg, p.surface, p.border, p.muted, p.text, p.accent, p.onAccent].map((c, i) => (
                    <span key={i} style={{ background: c }} title={c} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div>
          <label className="lbl">Theme visitors see first</label>
          <Seg value={design.mode} options={["auto", "light", "dark"]} labels={{ auto: "Match device" }} onChange={(mode) => set({ mode })} />
        </div>
      </Group>

      <Group title="Type">
        {(["display", "body", "mono"] as const).map((k) => (
          <div className="font-row" key={k}>
            <span className="small muted" style={{ textTransform: "capitalize" }}>
              {k === "display" ? "Headings" : k === "body" ? "Text" : "Numbers"}
            </span>
            <select value={design.fonts[k]} onChange={(e) => set({ fonts: { ...design.fonts, [k]: e.target.value } })} aria-label={`${k} font`}>
              {Array.from(new Set([design.fonts[k], ...FONT_CHOICES[k]])).map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </div>
        ))}
      </Group>

      <Group title="Shape and motion">
        <div>
          <label className="lbl">Corner roundness: {design.radius}px</label>
          <input type="range" min={0} max={24} value={design.radius} onChange={(e) => set({ radius: Number(e.target.value) })} />
        </div>
        <div>
          <label className="lbl">Motion</label>
          <Seg value={design.motion} options={["none", "subtle", "expressive"]} onChange={(motion) => set({ motion })} />
          <p className="hint" style={{ marginTop: 6 }}>
            {design.motion === "expressive"
              ? "Sections rise in as you scroll, numbers count up, roles cycle in the hero."
              : design.motion === "subtle"
                ? "Gentle fades only. Nothing moves around."
                : "Everything is still. Best for people who prefer less motion."}
          </p>
        </div>
      </Group>

      <Group title="Layout">
        <div>
          <label className="lbl">Opening</label>
          <Seg value={design.heroStyle} options={["statement", "portrait"]} labels={{ statement: "Big statement", portrait: "With photo" }} onChange={(heroStyle) => set({ heroStyle })} />
        </div>
        <div>
          <label className="lbl">Experience</label>
          <Seg value={design.experienceStyle} options={["ledger", "timeline", "list"]} onChange={(experienceStyle) => set({ experienceStyle })} />
        </div>
      </Group>
    </div>
  );
}
