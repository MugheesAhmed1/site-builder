import { classify, extractHints } from "./categories";
import { composePortfolioFromInput, composeWebsite, emptyInput, profileToInput } from "./compose";
import { personalDesign } from "./designs";
import { classifyRole } from "./fit";
import { TONE_MOOD, defaultAnswers, questionsFor } from "./questions";
import { keepCast, newProject } from "./store";
import type { PortfolioInput, Project, SiteContent, SiteKind } from "./types";
import { SCENES } from "@/template/src/scenes.js";

// One place for what a project is and how it changes. Pages and panels call these pure
// functions; none of them touch storage or the screen, so they are easy to test.
//
// The model: a site always has a page. It is written from the details (answers or the
// portfolio form) the moment the project is made. Later changes to the details flow into
// the page, except for anything the person rewrote by hand, which is kept.

export const HISTORY_LIMIT = 12;

export function studioPath(p: { id: string }) {
  return "/studio/" + p.id;
}

// What a one-line request will make, before anything is saved. The home page shows this
// live under the prompt so the guess can be corrected first.
export function readRequest(query: string, kind?: SiteKind | null, category?: string | null) {
  const detected = classify(query);
  const k = kind ?? detected.kind;
  const c = category ?? (k === "portfolio" ? classifyRole(query) : detected.kind === "website" ? detected.category : "general");
  return { kind: k, category: c, hints: extractHints(query) };
}

export function portfolioInput(p: Project): PortfolioInput {
  return { ...emptyInput(), ...(p.input ?? profileToInput(p.profile, p.answers)) };
}

// The page as the details alone would write it.
// A portfolio with no name yet reads "Your name" in the preview, so the opening is never a
// sentence with a hole in it. The launch check still counts the name as missing.
export const PLACEHOLDER_NAME = "Your name";
export function composeProject(p: Project): SiteContent {
  if (p.kind !== "portfolio") return composeWebsite(p.category, p.answers);
  const inp = portfolioInput(p);
  return composePortfolioFromInput({ ...inp, name: inp.name.trim() || PLACEHOLDER_NAME });
}

function toneOf(p: Project) {
  return p.kind === "portfolio" ? (p.input?.tone ?? p.answers.tone ?? "") : (p.answers.tone ?? "");
}

// The design system made for this person: seeded from their name, request and tone.
export function designFor(p: Project, salt = "") {
  const name = (p.kind === "portfolio" ? p.input?.name : p.answers.name) || p.name || p.query;
  return personalDesign(name + salt, p.query, TONE_MOOD[toneOf(p)] ?? undefined, p.category);
}

export interface CreateOptions {
  query?: string;
  kind?: SiteKind | null;
  category?: string | null;
  label?: string; // the category's name, when started from a category tile
  sceneId?: string; // open on this scene
  vary?: boolean; // a different design each time, for starts that carry no name
}

// From one line (or a category tile) to a complete project with a finished first page.
export function createProject(o: CreateOptions = {}): Project {
  const typed = (o.query ?? "").trim();
  const read = readRequest(typed, o.kind, o.category);
  const noun = o.label ? o.label.toLowerCase() : "";
  const query = typed || (read.kind === "portfolio" ? (noun ? "Portfolio for a " + noun : "A personal portfolio") : noun ? "Website for a " + noun : "A website for my business");
  let p = newProject(query, read.kind, read.category, read.hints.name);
  p.answers = defaultAnswers(read.kind, read.category, read.hints);
  if (read.kind === "portfolio") p.input = portfolioInput(p);
  p.design = keepCast(p.design, designFor(p, o.vary || !read.hints.name ? p.id : ""));
  const scene = o.sceneId ? SCENES.find((s) => s.id === o.sceneId) : undefined;
  if (scene) p.design = { ...p.design, scene, sceneMode: "backdrop" };
  p = { ...p, content: composeProject(p) };
  return p;
}

// Older projects, backups and projects made elsewhere may lack a page or the portfolio
// form. This fills the gaps without changing anything the person already has.
export function ensureProject(p: Project): Project {
  let out = p;
  if (out.kind === "portfolio" && !out.input) out = { ...out, input: portfolioInput(out) };
  if (!out.content) out = { ...out, content: composeProject(out) };
  return out;
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

export function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => same(x, b[i]));
  if (isObj(a) && isObj(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) if (!same(a[k], b[k])) return false;
    return true;
  }
  return false;
}

// Three-way merge. `before` and `after` are the page as the details wrote it before and
// after a change; `current` is the page on screen, which may hold hand edits. Whatever
// still matches `before` follows the details; whatever was changed by hand stays.
function merge(before: unknown, after: unknown, current: unknown): unknown {
  if (same(current, before)) return after;
  if (isObj(before) && isObj(after) && isObj(current)) {
    const out: Record<string, unknown> = {};
    for (const k of new Set([...Object.keys(after), ...Object.keys(current)])) {
      const v = merge(before[k], after[k], current[k]);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  if (Array.isArray(before) && Array.isArray(after) && Array.isArray(current) && before.length === after.length && after.length === current.length) {
    return current.map((c, i) => merge(before[i], after[i], c));
  }
  return current;
}

// The section list merges by membership: the person's order and switches are kept, a
// section the details just made possible is added, and one they emptied is dropped.
function mergeSections(before: string[], after: string[], current: string[]): string[] {
  if (same(current, before)) return after;
  const kept = current.filter((id) => after.includes(id) || !before.includes(id));
  const added = after.filter((id) => !before.includes(id) && !kept.includes(id));
  if (!added.length) return kept;
  const end = kept.indexOf("contact");
  return end < 0 ? [...kept, ...added] : [...kept.slice(0, end), ...added, ...kept.slice(end)];
}

export function mergeContent(before: SiteContent, after: SiteContent, current: SiteContent): SiteContent {
  const out = merge(before, after, current) as SiteContent;
  (out as { sections: string[] }).sections = mergeSections(before.sections as string[], after.sections as string[], current.sections as string[]);
  return out;
}

function remember(p: Project, label: string): Project["history"] {
  return p.content ? [{ at: new Date().toISOString(), label, content: p.content }, ...p.history].slice(0, HISTORY_LIMIT) : p.history;
}

// Apply a change to the details (answers, the portfolio form, the résumé) and carry it
// into the page.
export function applyDetails(prev: Project, patch: Partial<Pick<Project, "answers" | "input" | "profile" | "resumeText" | "resumeFileName" | "category">>): Project {
  const next: Project = { ...prev, ...patch };
  const name = next.kind === "portfolio" ? next.input?.name : next.answers.name;
  if (name) next.name = name;
  const after = composeProject(next);
  next.content = prev.content ? mergeContent(composeProject(prev), after, prev.content) : after;
  next.steps = { ...next.steps, questions: next.steps.questions === "todo" ? "draft" : next.steps.questions };
  return next;
}

// Switch between a portfolio and a business website, or change the kind of business. The
// questions change with it; answers that still apply are kept.
export function changeType(prev: Project, kind: SiteKind, category: string): Project {
  if (kind === prev.kind && category === prev.category) return prev;
  const hints = { name: prev.answers.name ?? prev.input?.name ?? "", city: prev.answers.city ?? prev.answers.location ?? "" };
  const fresh = defaultAnswers(kind, category, hints);
  const ids = new Set(questionsFor(kind, category).map((q) => q.id));
  const was = questionsFor(prev.kind, prev.category);
  // An answer that is still the old suggestion gives way to the new suggestion.
  const kept = Object.fromEntries(Object.entries(prev.answers).filter(([k, v]) => ids.has(k) && !(k in fresh && was.find((q) => q.id === k)?.suggest === v)));
  const answers = { ...fresh, ...kept };
  if (kind !== prev.kind) {
    // A different kind of site is a different page altogether, so it is written afresh.
    let next: Project = { ...prev, kind, category, answers, input: undefined, history: remember(prev, "Before changing the kind of site") };
    if (kind === "portfolio") next.input = portfolioInput(next);
    next.design = { ...next.design, plate: kind === "website" ? category : undefined };
    next.content = composeProject(next);
    return next;
  }
  const next = applyDetails(prev, { answers, category });
  if (kind === "website" && (!prev.design.plate || prev.design.plate === prev.category)) next.design = { ...next.design, plate: category };
  return next;
}

// Throw away hand edits and write the page again from the details.
export function rewriteFromDetails(prev: Project): Project {
  return { ...prev, content: composeProject(prev), history: remember(prev, "Before rewriting from details") };
}

export function restoreVersion(prev: Project, index: number): Project {
  const hit = prev.history[index];
  if (!hit) return prev;
  return { ...prev, content: hit.content, history: [{ at: new Date().toISOString(), label: "Before restoring", content: prev.content! }, ...prev.history.filter((_, i) => i !== index)].slice(0, HISTORY_LIMIT) };
}

// True when the page holds words or pictures the details would not have written.
export function hasHandEdits(p: Project): boolean {
  return !!p.content && !same(p.content, composeProject(p));
}

export function duplicateProject(p: Project): Project {
  const now = new Date().toISOString();
  const id = Math.random().toString(36).slice(2, 10);
  const copy: Project = JSON.parse(JSON.stringify(p));
  return { ...copy, id, name: (p.name || "My site") + " copy", createdAt: now, updatedAt: now, steps: { ...copy.steps, deploy: "todo" } };
}
