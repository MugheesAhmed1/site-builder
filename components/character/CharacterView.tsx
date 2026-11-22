"use client";

import { useEffect, useRef, useState } from "react";
import type { CharacterConfig, CharacterView as View } from "@/library/character/engine";

// The character engine (library/character/engine.ts) inside the builder itself: the same live
// model a generated site shows, on the same gradient. Loads three.js only when it is on the page.

/** Same box as the engine's own still, so handing over to it never moves the picture. */
const STILL: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" };

export default function CharacterView({ config, className = "", style, label }: { config: CharacterConfig; className?: string; style?: React.CSSProperties; label?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<View | null>(null);
  const latest = useRef(config);
  latest.current = config;
  // The still holds the space while three.js downloads, so the stage is never empty. It goes once
  // the engine's own still is on screen, or the model itself, whichever comes first.
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    let live = true;
    import("@/library/character/engine").then(({ mountCharacter }) => {
      if (!live || !host.current) return;
      const v = mountCharacter(host.current, latest.current);
      view.current = v;
      const own = host.current.querySelector<HTMLImageElement>(":scope > img.xp-char-poster");
      const shown = own && own.getAttribute("src") && own.style.display !== "none" ? own.decode().catch(() => undefined) : Promise.resolve();
      Promise.race([shown, v.ready]).then(() => live && setWaiting(false));
    });
    return () => {
      live = false;
      view.current?.dispose();
      view.current = null;
    };
  }, []);

  const key = JSON.stringify(config);
  useEffect(() => {
    view.current?.update(latest.current);
  }, [key]);

  return (
    <div ref={host} className={`cv-host ${className}`.trim()} style={style} role="img" aria-label={label || config.name || "3D model"}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {waiting && config.poster ? <img className="cv-wait" src={config.poster} alt="" aria-hidden="true" draggable={false} style={STILL} /> : null}
    </div>
  );
}
