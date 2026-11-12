export interface ConceptType { id: string; group: string; style: string; name: string; hint: string; fits: string[] }
export const CONCEPT_STYLES: { id: string; name: string }[];
export const CONCEPT_TYPES: ConceptType[];
export const CONCEPT_IDS: string[];
export const CONCEPTS: Record<string, unknown>;
export function isConcept(type: string): boolean;
export function conceptAssets(type: string): string[];
export function conceptsFor(category: string): string[];
