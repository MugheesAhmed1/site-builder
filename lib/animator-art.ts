// The animator's art direction and asset plan (docs/ASSETS.md, docs/ANIMATOR.md).
//
//   query -> ART DIRECTION -> ASSET PLAN (concepts) -> ASSET RESOLUTION (library files)
//
// Gemini (or the rules) describe the look and the visuals the site needs in words, such as
// "premium black sunglasses". They never name a file or a URL: the resolver alone turns a
// request into a licence-checked local asset, so nothing the model writes can reach a page.
import type { ArtDirection, AssetRequest, AssetResolutionNote } from "@/template/src/experiences/types";
import { understand } from "@/packages/experience-core/understand";
import { artDirectionFor, assetPlanFor, assetById, budgetOf, resolvePlan } from "@/packages/asset-library";

export interface ArtPlan {
  art: ArtDirection;
  assets: AssetRequest[];
}

export interface ResolvedNote extends AssetResolutionNote {
  name: string;
  preview: string;
}

const CHARACTER = /\b(mascot|robot|character|avatar|toy|game|gaming)\b/;

/** The rules' art direction and asset plan for a query. */
export function localArtPlan(query: string, kind: "website" | "portfolio", business: string, motion: "calm" | "lively" | "bold"): ArtPlan {
  const brief = understand({ kind, category: business, query });
  const intensity = motion === "calm" ? 4 : motion === "bold" ? 8 : 6;
  const art = artDirectionFor({ personality: brief.personality, style: brief.style, intensity, interactionLevel: intensity, focus: brief.focus, keywords: brief.keywords });
  return { art, assets: assetPlanFor(art, brief.focus, CHARACTER.test(brief.focus.join(" "))) };
}

const LIGHTING = ["studio", "cinematic", "natural", "night", "interior", "urban"] as const;
const ROLES = ["hero-product", "hero-character", "supporting", "environment", "lighting"] as const;
const DENSITY = ["minimal", "balanced", "rich"] as const;
const TYPE = ["editorial-serif", "grotesk", "mono-tech", "rounded"] as const;
const COMPOSITION = ["hero-object", "split", "centered", "immersive"] as const;

const word = (v: unknown, max = 40) => (typeof v === "string" ? v.replace(/[^\p{L}\p{N} '&-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");
const list = (v: unknown, n: number, max = 40) => (Array.isArray(v) ? v.map((x) => word(x, max).toLowerCase()).filter(Boolean).slice(0, n) : []);
const pick = <T extends string>(v: unknown, from: readonly T[], or: T): T => (typeof v === "string" && (from as readonly string[]).includes(v) ? (v as T) : or);
/** A file name, a path or a URL is never a request: the AI asks for concepts only. */
const looksLikeFile = (s: string) => /https?:|www\.|\/|\\|\.(glb|gltf|fbx|obj|hdr|exr|png|jpe?g|webp|usdz?)\b/i.test(s);

/** Keeps only what the engine can use from an art direction and asset plan a model wrote. */
export function normalizeArtPlan(rawArt: unknown, rawAssets: unknown, fallback: ArtPlan): ArtPlan {
  const r = rawArt && typeof rawArt === "object" ? (rawArt as Record<string, unknown>) : null;
  const f = fallback.art;
  const art: ArtDirection = r
    ? {
        visualStyle: word(r.visualStyle, 60) || f.visualStyle,
        mood: word(r.mood, 40) || f.mood,
        density: pick(r.density, DENSITY, f.density),
        depth: typeof r.depth === "number" && r.depth >= 1 && r.depth <= 10 ? Math.round(r.depth) : f.depth,
        motionIntensity: f.motionIntensity,
        interactionIntensity: f.interactionIntensity,
        preferredVisuals: list(r.preferredVisuals, 6, 60).length ? list(r.preferredVisuals, 6, 60) : f.preferredVisuals,
        avoid: list(r.avoid, 6, 60).length ? list(r.avoid, 6, 60) : f.avoid,
        styleTags: list(r.styleTags, 6).length ? list(r.styleTags, 6) : f.styleTags,
        lighting: pick(r.lighting, LIGHTING, f.lighting),
        typography: pick(r.typography, TYPE, f.typography),
        composition: pick(r.composition, COMPOSITION, f.composition),
        source: "gemini",
      }
    : f;
  const asked = Array.isArray(rawAssets) ? rawAssets : [];
  const assets: AssetRequest[] = [];
  for (const x of asked.slice(0, 4)) {
    if (!x || typeof x !== "object") continue;
    const a = x as Record<string, unknown>;
    const query = typeof a.query === "string" ? a.query : "";
    if (!query.trim() || looksLikeFile(query)) continue;
    const role = pick(a.role, ROLES, "supporting");
    assets.push({ role, query: word(query, 80).toLowerCase(), type: role === "lighting" ? "hdri" : "3d", style: list(a.style, 4), colors: list(a.colors, 3, 20), required: role.startsWith("hero") });
  }
  if (!assets.some((a) => a.role.startsWith("hero"))) assets.unshift(...fallback.assets.filter((a) => a.role.startsWith("hero")));
  if (!assets.some((a) => a.role === "lighting")) assets.push(...fallback.assets.filter((a) => a.role === "lighting"));
  return { art, assets };
}

/** Server side: the resolver's answer for each request, with the still to show. */
export function resolveArtPlan(p: ArtPlan): ResolvedNote[] {
  const { plan } = resolvePlan(p.assets, p.art, budgetOf("heavy"));
  return plan.resolved.map((n) => {
    const a = n.id ? assetById(n.id) : undefined;
    return { ...n, name: a?.name ?? "", preview: a?.preview ?? "" };
  });
}

/** The words the person can read: a short summary of the art direction. */
export function artSummary(a: ArtDirection): string {
  return `${a.visualStyle}, ${a.mood}; ${a.density} density, ${a.lighting} light, ${a.typography.replace("-", " ")} type, ${a.composition.replace("-", " ")} layout. Wants ${a.preferredVisuals.slice(0, 3).join(", ")}. Avoids ${a.avoid.slice(0, 2).join(", ")}.`;
}
