import type { Direction, ExperienceMode } from "@/template/src/experiences/types";
import { CONCEPTS, type Concept } from "./concepts";
import { modeAffinity, type Brief } from "./understand";
import { presetById } from "./presets";

// Stage 2 of the pipeline and the creative variation engine (PRD sections 7, 56 and 57).
// Every concept is scored against the brief, three directions are drawn up (A editorial,
// B cinematic, C interactive), and the strongest is chosen. A seed per project means two
// requests for "restaurant in Lahore" do not land on the same site.

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface DirectionOptions {
  seed: number;
  /** Only these concepts (a preset). */
  only?: string[];
  /** Never these (Surprise me excludes the current concept). */
  avoid?: string[];
  intensity?: number;
}

export function scoreConcept(c: Concept, b: Brief, o: DirectionOptions): number {
  let s = 0;
  if (c.compatibleIndustries.includes(b.category)) s += 6;
  else if (b.kind === "portfolio" && c.compatibleIndustries.includes("portfolio")) s += 4;
  else if (c.compatibleIndustries.includes("general")) s += 1;
  // What the person said about their business counts four times what the page's words do.
  const own = " " + b.focus.join(" ") + " ";
  const text = " " + b.keywords.join(" ") + " ";
  const has = (t: string, k: string) => t.includes(k.length > 4 ? k : " " + k);
  let mine = 0;
  let page = 0;
  for (const k of c.keywords) {
    if (has(own, k)) mine++;
    else if (has(text, k)) page++;
  }
  s += Math.min(12, mine * 4) + Math.min(4, page);
  const aff = modeAffinity(b);
  s += aff[c.modes[0]] * 1.2 + (c.modes[1] ? aff[c.modes[1]] * 0.5 : 0);
  if (o.intensity !== undefined && c.minIntensity > o.intensity) s -= 6;
  // The anti-template rule: a small, stable nudge per project so equal briefs differ.
  s += ((hash(o.seed + ":" + c.id) % 1000) / 1000) * 3;
  return s;
}

const LABEL: Record<"A" | "B" | "C", (m: ExperienceMode) => boolean> = {
  A: (m) => m === "editorial",
  B: (m) => m === "cinematic",
  C: (m) => m === "world" || m === "playful" || m === "product",
};

const MODE_OF: Record<"A" | "B" | "C", (c: Concept) => ExperienceMode> = {
  A: () => "editorial",
  B: () => "cinematic",
  C: (c) => c.modes.find((m) => LABEL.C(m)) ?? c.modes[0],
};

export interface Directions {
  directions: Direction[];
  chosen: Direction;
}

export function directionsFor(b: Brief, o: DirectionOptions): Directions {
  let pool = CONCEPTS.filter((c) => (!o.only || o.only.includes(c.id)) && !(o.avoid ?? []).includes(c.id));
  if (!pool.length) pool = CONCEPTS.filter((c) => !(o.avoid ?? []).includes(c.id));
  const ranked = pool.map((c) => ({ c, score: scoreConcept(c, b, o) })).sort((x, y) => y.score - x.score);
  const want = b.wantMode;
  // The strongest fit leads, in its own first mode (or the mode the person asked for).
  const lead = (want && ranked.find((r) => r.c.modes.includes(want))) || ranked[0];
  const leadMode: ExperienceMode = want && lead.c.modes.includes(want) ? want : lead.c.modes[0];
  const leadLabel = (["A", "B", "C"] as const).find((l) => LABEL[l](leadMode)) ?? "C";
  const used = new Set<string>([lead.c.id]);
  const out: Direction[] = [];
  for (const label of ["A", "B", "C"] as const) {
    if (label === leadLabel) {
      out.push({ label, mode: leadMode, concept: lead.c.id, name: lead.c.name, pitch: lead.c.pitch, score: Math.round(lead.score * 10) / 10 });
      continue;
    }
    // The best concept that can work in this direction; one whose first mode it is counts a little more.
    const fit = ranked
      .filter((r) => !used.has(r.c.id) && r.c.modes.some(LABEL[label]))
      .map((r) => ({ ...r, adj: r.score - (LABEL[label](r.c.modes[0]) ? 0 : 2) }))
      .sort((x, y) => y.adj - x.adj)[0];
    const hit = fit ?? ranked.find((r) => !used.has(r.c.id));
    if (!hit) continue;
    used.add(hit.c.id);
    out.push({ label, mode: MODE_OF[label](hit.c), concept: hit.c.id, name: hit.c.name, pitch: hit.c.pitch, score: Math.round(hit.score * 10) / 10 });
  }
  const chosen = out.find((d) => d.concept === lead.c.id)!;
  return { directions: out, chosen };
}

/** The concepts a preset allows, falling back to all when none of them fit. */
export function presetConcepts(presetId?: string): string[] | undefined {
  const p = presetId ? presetById(presetId) : undefined;
  return p?.concepts;
}
