export interface SceneDef { id: string; type: string; group: string; palette: string; name: string }
export interface SceneType { id: string; group: string; name: string; hint: string }
export const SCENE_GROUPS: { id: string; name: string }[];
export const SCENE_TYPES: SceneType[];
export const SCENE_PALETTES: { id: string; name: string; colors?: string[] }[];
export const SCENES: SceneDef[];
export function sceneById(id: string, list?: SceneDef[]): SceneDef | null;
export function sceneType(id: string): SceneType;
export interface RealLayer { mode: string; sprites: string[]; count: number; size: [number, number]; speed?: number; shimmer?: boolean }
export const REAL_SCENES: Record<string, Partial<RealLayer> & { plate?: string; veil?: number; layers?: RealLayer[] }>;
export function sceneAssets(def: SceneDef | null | undefined): string[];
