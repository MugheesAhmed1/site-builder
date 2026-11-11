"use client";

import { useEffect, useState } from "react";
import bundled from "@/library/design-systems.json";
import { normalizeDesign } from "./designs";
import type { Design } from "./types";
import { CHARACTERS, FAMILIES, WIDGETS, WIDGET_KINDS, type CharacterDef, type WidgetDef } from "@/template/src/cast.js";

// The design system library lives as a data file in the GitHub repo
// (library/design-systems.json). The app ships with a copy, then fetches the latest one
// from the repo, so a system added on GitHub shows up for everyone without a redeploy.
// Only a public file is read; nothing about the person is sent.

export const LIBRARY_URL = "https://raw.githubusercontent.com/MugheesAhmed1/site-builder/main/library/design-systems.json";
const CACHE = "sb.library.v1";

const BUNDLED: Design[] = (bundled as unknown as Design[]).map(normalizeDesign);

function merge(base: Design[], extra: Design[]): Design[] {
  const byId = new Map(base.map((d) => [d.id, d]));
  for (const d of extra) if (d && d.id && d.fonts && d.accent) byId.set(d.id, normalizeDesign(d));
  return [...byId.values()];
}

export function useLibrary(): { list: Design[]; source: "built-in" | "github" } {
  const [state, setState] = useState<{ list: Design[]; source: "built-in" | "github" }>({ list: BUNDLED, source: "built-in" });
  useEffect(() => {
    let off = false;
    try {
      const cached = sessionStorage.getItem(CACHE);
      if (cached) {
        setState({ list: merge(BUNDLED, JSON.parse(cached)), source: "github" });
        return;
      }
    } catch {}
    fetch(LIBRARY_URL, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((remote: Design[]) => {
        if (off || !Array.isArray(remote)) return;
        try {
          sessionStorage.setItem(CACHE, JSON.stringify(remote));
        } catch {}
        setState({ list: merge(BUNDLED, remote), source: "github" });
      })
      .catch(() => {});
    return () => {
      off = true;
    };
  }, []);
  return state;
}

// The cast works the same way: library/characters.json and library/widgets.json on GitHub.
// A new entry only needs a family (or widget kind) the renderer knows plus a palette, skin,
// accessory, expression and idle, so new looks can be added without touching code.
export const CHARACTERS_URL = "https://raw.githubusercontent.com/MugheesAhmed1/site-builder/main/library/characters.json";
export const WIDGETS_URL = "https://raw.githubusercontent.com/MugheesAhmed1/site-builder/main/library/widgets.json";
const CAST_CACHE = "sb.cast.v1";

function mergeById<T extends { id: string }>(base: T[], extra: unknown, ok: (x: T) => boolean): T[] {
  if (!Array.isArray(extra)) return base;
  const byId = new Map(base.map((d) => [d.id, d]));
  for (const d of extra as T[]) if (d && typeof d.id === "string" && ok(d)) byId.set(d.id, d);
  return [...byId.values()];
}

export function useCastLibrary(): { characters: CharacterDef[]; widgets: WidgetDef[]; source: "built-in" | "github" } {
  const [state, setState] = useState<{ characters: CharacterDef[]; widgets: WidgetDef[]; source: "built-in" | "github" }>({ characters: CHARACTERS, widgets: WIDGETS, source: "built-in" });
  useEffect(() => {
    let off = false;
    const families = new Set(FAMILIES.map((f) => f.id));
    const kinds = new Set(WIDGET_KINDS.map((k) => k.id));
    const apply = (c: unknown, w: unknown) =>
      setState({
        characters: mergeById(CHARACTERS, c, (x) => families.has(x.family)),
        widgets: mergeById(WIDGETS, w, (x) => kinds.has(x.kind)),
        source: "github",
      });
    try {
      const cached = sessionStorage.getItem(CAST_CACHE);
      if (cached) {
        const { c, w } = JSON.parse(cached);
        apply(c, w);
        return;
      }
    } catch {}
    const get = (u: string) => fetch(u, { cache: "no-cache" }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
    Promise.all([get(CHARACTERS_URL), get(WIDGETS_URL)])
      .then(([c, w]) => {
        if (off) return;
        try {
          sessionStorage.setItem(CAST_CACHE, JSON.stringify({ c, w }));
        } catch {}
        apply(c, w);
      })
      .catch(() => {});
    return () => {
      off = true;
    };
  }, []);
  return state;
}
