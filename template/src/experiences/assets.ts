import type { Experience, ExperienceAsset } from "./types";

// Shared rules for the asset stage, used by the stage, the studio and the downloads alike.

/** Asset stages carry the site's subject, so they turn 3D on from intensity 4; other 3D concepts from 7 (PRD 17, 18). */
export function wants3d(e: Experience | undefined | null): boolean {
  if (!e || !e.stage.webgl || e.noWebgl) return false;
  if (e.stage.webgl === "asset3d") return e.intensity >= 4 && !!e.assets?.some((a) => a.kind === "model");
  return e.intensity >= 7;
}

/** The model the stage is built around. */
export function heroAsset(e: Experience | undefined | null): ExperienceAsset | undefined {
  return e?.assets?.find((a) => a.kind === "model" && (a.role === "hero-product" || a.role === "hero-character")) ?? e?.assets?.find((a) => a.kind === "model");
}

/** A phone may run the asset stage in 3D only when the hero model is in the light tier. */
export function phoneMay3d(e: Experience | undefined | null): boolean {
  return !!e && e.stage.webgl === "asset3d" && !!heroAsset(e)?.mobile;
}

/** Every file the page needs (models, HDR lighting and their stills), for the downloads. */
export function assetFiles(e: Experience | undefined | null): string[] {
  if (!e?.assets?.length) return [];
  const out = new Set<string>();
  for (const a of e.assets) {
    out.add(a.src);
    if (a.preview) out.add(a.preview);
  }
  return [...out];
}

/** Credits owed by CC BY assets (and kindly given for CC0 ones). */
export function assetCredits(e: Experience | undefined | null): string[] {
  return (e?.assets ?? []).filter((a) => a.license.attributionRequired).map((a) => a.license.credit);
}

/**
 * A path inside the site ("/assets/...") as the page should fetch it. The ready-to-host download
 * sets window.__ASSET_BASE__ to "." so the folder also works when it is opened from a sub-folder.
 */
export function assetUrl(path: string): string {
  const base = typeof window !== "undefined" ? (window as Window & { __ASSET_BASE__?: string }).__ASSET_BASE__ : "";
  return base && path.startsWith("/") && !path.startsWith("//") ? base + path : path;
}
