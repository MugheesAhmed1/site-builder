export interface PlateFx {
  horizon?: number;
  sway?: number;
  water?: number;
  sky?: number;
  fog?: number;
  fogCol?: string;
  motes?: number;
  moteKind?: number;
  moteCol?: string;
  rays?: number;
  rayPos?: [number, number];
}
export interface AtmosDef {
  id: string;
  label: string;
  note: string;
  tone: "dark" | "light";
  moods: string[];
  family: "plate" | "shader" | "paper" | "okaybabe";
  group: string;
  face: string;
  layout: "center" | "low" | "high" | "panel" | "wordmark";
  flat: string;
  credit?: string;
  plate?: PlateFx;
  paper?: { id: string; shader: string; params: Record<string, unknown> };
}
export const PLATES: AtmosDef[];
export const SIGNATURE: AtmosDef[];
export const PAPER: AtmosDef[];
export const ADVANCED: AtmosDef[];
export const SCENES: AtmosDef[];
export const SCENE_GROUPS: string[];
export const MOODS: string[];
export const ATMOSPHERES: AtmosDef[];
export const ALL_ATMOSPHERES: AtmosDef[];
export const ATMOS_IDS: string[];
export function atmosById(id: unknown): AtmosDef;
export function sceneHasMood(s: AtmosDef, mood: string): boolean;
export function thumbOf(id: string): string;
export function sceneFiles(id: string): string[];
export function plateSrc(id: string): string;
export function pickAtmos(category: unknown, words?: unknown): string;
export const LEGACY: Record<string, string>;
export function atmosOf(v: unknown): string;
export function siteAtmos(d: unknown, category?: unknown, words?: unknown): string;
