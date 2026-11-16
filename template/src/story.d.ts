export type EnvId = "ocean" | "jungle" | "cosmos";
export type CharacterId = "whale" | "parrot";
export type Intensity = "simple" | "creative" | "insane";
export interface StorySpec {
  intensity: Intensity;
  scene: EnvId;
  character: CharacterId;
  scrollBehavior: string;
  characterBehavior: string[];
  transition: string;
}
export const ENVIRONMENTS: { id: EnvId; label: string; aliases: string[]; character: CharacterId }[];
export const CHARACTERS: { id: CharacterId; label: string; behaviours: string[] }[];
export const BEHAVIOURS: string[];
export const SCROLL_BEHAVIOURS: string[];
export const TRANSITIONS: string[];
export const INTENSITIES: { id: Intensity; label: string; text: string }[];
export function envId(v: unknown): EnvId;
export function normalizeStory(raw: unknown): StorySpec;
export function storyChapters(kind: "website" | "portfolio", c: unknown): { kicker?: string; title: string; text?: string }[];
export function directStory(category: string, words?: string, intensity?: Intensity): StorySpec;
