import { categoryLabel } from "./fit";
import { questionsFor } from "./questions";
import type { PortfolioContent, Project, StepId, WebsiteContent } from "./types";

// The studio is not a wizard: every panel is open from the start and the site is always on
// screen. This file describes the panels, the suggested order through them, and the launch
// check that says what is still worth doing before the site goes online.

export type PanelId = "prd" | "sections" | "content" | "experience" | "design" | "motion" | "page" | "publish";

export interface Panel {
  id: PanelId;
  step: StepId; // where its "seen" mark lives in project.steps (kept for older backups)
  title: string;
  short: string;
  icon: string;
  intro: string;
}

// PRD section 30: five controls (Content, Experience, Design, Motion, Page), then Publish.
export const PANELS: Panel[] = [
  { id: "content", step: "questions", title: "Content", short: "Content", icon: "list", intro: "Your business, every line of text, the call to action, contact details, services, prices and questions. Change an answer and the page rewrites itself; anything you edited by hand is kept." },
  { id: "experience", step: "cast", title: "Experience", short: "Experience", icon: "film", intro: "The idea your site is built around: its concept, its world, how visitors play with it and how much it moves. Remix it in plain words, or let Surprise me try a new direction." },
  { id: "design", step: "design", title: "Design", short: "Design", icon: "palette", intro: "Colours, type, spacing, shape, materials and light or dark. Shuffle for a new system, lock what you like, or pick from the library." },
  { id: "motion", step: "motion", title: "Motion", short: "Motion", icon: "motion", intro: "Tune each kind of movement on its own: scroll, cursor, hover, click, transitions, type, characters and the world around them." },
  { id: "page", step: "build", title: "Page", short: "Page", icon: "layout", intro: "Reorder, add, remove, hide and show sections, and edit every word. Or press Edit on page and click anything in the preview." },
  { id: "publish", step: "deploy", title: "Publish", short: "Publish", icon: "rocket", intro: "Quality checks, then download the finished site or its complete source. It is yours: plain files, no account, no monthly fee." },
];

// A site built from a PRD (the PRD journey): the PRD and its sections come first; the old
// Content and Experience controls give way to them, because the words come from the PRD and
// each section has its own Director.
export const PRD_PANELS: Panel[] = [
  { id: "prd", step: "questions", title: "PRD", short: "PRD", icon: "doc", intro: "The product requirements document your site is built from. Change any section, word or requirement, then rebuild: your choices for each section are kept, and every requirement must stay on the site." },
  { id: "sections", step: "cast", title: "Sections", short: "Sections", icon: "layout", intro: "Each section is generated from its parameters: layout, hero asset, background, animation and Director cut. Pick a section and change any of them, upload your own picture, video or 3D model, or take one from the asset library." },
  ...PANELS.filter((p) => p.id === "design" || p.id === "motion" || p.id === "page" || p.id === "publish"),
];

export function panelsFor(p: { prd?: unknown } | null | undefined): Panel[] {
  return p?.prd ? PRD_PANELS : PANELS;
}

// Links saved before the studio had five controls still open the right place.
const OLD: Record<string, PanelId> = { details: "content", refine: "content", scenes: "experience" };

export function panelById(id: string | null | undefined, list: Panel[] = PANELS): Panel {
  const want = (id && OLD[id]) || id;
  return list.find((p) => p.id === want) ?? list[0];
}

export function nextPanel(id: PanelId, list: Panel[] = PANELS): Panel | null {
  const i = list.findIndex((p) => p.id === id);
  return list[i + 1] ?? null;
}

export interface Check {
  id: string;
  label: string;
  done: boolean;
  panel: PanelId;
  must: boolean; // without it the site reads as unfinished
}

// What stands between this project and a site worth sharing.
export function launchChecks(p: Project): Check[] {
  const out: Check[] = [];
  const c = p.content;
  if (p.prd) {
    const prd = p.prd;
    const blocks = (c as WebsiteContent | null)?.blocks ?? [];
    out.push({ id: "prd", label: "Submit the PRD", done: prd.status === "submitted", panel: "prd", must: true });
    out.push({ id: "reach", label: "An email, phone or address in the PRD", done: !!(prd.contact.email || prd.contact.phone || prd.contact.address), panel: "prd", must: false });
    out.push({ id: "media", label: "Your own pictures and models", done: blocks.every((b) => !["image", "video", "glb"].includes(b.spec.hero.type) || !!b.spec.hero.src), panel: "sections", must: false });
    out.push({ id: "look", label: "Look over the design", done: p.steps.design === "approved", panel: "design", must: false });
    out.push({ id: "download", label: "Download the site", done: p.steps.deploy === "approved", panel: "publish", must: false });
    return out;
  }
  if (p.kind === "portfolio") {
    const inp = p.input;
    const pc = c as PortfolioContent | null;
    out.push({ id: "name", label: "Your name", done: !!inp?.name?.trim(), panel: "content", must: true });
    out.push({ id: "role", label: "What you do", done: !!inp?.role?.trim(), panel: "content", must: true });
    out.push({ id: "reach", label: "A way to reach you", done: !!(inp?.email || inp?.phone || inp?.links?.length || pc?.contact.email), panel: "content", must: true });
    out.push({ id: "work", label: "Experience or projects", done: !!((inp?.experience?.length ?? 0) + (inp?.projects?.length ?? 0) || (pc?.experience.length ?? 0) + (pc?.projects.length ?? 0)), panel: "content", must: false });
    if (p.design.heroStyle === "portrait") out.push({ id: "photo", label: "A photo of you", done: !!pc?.hero.photoUrl, panel: "page", must: false });
  } else {
    const wc = c as WebsiteContent | null;
    const a = p.answers;
    for (const q of questionsFor(p.kind, p.category).filter((q) => q.required)) out.push({ id: "q-" + q.id, label: q.label.replace(/[?.!]+$/, ""), done: !!(a[q.id] ?? "").trim(), panel: "content", must: true });
    const ct = wc?.contact;
    out.push({ id: "reach", label: "A phone, WhatsApp, email or address", done: !!(ct && (ct.email || ct.phone || ct.whatsapp || ct.instagram || ct.facebook || ct.linkedin)) || !!wc?.visit?.address, panel: "content", must: true });
    out.push({ id: "photo", label: "A main photo", done: !!wc?.hero.imageUrl || p.design.heroStyle === "cinema" || p.design.heroStyle === "scatter", panel: "page", must: false });
    if (wc?.sections.includes("gallery") && wc.gallery.length) out.push({ id: "gallery", label: "Gallery photos", done: wc.gallery.every((g) => !!g.imageUrl), panel: "page", must: false });
  }
  out.push({ id: "look", label: "Look over the design", done: p.steps.design === "approved", panel: "design", must: false });
  out.push({ id: "download", label: "Download the site", done: p.steps.deploy === "approved", panel: "publish", must: false });
  return out;
}

export function readiness(p: Project) {
  const checks = launchChecks(p);
  const done = checks.filter((c) => c.done).length;
  return { checks, done, total: checks.length, ready: checks.filter((c) => c.must).every((c) => c.done), published: p.steps.deploy === "approved" };
}

export function describe(p: Project): string {
  return p.kind === "portfolio" ? "Portfolio" + (p.category !== "portfolio" ? " · " + categoryLabel("portfolio", p.category) : "") : categoryLabel("website", p.category);
}
