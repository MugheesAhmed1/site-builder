"use client";

import { useEffect, useRef } from "react";
import type { CharacterConfig, CharacterView as View } from "@/library/character/engine";

// The character engine (library/character/engine.ts) inside the builder itself: the same live
// model a generated site shows, on the same gradient. Loads three.js only when it is on the page.

export default function CharacterView({ config, className = "", style, label }: { config: CharacterConfig; className?: string; style?: React.CSSProperties; label?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<View | null>(null);
  const latest = useRef(config);
  latest.current = config;

  useEffect(() => {
    let live = true;
    import("@/library/character/engine").then(({ mountCharacter }) => {
      if (!live || !host.current) return;
      view.current = mountCharacter(host.current, latest.current);
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

  return <div ref={host} className={`cv-host ${className}`.trim()} style={style} role="img" aria-label={label || config.name || "3D model"} />;
}
