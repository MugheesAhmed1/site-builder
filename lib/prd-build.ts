import { assetById } from "@/packages/asset-library/registry";
import { resolveAsset } from "@/packages/asset-library/resolver";
import { blockSection, type Block, type BlockRequirement, type HeroAsset, type SectionSpec } from "@/template/src/content/blocks";
import type { WebsiteContent } from "@/template/src/content/types";
import { cleanSpec, direct, directedSpec } from "@/template/src/director";
import type { Experience } from "@/template/src/experiences/types";
import { classify } from "./categories";
import { composeWebsite } from "./compose";
import { fromBrandColour, personalDesign } from "./designs";
import { experienceFor } from "./experience";
import { allRequirements, syncPrd, widgetFor, type Prd, type PrdSection } from "./prd";
import { defaultAnswers } from "./questions";
import { keepCast, newProject } from "./store";
import type { Project } from "./types";

// The PRD becomes the site. Each PRD section is one dynamic section (a Block), in the same
// order; each requirement is carried by its block with its id, so it is drawn on the page
// (data-req) and the coverage check can prove it is there. The person's choices for a section
// (layout, asset, background, animation, Director, uploads) are kept when the PRD is rebuilt;
// the words always follow the PRD.

/** The library model for what a section shows ("realistic human heart"), if the library has one. */
export function libraryModel(subject: string): { id: string; src: string; preview: string } | null {
  if (!subject.trim()) return null;
  const r = resolveAsset({ query: subject, type: "3d" });
  if (!r.asset || r.representation === "procedural" || r.score < 0.45) return null;
  return { id: r.asset.id, src: r.asset.asset, preview: r.asset.preview };
}

function heroFor(s: PrdSection, spec: SectionSpec, prev?: HeroAsset): HeroAsset {
  if (prev) return { ...prev, subject: prev.subject || s.visual.subject };
  const h: HeroAsset = { ...spec.hero, subject: s.visual.subject || s.title, alt: s.visual.subject || s.title };
  if (h.type === "glb") {
    const m = libraryModel(h.subject || "");
    if (m) Object.assign(h, { src: m.src, assetId: m.id });
  }
  return h;
}

function reqFor(r: { id: string; kind: "content" | "functional"; text: string }, prev?: BlockRequirement): BlockRequirement {
  const w = r.kind === "functional" ? widgetFor(r.text) : { widget: undefined };
  return { id: r.id, kind: r.kind, text: r.text, ...w, ...(prev?.widget === w.widget && prev?.src ? { src: prev.src } : {}), ...(prev?.widget === w.widget && prev?.fields ? { fields: prev.fields } : {}) };
}

export function blockFor(prd: Prd, s: PrdSection, i: number, prev?: Block): Block {
  const last = i === prd.sections.length - 1;
  const base = directedSpec(s.visual.director || prd.director, { lead: i === 0, index: i, subject: s.visual.subject, heroType: s.visual.asset, secondary: s.visual.secondary });
  if (s.visual.layout) base.layout = s.visual.layout;
  if (s.visual.animation) base.animation = s.visual.animation;
  if (s.visual.background) base.background = { ...base.background, type: s.visual.background, environment: base.background.environment ?? direct(base.director).asset.environment };
  const spec = prev ? cleanSpec(prev.spec, base) : base;
  // A different asset kind chosen in the PRD wins over the kept one.
  if (prev && prev.spec.hero.type !== s.visual.asset && prev.prdAsset !== s.visual.asset) spec.hero = { ...base.hero };
  spec.hero = heroFor(s, spec, prev && spec.hero.type === prev.spec.hero.type ? prev.spec.hero : undefined);
  const prevItems = prev?.items ?? [];
  return {
    id: s.id,
    prd: s.id,
    lead: i === 0 || undefined,
    kicker: i === 0 ? (s.title !== prd.name ? prd.name : "") : s.purpose && s.purpose.length <= 40 ? s.purpose : "",
    heading: s.title,
    body: s.content,
    items: s.items.map((x, n) => ({ title: x.title, text: x.text, value: x.value, imageUrl: prevItems[n]?.imageUrl })),
    reqs: s.requirements.map((r) => reqFor(r, prev?.reqs.find((p) => p.id === r.id))),
    cta: i === 0 || last ? { label: prd.cta.label, href: i === 0 ? prd.cta.href : "#pf-contact" } : undefined,
    spec,
    prdAsset: s.visual.asset,
  };
}

function contentFor(prd: Prd, category: string, prev?: WebsiteContent | null): WebsiteContent {
  const answers = { ...defaultAnswers("website", category, { name: prd.name, city: "" }), name: prd.name, email: prd.contact.email, phone: prd.contact.phone, address: prd.contact.address };
  const base = composeWebsite(category, answers);
  const prevBlocks = new Map((prev?.blocks ?? []).map((b) => [b.prd, b]));
  const blocks = prd.sections.map((s, i) => blockFor(prd, s, i, prevBlocks.get(s.id)));
  return {
    ...base,
    meta: { title: prd.title || prd.name, description: (prd.summary || prd.idea).slice(0, 158) },
    brand: { ...base.brand, name: prd.name },
    hero: { ...base.hero, headline: blocks[0]?.heading || prd.name, sub: blocks[0]?.body || prd.summary, primaryCta: prd.cta.label, primaryHref: prd.cta.href },
    contact: { ...base.contact, email: prd.contact.email, phone: prd.contact.phone, heading: "Contact", blurb: "" },
    visit: { ...base.visit, address: prd.contact.address },
    blocks,
    sections: blocks.map(blockSection) as WebsiteContent["sections"],
  };
}

/** The experience for a PRD site: the storyboard over its blocks, with motion set by the Directors. */
export function prdExperience(p: Project, prev?: Experience): Experience {
  const blocks = (p.content as WebsiteContent).blocks ?? [];
  const energy = blocks.length ? blocks.reduce((n, b) => n + direct(b.spec.director, b.spec.secondary).intensity, 0) / blocks.length : 0.5;
  const e = experienceFor(p, { intensity: Math.max(2, Math.min(9, Math.round(energy * 10))), allow3d: false });
  const keep = prev ? { channels: prev.channels, cursor: prev.cursor, smooth: prev.smooth, control: prev.control } : {};
  return { ...e, ...keep, noWebgl: true };
}

/** Build (or rebuild) the site from the approved PRD. */
export function buildFromPrd(prd: Prd, prev?: Project | null): Project {
  const found = classify(prd.idea + " " + prd.name);
  const category = prev?.category ?? (found.kind === "website" ? found.category : "general");
  let p: Project = prev ? { ...prev } : newProject(prd.idea, "website", category, prd.name);
  if (!prev) {
    const d = personalDesign(prd.name, prd.idea, undefined, category);
    p.design = keepCast(p.design, { ...fromBrandColour(d, prd.accent), align: "center" });
    p.steps = { ...p.steps, questions: "approved" };
  }
  const now = new Date().toISOString();
  const submitted: Prd = { ...prd, status: "submitted", submittedAt: now };
  p = { ...p, name: prd.name || p.name, query: prd.idea, prd: submitted, answers: { ...p.answers, name: prd.name, email: prd.contact.email, phone: prd.contact.phone, address: prd.contact.address } };
  const content = contentFor(submitted, category, prev?.content as WebsiteContent | null);
  p = { ...p, content, history: prev?.content ? [{ at: now, label: "Before rebuilding from the PRD", content: prev.content }, ...prev.history].slice(0, 12) : p.history };
  p = { ...p, experience: prdExperience(p, prev?.experience) };
  return p;
}

/** Library models a PRD site uses, for the export and the licence gate. */
export function blockAssetIds(content: WebsiteContent | null | undefined): string[] {
  return [...new Set((content?.blocks ?? []).map((b) => (b.spec.hero.type === "glb" ? b.spec.hero.assetId : "")).filter((id): id is string => !!id && !!assetById(id)))];
}

export { allRequirements, syncPrd };
