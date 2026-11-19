"use client";

import { useEffect, useRef, useState } from "react";
import { beatAt, type Frame, type Palette } from "@/template/src/scenes/frame";
import type { Mount3D, View3D } from "@/template/src/scenes/webgl/core";
import type { AssetDirection, Beat, ExperienceAsset } from "@/template/src/experiences/types";

// The library's interactive preview: the same asset3d renderer the generated sites use, driven
// by a synthetic stage frame. The slider stands in for the page scroll, so what you see here
// is what the model does on a site: it turns, comes close, settles. Pointer and taps work too.

const PAL_DARK: Palette = { bg: "#101012", surface: "#1a1a1e", text: "#f4f4f5", muted: "#a1a1aa", accent: "#d9b36c", onAccent: "#111111", dark: true };
const PAL_LIGHT: Palette = { bg: "#f4f2ee", surface: "#ffffff", text: "#17171a", muted: "#5f5f66", accent: "#8a5a1f", onAccent: "#ffffff", dark: false };

const BEATS: Beat[] = [
  { spin: -40, zoom: 0.92, tilt: 0.16, light: 0.6, particles: 0.35 },
  { spin: 90, zoom: 1, tilt: 0.12, lift: 0.04, light: 0.7, particles: 0.5, orbit: 10 },
  { spin: 200, zoom: 1.3, tilt: 0.2, light: 0.85, particles: 0.6, orbit: 20 },
  { spin: 300, zoom: 1.08, tilt: 0.08, light: 0.75, particles: 0.45, orbit: -10 },
  { spin: 360, zoom: 1, tilt: 0, light: 1, particles: 0.3, orbit: 0 },
];

export default function AssetViewer({ asset, hdri, onClose }: { asset: ExperienceAsset; hdri?: ExperienceAsset; onClose(): void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [pos, setPos] = useState(0);
  const [auto, setAuto] = useState(true);
  const [clip, setClip] = useState(asset.clips.includes("idle") ? "idle" : asset.clips[0] ?? "");
  const [variant, setVariant] = useState(asset.variants[0] ?? "");
  const [status, setStatus] = useState<"loading" | "ready" | "failed" | "no-webgl">("loading");
  const live = useRef({ pos, auto, clip, variant });
  live.current = { pos, auto, clip, variant };

  useEffect(() => {
    const el = wrap.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dark = matchMedia("(prefers-color-scheme: dark)").matches;
    const pal = dark ? PAL_DARK : PAL_LIGHT;
    const character = asset.clips.length > 0;
    const direction: AssetDirection = {
      camera: { position: [0, character ? 0.4 : 0.15, 5.2], fov: 32 },
      lighting: { type: "studio", intensity: 1, hdri: hdri?.id },
      animation: { enter: "scale-reveal", idle: character ? "clip" : "slow-float", scroll: "rotate-360" },
      particles: false,
    };
    let view: View3D | null = null;
    let raf = 0;
    let gone = false;
    const taps: Frame["taps"] = [];
    let px = 0;
    let py = 0;
    let pointer = false;
    const t0 = performance.now();
    let last = t0;
    let shown = 0;
    const size = () => {
      const r = el.getBoundingClientRect();
      view?.resize(Math.max(1, r.width), Math.max(1, r.height), Math.min(devicePixelRatio || 1, 1.5));
    };
    const move = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      px = ev.clientX - r.left;
      py = ev.clientY - r.top;
      pointer = ev.pointerType !== "touch";
    };
    const leave = () => (pointer = false);
    const down = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      taps.push({ x: ev.clientX - r.left, y: ev.clientY - r.top, t: (performance.now() - t0) / 1000 });
      if (taps.length > 8) taps.shift();
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointerdown", down);
    const ro = new ResizeObserver(size);
    ro.observe(el);

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!view) return;
      const r = el.getBoundingClientRect();
      const t = (now - t0) / 1000;
      const L = live.current;
      // Auto plays the scroll story back and forth; otherwise the slider is the scroll.
      const p = L.auto && !reduced ? 2 - 2 * Math.cos((t * Math.PI) / 9) : L.pos;
      if (L.auto && !reduced && Math.abs(p - L.pos) > 0.02 && now - shown > 120) (shown = now), setPos(+p.toFixed(2));
      const beat = { ...beatAt(BEATS, p), ...(L.clip ? { clip: L.clip } : {}), ...(L.variant ? { variant: L.variant } : {}) };
      const w = Math.max(1, r.width);
      const h = Math.max(1, r.height);
      view.frame({
        t: reduced ? 2 : t,
        dt: Math.min(0.05, (now - last) / 1000),
        pos: p,
        beat,
        params: { image: asset.preview },
        w,
        h,
        px: pointer ? px : w / 2,
        py: pointer ? py : h * 0.4,
        nx: pointer ? (px / w) * 2 - 1 : 0,
        ny: pointer ? (py / h) * 2 - 1 : 0,
        pointer: pointer && !reduced,
        taps: reduced ? [] : taps,
        side: 0.5,
        presence: 1,
        pal,
        mobile: w < 520,
        reduced,
        energy: 0.7,
        budget: { particles: 120, dpr: 1.5, timelines: 6, texture: 1024, lowFps: 30 },
        ch: { scroll: 3, cursor: 2, hover: 2, click: 2, transitions: 2, typography: 2, characters: 2, environment: 2 },
        speed: 0,
        labels: [],
        seed: 7,
      });
      last = now;
      if (view.failed?.()) setStatus("failed");
      else if (view.ready?.() ?? true) setStatus((s) => (s === "loading" ? "ready" : s));
    };

    const gl = (() => {
      try {
        return !!document.createElement("canvas").getContext("webgl2");
      } catch {
        return false;
      }
    })();
    if (!gl) {
      setStatus("no-webgl");
      return;
    }
    import("@/template/src/scenes/webgl").then((m) => {
      if (gone) return;
      const mount = m.default as Mount3D | null;
      view = mount ? mount(cv, "asset3d", { params: { image: asset.preview }, pal, labels: [], mobile: false, assets: [asset, ...(hdri ? [hdri] : [])], direction }) : null;
      if (!view) return setStatus("failed");
      size();
      raf = requestAnimationFrame(loop);
    });
    return () => {
      gone = true;
      cancelAnimationFrame(raf);
      view?.dispose();
      ro.disconnect();
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("pointerdown", down);
    };
  }, [asset, hdri]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [onClose]);

  return (
    <div className="av-back" role="dialog" aria-modal="true" aria-label={`${asset.name} in 3D`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="av-panel">
        <div className="av-stage" ref={wrap} data-status={status}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="av-still" src={asset.preview} alt="" aria-hidden="true" />
          <canvas ref={canvas} className="av-canvas" />
          {status !== "ready" && <p className="av-note small">{status === "loading" ? "Loading the model…" : status === "failed" ? "The model could not be loaded here, so its still is shown." : "This browser has no WebGL 2, so the still is shown."}</p>}
        </div>
        <div className="av-controls">
          <div className="av-head">
            <h2>{asset.name}</h2>
            <button type="button" className="btn btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
          <label className="lab-field">
            <span>Scroll position {pos.toFixed(1)} of 4 (what the page scroll does)</span>
            <input type="range" min={0} max={4} step={0.01} value={pos} onChange={(e) => (setAuto(false), setPos(+e.target.value))} />
          </label>
          <label className="av-check small">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Play the scroll story
          </label>
          {asset.clips.length > 0 && (
            <label className="lab-field">
              <span>Animation</span>
              <select value={clip} onChange={(e) => setClip(e.target.value)}>
                {asset.clips.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          )}
          {asset.variants.length > 1 && (
            <label className="lab-field">
              <span>Colourway</span>
              <select value={variant} onChange={(e) => setVariant(e.target.value)}>
                {asset.variants.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          )}
          <p className="muted small">Move the pointer over it to make it lean. Tap it to {asset.clips.includes("wave") || asset.clips.includes("jump") ? "play a one-off move" : "spin it"}.</p>
        </div>
      </div>
    </div>
  );
}
