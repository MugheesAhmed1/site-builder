"use client";

import { useEffect, useState } from "react";
import bundled from "@/library/design-systems.json";
import { normalizeDesign } from "./designs";
import type { Design } from "./types";

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
