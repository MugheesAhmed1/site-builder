export const PLATE_IDS: string[];
export const DARK_PLATES: string[];
export function platePath(idOrCategory: string, role?: string): string;
export function plateFor(design: { plate?: string } | null | undefined, category: string, role?: string): string;
