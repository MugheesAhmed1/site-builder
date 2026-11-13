"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import ImageField from "@/components/ImageField";
import VideoField from "@/components/VideoField";
import { EDIT_ICON_IDS, iconSvg } from "@/template/src/edits.js";
import * as sceneCatalog from "@/template/src/scenes.js";
import { palette } from "@/template/src/theme.js";
import type { Design, ElementEdit, PageColors, ScenePick } from "@/lib/types";

// The panel beside the preview while editing on the page. It shows what can change on the
// thing that was clicked: its words, link, picture, icon, colours, background, size, shape
// and whether it shows at all. With nothing selected it holds the page-wide settings.

export interface Picked {
  key: string; // where the element is (template/src/edits.js); "" when it cannot be addressed
  label: string;
  tag: string;
  media: boolean; // an image, vector, canvas or video
  hasText: boolean; // it shows words of its own
  ownText: string; // those words, when they are not part of the content
  contentPath: string; // the words come from the content at this path ("" if not)
  imgPath: string; // a content photo slot
  videoPath: string;
  isLink: boolean;
  isScene: boolean;
  chain: { key: string; label: string }[]; // this element, then what it sits inside
  under: { key: string; label: string }[]; // other things stacked under the click
}

type SceneOption = { key: string; label: string; kind: "color" | "range" | "toggle" | "select"; min?: number; max?: number; step?: number; default?: string | number | boolean; options?: { value: string; label: string }[] | string[] };

const SWATCHES = ["#111827", "#FFFFFF", "#6B7280", "#DC2626", "#EA580C", "#D97706", "#16A34A", "#0D9488", "#0284C7", "#2563EB", "#7C3AED", "#DB2777"];
const COLOR_NAMES: [keyof PageColors, string][] = [
  ["bg", "Page background"],
  ["surface", "Cards and panels"],
  ["text", "Words"],
  ["muted", "Quiet words"],
  ["border", "Lines"],
  ["accent", "Accent"],
  ["onAccent", "Words on accent"],
];

const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);

function Group({ title, open = true, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details className="pe-group" open={open}>
      <summary>{title}</summary>
      <div className="pe-group-body">{children}</div>
    </details>
  );
}

function ColorField({ label, value, onChange, brand, allowNone = true }: { label: string; value: string; onChange: (v: string) => void; brand: string[]; allowNone?: boolean }) {
  const hex = isHex(value) ? value : "";
  const [text, setText] = useState(value || "");
  useEffect(() => setText(value || ""), [value]);
  return (
    <div className="pe-field">
      <div className="pe-field-head">
        <span className="pe-lbl">{label}</span>
        {allowNone && value && (
          <button type="button" className="pe-link" onClick={() => onChange("")}>
            Reset
          </button>
        )}
      </div>
      <div className="pe-color">
        <label className="pe-well" style={{ background: value || "transparent" }} title="Pick any colour">
          <input type="color" value={hex || "#888888"} onChange={(e) => onChange(e.target.value.toUpperCase())} aria-label={label} />
          {!value && <span aria-hidden="true">+</span>}
        </label>
        <input
          className="pe-hex"
          value={text}
          placeholder="#RRGGBB"
          spellCheck={false}
          aria-label={label + " code"}
          onChange={(e) => {
            const v = e.target.value.trim();
            setText(v);
            if (isHex(v)) onChange(v.toUpperCase());
            else if (/^#[0-9a-f]{3}$/i.test(v)) onChange(("#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]).toUpperCase());
          }}
        />
      </div>
      <div className="pe-swatches" role="group" aria-label={label + " swatches"}>
        {[...brand, ...SWATCHES].map((c, i) => (
          <button type="button" key={c + i} className={"pe-swatch" + (value?.toUpperCase() === c.toUpperCase() ? " is-on" : "")} style={{ background: c }} onClick={() => onChange(c)} aria-label={c} title={i < brand.length ? "From your design, " + c : c} />
        ))}
      </div>
    </div>
  );
}

function Range({ label, value, min, max, step, unit = "", onChange, reset }: { label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void; reset?: number }) {
  return (
    <div className="pe-field">
      <div className="pe-field-head">
        <span className="pe-lbl">{label}</span>
        <span className="pe-val">
          {unit === "%" ? Math.round(value * 100) + "%" : Math.round(value * 100) / 100 + unit}
          {reset !== undefined && value !== reset && (
            <button type="button" className="pe-link" onClick={() => onChange(reset)}>
              Reset
            </button>
          )}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className={"pe-chip" + (on ? " is-on" : "")} aria-pressed={on} onClick={() => onChange(!on)}>
      {label}
    </button>
  );
}

// A background: one colour, a blend of two, or a picture.
function Background({ e, set, brand }: { e: ElementEdit; set: (p: Partial<ElementEdit>) => void; brand: string[] }) {
  const grad = /^linear-gradient\((-?\d+)deg,\s*(#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\)$/i.exec(e.bg || "");
  const start: "none" | "solid" | "blend" | "picture" = e.bgImage ? "picture" : grad ? "blend" : e.bg ? "solid" : "none";
  const [mode, setMode] = useState(start);
  useEffect(() => setMode(start), [start]);
  const a = grad ? grad[2] : isHex(e.bg || "") ? e.bg! : brand[0] || "#2563EB";
  const b = grad ? grad[3] : brand[1] || "#7C3AED";
  const angle = grad ? Number(grad[1]) : 135;
  const blend = (x: string, y: string, deg: number) => set({ bg: `linear-gradient(${deg}deg, ${x}, ${y})`, bgImage: "" });
  return (
    <>
      <div className="seg pe-seg" role="group" aria-label="Background kind">
        {(["none", "solid", "blend", "picture"] as const).map((m) => (
          <button
            type="button"
            key={m}
            className={mode === m ? "is-on" : ""}
            aria-pressed={mode === m}
            onClick={() => {
              setMode(m);
              if (m === "none") set({ bg: "", bgImage: "", bgDim: undefined, bgFit: undefined });
              if (m === "solid") set({ bg: isHex(e.bg || "") ? e.bg : a, bgImage: "" });
              if (m === "blend") blend(a, b, angle);
            }}
          >
            {m === "none" ? "As designed" : m === "solid" ? "Colour" : m === "blend" ? "Blend" : "Picture"}
          </button>
        ))}
      </div>
      {mode === "solid" && <ColorField label="Background colour" value={isHex(e.bg || "") ? e.bg! : ""} onChange={(v) => set({ bg: v, bgImage: "" })} brand={brand} allowNone={false} />}
      {mode === "blend" && (
        <>
          <ColorField label="From" value={a} onChange={(v) => v && blend(v, b, angle)} brand={brand} allowNone={false} />
          <ColorField label="To" value={b} onChange={(v) => v && blend(a, v, angle)} brand={brand} allowNone={false} />
          <Range label="Direction" value={angle} min={0} max={360} step={15} unit="°" onChange={(v) => blend(a, b, v)} />
        </>
      )}
      {mode === "picture" && (
        <>
          <ImageField value={e.bgImage || ""} onChange={(v) => set({ bgImage: v })} />
          {e.bgImage && (
            <>
              <Range label="Darken so words stay readable" value={e.bgDim ?? 0} min={0} max={0.9} step={0.05} unit="%" onChange={(v) => set({ bgDim: v })} reset={0} />
              <div className="pe-chips">
                <Toggle label="Fill the area" on={e.bgFit !== "contain"} onChange={() => set({ bgFit: undefined })} />
                <Toggle label="Show whole picture" on={e.bgFit === "contain"} onChange={() => set({ bgFit: "contain" })} />
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

function IconPicker({ e, set }: { e: ElementEdit; set: (p: Partial<ElementEdit>) => void }) {
  const [q, setQ] = useState("");
  const ids = EDIT_ICON_IDS.filter((id) => id.includes(q.trim().toLowerCase()));
  return (
    <>
      <input type="search" placeholder="Search icons, for example star or phone" value={q} onChange={(ev) => setQ(ev.target.value)} aria-label="Search icons" />
      <div className="pe-icons" role="group" aria-label="Icons">
        {ids.map((id) => (
          <button type="button" key={id} title={id} aria-label={id} aria-pressed={e.icon === id} className={"pe-icon-btn" + (e.icon === id ? " is-on" : "")} onClick={() => set({ icon: id, iconSrc: "" })} dangerouslySetInnerHTML={{ __html: iconSvg(id, 20) }} />
        ))}
        {!ids.length && <p className="small muted">No icon by that name. Upload your own below.</p>}
      </div>
      <p className="pe-lbl" style={{ marginTop: 12 }}>
        Or use your own picture or logo
      </p>
      <ImageField value={e.iconSrc || ""} onChange={(v) => set({ iconSrc: v, icon: v ? "" : e.icon })} />
      {(e.icon || e.iconSrc) && (
        <button type="button" className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => set({ icon: "", iconSrc: "" })}>
          <Icon name="undo" size={14} />
          Back to the original
        </button>
      )}
    </>
  );
}

function SceneSettings({ design, onDesign }: { design: Design; onDesign: (patch: Partial<Design>) => void }) {
  const scene = design.scene as ScenePick | null | undefined;
  if (!scene) return <p className="small muted">This site has no live scene. Add one in the Scenes step.</p>;
  const cat = sceneCatalog as unknown as { SCENE_OPTIONS?: Record<string, SceneOption[]>; SCENE_PALETTES: { id: string; name: string }[]; SCENES: (ScenePick & { type: string })[]; sceneType: (id: string) => { group: string; name: string } };
  const options = (cat.SCENE_OPTIONS && cat.SCENE_OPTIONS[scene.type]) || [];
  const opts = scene.opts || {};
  const setOpt = (k: string, v: string | number | boolean | undefined) => {
    const next = { ...opts } as Record<string, string | number | boolean | string[]>;
    if (v === undefined || v === "") delete next[k];
    else next[k] = v;
    onDesign({ scene: { ...scene, opts: next } });
  };
  const siblings = cat.SCENES.filter((s) => s.type === scene.type);
  return (
    <>
      <p className="small">
        <strong>{scene.name}</strong>
      </p>
      {siblings.length > 1 && (
        <div className="pe-field">
          <span className="pe-lbl">Colours</span>
          <div className="pe-chips">
            {siblings.map((s) => (
              <Toggle key={s.id} label={(cat.SCENE_PALETTES.find((p) => p.id === s.palette) || { name: s.palette }).name} on={s.id === scene.id} onChange={() => onDesign({ scene: { ...s, opts: scene.opts } as ScenePick })} />
            ))}
          </div>
        </div>
      )}
      <div className="pe-field">
        <span className="pe-lbl">Where it shows</span>
        <div className="pe-chips">
          <Toggle label="Behind the opening words" on={design.sceneMode !== "visual"} onChange={() => onDesign({ sceneMode: "backdrop" })} />
          <Toggle label="As the opening picture" on={design.sceneMode === "visual"} onChange={() => onDesign({ sceneMode: "visual", heroStyle: "stage" })} />
        </div>
      </div>
      {options.map((o) =>
        o.kind === "color" ? (
          <ColorField key={o.key} label={o.label} value={String(opts[o.key] ?? "")} onChange={(v) => setOpt(o.key, v)} brand={[]} />
        ) : o.kind === "range" ? (
          <Range key={o.key} label={o.label} value={Number(opts[o.key] ?? o.default ?? 1)} min={o.min ?? 0} max={o.max ?? 2} step={o.step ?? 0.05} onChange={(v) => setOpt(o.key, v)} reset={Number(o.default ?? 1)} />
        ) : o.kind === "toggle" ? (
          <div className="pe-chips" key={o.key}>
            <Toggle label={o.label} on={Boolean(opts[o.key] ?? o.default)} onChange={(v) => setOpt(o.key, v)} />
          </div>
        ) : (
          <div className="pe-field" key={o.key}>
            <span className="pe-lbl">{o.label}</span>
            <select value={String(opts[o.key] ?? o.default ?? "")} onChange={(ev) => setOpt(o.key, ev.target.value)} aria-label={o.label}>
              {(o.options || []).map((x) => {
                const v = typeof x === "string" ? x : x.value;
                return (
                  <option key={v} value={v}>
                    {typeof x === "string" ? x : x.label}
                  </option>
                );
              })}
            </select>
          </div>
        )
      )}
      <p className="small muted">Click the scene itself to recolour, brighten, blur or hide it. Choose a different scene in the Scenes step.</p>
      <button type="button" className="btn btn-sm btn-danger" style={{ marginTop: 6 }} onClick={() => onDesign({ scene: null })}>
        <Icon name="x" size={14} />
        Remove the scene
      </button>
    </>
  );
}

export default function Inspector({
  picked,
  design,
  scheme,
  edit,
  contentValue,
  editLabels,
  onEdit,
  onContent,
  onDesign,
  onSelect,
  onClose,
  onResetAll,
}: {
  picked: Picked | null;
  design: Design;
  scheme: "light" | "dark";
  edit: ElementEdit;
  contentValue: string;
  editLabels: { key: string; label: string; missing: boolean }[];
  onEdit: (key: string, patch: Partial<ElementEdit> | null) => void;
  onContent: (path: string, v: string) => void;
  onDesign: (patch: Partial<Design>) => void;
  onSelect: (key: string) => void;
  onClose: () => void;
  onResetAll: () => void;
}) {
  const pal = palette(design, scheme) as PageColors;
  const brand = [pal.accent, pal.text, pal.bg, pal.surface];
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
  }, [picked?.key, picked?.contentPath, picked?.imgPath]);

  // ---------------------------------------------------------------- page-wide settings
  if (!picked) {
    const own = (design.colors && design.colors[scheme]) || {};
    const setColor = (k: keyof PageColors, v: string) => {
      const mine = { ...own } as Partial<PageColors>;
      if (v) mine[k] = v;
      else delete mine[k];
      const colors = { ...(design.colors || {}), [scheme]: mine };
      if (!Object.keys(mine).length) delete colors[scheme];
      onDesign({ colors: Object.keys(colors).length ? colors : undefined });
    };
    return (
      <aside className="pe-panel" aria-label="Page settings">
        <header className="pe-head">
          <div>
            <p className="pe-kicker">Whole page</p>
            <h3 className="pe-title">Page settings</h3>
          </div>
          <button className="btn btn-ghost btn-sm btn-icon" aria-label="Close" onClick={onClose}>
            <Icon name="x" size={15} />
          </button>
        </header>
        <div className="pe-body" ref={body}>
          <p className="small muted" style={{ marginBottom: 12 }}>
            Click anything on the page to change it: words, pictures, icons, buttons, backgrounds, widgets and scenes.
          </p>
          <Group title={"Page colours, " + scheme + " theme"}>
            <p className="small muted">Exact colours for the whole site. Switch Light or Dark above the preview to set the other theme.</p>
            {COLOR_NAMES.map(([k, name]) => (
              <div className="pe-row" key={k}>
                <label className="pe-well pe-well-sm" style={{ background: pal[k] }}>
                  <input type="color" value={pal[k]} onChange={(e) => setColor(k, e.target.value.toUpperCase())} aria-label={name} />
                </label>
                <span className="pe-row-name">{name}</span>
                <code className="pe-code">{pal[k]}</code>
                {own[k] && (
                  <button type="button" className="pe-link" onClick={() => setColor(k, "")}>
                    Reset
                  </button>
                )}
              </div>
            ))}
          </Group>
          <Group title="Live scene" open={!!design.scene}>
            <SceneSettings design={design} onDesign={onDesign} />
          </Group>
          <Group title={"Your changes (" + editLabels.length + ")"} open={editLabels.length > 0}>
            {!editLabels.length && <p className="small muted">Nothing changed yet. Changes you make to single elements are listed here.</p>}
            {editLabels.map((x) => (
              <div className="pe-row" key={x.key}>
                <button type="button" className="pe-link pe-row-name" disabled={x.missing} onClick={() => onSelect(x.key)} title={x.missing ? "This element is not on the page right now" : "Select it"}>
                  {x.label}
                  {x.missing ? " (not on the page now)" : ""}
                </button>
                <button type="button" className="pe-link" onClick={() => onEdit(x.key, null)}>
                  Remove
                </button>
              </div>
            ))}
            {(editLabels.length > 0 || design.colors) && (
              <button type="button" className="btn btn-sm btn-danger" style={{ marginTop: 10 }} onClick={onResetAll}>
                <Icon name="undo" size={14} />
                Put everything back as designed
              </button>
            )}
          </Group>
        </div>
      </aside>
    );
  }

  // ---------------------------------------------------------------- one element
  const p = picked;
  const e = edit;
  const can = !!p.key;
  const set = (patch: Partial<ElementEdit>) => can && onEdit(p.key, patch);
  const changed = Object.keys(e).length > 0;
  const wordy = !p.media && !p.isScene;
  return (
    <aside className="pe-panel" aria-label={"Edit " + p.label}>
      <header className="pe-head">
        <div style={{ minWidth: 0 }}>
          <p className="pe-kicker">Editing</p>
          <h3 className="pe-title">{p.label}</h3>
        </div>
        <button className="btn btn-ghost btn-sm btn-icon" aria-label="Close" onClick={onClose}>
          <Icon name="x" size={15} />
        </button>
      </header>
      {(p.chain.length > 1 || p.under.length > 0) && (
        <nav className="pe-crumbs" aria-label="Select something else here">
          {p.chain.length > 1 && (
            <div>
              <span className="pe-crumb-lbl">Inside</span>
              {p.chain.slice(1).map((c) => (
                <button type="button" key={c.key} className="pe-chip" onClick={() => onSelect(c.key)}>
                  {c.label}
                </button>
              ))}
            </div>
          )}
          {p.under.length > 0 && (
            <div>
              <span className="pe-crumb-lbl">Behind it</span>
              {p.under.map((c) => (
                <button type="button" key={c.key} className="pe-chip" onClick={() => onSelect(c.key)}>
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </nav>
      )}
      <div className="pe-body" ref={body}>
        {p.videoPath && (
          <Group title="Video">
            <VideoField value={contentValue} onChange={(v) => onContent(p.videoPath, v)} />
          </Group>
        )}
        {p.imgPath && !p.videoPath && (
          <Group title="Picture">
            <ImageField value={contentValue} onChange={(v) => onContent(p.imgPath, v)} />
            <p className="small muted" style={{ marginTop: 8 }}>
              Upload, drop or paste a picture. It is saved with your site.
            </p>
          </Group>
        )}
        {p.contentPath && (
          <Group title="Words">
            <textarea autoFocus rows={Math.min(8, Math.max(2, Math.ceil(contentValue.length / 34)))} value={contentValue} onChange={(ev) => onContent(p.contentPath, ev.target.value)} aria-label="Words" />
          </Group>
        )}
        {!p.contentPath && !p.imgPath && p.hasText && can && (
          <Group title="Words">
            <textarea rows={Math.min(6, Math.max(2, Math.ceil((e.text ?? p.ownText).length / 34)))} value={e.text ?? p.ownText} onChange={(ev) => set({ text: ev.target.value })} aria-label="Words" />
            {e.text != null && (
              <button type="button" className="pe-link" onClick={() => onEdit(p.key, { text: undefined })}>
                Back to the original words
              </button>
            )}
          </Group>
        )}
        {p.isLink && can && (
          <Group title="Where it goes" open={!!e.href}>
            <input type="text" inputMode="url" placeholder="https://, mailto:, tel: or #contact" value={e.href || ""} onChange={(ev) => set({ href: ev.target.value })} aria-label="Link" />
            <p className="small muted" style={{ marginTop: 6 }}>
              Leave empty to keep where it goes now.
            </p>
          </Group>
        )}
        {p.isScene && (
          <Group title="Live scene">
            <SceneSettings design={design} onDesign={onDesign} />
          </Group>
        )}
        {!can && <p className="small muted">This part can only have its words or picture changed.</p>}
        {can && p.tag === "img" && !p.imgPath && (
          <Group title="Picture">
            <ImageField value={e.src || ""} onChange={(v) => set({ src: v })} />
            <p className="small muted" style={{ marginTop: 8 }}>
              Replaces this picture with your own. Remove yours to get the original back.
            </p>
          </Group>
        )}
        {can && (p.tag === "svg" || (p.tag === "img" && !p.imgPath)) && (
          <Group title={p.tag === "svg" ? "Icon or vector" : "Swap for an icon"} open={p.tag === "svg"}>
            <IconPicker e={e} set={set} />
          </Group>
        )}
        {can && !p.isScene && (p.tag === "svg" || wordy) && (
          <Group title={p.tag === "svg" ? "Icon colour" : "Text colour"}>
            <ColorField label={p.tag === "svg" ? "Colour" : "Words"} value={e.color || ""} onChange={(v) => set({ color: v })} brand={brand} />
          </Group>
        )}
        {can && wordy && (
          <Group title="Background" open={!!(e.bg || e.bgImage)}>
            <Background e={e} set={set} brand={brand} />
            <ColorField label="Outline colour" value={e.border || ""} onChange={(v) => set({ border: v })} brand={brand} />
          </Group>
        )}
        {can && wordy && (
          <Group title="Type" open={p.hasText}>
            <Range label="Size" value={e.size ?? 1} min={0.5} max={2.5} step={0.05} unit="%" onChange={(v) => set({ size: v })} reset={1} />
            <div className="pe-chips">
              <Toggle label="Bold" on={(e.weight ?? 0) >= 700} onChange={(v) => set({ weight: v ? 800 : undefined })} />
              <Toggle label="Italic" on={!!e.italic} onChange={(v) => set({ italic: v || undefined })} />
              <Toggle label="Underline" on={!!e.underline} onChange={(v) => set({ underline: v || undefined })} />
              <Toggle label="CAPITALS" on={!!e.caps} onChange={(v) => set({ caps: v || undefined })} />
            </div>
            <div className="seg pe-seg" role="group" aria-label="Alignment">
              {(["", "left", "center", "right"] as const).map((a) => (
                <button type="button" key={a || "auto"} className={(e.align || "") === a ? "is-on" : ""} aria-pressed={(e.align || "") === a} onClick={() => set({ align: a || undefined })}>
                  {a === "" ? "As designed" : a === "center" ? "Centre" : a}
                </button>
              ))}
            </div>
            <Range label="Letter spacing" value={e.spacing ?? 0} min={-0.05} max={0.3} step={0.01} unit="em" onChange={(v) => set({ spacing: v || undefined })} reset={0} />
          </Group>
        )}
        {can && p.media && (
          <Group title="Size and colour">
            <Range label="Size" value={e.size ?? 1} min={0.4} max={2.5} step={0.05} unit="%" onChange={(v) => set({ size: v })} reset={1} />
            <Range label="Shift the colours" value={e.tint ?? 0} min={-180} max={180} step={5} unit="°" onChange={(v) => set({ tint: v || undefined })} reset={0} />
            <Range label="Colour strength" value={e.sat ?? 1} min={0} max={2.5} step={0.05} unit="%" onChange={(v) => set({ sat: v })} reset={1} />
            <Range label="Brightness" value={e.bright ?? 1} min={0.3} max={1.8} step={0.05} unit="%" onChange={(v) => set({ bright: v })} reset={1} />
            <Range label="Blur" value={e.blur ?? 0} min={0} max={24} step={1} unit="px" onChange={(v) => set({ blur: v || undefined })} reset={0} />
            {p.tag === "img" && (
              <div className="pe-chips">
                <Toggle label="Fill the frame" on={e.fit === "cover"} onChange={(v) => set({ fit: v ? "cover" : undefined })} />
                <Toggle label="Show the whole picture" on={e.fit === "contain"} onChange={(v) => set({ fit: v ? "contain" : undefined })} />
              </div>
            )}
          </Group>
        )}
        {can && (
          <Group title="Shape and visibility" open={e.hide || e.radius != null || e.opacity != null || e.pad != null}>
            <Range label="Round the corners" value={e.radius ?? 0} min={0} max={80} step={1} unit="px" onChange={(v) => set({ radius: v })} />
            {e.radius != null && (
              <button type="button" className="pe-link" onClick={() => onEdit(p.key, { radius: undefined })}>
                Corners as designed
              </button>
            )}
            {wordy && (
              <>
                <Range label="Space inside" value={e.pad ?? 0} min={0} max={96} step={2} unit="px" onChange={(v) => set({ pad: v })} />
                {e.pad != null && (
                  <button type="button" className="pe-link" onClick={() => onEdit(p.key, { pad: undefined })}>
                    Space as designed
                  </button>
                )}
              </>
            )}
            <Range label="See-through" value={e.opacity ?? 1} min={0.05} max={1} step={0.05} unit="%" onChange={(v) => set({ opacity: v })} reset={1} />
            <div className="pe-chips">
              <Toggle label={e.hide ? "Hidden on your site. Show it again" : "Hide this on my site"} on={!!e.hide} onChange={(v) => set({ hide: v || undefined })} />
            </div>
          </Group>
        )}
      </div>
      {can && changed && (
        <footer className="pe-foot">
          <button type="button" className="btn btn-sm" onClick={() => onEdit(p.key, null)}>
            <Icon name="undo" size={14} />
            Put this back as designed
          </button>
        </footer>
      )}
    </aside>
  );
}
