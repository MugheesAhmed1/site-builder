export interface ConceptType { id: string; group: string; style: string; name: string; hint: string; fits: string[] }
export interface ConceptInfo { id: string; scene: string; look: string; name: string; hint: string; fits: string[]; dark: boolean }
export const CONCEPT_STYLES: { id: string; name: string }[];
export const CONCEPT_TYPES: ConceptType[];
export const CONCEPT_IDS: string[];
export const CONCEPTS: Record<string, ConceptInfo>;
export function conceptAlias(type: string): string | null;
export function isConcept(type: string): boolean;
export function conceptInfo(type: string): ConceptInfo | null;
export function conceptAssets(type?: string): string[];
export function conceptsFor(category: string): string[];
