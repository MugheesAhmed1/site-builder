export function hexToOklch(hex: string): [number, number, number];
export function oklchToHex(L: number, C: number, H: number): string;
export function contrast(a: string, b: string): number;
export function palette(design: unknown, scheme: "light" | "dark"): { bg: string; surface: string; text: string; muted: string; border: string; accent: string; onAccent: string };
export function resolveScheme(design: unknown, systemDark: boolean): "light" | "dark";
