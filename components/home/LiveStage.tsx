"use client";

import { useEffect, useMemo, useRef } from "react";
import { conceptById, generateExperience } from "@/packages/experience-core";
import type { Experience, ExperienceScene } from "@/template/src/experiences/types";
import type { Conductor } from "@/template/src/motion/scroll";
import { Stage } from "@/template/src/scenes/Stage";
import { palette } from "@/template/src/theme.js";

// One concept's stage, running live outside a generated site: the home page's showcase, the
// Experience Gallery cards and the Experience Lab all use it. The stage is the same code a
// generated site runs. Its beats are walked by `pos` (0 .. beats - 1), which the caller drives
// from the scroll or the pointer; `still` holds a single frame until the card is played.

const DESIGN = { hue: 285, tint: 0.02, accent: "#8B5CF6", mode: "dark" };

export function demoExperience(concept: string, intensity = 8): Experience {
  return generateExperience({ kind: "website", category: "general", query: "", answers: {}, content: null }, { concept, intensity, allow3d: false, seed: 7 });
}

export default function LiveStage({ concept, pos = 0, still = false, accent, labels, intensity = 8, className }: { concept: string; pos?: number; still?: boolean; accent?: string; labels?: string[]; intensity?: number; className?: string }) {
  const e = useMemo(() => demoExperience(concept, intensity), [concept, intensity]);
  const c = conceptById(concept);
  // The concept's whole story as scenes, so moving `pos` plays every beat.
  const scenes = useMemo<ExperienceScene[]>(() => {
    const base = e.scenes[0];
    return (c?.beats ?? []).map((b, i) => ({ ...base, id: "b" + i, section: "b" + i, title: b.title, note: b.note, beat: b.beat, composition: "center" }));
  }, [e, c]);
  const pal = useMemo(() => ({ ...palette({ ...DESIGN, accent: accent ?? DESIGN.accent }, "dark"), dark: true }), [accent]);
  const conductor = useRef<Conductor | null>(null);
  const state = useRef({ pos });
  state.current.pos = pos;
  // The stage reads `conductor.current.state.pos` every frame; this stand-in follows `pos`.
  useEffect(() => {
    conductor.current = { state: state.current } as unknown as Conductor;
  }, []);
  return (
    <div className={"xp-root live-stage" + (className ? " " + className : "")} data-scheme="dark" style={{ ["--bg" as string]: pal.bg, ["--surface" as string]: pal.surface, ["--text" as string]: pal.text, ["--muted" as string]: pal.muted, ["--border" as string]: pal.border, ["--accent" as string]: pal.accent, ["--on-accent" as string]: pal.onAccent }}>
      <Stage key={concept + intensity} experience={e} scenes={scenes} pal={pal} labels={labels ?? [c?.name ?? "", "Concept", "World", "Motion"]} conductor={conductor} reduced={still} editing={false} sound={false} />
    </div>
  );
}
