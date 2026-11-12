import { categoryLabel } from "./fit";
import { questionsFor } from "./questions";
import type { PortfolioContent, Project, StepId, WebsiteContent } from "./types";

// The studio is not a wizard: every panel is open from the start and the site is always on
// screen. This file describes the panels, the suggested order through them, and the launch
// check that says what is still worth doing before the site goes online.

export type PanelId = "details" | "design" | "scenes" | "motion" | "page" | "publish";

export interface Panel {
  id: PanelId;
  step: StepId; // where its "seen" mark lives in project.steps (kept for older backups)
  title: string;
  short: string;
  icon: string;
  intro: string;
}

export const PANELS: Panel[] = [
  { id: "details", step: "questions", title: "Details", short: "Details", icon: "list", intro: "The facts your site is written from. Change an answer and the page rewrites itself; anything you edited by hand is kept." },
  { id: "design", step: "design", title: "Design system", short: "Design", icon: "palette", intro: "Made for you from your name and tone. Shuffle for a new one, remix one part, lock what you like, or pick from the library." },
  { id: "scenes", step: "cast", title: "Scenes and characters", short: "Scenes", icon: "film", intro: "The set piece your site opens with, plus a character and live widgets. All of it reacts to the pointer, taps and drags." },
  { id: "motion", step: "motion", title: "Animation", short: "Motion", icon: "motion", intro: "How the site moves: one-tap packs, entrance styles, scrolling effects and showpieces. Played by Motion in the site you download too." },
  { id: "page", step: "build", title: "Page", short: "Page", icon: "layout", intro: "Switch sections on and off, drag them into order, and edit every word. Or press Edit on page and click anything in the preview." },
  { id: "publish", step: "deploy", title: "Publish", short: "Publish", icon: "rocket", intro: "Download the finished site and put it online for free. It is yours: plain files, no account, no monthly fee." },
];

export function panelById(id: string | null | undefined): Panel {
  return PANELS.find((p) => p.id === id) ?? PANELS[0];
}

export function nextPanel(id: PanelId): Panel | null {
  const i = PANELS.findIndex((p) => p.id === id);
  return PANELS[i + 1] ?? null;
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
  if (p.kind === "portfolio") {
    const inp = p.input;
    const pc = c as PortfolioContent | null;
    out.push({ id: "name", label: "Your name", done: !!(inp?.name || pc?.hero.name), panel: "details", must: true });
    out.push({ id: "role", label: "What you do", done: !!(inp?.role || pc?.hero.role), panel: "details", must: true });
    out.push({ id: "reach", label: "A way to reach you", done: !!(inp?.email || inp?.phone || inp?.links?.length || pc?.contact.email), panel: "details", must: true });
    out.push({ id: "work", label: "Experience or projects", done: !!((inp?.experience?.length ?? 0) + (inp?.projects?.length ?? 0) || (pc?.experience.length ?? 0) + (pc?.projects.length ?? 0)), panel: "details", must: false });
    if (p.design.heroStyle === "portrait") out.push({ id: "photo", label: "A photo of you", done: !!pc?.hero.photoUrl, panel: "page", must: false });
  } else {
    const wc = c as WebsiteContent | null;
    const a = p.answers;
    for (const q of questionsFor(p.kind, p.category).filter((q) => q.required)) out.push({ id: "q-" + q.id, label: q.label.replace(/[?.!]+$/, ""), done: !!(a[q.id] ?? "").trim(), panel: "details", must: true });
    const ct = wc?.contact;
    out.push({ id: "reach", label: "A phone, WhatsApp, email or address", done: !!(ct && (ct.email || ct.phone || ct.whatsapp || ct.instagram || ct.facebook || ct.linkedin)) || !!wc?.visit?.address, panel: "details", must: true });
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
