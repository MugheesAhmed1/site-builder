import { ASSETS, isShippable, licenseProblems, type AssetCategory, type AssetRecord } from "./registry";

// The asset resolver (docs/ASSETS.md). The AI and the rules ask for a visual CONCEPT ("premium
// black luxury sunglasses", type 3d, category product, style luxury and minimal); the resolver
// searches the local, licence-checked library and answers with the best asset, how sure it is,
// why, what it costs and how it will be drawn. Nothing ever invents a file name or a URL.
//
// Order of preference (free-first): a local open-licence 3D model, then a lighter model of the
// same thing when the budget is tight, then the model's still (2D), then the procedural stage.

export interface ResolveRequest {
  query: string;
  type?: "3d" | "2d" | "hdri";
  category?: string;
  style?: string[];
  colors?: string[];
  /** Art-direction style words, weighed with the request's own. */
  artStyle?: string[];
}

export interface Budget {
  /** Largest file the page may load for this asset. */
  maxBytes: number;
  maxTriangles: number;
  mobile: boolean;
}

/** Budgets by device and the experience's tier: phones and calm sites get lighter models. */
export function budgetOf(tier: "light" | "medium" | "heavy" | "extreme" | "low", mobile = false): Budget {
  if (mobile || tier === "low" || tier === "light") return { maxBytes: 900_000, maxTriangles: 40_000, mobile };
  if (tier === "medium") return { maxBytes: 2_600_000, maxTriangles: 120_000, mobile };
  if (tier === "heavy") return { maxBytes: 4_000_000, maxTriangles: 160_000, mobile };
  return { maxBytes: 6_000_000, maxTriangles: 260_000, mobile };
}

export type Representation = "3d" | "optimized-3d" | "2d" | "procedural";

export interface Resolution {
  asset: AssetRecord | null;
  id: string;
  /** 0 to 1. */
  score: number;
  reason: string;
  preview: string;
  representation: Representation;
  /** File size and triangles in words. */
  cost: string;
  license: string;
  /** Next best, for the studio and the library. */
  alternatives: { id: string; score: number }[];
  /** True when a subject word of the request hit a subject tag exactly. */
  exact: boolean;
}

// Words people use for the same thing. Each maps to a tag the library uses.
const SYNONYMS: Record<string, string> = {
  shades: "sunglasses", spectacles: "glasses", specs: "glasses", eyeglasses: "glasses", optician: "eyewear", optics: "eyewear", optical: "eyewear", optometrist: "eyewear",
  timepiece: "watch", watches: "watch", wristwatch: "watch", horology: "watch",
  sneakers: "sneaker", trainers: "trainer", footwear: "shoe", shoes: "shoe",
  automobile: "car", cars: "car", automotive: "car", supercar: "car", dealership: "car", motorbike: "motorcycle",
  couch: "sofa", sofas: "sofa", settee: "sofa", chairs: "chair", lamps: "lamp", lighting: "lamp",
  headphones: "speaker", audio: "speaker", radio: "speaker", stereo: "speaker",
  bottles: "bottle", flask: "bottle", skincare: "bottle", perfume: "bottle", cosmetics: "bottle",
  fish: "fish", seafood: "fish", fox: "fox", robot: "robot", robots: "robot", bot: "robot", mascot: "mascot",
  plants: "plant", houseplant: "plant", flowers: "flowers", florist: "florist", bouquet: "bouquet",
  trees: "tree", forest: "forest", rocks: "rocks", stone: "rocks",
  burger: "burger", burgers: "burger", restaurant: "restaurant", diner: "diner", cafe: "cafe", coffee: "coffee", tea: "tea",
  books: "books", bookshop: "books", library: "library", education: "education",
  chess: "chess", strategy: "strategy", trophy: "trophy", award: "award", money: "money", finance: "finance", crypto: "crypto",
  crystal: "crystal", gem: "gem", diamond: "diamond", orb: "orb", sphere: "sphere", blob: "blob", ribbon: "ribbon", particles: "particles",
};

/** Synonyms that name a near object, not the same one: they find a stand-in, never an exact match. */
const LOOSE = new Set(["headphones", "audio", "perfume", "skincare", "cosmetics", "lighting", "dealership", "optician", "optometrist"]);

const STYLE_WORDS = new Set(["premium", "luxury", "minimal", "editorial", "realistic", "stylized", "low-poly", "playful", "cinematic", "futuristic", "warm", "natural", "industrial", "classic", "vintage", "retro", "clean", "technical", "modern", "elegant", "bold", "cozy", "fresh", "moody", "dark", "urban"]);
const STYLE_ALIASES: Record<string, string> = { luxurious: "luxury", high: "premium", "high-end": "premium", highend: "premium", elegant: "luxury", sleek: "minimal", simple: "minimal", cute: "playful", fun: "playful", toy: "playful", cartoon: "stylized", lowpoly: "low-poly", real: "realistic", photoreal: "realistic", photorealistic: "realistic", modern: "minimal", tech: "futuristic", scifi: "futuristic", retro: "vintage", antique: "vintage", rustic: "warm" };
const COLORS = new Set(["black", "white", "silver", "gold", "red", "blue", "green", "pink", "purple", "violet", "yellow", "orange", "brown", "grey", "gray", "cream", "copper", "brass", "clear", "wood"]);
const STOP = new Set("a an and the for of in on at to my our your with from by is are we i me this that it its be best new website site page web brand called company business shop store studio online local".split(" "));

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

const singular = (w: string) => (w.length > 4 && w.endsWith("es") && !w.endsWith("ses") ? w.slice(0, -2) : w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);

/** The request split into subject words, style words and colour words. */
export function parseQuery(text: string) {
  const subject: string[] = [];
  const style: string[] = [];
  const colors: string[] = [];
  const loose: string[] = [];
  let head: string[] = [];
  for (const raw of words(text)) {
    const w = SYNONYMS[raw] ?? raw;
    if (LOOSE.has(raw) && !loose.includes(w)) loose.push(w);
    const st = STYLE_ALIASES[w] ?? w;
    if (STYLE_WORDS.has(st)) style.push(st);
    else if (COLORS.has(w)) colors.push(w === "gray" ? "grey" : w);
    else {
      const forms = [w, ...(singular(w) !== w ? [singular(w)] : []), ...(SYNONYMS[singular(w)] && SYNONYMS[singular(w)] !== w ? [SYNONYMS[singular(w)]] : [])];
      subject.push(...forms);
      // The head noun is the last subject word the library knows ("concept sports CAR"; a
      // brand or a city after it is skipped). Hits on it count fully, other words a little less.
      if (forms.some((f) => vocabulary().has(f))) head = forms;
    }
  }
  // A word the person wrote themselves counts as exact even if a loose synonym also produced it.
  const direct = new Set(words(text).filter((r) => !LOOSE.has(r)).map((r) => SYNONYMS[r] ?? r));
  return { subject: [...new Set(subject)], style: [...new Set(style)], colors: [...new Set(colors)], loose: loose.filter((w) => !direct.has(w)), head };
}

let VOCAB: Set<string> | null = null;
function vocabulary(): Set<string> {
  if (!VOCAB) VOCAB = new Set(ASSETS.flatMap((a) => [...a.tags, a.subcategory, ...a.name.toLowerCase().split(/\s+/)].flatMap((t) => [t.toLowerCase(), ...t.toLowerCase().split(" ")])));
  return VOCAB;
}

/** How well the asset's tags and names describe the subject words. 1 means an exact subject tag. */
function subjectScore(a: AssetRecord, subject: string[], loose: string[] = [], head: string[] = []): { score: number; exact: boolean; hits: string[] } {
  if (!subject.length) return { score: 0, exact: false, hits: [] };
  const lead = new Set([...a.tags.slice(0, 3), a.subcategory, ...a.name.toLowerCase().split(/\s+/)].map((t) => t.toLowerCase()));
  const all = new Set(a.tags.map((t) => t.toLowerCase()));
  let best = 0;
  let extra = 0;
  let exact = false;
  const hits: string[] = [];
  for (const w of subject) {
    let s = 0;
    if (lead.has(w) && loose.includes(w)) s = 0.8;
    else if (lead.has(w)) (s = 1), (exact = exact || !head.length || head.includes(w));
    else if (all.has(w)) s = 0.75;
    else if ([...all].some((t) => t.includes(" ") && t.split(" ").includes(w))) s = 0.6;
    else if (w.length >= 5 && [...all].some((t) => t.startsWith(w) || w.startsWith(t))) s = 0.45;
    if (s > 0) hits.push(w);
    if (head.length && !head.includes(w)) s *= 0.8;
    if (s > best) (extra += best * 0.15), (best = s);
    else extra += s * 0.15;
  }
  // The best word carries the score; every further word that also fits adds a little, so
  // "robot mascot" prefers the robot that is also a mascot over a mascot that is no robot.
  return { score: Math.min(1, best * 0.85 + Math.min(0.15, extra)), exact, hits };
}

function overlap(want: string[], have: string[]): number {
  if (!want.length) return 0.5;
  const h = new Set(have.map((x) => x.toLowerCase()));
  return want.filter((w) => h.has(w)).length / want.length;
}

/** 1 when the asset is comfortably inside the budget, falling to 0 at twice the budget. */
function fit(a: AssetRecord, b: Budget): number {
  const over = Math.max(a.performance.bytes / b.maxBytes, a.performance.triangles / b.maxTriangles);
  return over <= 1 ? 1 : Math.max(0, 2 - over);
}

export const withinBudget = (a: AssetRecord, b: Budget) => a.performance.bytes <= b.maxBytes && a.performance.triangles <= b.maxTriangles;

const mb = (bytes: number) => (bytes / 1048576).toFixed(bytes < 1048576 ? 2 : 1) + " MB";
const costOf = (a: AssetRecord) => (a.type === "hdri" ? `${mb(a.performance.bytes)} HDR light` : `${mb(a.performance.bytes)}, ${a.performance.triangles.toLocaleString("en")} triangles, ${a.performance.tier} tier`);

/** Below this the library has nothing that honestly matches: the procedural stage is used. */
export const MIN_SCORE = 0.32;

export interface ResolveOptions {
  budget?: Budget;
  /** Replace the library (tests, the quality engine). */
  pool?: AssetRecord[];
  exclude?: string[];
}

export function resolveAsset(req: ResolveRequest, o: ResolveOptions = {}): Resolution {
  const pool = o.pool ?? ASSETS;
  const budget = o.budget ?? budgetOf("heavy");
  const q = parseQuery(req.query);
  const style = [...new Set([...(req.style ?? []), ...q.style].map((s) => STYLE_ALIASES[s] ?? s))];
  const art = (req.artStyle ?? []).map((s) => STYLE_ALIASES[s] ?? s);
  const colors = [...new Set([...(req.colors ?? []), ...q.colors])];
  const type = req.type ?? "3d";
  // 1 and 2: the right kind (an HDR for lighting, a model for everything else), in the asked category.
  const typed = pool.filter((a) => (type === "hdri" ? a.type === "hdri" : a.type === "3d") && !(o.exclude ?? []).includes(a.id));
  // 8: the licence gate comes before any scoring. A refused asset is never a candidate.
  const licensed = typed.filter(isShippable);
  const refused = typed.length - licensed.length;
  const inCategory = req.category ? licensed.filter((a) => a.category === (req.category as AssetCategory)) : licensed;
  const candidates = inCategory.length ? inCategory : licensed;
  const scored = candidates
    .map((a) => {
      const sub = subjectScore(a, q.subject, q.loose, q.head);
      // HDRIs are chosen by mood words as much as by subject.
      const subj = type === "hdri" ? Math.max(sub.score, overlap([...q.subject, ...style], a.tags) * 0.8) : sub.score;
      const st = overlap(style, a.style) * 0.6 + overlap(art, a.style) * 0.4;
      const col = colors.length ? overlap(colors, a.colors) : 0.5;
      const mat = overlap(q.subject.filter((w) => a.materials.includes(w)), a.materials);
      const perf = fit(a, budget);
      const score = 0.6 * subj + 0.2 * st + 0.08 * col + 0.04 * mat + 0.08 * perf;
      return { a, score: subj > 0 || type === "hdri" ? score : score * 0.4, exact: sub.exact, hits: sub.hits, st, col, perf };
    })
    .sort((x, y) => y.score - x.score || x.a.performance.bytes - y.a.performance.bytes);
  const top = scored[0];
  const alternatives = scored.slice(1, 4).map((s) => ({ id: s.a.id, score: +s.score.toFixed(3) }));
  if (!top || top.score < MIN_SCORE) {
    return {
      asset: null,
      id: "",
      score: top ? +top.score.toFixed(3) : 0,
      reason: `Nothing in the library matches "${req.query}" well enough${refused ? ` (${refused} unlicensed files were not considered)` : ""}; the procedural stage draws it instead.`,
      preview: "",
      representation: "procedural",
      cost: "no download",
      license: "original",
      alternatives,
      exact: false,
    };
  }
  // 7: the budget. Over it, a lighter model of the same thing if one is nearly as good, else the still.
  let pick = top;
  let representation: Representation = "3d";
  if (type !== "hdri" && !withinBudget(top.a, budget)) {
    const lighter = scored.find((s) => s !== top && withinBudget(s.a, budget) && s.score >= top.score * 0.8 && s.hits.some((h) => top.hits.includes(h)));
    if (lighter) (pick = lighter), (representation = "optimized-3d");
    else representation = "2d";
  }
  const a = pick.a;
  const why = [
    pick.hits.length ? `matches ${pick.hits.map((h) => `"${h}"`).join(", ")}` : `closest ${a.category}`,
    style.length || art.length ? `style ${Math.round(pick.st * 100)}%` : "",
    colors.length ? `colour ${Math.round(pick.col * 100)}%` : "",
    representation === "optimized-3d" ? `lighter than ${top.a.name} for this budget` : representation === "2d" ? "over the 3D budget, so its still is shown" : "within the performance budget",
    a.license.attributionRequired ? `${a.license.type}, credited in the site` : a.license.type,
  ].filter(Boolean);
  return {
    asset: a,
    id: a.id,
    score: +pick.score.toFixed(3),
    reason: `${a.name}: ${why.join("; ")}.`,
    preview: a.preview,
    representation,
    cost: representation === "2d" ? `still image (${a.name} would be ${costOf(a)})` : costOf(a),
    license: a.license.type,
    alternatives,
    exact: pick.exact,
  };
}

/** Everything wrong with a list of asset ids before export: unknown ids and licence problems. */
export function auditAssets(ids: string[], pool: AssetRecord[] = ASSETS): string[] {
  const out: string[] = [];
  for (const id of ids) {
    const a = pool.find((x) => x.id === id);
    if (!a) out.push(`${id} is not in the asset library`);
    else out.push(...licenseProblems(a));
  }
  return out;
}
