"use client";

import "./character.css";

import { useEffect, useRef, useState } from "react";
import CharacterView from "./CharacterView";
import { findSubject, loadPicture, reliefFromPicture, sculptFromPicture, sculptorReady, type Picture, type PhotoModel, type SubjectCut } from "@/lib/character/photo";
import { warmCutout } from "@/lib/character/cutout";

// Photo to 3D (docs/CHARACTER-JOURNEY.md). The subject is cut out on this device first (the
// MagicTouch model; tap to pick another subject). Then the AI sculptor rebuilds it from shapes the
// img2threejs way (Gemini reads, builds, compares and corrects), or the relief inflates the cut-out
// itself, which keeps real faces. Nothing is uploaded for the cut-out or the relief.

type Way = "sculpt" | "puffy" | "standee";

const WAYS: { id: Way; label: string; note: string }[] = [
  { id: "sculpt", label: "AI sculpt", note: "Rebuilt from shapes like a toy figure, then checked against your photo and corrected. Best for mascots, products and animals." },
  { id: "puffy", label: "Soft 3D", note: "Your picture, cut out and inflated like a soft vinyl toy. Best for logos, drawings and characters." },
  { id: "standee", label: "Standee", note: "Your photo as a thick cut-out with soft edges. Best for people: it keeps your real face." },
];

const CUT_NOTE: Record<SubjectCut["method"], string> = {
  model: "Cut out on this device. Tap your subject if something else was picked.",
  own: "Your picture's own transparent background is used.",
  colour: "Cut out by colour. A plain background works best; tap your subject to try again.",
};

export default function PhotoTo3D({ onDone, onCancel, person = false, hint: hint0 = "" }: { onDone: (m: PhotoModel) => void; onCancel?: () => void; person?: boolean; hint?: string }) {
  const [pic, setPic] = useState<Picture | null>(null);
  const [preview, setPreview] = useState("");
  const [cut, setCut] = useState<SubjectCut | null>(null);
  const [finding, setFinding] = useState(false);
  const [way, setWay] = useState<Way>(person ? "standee" : "sculpt");
  const [ai, setAi] = useState<boolean | null>(null);
  const [hint, setHint] = useState(hint0);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [made, setMade] = useState<PhotoModel | null>(null);
  const run = useRef(0);

  useEffect(() => {
    warmCutout();
    sculptorReady().then((ok) => {
      setAi(ok);
      if (!ok) setWay((w) => (w === "sculpt" ? (person ? "standee" : "puffy") : w));
    });
  }, [person]);

  async function find(p: Picture, point?: { x: number; y: number }) {
    const id = ++run.current;
    setFinding(true);
    try {
      const c = await findSubject(p, point);
      if (id === run.current) setCut(c);
    } catch {
      if (id === run.current) setCut(null);
    } finally {
      if (id === run.current) setFinding(false);
    }
  }

  async function choose(file: File | undefined) {
    setError("");
    setMade(null);
    setCut(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("That file is not a picture.");
    if (file.size > 12 * 1024 * 1024) return setError("Use a picture under 12 MB.");
    try {
      const p = await loadPicture(file, 768);
      setPic(p);
      setPreview(p.canvas.toDataURL("image/jpeg", 0.8));
      void find(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That picture could not be opened.");
    }
  }

  function tap(e: React.MouseEvent<HTMLImageElement>) {
    if (!pic || finding) return;
    const r = e.currentTarget.getBoundingClientRect();
    void find(pic, { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
  }

  async function make(w: Way = way) {
    if (!pic) return;
    setError("");
    setMade(null);
    try {
      if (w === "sculpt") {
        try {
          const m = await sculptFromPicture(pic, { hint, rounds: 2, cut: cut ?? undefined, onStep: (s) => setBusy(s) });
          setMade(m);
          return;
        } catch (e) {
          setError(`${e instanceof Error ? e.message : "The sculptor could not finish."} A soft 3D version was made instead.`);
          w = person ? "standee" : "puffy";
        }
      }
      setBusy("Shaping it");
      // let the message paint before the heavy work
      await new Promise((r) => setTimeout(r, 30));
      setMade(await reliefFromPicture(pic, w === "standee" ? "standee" : "puffy", hint, cut ?? undefined));
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work. Try another picture.");
    } finally {
      setBusy("");
    }
  }

  const picker = <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => choose(e.target.files?.[0])} />;

  return (
    <div className="p3">
      {!made && (
        <>
          {!pic ? (
            <label className="p3-drop">
              <span>
                <strong>Choose a photo</strong>
                <small className="muted">A person, a mascot, a product, a pet, a logo. It is cut out on this device; a PNG with no background works too.</small>
              </span>
              {picker}
            </label>
          ) : (
            <figure className={`p3-cut ${finding ? "is-busy" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/no-noninteractive-element-interactions */}
              <img src={cut?.preview || preview} alt="Your picture, with the background faded where it was cut away" onClick={tap} />
              <figcaption className="small muted" aria-live="polite">
                {finding ? "Finding the subject…" : cut ? CUT_NOTE[cut.method] : ""}{" "}
                <label className="p3-again">
                  Another photo
                  {picker}
                </label>
              </figcaption>
            </figure>
          )}
          {pic && (
            <div className="p3-opts">
              <label className="lab-field">
                <span>What is in it?</span>
                <input type="text" value={hint} placeholder={person ? "Me" : "Our mascot, a red sneaker…"} onChange={(e) => setHint(e.target.value)} />
              </label>
              <div className="p3-ways" role="radiogroup" aria-label="How to make it 3D">
                {WAYS.map((x) => (
                  <button key={x.id} type="button" role="radio" aria-checked={way === x.id} disabled={x.id === "sculpt" && ai === false} className={`p3-way ${way === x.id ? "is-on" : ""}`} onClick={() => setWay(x.id)}>
                    <strong>{x.label}</strong>
                    <small>{x.id === "sculpt" && ai === false ? "Needs the AI key on the server. Use Soft 3D or Standee." : x.note}</small>
                  </button>
                ))}
              </div>
              <div className="tpl-row">
                <button type="button" className="btn btn-primary" disabled={!!busy || finding} onClick={() => make()}>
                  {busy ? `${busy}…` : finding ? "Finding the subject…" : "Make it 3D"}
                </button>
                {onCancel && (
                  <button type="button" className="btn btn-ghost" onClick={onCancel}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
          {!pic && onCancel && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
              Cancel
            </button>
          )}
        </>
      )}
      {error && (
        <p className="tpl-warn small" role="alert">
          {error}
        </p>
      )}
      {made && (
        <div className="p3-done">
          <CharacterView className="p3-view" config={{ src: made.src, poster: made.poster, name: made.name, stops: ["#1b1b22", "#6d5dfc", "#2a2a36"], scroll: "none", react: "both", entrance: true }} />
          <p className="small muted">
            {made.method === "sculpt" ? `Sculpted from ${made.spec?.parts.length ?? 0} shapes and checked against your photo.` : "Made on this device from your photo; nothing was uploaded."} Drag it to look around.
          </p>
          <div className="tpl-row">
            <button type="button" className="btn btn-primary" onClick={() => onDone(made)}>
              Use this model
            </button>
            {made.method === "sculpt" ? (
              <button type="button" className="btn" onClick={() => make(person ? "standee" : "puffy")}>
                Make a soft 3D version instead
              </button>
            ) : (
              ai && (
                <button type="button" className="btn" onClick={() => make("sculpt")}>
                  Try the AI sculpt
                </button>
              )
            )}
            <button type="button" className="btn btn-ghost" onClick={() => (setMade(null), setPic(null), setPreview(""), setCut(null))}>
              Another photo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
