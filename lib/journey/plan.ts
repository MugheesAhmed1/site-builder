// Steps 4 to 6 of the journey (docs/CHARACTER-JOURNEY.md): the brief from the interview, the
// character and the design system become one template's content. The animator engine writes the
// words (lib/animator.ts, by rules here, by Gemini through /api/animate), then the design system
// and the character are poured in by role (lib/character/apply.ts). Shared by the browser and tests.
import { buildContent, localPlan, localTexts, masterPromptText, pickBlocks, type MasterPlan } from "../animator";
import { blockById, BLOCKS } from "../library-blocks";
import { categoryById } from "../categories";
import { composeContent, rolesOf, type ModelInfo } from "../character/apply";
import type { DesignSystem } from "../character/design";
import type { Content } from "../template-schema.mjs";
import type { TemplateInfo } from "../templates";
import type { Brief } from "./brief";

/** Library sections a wish in the brief asks for ("Prices" -> the pricing block). */
const WISHES: [RegExp, string][] = [
  [/price|pricing|plan|package|fee/i, "pricing-plans"],
  [/gallery|work|portfolio|project|case/i, "image-marquee"],
  [/how it works|step|process/i, "numbered-list"],
  [/stat|number|result|impact/i, "count-up-stats"],
  [/product|shop|menu|collection|range/i, "product-cards"],
  [/before|after|transform/i, "before-after"],
  [/contact|book|booking|appointment|enquir|inquir|form|reserve|table/i, "contact-form"],
];

/** The library sections for a brief: what it asked for first, then what suits the business. */
export function blocksFor(b: Brief, motion: MasterPlan["motion"], template: string, max = 3): string[] {
  const own = (id: string) => blockById(id)?.from === template;
  const want: string[] = [];
  for (const s of b.sections) for (const [re, id] of WISHES) if (re.test(s) && !want.includes(id) && !own(id) && blockById(id)) want.push(id);
  const sections = want.filter((x) => x !== "contact-form").slice(0, max);
  for (const id of pickBlocks(b.business, motion, template)) {
    const k = blockById(id)?.kind;
    if (k === "section" && id !== "contact-form" && sections.length < max && !sections.includes(id)) sections.push(id);
  }
  const list = [...sections];
  if (!own("contact-form")) list.push("contact-form");
  if (motion !== "calm") list.push("scroll-progress");
  if (motion === "bold") list.push("custom-cursor");
  return list.filter((id, i, a) => a.indexOf(id) === i && BLOCKS.some((x) => x.id === id));
}

/** A plain line for the rules that phrase headlines: what it is and where, without the name. */
function queryOf(b: Brief): string {
  const label = categoryById(b.business).label;
  const what = b.what && b.what !== label ? b.what : b.idea.replace(/\s*\b(?:called|named)\b.*$/i, "");
  const city = b.city && !what.toLowerCase().includes(b.city.toLowerCase()) ? ` in ${b.city}` : "";
  return `${what}${city}`.trim().slice(0, 300) || b.idea;
}

/** The animator's master plan for a brief, a template and a design system. */
export function planFromBrief(b: Brief, t: TemplateInfo, d: DesignSystem, blocks?: string[]): MasterPlan {
  const base = localPlan(b.idea || b.what || "website");
  const plan: MasterPlan = {
    ...base,
    query: queryOf(b),
    kind: b.kind,
    business: b.business || base.business,
    name: b.name || base.name,
    city: b.city || base.city,
    audience: b.audience || base.audience,
    tone: b.tone || base.tone,
    template: t.id,
    accent: d.accent,
    fonts: { display: d.fonts.display, body: d.fonts.body },
    motion: d.motion,
    cta: b.cta || undefined,
    blocks: blocks ?? blocksFor(b, d.motion, t.id),
    source: "local",
    prompt: "",
  };
  plan.prompt = [
    masterPromptText(plan),
    b.sections.length ? `It must have: ${b.sections.join(", ")}.` : "",
    b.character ? `The star of the site is a 3D ${b.character.replace(/^(a|an|the)\s+/i, "")}: the hero is built around it and every colour comes from it.` : "",
    b.cta ? `The main action is "${b.cta}".` : "",
    b.colors ? `Colour wish: ${b.colors}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return plan;
}

/** Words by rules, for the first look while the model writes. */
export const rulesTexts = (t: TemplateInfo, plan: MasterPlan) => localTexts(t, plan);

/**
 * The finished content for a template: the template's own, rewritten for the brief (`texts` from
 * the writer, or the rules), the design system poured in by role, the character on its stage, and
 * the person's own email wherever the site shows one.
 */
export function contentFor(t: TemplateInfo, plan: MasterPlan, d: DesignSystem, model: ModelInfo | null, opts: { texts?: Record<string, string>; email?: string } = {}): Content {
  let c = buildContent(t, plan, { texts: opts.texts ?? localTexts(t, plan) });
  c = composeContent(c, rolesOf(t), d, model);
  // The site's name, outlined behind the character in the opening shot.
  if (model && c.character && !String(c.character.wordmark || "").trim()) c.character = { ...c.character, wordmark: plan.name.slice(0, 24) };
  if (opts.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(opts.email)) {
    const generated = `hello@${plan.name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24) || "studio"}.com`;
    c = JSON.parse(JSON.stringify(c).split(generated).join(opts.email)) as Content;
  }
  return c;
}
