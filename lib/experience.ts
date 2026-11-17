import { generateExperience, refreshExperience, type GenerateOptions } from "@/packages/experience-core";
import type { Experience } from "@/template/src/experiences/types";
import { hashString } from "./designs";
import { defaultAnswers } from "./questions";
import type { Project } from "./types";

// The bridge between a project and the experience engine. Every site has an Experience
// JSON next to its content; these helpers make one, keep it in step with the content, and
// keep earlier ones so the person can compare and restore (PRD sections 32 and 49).

export const EXPERIENCE_HISTORY = 8;

// Only what the person wrote counts as their words: answers still on the suggested text are dropped.
export function briefInput(p: Project) {
  const suggested = defaultAnswers(p.kind, p.category, { name: "", city: "" });
  const own = Object.fromEntries(Object.entries(p.answers).filter(([k, v]) => v && v !== suggested[k]));
  const answers = p.kind === "portfolio" && p.input ? { ...own, name: p.input.name, role: p.input.role, tone: p.input.tone } : own;
  return { kind: p.kind, category: p.category, query: p.query, answers, content: p.content };
}

export function experienceFor(p: Project, o: GenerateOptions = {}): Experience {
  return generateExperience(briefInput(p), { seed: hashString(p.id + p.query), ...o });
}

/** Older projects have no experience yet; content changes may add or drop scenes. */
export function syncExperience(p: Project): Project {
  if (!p.content) return p;
  if (!p.experience || p.experience.version !== 2) return { ...p, experience: experienceFor(p) };
  const want = refreshExperience(p.experience, briefInput(p));
  const same = want.scenes.map((s) => s.section).join() === p.experience.scenes.map((s) => s.section).join();
  return same ? p : { ...p, experience: want };
}

/** Swap in a new experience and keep the old one under Versions. */
export function withExperience(p: Project, next: Experience, label: string): Project {
  const prev = p.experience;
  const experiences = prev ? [{ at: new Date().toISOString(), label, experience: prev }, ...(p.experiences ?? [])].slice(0, EXPERIENCE_HISTORY) : p.experiences;
  return { ...p, experience: next, experiences };
}
