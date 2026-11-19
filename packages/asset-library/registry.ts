import manifest from "@/library/assets/manifest.json";

// The asset registry (docs/ASSETS.md): every 3D model and HDR light the builder may put on a
// page, read from library/assets/manifest.json (written by scripts/assets/ingest.mjs from the
// curated, licence-checked sources). Nothing outside this list can reach a generated site.

export type AssetCategory = "product" | "vehicle" | "character" | "nature" | "architecture" | "environment" | "prop" | "abstract" | "hdri";

export interface AssetLicense {
  type: string;
  url: string;
  commercialUse: boolean;
  redistribution: boolean;
  modification?: boolean;
  attributionRequired: boolean;
  evidence?: string;
}

export interface AssetRecord {
  id: string;
  name: string;
  type: "3d" | "hdri" | "2d";
  format: "glb" | "gltf" | "hdr" | "webp";
  category: AssetCategory;
  subcategory: string;
  tags: string[];
  style: string[];
  materials: string[];
  colors: string[];
  animationCapabilities: string[];
  clips?: { name: string; duration: number }[];
  performance: { fileSizeMB: number; bytes: number; triangles: number; textureResolution: string; materials: number; animation: string; tier: "low" | "medium" | "high" };
  license: AssetLicense;
  /** title: the work's own title where it differs from our listing name (CC BY credits name it). */
  source: { url: string; creator: string; publisher?: string; via?: string; title?: string };
  modifications?: string;
  added?: string;
  bounds?: { min: number[]; max: number[]; size: number[] };
  display?: { pivot?: "center" | "bottom"; rotation?: number[]; variants?: string[]; skinned?: boolean; morphs?: boolean; extensions?: string[]; width?: number; height?: number };
  preview: string;
  asset: string;
}

export const ASSETS: AssetRecord[] = (manifest as unknown as { assets: AssetRecord[] }).assets;

export function assetById(id: string): AssetRecord | undefined {
  return ASSETS.find((a) => a.id === id);
}

/** Licences an asset may carry into a site someone else owns and sells from. */
export const SHIPPABLE_LICENSES = ["CC0-1.0", "CC-BY-4.0", "original"];

/**
 * The licence gate. An asset ships only when every one of these is recorded and allows it;
 * anything missing or unclear is refused, never guessed.
 */
export function licenseProblems(a: Pick<AssetRecord, "id" | "license" | "source">): string[] {
  const out: string[] = [];
  const l = a.license;
  if (!l || !l.type) out.push(`${a.id}: no licence recorded`);
  else {
    if (!SHIPPABLE_LICENSES.includes(l.type)) out.push(`${a.id}: licence ${l.type} is not one the builder ships (${SHIPPABLE_LICENSES.join(", ")})`);
    if (l.commercialUse !== true) out.push(`${a.id}: commercial use not confirmed`);
    if (l.redistribution !== true) out.push(`${a.id}: redistribution not confirmed`);
    if (typeof l.attributionRequired !== "boolean") out.push(`${a.id}: attribution requirement not recorded`);
    if (l.type === "CC-BY-4.0" && l.attributionRequired !== true) out.push(`${a.id}: CC BY needs attribution`);
  }
  if (!a.source?.url) out.push(`${a.id}: no source URL`);
  if (!a.source?.creator) out.push(`${a.id}: no creator recorded`);
  return out;
}

export const isShippable = (a: AssetRecord) => licenseProblems(a).length === 0;

/** The credit line an asset owes (CC BY) or deserves (CC0). */
export function creditOf(a: AssetRecord): string {
  const lic = a.license.type === "original" ? "original work" : a.license.type.replace("-1.0", " 1.0").replace("-4.0", " 4.0").replace(/-/g, " ");
  return `"${a.source.title ?? a.name}" by ${a.source.creator}${a.source.publisher && a.source.publisher !== a.source.creator ? ` (${a.source.publisher})` : ""}, ${lic}, ${a.source.url}${a.modifications && a.modifications !== "Original" ? `. Changes: ${a.modifications}` : ""}`;
}
