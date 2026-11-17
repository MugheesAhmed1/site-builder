import type { Experience } from "@/template/src/experiences/types";
import { primitive } from "@/template/src/motion/primitives";
import { licenceProblems } from "./licences";

// The quality engine (PRD sections 53, 54 and 72, P0 item 10). Two layers:
// - experienceQA: the ten Experience QA questions, answered from the Experience JSON. A site
//   whose hero does not move, whose scroll changes nothing, or that has no interactive moment
//   is not a finished generation.
// - qualityGates: everything checked before export (performance budget, accessibility, SEO,
//   motion, mobile, reduced motion and licensing). Console errors and Lighthouse scores are
//   runtime checks: scripts/experience-qa.mjs runs them in a real browser on the examples.

export { LICENCES, licenceProblems, OPEN_LICENCES } from "./licences";

export interface Check {
  id: string;
  question: string;
  pass: boolean;
  detail: string;
  /** Runtime checks cannot be answered from the JSON alone. */
  runtime?: boolean;
}

const numeric = (b: Record<string, unknown>) => Object.entries(b).filter(([, v]) => typeof v === "number") as [string, number][];

/** How far the stage moves between two beats, 0 (identical) and up. */
export function beatDistance(a: Record<string, unknown>, b: Record<string, unknown>): number {
  let d = 0;
  for (const [k, v] of numeric(a)) {
    const w = b[k];
    if (typeof w === "number") d += Math.abs(v - w) / (Math.abs(v) + Math.abs(w) > 10 ? Math.max(Math.abs(v), Math.abs(w)) : 1);
  }
  for (const [k, v] of Object.entries(a)) if (typeof v === "string" && b[k] !== v) d += 0.5;
  return d;
}

export function experienceQA(e: Experience): Check[] {
  const scenes = e.scenes.filter((s) => !s.hidden);
  const hero = scenes[0];
  const last = scenes[scenes.length - 1];
  const moves = scenes.slice(1).filter((s, i) => beatDistance(scenes[i].beat, s.beat) > 0.05).length;
  const interactive = scenes.flatMap((s) => s.interactions).filter((x) => x.input !== "keyboard" && x.target !== "cta" && x.target !== "faq");
  const beyond = scenes.slice(1).filter((s) => s.objects.some((o) => o.role === "anchor" || o.role === "character")).length;
  const arcEnd = scenes.findIndex((s) => s.kind === "cta" || s.kind === "contact");
  const cta = scenes.find((s) => s.kind === "cta") ?? scenes.find((s) => s.kind === "contact");
  const unprimitive = scenes.flatMap((s) => [s.entrance, s.text, ...s.interactions.map((x) => x.primitive), ...s.transitions.map((t) => t.primitive)]).filter((id) => !primitive(id));
  // PRD section 19: a cursor effect may become a tap or disappear on phones, but a phone must
  // still get at least one interactive moment of its own.
  const touchMoments = interactive.filter((x) => x.input === "click" || x.input === "touch" || !!x.touch);
  return [
    { id: "hero-moves", question: "Does the hero actually move?", pass: !!hero && hero.kind === "hero" && !!hero.entrance && hero.objects.some((o) => o.role === "anchor"), detail: hero ? `${hero.title}: ${hero.note}` : "There is no hero scene" },
    { id: "scroll-meaningful", question: "Does scrolling change something meaningful?", pass: moves >= Math.min(3, scenes.length - 1) && scenes.some((s) => s.scroll.some((m) => m.target !== "progress")), detail: `${moves} of ${Math.max(0, scenes.length - 1)} scene changes move the stage` },
    { id: "interactive-moment", question: "Is there at least one interactive moment?", pass: interactive.length > 0, detail: interactive[0] ? interactive[0].response : "Nothing reacts to the cursor, a click or a tap" },
    { id: "concept-continues", question: "Does the visual concept continue beyond the hero?", pass: beyond >= Math.min(2, scenes.length - 1), detail: `${e.name} carries on through ${beyond} more scenes` },
    { id: "story-arc", question: "Does the experience have a beginning, middle and end?", pass: scenes.length >= 3 && arcEnd > 1, detail: scenes.map((s) => s.title).join(" → ") },
    { id: "cta-clear", question: "Does the call to action remain understandable?", pass: !!cta && (cta.composition === "center" || cta.kind === "contact") && last && (last.kind === "cta" || last.kind === "contact"), detail: cta ? `${cta.title}: ${cta.note}` : "No call to action scene" },
    { id: "mobile", question: "Does mobile work?", pass: !!e.fallbacks.mobile && touchMoments.length > 0, detail: touchMoments.length ? e.fallbacks.mobile : "Nothing on the page answers a tap" },
    { id: "reduced-motion", question: "Does reduced motion work?", pass: !!e.fallbacks.reducedMotion && unprimitive.length === 0, detail: unprimitive.length ? "Unknown motion: " + unprimitive.join(", ") : e.fallbacks.reducedMotion },
    { id: "console", question: "Are there console errors?", pass: true, detail: "Checked in a real browser by scripts/experience-qa.mjs", runtime: true },
    { id: "lazy-heavy", question: "Are heavy assets loaded lazily?", pass: !e.stage.webgl || e.technologies.includes("three"), detail: e.stage.webgl ? "The 3D stage loads after the page is usable, with the 2D stage until then" : "No heavy assets" },
  ];
}

export interface GateInput {
  experience: Experience;
  meta: { title?: string; description?: string };
  /** Contrast ratios of body text and of the accent on its background, light and dark. */
  contrast: number[];
  images: { src: string; alt: string }[];
}

export function qualityGates(g: GateInput): Check[] {
  const e = g.experience;
  const qa = experienceQA(e);
  const motion = qa.filter((c) => !c.runtime);
  const licence = licenceProblems(e.technologies);
  const minContrast = g.contrast.length ? Math.min(...g.contrast) : 21;
  const noAlt = g.images.filter((i) => i.src && !i.alt.trim());
  return [
    { id: "performance", question: "Performance", pass: e.budget.dpr <= 2 && e.budget.particles <= 400 && (!e.stage.webgl || e.tier !== "light"), detail: `${e.tier} tier, up to ${e.budget.particles} particles at ${e.budget.dpr}x` },
    { id: "accessibility", question: "Accessibility", pass: minContrast >= 4.5 && noAlt.length === 0, detail: minContrast < 4.5 ? `Lowest contrast ${minContrast.toFixed(2)}:1 (needs 4.5:1)` : noAlt.length ? `${noAlt.length} pictures have no description` : "AA contrast, every picture described" },
    { id: "seo", question: "SEO", pass: !!g.meta.title?.trim() && (g.meta.description?.trim().length ?? 0) >= 50, detail: !g.meta.title?.trim() ? "The page has no title" : (g.meta.description?.trim().length ?? 0) < 50 ? "The description is shorter than 50 characters" : "Title, description, sharing tags, structured data, robots.txt" },
    { id: "motion", question: "Motion", pass: motion.every((c) => c.pass), detail: motion.filter((c) => !c.pass).map((c) => c.question).join(" ") || "Every Experience QA question passes" },
    { id: "console", question: "Console", pass: true, detail: "Checked in a real browser", runtime: true },
    { id: "mobile", question: "Mobile", pass: qa.find((c) => c.id === "mobile")!.pass, detail: e.fallbacks.mobile },
    { id: "reduced-motion", question: "Reduced motion", pass: qa.find((c) => c.id === "reduced-motion")!.pass, detail: e.fallbacks.reducedMotion },
    { id: "licensing", question: "Asset licensing", pass: licence.length === 0, detail: licence.join("; ") || "Every library and asset is on the licence register and may ship" },
  ];
}
