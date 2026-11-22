"use client";

import { useEffect, useMemo, useState } from "react";
import CharacterView from "@/components/character/CharacterView";
import ModelPicker, { modelInfo, modelsFor } from "@/components/character/ModelPicker";
import PhotoTo3D from "@/components/character/PhotoTo3D";
import DesignPreview from "./DesignPreview";
import { FONT_PAIRS, gradientCss, type DesignSystem, type GradientStyle, type Mode, type Motion, type Radius } from "@/lib/character/design";
import type { ModelInfo } from "@/lib/character/apply";
import type { CharacterPalette } from "@/lib/character/palette";
import type { Brief } from "@/lib/journey/brief";
import { fontsHref, stageOf, type Tweak } from "./design-tweak";

// Step 3: the character every part of the site follows, then the design system drawn from it:
// five directions from its colours, and every choice in them open to change.

type Panel = "" | "library" | "photo";

const LIMIT_MB = 30;
const STYLES: { id: GradientStyle; label: string }[] = [
  { id: "glow", label: "Glow" },
  { id: "radial", label: "Spotlight" },
  { id: "aurora", label: "Aurora" },
  { id: "linear", label: "Linear" },
  { id: "solid", label: "Solid" },
];
const MODES: { id: "auto" | Mode; label: string }[] = [
  { id: "auto", label: "Template's own" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];
const RADII: { id: Radius; label: string }[] = [
  { id: "sharp", label: "Sharp" },
  { id: "soft", label: "Soft" },
  { id: "round", label: "Round" },
];
const MOTIONS: { id: Motion; label: string }[] = [
  { id: "calm", label: "Calm" },
  { id: "lively", label: "Lively" },
  { id: "bold", label: "Bold" },
];

function readFile(file: File): Promise<string> {
  return new Promise((ok, fail) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => fail(r.error);
    r.readAsDataURL(file);
  });
}

export default function DesignStep({
  brief,
  model,
  designs,
  design,
  designId,
  tweak,
  onModel,
  onDesign,
  onTweak,
  onNext,
}: {
  brief: Brief;
  model: ModelInfo | null;
  designs: DesignSystem[];
  design: DesignSystem | null;
  designId: string;
  tweak: Tweak;
  onModel: (m: ModelInfo, palette?: CharacterPalette | null) => void;
  onDesign: (id: string) => void;
  onTweak: (t: Tweak) => void;
  onNext: () => void;
}) {
  const fromPhoto = /photo|picture|logo|selfie|\bme\b/i.test(brief.character);
  const person = brief.kind === "portfolio" || /\bme\b|my photo|selfie/i.test(brief.character);
  const [panel, setPanel] = useState<Panel>(!model && fromPhoto ? "photo" : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const ideas = useMemo(() => modelsFor(brief.character || brief.what || brief.idea, 6), [brief.character, brief.what, brief.idea]);

  // The first idea is the character until they choose, unless they want one from a photo.
  useEffect(() => {
    if (!model && !fromPhoto && ideas[0]) onModel(modelInfo(ideas[0]));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Every font the options use, so their samples show in their own type.
  useEffect(() => {
    const fams = [...new Set([...designs.flatMap((d) => [d.fonts.display, d.fonts.body]), design?.fonts.display, design?.fonts.body].filter(Boolean) as string[])];
    if (!fams.length) return;
    const href = fontsHref(fams);
    if (document.querySelector(`link[data-jr-fonts="${CSS.escape(href)}"]`)) return;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    l.dataset.jrFonts = href;
    document.head.appendChild(l);
  }, [designs, design?.fonts.display, design?.fonts.body]);

  async function upload(file: File | undefined) {
    setError("");
    if (!file) return;
    if (!/\.glb$/i.test(file.name)) return setError("Choose a .glb file (a binary glTF model).");
    if (file.size > LIMIT_MB * 1024 * 1024) return setError(`Keep models under ${LIMIT_MB} MB; big ones load slowly on phones.`);
    setBusy(true);
    try {
      const src = (await readFile(file)).replace(/^data:[^;]*;base64,/, "data:model/gltf-binary;base64,");
      const { stillOfGlb } = await import("@/lib/character/model3d");
      const { poster } = await stillOfGlb(src);
      if (!poster) return setError("That model could not be read. Try exporting it again as GLB.");
      onModel({ asset: src, preview: poster, name: file.name.replace(/\.glb$/i, "").replace(/[-_]+/g, " ") });
      setPanel("");
    } catch {
      setError("That model could not be read.");
    } finally {
      setBusy(false);
    }
  }

  const stage = design ? stageOf(design) : null;
  const pair = FONT_PAIRS.find((p) => p.display === design?.fonts.display && p.body === design?.fonts.body);

  return (
    <div className="jr-design">
      <section className="jr-star" aria-labelledby="jr-star-h">
        <div className="jr-stage" style={{ background: stage ? gradientCss(stage.stops, design!.gradient.style, design!.gradient.angle, [50, 52]) : undefined }}>
          {model ? (
            <CharacterView className="jr-stage-view" config={{ src: model.asset, poster: model.preview, name: model.name, stops: stage?.stops, scroll: "none", react: "both", entrance: true, speed: design?.motion === "bold" ? 1.25 : design?.motion === "lively" ? 1.1 : 0.8, motion: design?.motion === "bold" ? "sway" : "float" }} />
          ) : (
            <p className="jr-stage-empty">{fromPhoto ? "Your photo becomes the star. Choose one on the right." : "Pick a character on the right."}</p>
          )}
          {model && <span className="jr-stage-name">{model.name}</span>}
        </div>
        <div className="jr-star-pick">
          <p className="eyebrow">
            <span className="mono">Step 3 · The star</span>
          </p>
          <h2 id="jr-star-h">Your character</h2>
          <p className="muted">Every colour, the type and the motion of the site follow it. {brief.character ? `You asked for ${brief.character.replace(/^(a|an|the)\s+/i, (m) => m.toLowerCase())}.` : ""}</p>
          <div className="jr-ideas" role="listbox" aria-label="Characters for your idea">
            {ideas.map((a) => {
              const on = model?.asset === a.asset;
              return (
                <button key={a.id} type="button" role="option" aria-selected={on} className={`jr-idea ${on ? "is-on" : ""}`} onClick={() => onModel(modelInfo(a))}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.preview} alt="" loading="lazy" />
                  <span>{a.name}</span>
                </button>
              );
            })}
          </div>
          <div className="tpl-row">
            <button type="button" className={`btn btn-sm ${panel === "library" ? "is-on" : ""}`} aria-expanded={panel === "library"} onClick={() => setPanel(panel === "library" ? "" : "library")}>
              All 3D models
            </button>
            <button type="button" className={`btn btn-sm ${panel === "photo" ? "is-on" : ""}`} aria-expanded={panel === "photo"} onClick={() => setPanel(panel === "photo" ? "" : "photo")}>
              {person ? "From my photo" : "From a photo"}
            </button>
            <label className={`btn btn-sm ${busy ? "is-busy" : ""}`}>
              Upload a GLB
              <input type="file" accept=".glb,model/gltf-binary" hidden onChange={(e) => upload(e.target.files?.[0])} />
            </label>
          </div>
          {error && (
            <p className="tpl-warn small" role="alert">
              {error}
            </p>
          )}
          {panel === "library" && <ModelPicker compact value={model?.asset} onPick={(a) => (onModel(modelInfo(a)), setPanel(""))} />}
          {panel === "photo" && (
            <PhotoTo3D
              person={person}
              hint={person ? "" : brief.character.replace(/,?\s*from (a|my|our) (photo|picture)/i, "").replace(/^(our|my)\s+/i, "")}
              onCancel={() => setPanel("")}
              onDone={(m) => (onModel({ asset: m.src, preview: m.poster, name: m.name }, m.palette), setPanel(""))}
            />
          )}
        </div>
      </section>

      {model && (
        <section className="jr-systems" aria-labelledby="jr-sys-h">
          <div className="jr-sys-head">
            <h2 id="jr-sys-h">Design system</h2>
            <p className="muted">Five directions drawn from {model.name.toLowerCase().startsWith("my ") ? "your model" : `the ${model.name.toLowerCase()}`}'s own colours. Pick one, then change anything.</p>
          </div>
          {designs.length === 0 ? (
            <p className="muted">Reading its colours…</p>
          ) : (
            <div className="jr-options" role="radiogroup" aria-label="Design directions">
              {designs.map((d) => {
                const s = stageOf(d);
                const on = d.id === designId;
                return (
                  <button key={d.id} type="button" role="radio" aria-checked={on} className={`jr-option ${on ? "is-on" : ""}`} onClick={() => onDesign(d.id)}>
                    <span className="jr-option-stage" style={{ background: gradientCss(s.stops, d.gradient.style, d.gradient.angle, [50, 50]) }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={model.preview} alt="" />
                    </span>
                    <span className="jr-option-dots" aria-hidden="true">
                      {[d.accent, d.accent2, s.k.page, s.k.ink].map((c, i) => (
                        <i key={i} style={{ background: c }} />
                      ))}
                    </span>
                    <strong style={{ fontFamily: `"${d.fonts.display}", var(--font-display, inherit)` }}>{d.name}</strong>
                    <small>{d.note}</small>
                    <small className="jr-option-type">
                      {d.fonts.display} / {d.fonts.body}
                    </small>
                  </button>
                );
              })}
            </div>
          )}

          {design && (
            <div className="jr-tune">
              <div className="jr-tune-controls">
                <h3>Change anything</h3>
                <label className="lab-field">
                  <span>Accent colour</span>
                  <span className="jr-color">
                    <input type="color" value={design.accent} onChange={(e) => onTweak({ ...tweak, accent: e.target.value })} aria-label="Accent colour" />
                    <code>{design.accent}</code>
                    {tweak.accent && (
                      <button type="button" className="linklike small" onClick={() => onTweak({ ...tweak, accent: undefined })}>
                        From the character
                      </button>
                    )}
                  </span>
                </label>
                <label className="lab-field">
                  <span>Type</span>
                  <select value={pair?.id || ""} onChange={(e) => onTweak({ ...tweak, pair: e.target.value || undefined })}>
                    {!pair && <option value="">{design.fonts.display} / {design.fonts.body}</option>}
                    {FONT_PAIRS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}: {p.display} / {p.body}
                      </option>
                    ))}
                  </select>
                </label>
                <Seg label="Light or dark" value={design.mode} options={MODES} onPick={(v) => onTweak({ ...tweak, mode: v })} />
                <Seg label="Background" value={design.gradient.style} options={STYLES} onPick={(v) => onTweak({ ...tweak, style: v })} />
                <Seg label="Corners" value={design.radius} options={RADII} onPick={(v) => onTweak({ ...tweak, radius: v })} />
                <Seg label="Motion" value={design.motion} options={MOTIONS} onPick={(v) => onTweak({ ...tweak, motion: v })} />
              </div>
              <DesignPreview design={design} model={model} brief={brief} />
            </div>
          )}

          <div className="jr-next">
            <button type="button" className="btn btn-primary" disabled={!design} onClick={onNext}>
              Next: choose a template
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Seg<T extends string>({ label, value, options, onPick }: { label: string; value: T; options: { id: T; label: string }[]; onPick: (v: T) => void }) {
  return (
    <div className="lab-field">
      <span>{label}</span>
      <div className="seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className={value === o.id ? "is-on" : ""} onClick={() => onPick(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
