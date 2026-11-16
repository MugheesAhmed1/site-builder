export interface AtmosDef {
  id: string;
  label: string;
  note: string;
  tone: "dark" | "light";
  face: string;
  layout: "center" | "low" | "high" | "panel" | "wordmark";
  swatch: [string, string, string];
  points?: string;
  tier?: string;
  credit?: string;
}
export const ATMOSPHERES: AtmosDef[];
export const ADVANCED: AtmosDef[];
export const ALL_ATMOSPHERES: AtmosDef[];
export const ATMOS_IDS: string[];
export function atmosById(id: unknown): AtmosDef;
export function pickAtmos(category: unknown, words?: unknown): string;
export const LEGACY: Record<string, string>;
export function atmosOf(v: unknown): string;
export function siteAtmos(d: unknown, category?: unknown, words?: unknown): string;
