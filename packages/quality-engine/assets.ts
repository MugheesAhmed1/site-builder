import type { Experience } from "@/template/src/experiences/types";
import { assetById, licenseProblems } from "@/packages/asset-library/registry";

// The asset gates (docs/ASSETS.md), run before export with the other quality gates:
// - licensing: every model and light on the page is in the library, its licence allows a
//   commercial site to copy and ship it, and a CC BY asset carries its credit line.
// - performance: what the page downloads fits the experience's tier, and phones only get 3D
//   for a light model (otherwise they show the still, which is fine and is said so).

/** Bytes the asset stage may download, by tier. */
export const ASSET_BUDGET: Record<Experience["tier"], number> = { light: 1_000_000, medium: 3_000_000, heavy: 6_500_000, extreme: 9_000_000 };

export function assetLicenceProblems(e: Experience): string[] {
  const out: string[] = [];
  for (const a of e.assets ?? []) {
    const rec = assetById(a.id);
    if (!rec) {
      out.push(`${a.id} is not in the asset library`);
      continue;
    }
    if (rec.asset !== a.src) out.push(`${a.id} points at ${a.src}, not its library file`);
    out.push(...licenseProblems(rec));
    if (rec.license.attributionRequired && !a.license.credit.includes(rec.source.creator)) out.push(`${a.id} has no credit line for ${rec.source.creator}`);
    if (!a.src.startsWith("/assets/") || /^[a-z]+:|^\/\//i.test(a.src) || (a.preview && !a.preview.startsWith("/assets/"))) out.push(`${a.id} would be fetched from outside the site`);
  }
  return out;
}

export function assetPerformance(e: Experience): { pass: boolean; detail: string } {
  const models = (e.assets ?? []).filter((a) => a.kind === "model");
  if (!e.assets?.length) return { pass: true, detail: "No library assets on this page" };
  const bytes = e.assets.reduce((n, a) => n + a.bytes, 0);
  const tris = models.reduce((n, a) => n + (assetById(a.id)?.performance.triangles ?? 0), 0);
  const limit = ASSET_BUDGET[e.tier];
  const mb = (n: number) => (n / 1e6).toFixed(1) + " MB";
  const hero = models[0];
  const phone = hero ? (hero.mobile ? "phones get the 3D model too" : "phones get the still, the model is too heavy for them") : "";
  const pass = bytes <= limit && tris <= 300_000 && models.length <= 2;
  return { pass, detail: pass ? `${mb(bytes)} for ${e.assets.length} files, ${tris.toLocaleString("en")} triangles, within the ${e.tier} budget of ${mb(limit)}; ${phone}` : `${mb(bytes)} and ${tris.toLocaleString("en")} triangles over the ${e.tier} budget of ${mb(limit)} (or more than two models)` };
}
