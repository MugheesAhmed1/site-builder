export interface CharacterDef { id: string; family: string; name: string; palette: string; accessory: string; expression: string; idle: string; variant: number }
export interface WidgetDef { id: string; kind: string; skin: string; name: string }
export const FAMILIES: { id: string; name: string }[];
export const PALETTES: { id: string; name: string; body: string; trim: string }[];
export const EXPRESSIONS: string[];
export const ACCESSORIES: string[];
export const IDLES: string[];
export const WIDGET_KINDS: { id: string; name: string }[];
export const SKINS: { id: string; name: string }[];
export const CHARACTERS: CharacterDef[];
export const WIDGETS: WidgetDef[];
export function characterById(id: string, list?: CharacterDef[]): CharacterDef | null;
export function widgetById(id: string, list?: WidgetDef[]): WidgetDef | null;
export function defaultCast(kind: string, category: string, seed: number): { character: CharacterDef; widgets: WidgetDef[] };
