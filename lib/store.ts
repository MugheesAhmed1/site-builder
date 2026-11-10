"use client";

import { clonePreset } from "./presets";
import type { PortfolioProject, StepId } from "./types";
import { STEPS } from "./types";

// Portfolios are saved in this browser's local storage. Use Export/Import on the
// home page to move them to another browser or back them up.

const KEY = "pb.projects.v1";
const SETTINGS_KEY = "pb.settings.v1";

export interface Settings {
  apiKey: string;
  accessCode: string;
}

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
    alert("Couldn't save to this browser's storage. It may be full or blocked. Export your portfolio to keep a copy.");
    throw e;
  }
}

export function listProjects(): PortfolioProject[] {
  return read<PortfolioProject[]>(KEY, []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getProject(id: string): PortfolioProject | null {
  return listProjects().find((p) => p.id === id) ?? null;
}

export function saveProject(p: PortfolioProject) {
  const all = read<PortfolioProject[]>(KEY, []).filter((x) => x.id !== p.id);
  all.push({ ...p, updatedAt: new Date().toISOString() });
  write(KEY, all);
}

export function deleteProject(id: string) {
  write(KEY, read<PortfolioProject[]>(KEY, []).filter((x) => x.id !== id));
}

export function importProjects(items: PortfolioProject[]) {
  const all = read<PortfolioProject[]>(KEY, []);
  const ids = new Set(items.map((i) => i.id));
  write(KEY, [...all.filter((x) => !ids.has(x.id)), ...items]);
}

export function newProject(name: string): PortfolioProject {
  const now = new Date().toISOString();
  const steps = Object.fromEntries(STEPS.map((s) => [s.id, "todo"])) as Record<StepId, "todo">;
  return {
    id: Math.random().toString(36).slice(2, 10),
    name,
    createdAt: now,
    updatedAt: now,
    steps,
    resumeText: "",
    resumeFileName: "",
    profile: null,
    design: clonePreset("Ledger"),
    questions: [],
    content: null,
    history: [],
  };
}

export function getSettings(): Settings {
  return read<Settings>(SETTINGS_KEY, { apiKey: "", accessCode: "" });
}

export function saveSettings(s: Settings) {
  write(SETTINGS_KEY, s);
}

// When an earlier step changes, later steps that were built from it are marked "stale".
const ORDER: StepId[] = ["resume", "design", "questions", "build", "deploy"];
export function markChanged(p: PortfolioProject, step: StepId): PortfolioProject {
  const steps = { ...p.steps };
  const i = ORDER.indexOf(step);
  if (steps[step] === "approved") steps[step] = "draft";
  else if (steps[step] === "todo") steps[step] = "draft";
  for (const later of ORDER.slice(i + 1)) {
    if (steps[later] === "approved" || steps[later] === "draft") {
      // Design changes don't change what Claude wrote, only how it looks.
      if (step === "design" && later !== "deploy") continue;
      steps[later] = "stale";
    }
  }
  return { ...p, steps };
}
