"use client";

import { LIBRARY, normalizeDesign } from "./designs";
import type { Design, Project, SiteKind, StepId } from "./types";
import { STEPS } from "./types";

// Projects are saved in this browser's local storage. Nothing is sent to a server.
// Use Export and Import on the home page to back up or move them.

const KEY = "sb.projects.v2";
const DESIGNS_KEY = "sb.designs.v1";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    alert("Couldn't save to this browser's storage. It may be full or blocked. Export your project to keep a copy.");
    throw e;
  }
}

function normalize(p: Project): Project {
  return { ...p, kind: p.kind ?? "portfolio", category: p.category ?? "portfolio", answers: p.answers ?? {}, locks: p.locks ?? {}, design: normalizeDesign(p.design) };
}

export function listProjects(): Project[] {
  return read<Project[]>(KEY, [])
    .map(normalize)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getProject(id: string): Project | null {
  return listProjects().find((p) => p.id === id) ?? null;
}

export function saveProject(p: Project) {
  const all = read<Project[]>(KEY, []).filter((x) => x.id !== p.id);
  all.push({ ...p, updatedAt: new Date().toISOString() });
  write(KEY, all);
}

export function deleteProject(id: string) {
  write(KEY, read<Project[]>(KEY, []).filter((x) => x.id !== id));
}

export function importProjects(items: Project[]) {
  const all = read<Project[]>(KEY, []);
  const ids = new Set(items.map((i) => i.id));
  write(KEY, [...all.filter((x) => !ids.has(x.id)), ...items.map(normalize)]);
}

export function newProject(query: string, kind: SiteKind, category: string, name: string): Project {
  const now = new Date().toISOString();
  const steps = Object.fromEntries(STEPS.map((s) => [s.id, "todo"])) as Record<StepId, "todo">;
  steps.start = "approved" as never;
  return {
    id: Math.random().toString(36).slice(2, 10),
    kind,
    category,
    query,
    name: name || (kind === "portfolio" ? "My portfolio" : "My website"),
    createdAt: now,
    updatedAt: now,
    steps,
    answers: {},
    resumeText: "",
    resumeFileName: "",
    profile: null,
    design: LIBRARY[0],
    locks: {},
    content: null,
    history: [],
  };
}

// Design systems the person saved from the editor, kept across projects.
export function savedDesigns(): Design[] {
  return read<Design[]>(DESIGNS_KEY, []).map(normalizeDesign);
}

export function saveDesign(d: Design) {
  const all = savedDesigns().filter((x) => x.id !== d.id);
  write(DESIGNS_KEY, [{ ...d }, ...all].slice(0, 60));
}

export function removeSavedDesign(id: string) {
  write(DESIGNS_KEY, savedDesigns().filter((x) => x.id !== id));
}

const ORDER: StepId[] = STEPS.map((s) => s.id);

// When an earlier step changes, later steps that were built from it are marked "stale".
// Design changes only change how the site looks, so they don't make the content stale.
export function markChanged(p: Project, step: StepId): Project {
  const steps = { ...p.steps };
  if (steps[step] === "approved" || steps[step] === "todo") steps[step] = "draft";
  for (const later of ORDER.slice(ORDER.indexOf(step) + 1)) {
    if (step === "design" && later !== "deploy") continue;
    if (steps[later] === "approved" || steps[later] === "draft") steps[later] = "stale";
  }
  return { ...p, steps };
}
