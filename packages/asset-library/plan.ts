import type { ArtDirection, AssetDirection, AssetPlan, AssetRequest, Beat, ExperienceAsset, ExperienceScene } from "@/template/src/experiences/types";
import { assetById, creditOf, type AssetRecord } from "./registry";
import { budgetOf, resolveAsset, type Budget, type Resolution } from "./resolver";

// Art direction, asset plan and scene composition (docs/ASSETS.md):
//
//   prompt -> ART DIRECTION -> experience plan -> ASSET PLAN -> ASSET RESOLUTION -> SCENE PLAN
//
// The art direction is the deliberate look every visual decision follows. The asset plan says
// which visuals the experience needs, as concepts. The resolver turns each into a local asset.
// The scene plan says WHAT the asset does in each scene (camera, light, entrance, idle, scroll,
// clip, material variant); the renderer (template/src/scenes/webgl/asset.ts) decides HOW.

export interface DirectionInput {
  personality: string[];
  style?: string;
  mode?: string;
  intensity: number;
  interactionLevel: number;
  /** The request and offer words, which say what the subject is. */
  focus: string[];
  keywords: string[];
}

const STYLES: Record<string, Omit<ArtDirection, "motionIntensity" | "interactionIntensity" | "source">> = {
  luxury: { visualStyle: "luxury editorial", mood: "cinematic", density: "minimal", depth: 8, preferredVisuals: ["3d product", "soft particles", "glass reflections", "large typography"], avoid: ["generic SaaS cards", "generic gradients", "stock-photo feeling"], styleTags: ["luxury", "premium", "minimal", "editorial", "realistic"], lighting: "studio", typography: "editorial-serif", composition: "hero-object" },
  technical: { visualStyle: "precise technology", mood: "focused", density: "balanced", depth: 7, preferredVisuals: ["3d object", "chrome and glass", "grid light", "monospace details"], avoid: ["clip-art icons", "busy gradients", "stock-photo feeling"], styleTags: ["futuristic", "premium", "minimal", "realistic"], lighting: "night", typography: "mono-tech", composition: "split" },
  playful: { visualStyle: "playful toybox", mood: "joyful", density: "rich", depth: 6, preferredVisuals: ["stylized 3d characters", "bouncy motion", "bright colour blocks"], avoid: ["corporate stock photos", "grey palettes"], styleTags: ["playful", "stylized", "low-poly"], lighting: "natural", typography: "rounded", composition: "centered" },
  natural: { visualStyle: "organic natural", mood: "calm", density: "balanced", depth: 6, preferredVisuals: ["natural forms", "daylight", "soft shadows", "earthy palette"], avoid: ["neon", "chrome", "hard gradients"], styleTags: ["natural", "realistic", "warm"], lighting: "natural", typography: "editorial-serif", composition: "split" },
  warm: { visualStyle: "warm hospitality", mood: "inviting", density: "balanced", depth: 5, preferredVisuals: ["warm interior light", "tactile objects", "close detail"], avoid: ["cold blue light", "sterile layouts"], styleTags: ["warm", "realistic", "classic"], lighting: "interior", typography: "editorial-serif", composition: "split" },
  bold: { visualStyle: "bold kinetic", mood: "energetic", density: "rich", depth: 7, preferredVisuals: ["hero object in motion", "strong contrast", "huge type"], avoid: ["timid pastel layouts", "small type"], styleTags: ["cinematic", "premium", "realistic"], lighting: "cinematic", typography: "grotesk", composition: "immersive" },
  creative: { visualStyle: "gallery modern", mood: "curious", density: "balanced", depth: 7, preferredVisuals: ["sculptural objects", "negative space", "editorial grid"], avoid: ["generic SaaS cards", "stock-photo feeling"], styleTags: ["editorial", "premium", "futuristic"], lighting: "studio", typography: "grotesk", composition: "hero-object" },
  trustworthy: { visualStyle: "calm professional", mood: "assured", density: "minimal", depth: 4, preferredVisuals: ["one clear object", "soft studio light", "plenty of space"], avoid: ["flashy effects", "cartoon characters"], styleTags: ["classic", "realistic", "minimal"], lighting: "studio", typography: "editorial-serif", composition: "split" },
  calm: { visualStyle: "quiet minimal", mood: "serene", density: "minimal", depth: 5, preferredVisuals: ["slow motion", "soft light", "one object"], avoid: ["busy layouts", "loud colour"], styleTags: ["minimal", "natural", "realistic"], lighting: "natural", typography: "editorial-serif", composition: "centered" },
  energetic: { visualStyle: "bold kinetic", mood: "energetic", density: "rich", depth: 7, preferredVisuals: ["object in motion", "speed", "strong contrast"], avoid: ["static layouts"], styleTags: ["cinematic", "realistic", "premium"], lighting: "cinematic", typography: "grotesk", composition: "immersive" },
};

const DEFAULT = { visualStyle: "clean modern", mood: "confident", density: "balanced" as const, depth: 6, preferredVisuals: ["one hero object", "studio light", "clear type"], avoid: ["generic gradients", "stock-photo feeling"], styleTags: ["minimal", "premium", "realistic"], lighting: "studio" as const, typography: "grotesk" as const, composition: "split" as const };

/** The art direction, from the brief's personality, the chosen style and the intensity. */
export function artDirectionFor(d: DirectionInput): ArtDirection {
  const lead = d.style && STYLES[d.style] ? d.style : d.style === "minimal" ? "calm" : d.style === "experimental" ? "creative" : d.personality.find((p) => STYLES[p]);
  const base = lead ? STYLES[lead] : DEFAULT;
  const words = d.focus.join(" ") + " " + d.keywords.slice(0, 40).join(" ");
  // A few subjects ask for their own light whatever the personality.
  const lighting: ArtDirection["lighting"] = /\b(night|bar|club|neon|cocktail)\b/.test(words) ? "night" : /\b(car|motor|auto|racing)\b/.test(words) ? "cinematic" : /\b(city|urban|street|property|apartment)\b/.test(words) && base.lighting === "studio" ? "urban" : base.lighting;
  return {
    ...base,
    lighting,
    motionIntensity: Math.max(1, Math.min(10, d.intensity)),
    interactionIntensity: Math.max(1, Math.min(10, d.interactionLevel)),
    source: "rules",
  };
}

const HDRI_FOR: Record<ArtDirection["lighting"], string> = {
  studio: "studio softbox product neutral",
  cinematic: "cinematic sunset golden hour warm",
  natural: "nature forest daylight outdoor",
  night: "cinematic night dark moody",
  interior: "interior room heritage warm",
  urban: "city urban daylight street",
};

/** Subject words: what the visitor should see, from what the person wrote. */
export function subjectOf(focus: string[]): string {
  return focus.filter((w) => !/^(website|site|portfolio|called|brand|company|for|my|our|the|and|in|of|shop|store|studio|business|services?)$/.test(w)).join(" ");
}

/** The asset plan: the visuals the experience needs, as concepts, never as files. */
export function assetPlanFor(ad: ArtDirection, focus: string[], wantCharacter = false): AssetRequest[] {
  const subject = subjectOf(focus);
  const style = ad.styleTags.slice(0, 3);
  const out: AssetRequest[] = [
    { role: wantCharacter ? "hero-character" : "hero-product", query: `${ad.styleTags[0] ?? ""} ${subject}`.trim(), type: "3d", category: wantCharacter ? "character" : undefined, style, required: true },
    { role: "lighting", query: HDRI_FOR[ad.lighting], type: "hdri", style: [ad.mood], required: false },
  ];
  if (ad.density === "rich") out.push({ role: "supporting", query: `${style.join(" ")} abstract`, type: "3d", category: "abstract", style, required: false });
  return out;
}

export interface ResolvedPlan {
  plan: AssetPlan;
  assets: ExperienceAsset[];
  hero: Resolution | null;
}

const SPEC_ROLE = (r: AssetRequest["role"]) => r;

/** The renderer's view of a library record. */
export function toExperienceAsset(a: AssetRecord, role: AssetRequest["role"], query: string): ExperienceAsset {
  const size = a.bounds ? Math.max(...a.bounds.size) : 1;
  return {
    role: SPEC_ROLE(role),
    id: a.id,
    name: a.name,
    src: a.asset,
    preview: a.preview,
    kind: a.type === "hdri" ? "hdri" : "model",
    size: +size.toFixed(4),
    pivot: a.display?.pivot ?? "center",
    clips: (a.clips ?? []).map((c) => c.name).filter(Boolean),
    variants: a.display?.variants ?? [],
    capabilities: a.animationCapabilities,
    query,
    mobile: a.performance.tier === "low",
    tier: a.performance.tier,
    bytes: a.performance.bytes,
    license: { type: a.license.type, attributionRequired: a.license.attributionRequired, credit: creditOf(a) },
  };
}

/** Runs the resolver over the plan with the experience's budget. */
export function resolvePlan(requests: AssetRequest[], ad: ArtDirection, budget: Budget = budgetOf("heavy")): ResolvedPlan {
  const assets: ExperienceAsset[] = [];
  const resolved: AssetPlan["resolved"] = [];
  let hero: Resolution | null = null;
  const used: string[] = [];
  for (const r of requests) {
    const res = resolveAsset({ query: r.query, type: r.type, category: r.category, style: r.style, colors: r.colors, artStyle: ad.styleTags }, { budget, exclude: used });
    if (r.role === "hero-product" || r.role === "hero-character") hero = res;
    resolved.push({ role: r.role, query: r.query, id: res.id, score: res.score, reason: res.reason, representation: res.representation, license: res.license, cost: res.cost });
    if (!res.asset) continue;
    used.push(res.asset.id);
    // A still is drawn by the 2D stage from the preview; only real 3D goes to the 3D stage.
    if (res.representation === "2d" && r.type === "3d") continue;
    assets.push(toExperienceAsset(res.asset, r.role, r.query));
  }
  return { plan: { assets: requests, resolved }, assets, hero };
}

/** The scene plan's fixed parts: camera, light, entrance, idle and scroll behaviour. */
export function assetDirectionFor(ad: ArtDirection, hero: ExperienceAsset | undefined, hdri: ExperienceAsset | undefined): AssetDirection {
  const character = hero?.role === "hero-character" || !!hero?.clips.includes("idle");
  const calm = ad.motionIntensity <= 4;
  return {
    camera: { position: [0, character ? 0.4 : 0.15, 5.2], fov: ad.composition === "immersive" ? 40 : 32 },
    lighting: { type: ad.lighting, intensity: ad.lighting === "night" ? 1.1 : 1, hdri: hdri?.id },
    animation: {
      enter: ad.density === "minimal" ? "scale-reveal" : character ? "rise" : "fade",
      idle: character ? "clip" : calm ? "still" : ad.mood === "cinematic" || ad.density === "minimal" ? "slow-float" : "turntable",
      scroll: character ? "travel" : hero?.capabilities.includes("rotate") ? (calm ? "orbit" : "rotate-360") : "drift",
    },
    particles: ad.preferredVisuals.some((v) => /particle/.test(v)) || ad.density === "rich",
  };
}

/**
 * Per-scene choreography over the concept's beats: only what the asset can do. A character
 * walks, runs and waves with the clips it has; a product with colourways shows them in the
 * middle scenes; a model made of parts comes apart once and closes again by the end.
 */
export function choreograph(scenes: ExperienceScene[], hero: ExperienceAsset | undefined, ad: ArtDirection): ExperienceScene[] {
  if (!hero) return scenes;
  const n = scenes.length;
  const mid = (i: number) => i > 0 && i < n - 1;
  const clipFor = (i: number): string | undefined => {
    const has = (c: string) => hero.clips.includes(c);
    if (!hero.clips.length) return undefined;
    if (i === 0) return has("idle") ? "idle" : hero.clips[0];
    if (i === n - 1) return ["wave", "cheer", "dance", "yes", "idle"].find(has);
    const moving = ["walk", "run", "dance", "jump"].filter(has);
    return moving.length ? moving[(i - 1) % moving.length] : undefined;
  };
  return scenes.map((s, i) => {
    const beat: Beat = { ...s.beat };
    const clip = clipFor(i);
    if (clip) beat.clip = clip;
    if (hero.variants.length > 1 && mid(i)) beat.variant = hero.variants[(i - 1) % hero.variants.length];
    if (hero.variants.length > 1 && !mid(i)) beat.variant = hero.variants[0];
    if (hero.capabilities.includes("assemble")) beat.explode = n > 2 && i === Math.floor(n / 2) ? 1 : 0;
    if (ad.density === "minimal" && typeof beat.particles === "number") beat.particles = Math.min(beat.particles, 0.45);
    return { ...s, beat };
  });
}

/** An asset record by id, as the renderer reads it (tests and the library preview). */
export function experienceAssetById(id: string, role: AssetRequest["role"] = "hero-product"): ExperienceAsset | undefined {
  const a = assetById(id);
  return a ? toExperienceAsset(a, role, a.name) : undefined;
}
