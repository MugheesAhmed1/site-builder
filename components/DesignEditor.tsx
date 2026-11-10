"use client";

import { FONT_CHOICES, PRESETS, clonePreset } from "@/lib/presets";
import type { Design } from "@/lib/types";

const COLOR_LABELS: Record<keyof Design["colors"], string> = {
  bg: "Background",
  surface: "Cards",
  text: "Text",
  muted: "Muted text",
  primary: "Primary",
  accent: "Accent",
  border: "Borders",
};

function lum(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function contrast(a: string, b: string) {
  const la = lum(a);
  const lb = lum(b);
  if (la === null || lb === null) return 21;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function Seg<T extends string>({ value, options, onChange }: { value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o} className={o === value ? "is-on" : ""} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

export default function DesignEditor({ design, onChange }: { design: Design; onChange: (d: Design) => void }) {
  const set = (patch: Partial<Design>) => onChange({ ...design, ...patch, preset: patch.preset ?? (design.preset.endsWith("(custom)") ? design.preset : design.preset + " (custom)") });
  const warnings: string[] = [];
  if (contrast(design.colors.text, design.colors.bg) < 4.5) warnings.push("Text is hard to read on the background.");
  if (contrast(design.colors.muted, design.colors.bg) < 3) warnings.push("Muted text is very faint on the background.");
  if (contrast(design.colors.bg, design.colors.primary) < 3) warnings.push("Button text may be hard to read on the primary colour.");

  return (
    <div className="stack">
      <div>
        <label className="lbl">Start from a preset</label>
        <div className="presets">
          {PRESETS.map((p) => (
            <button key={p.preset} className={"preset " + (design.preset.startsWith(p.preset) ? "is-active" : "")} onClick={() => onChange(clonePreset(p.preset))}>
              <div className="preset-swatches">
                <span style={{ background: p.colors.bg }} />
                <span style={{ background: p.colors.surface }} />
                <span style={{ background: p.colors.primary }} />
                <span style={{ background: p.colors.accent }} />
              </div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{p.preset}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {p.mode} · {p.fonts.heading}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="lbl">Colours</label>
        <div className="stack" style={{ gap: 6 }}>
          {(Object.keys(COLOR_LABELS) as (keyof Design["colors"])[]).map((k) => (
            <div className="color-row" key={k}>
              <input type="color" value={/^#[0-9a-f]{6}$/i.test(design.colors[k]) ? design.colors[k] : "#000000"} onChange={(e) => set({ colors: { ...design.colors, [k]: e.target.value.toUpperCase() } })} aria-label={COLOR_LABELS[k]} />
              <span className="small">{COLOR_LABELS[k]}</span>
              <input type="text" value={design.colors[k]} onChange={(e) => set({ colors: { ...design.colors, [k]: e.target.value } })} />
            </div>
          ))}
        </div>
        {warnings.length > 0 && (
          <div className="notice notice-warn small" style={{ marginTop: 8 }}>
            {warnings.join(" ")}
          </div>
        )}
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <label className="lbl">Fonts</label>
        {(["heading", "body", "mono"] as const).map((k) => (
          <div className="row" key={k}>
            <span className="small" style={{ width: 70, textTransform: "capitalize" }}>
              {k}
            </span>
            <select value={design.fonts[k]} onChange={(e) => set({ fonts: { ...design.fonts, [k]: e.target.value } })}>
              {Array.from(new Set([design.fonts[k], ...FONT_CHOICES])).map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div>
        <label className="lbl">Corner roundness: {design.radius}px</label>
        <input type="range" min={0} max={28} value={design.radius} onChange={(e) => set({ radius: Number(e.target.value) })} style={{ width: "100%" }} />
      </div>
      <div className="stack" style={{ gap: 10 }}>
        <div>
          <label className="lbl">Mode</label>
          <Seg value={design.mode} options={["dark", "light"]} onChange={(mode) => set({ mode })} />
        </div>
        <div>
          <label className="lbl">Animation</label>
          <Seg value={design.animation} options={["none", "subtle", "rich"]} onChange={(animation) => set({ animation })} />
        </div>
        <div>
          <label className="lbl">Hero layout</label>
          <Seg value={design.heroStyle} options={["split", "centered"]} onChange={(heroStyle) => set({ heroStyle })} />
        </div>
        <div>
          <label className="lbl">Experience style</label>
          <Seg value={design.experienceStyle} options={["receipts", "timeline", "cards"]} onChange={(experienceStyle) => set({ experienceStyle })} />
        </div>
      </div>
    </div>
  );
}
