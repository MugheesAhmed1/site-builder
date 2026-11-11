export interface MotionStyle { id: string; name: string; reveal: string; tempo: string; headline: string; hover: "lift" | "glow" | "line" | "none"; feel?: string; from: Record<string, string | number> | null; transition: Record<string, unknown> | null; stagger: number }
export const MOTIONS: MotionStyle[];
export const STILL: MotionStyle;
export const REST: Record<string, string | number>;
export function motionById(id: string): MotionStyle;
export const REVEAL_NAMES: { id: string; name: string }[];
export const TEMPO_NAMES: { id: string; name: string }[];
export const FEELS: { id: string; name: string }[];
