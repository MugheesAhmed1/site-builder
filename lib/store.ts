"use client";

import { packById } from "./packs";
import { LIBRARY, normalizeDesign } from "./designs";
import type { Design, Project, SiteKind, StepId } from "./types";
import { STEPS } from "./types";
import { castFor, sceneFor } from "./fit";
import { conceptAlias } from "@/template/src/concepts.js";
import { SCENES } from "@/template/src/scenes.js";

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

// Saving can fail when the browser's storage is full or blocked (private windows, strict
// settings). The page keeps working with what it has in memory and shows one notice, so a
// failed save never crashes the editor or interrupts typing.
export const STORAGE_EVENT = "sb:storage";
let storageOk = true;

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    if (!storageOk) {
      storageOk = true;
      window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: { ok: true } }));
    }
    return true;
  } catch {
    if (storageOk) {
      storageOk = false;
      window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: { ok: false } }));
    }
    return false;
  }
}

// A backup file can come from anywhere, so only things shaped like a project are let in.
export function looksLikeProject(x: unknown): x is Project {
  if (!x || typeof x !== "object") return false;
  const p = x as Record<string, unknown>;
  return typeof p.id === "string" && /^[\w-]{1,40}$/.test(p.id) && !!p.steps && typeof p.steps === "object" && !!p.design && typeof p.design === "object" && typeof (p.updatedAt ?? "") === "string";
}

export function seedOf(id: string) {
  let h = 7;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function normalize(p: Project): Project {
  const kind = p.kind ?? "portfolio";
  const category = p.category ?? "portfolio";
  const design = normalizeDesign(p.design);
  if (design.cast === undefined || (design.cast && !design.cast.character)) design.cast = castFor(category, seedOf(p.id));
  if (design.scene === undefined) design.scene = sceneFor(category, seedOf(p.id));
  // Scene concepts from before the 3D engine move to the scene that replaced them.
  else if (design.scene && design.scene.group === "concept") {
    const to = conceptAlias(design.scene.type);
    const hit = to ? SCENES.find((s) => s.type === to) : null;
    design.scene = hit ? { ...hit, ...(design.scene.opts ? { opts: design.scene.opts } : {}) } : sceneFor(category, seedOf(p.id));
  }
  const steps = { ...p.steps };
  if (!steps.cast) steps.cast = steps.motion === "approved" ? "approved" : steps.design === "approved" ? "draft" : "todo";
  return { ...p, kind, category, answers: p.answers ?? {}, locks: p.locks ?? {}, design, steps };
}

export function listProjects(): Project[] {
  const raw = read<unknown>(KEY, []);
  return (Array.isArray(raw) ? raw : [])
    .filter(looksLikeProject)
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

// Returns how many projects were brought in. Anything that is not a project is skipped.
export function importProjects(input: unknown[]): number {
  const items = input.filter(looksLikeProject).map((p) => normalize({ ...p, updatedAt: p.updatedAt || new Date().toISOString(), name: String(p.name ?? "My site"), query: String(p.query ?? "") }));
  if (!items.length) return 0;
  const all = read<Project[]>(KEY, []);
  const ids = new Set(items.map((i) => i.id));
  return write(KEY, [...all.filter((x) => !ids.has(x.id)), ...items]) ? items.length : 0;
}

// New projects open like a film: a scene behind the words, a glass pill menu, a glass call
// to action and the name set huge in the footer. Every piece can be switched off later.
const CINEMA_START: Partial<Design> = { heroStyle: "cinema", accentFace: "serif", chrome: "pill", menu: "curtain", footer: "wordmark", ctaStyle: "glass" };

// New projects start on the animation pack that suits their kind of site.
function packFor(category: string) {
  const id = category === "portfolio" || category.startsWith("role-") || category === "creator" || category === "agency" || category === "photo" ? "studio" : ["food", "shop", "product", "hotel", "beauty", "fitness"].includes(category) ? "launch" : "editorial";
  const p = packById(id)!;
  return { ...p.set, pack: p.id };
}

export function newProject(query: string, kind: SiteKind, category: string, name: string): Project {
  const now = new Date().toISOString();
  const steps = Object.fromEntries(STEPS.map((s) => [s.id, "todo"])) as Record<StepId, "todo">;
  steps.start = "approved" as never;
  const id = Math.random().toString(36).slice(2, 10);
  return {
    id,
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
    design: { ...LIBRARY[0], cast: castFor(category, seedOf(id)), scene: sceneFor(category, seedOf(id)), ...packFor(category), ...CINEMA_START, ...(kind === "website" ? { plate: category } : {}) },
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
    if ((step === "design" || step === "cast" || step === "motion") && later !== "deploy") continue;
    if (steps[later] === "approved" || steps[later] === "draft") steps[later] = "stale";
  }
  return { ...p, steps };
}

// Picking a new design system keeps the cast and the extra touches the person chose.
export function keepCast(prev: Design, next: Design): Design {
  // Characters, scenes and every motion layer belong to the person, not the design system,
  // so switching design keeps them.
  const keys = ["cast", "castStory", "intro", "magnetic", "cursor", "scene", "sceneMode", "tilt", "smooth", "grain", "loader", "film", "video", "flight", "carousel", "scrollWords", "showpiece", "scramble", "fogSwitch", "pack", "plate", "accentFace", "chrome", "menu", "footer", "ctaStyle", "edits"] as const;
  const keep = Object.fromEntries(keys.map((k) => [k, prev[k]]));
  const out = { ...next } as Design;
  for (const [k, v] of Object.entries(keep)) if ((out as unknown as Record<string, unknown>)[k] === undefined && v !== undefined) (out as unknown as Record<string, unknown>)[k] = v;
  return out;
}
