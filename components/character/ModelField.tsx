"use client";

import "./character.css";

import { useEffect, useState } from "react";
import ModelPicker, { modelInfo } from "./ModelPicker";
import PhotoTo3D from "./PhotoTo3D";
import { designsFor, withModel } from "@/lib/character/match";
import { applyDesign, stageStops, type ModelInfo, type TemplateRoles } from "@/lib/character/apply";
import { gradientCss, type DesignSystem } from "@/lib/character/design";
import type { Content } from "@/lib/template-schema.mjs";
import type { CharacterPalette } from "@/lib/character/palette";

// The 3D character in the studio: pick a library model, upload a GLB or make one from a photo.
// The stage behind it takes the model's colours at once; one tap pours them into the whole site.

type Open = "" | "library" | "photo";

const LIMIT_MB = 30;

function readFile(file: File): Promise<string> {
  return new Promise((ok, fail) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => fail(r.error);
    r.readAsDataURL(file);
  });
}

export default function ModelField({ content, roles, words, business, setContent, onError }: { content: Content; roles: TemplateRoles; words: string[]; business?: string; setContent: (fn: (c: Content) => Content) => void; onError: (m: string) => void }) {
  const ch = content.character || {};
  const [open, setOpen] = useState<Open>("");
  const [designs, setDesigns] = useState<DesignSystem[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  // The design systems for the current model, for the "whole site" row.
  useEffect(() => {
    let live = true;
    if (!ch.src) return setDesigns([]);
    designsFor(String(ch.poster || ""), [...words, String(ch.name || "")], { business }).then((r) => live && setDesigns(r.designs));
    return () => {
      live = false;
    };
  }, [ch.src, ch.poster]); // eslint-disable-line react-hooks/exhaustive-deps

  async function use(m: ModelInfo, palette?: CharacterPalette | null) {
    setBusy(true);
    try {
      const { designs: ds } = await designsFor(m.preview, [...words, m.name], { palette, business });
      setContent((c) => withModel(c, roles, m, ds[0] ?? null));
      setDesigns(ds);
      const who = !m.name || /^(my|your)\b/i.test(m.name) ? "your model" : `the ${m.name.toLowerCase()}`;
      setNote(`The background now takes its colours from ${who}. Pour them into the whole site below.`);
      setOpen("");
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!/\.glb$/i.test(file.name)) return onError("Choose a .glb file (a binary glTF model).");
    if (file.size > LIMIT_MB * 1024 * 1024) return onError(`Keep models under ${LIMIT_MB} MB. Big ones load slowly on phones.`);
    setBusy(true);
    try {
      const raw = await readFile(file);
      const src = raw.replace(/^data:[^;]*;base64,/, "data:model/gltf-binary;base64,");
      const { stillOfGlb } = await import("@/lib/character/model3d");
      const { poster } = await stillOfGlb(src);
      if (!poster) return onError("That model could not be read. Try exporting it again as GLB.");
      await use({ asset: src, preview: poster, name: file.name.replace(/\.glb$/i, "").replace(/[-_]+/g, " ") });
    } catch {
      onError("That model could not be read.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lab-field mf">
      <span>3D model</span>
      <div className="mf-now">
        {ch.poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={String(ch.poster)} alt="" className="mf-thumb" style={{ background: gradientCss(content.design?.stops || [], "radial", 160, [50, 55]) }} />
        ) : (
          <span className="mf-thumb mf-empty" aria-hidden="true" />
        )}
        <span className="mf-name">
          <strong>{ch.src ? String(ch.name || "Your model") : "No character yet"}</strong>
          <small className="muted">{ch.src ? (String(ch.src).startsWith("data:") ? "Your own model" : "From the library") : "The site shows its pictures as made."}</small>
        </span>
      </div>
      <span className="tpl-row">
        <button type="button" className="btn btn-sm" aria-expanded={open === "library"} disabled={busy} onClick={() => setOpen(open === "library" ? "" : "library")}>
          Library
        </button>
        <label className={`btn btn-sm ${busy ? "is-busy" : ""}`}>
          Upload GLB
          <input type="file" accept=".glb,model/gltf-binary" hidden onChange={(e) => upload(e.target.files?.[0])} />
        </label>
        <button type="button" className="btn btn-sm" aria-expanded={open === "photo"} disabled={busy} onClick={() => setOpen(open === "photo" ? "" : "photo")}>
          From a photo
        </button>
        {ch.src && (
          <button type="button" className="btn btn-sm" onClick={() => setContent((c) => ({ ...c, character: { ...c.character, src: "", poster: "", name: "", credit: "" } }))}>
            Remove
          </button>
        )}
      </span>
      {open === "library" && <ModelPicker compact value={String(ch.src || "")} onPick={(a) => use(modelInfo(a))} />}
      {open === "photo" && (
        <PhotoTo3D
          person={/portfolio|creator/.test(business || "")}
          onCancel={() => setOpen("")}
          onDone={(m) => use({ asset: m.src, preview: m.poster, name: m.name }, m.palette)}
        />
      )}
      {note && <small className="mf-note">{note}</small>}
      {ch.src && designs.length > 0 && (
        <div className="mf-designs" role="group" aria-label="Colours from the character">
          <small className="muted">Colours from the character, for the whole site:</small>
          <div className="mf-swatches">
            {designs.map((d) => (
              <button key={d.id} type="button" className="mf-swatch" title={`${d.name}: ${d.note}`} onClick={() => setContent((c) => applyDesign(c, roles, d))}>
                <span style={{ background: gradientCss(stageStops(d, roles), d.gradient.style, d.gradient.angle, [50, 50]) }} />
                <i style={{ background: d.accent }} />
                <em>{d.name}</em>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
