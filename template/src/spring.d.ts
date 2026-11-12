export type SpringOptions = { visualDuration?: number; bounce?: number; rest?: number };
export function springAt(t: number, visualDuration: number, bounce: number): number;
export function cssSpring(options?: SpringOptions): { duration: number; easing: string; css: string };
export const CSS_SPRINGS: Record<string, Required<Pick<SpringOptions, "visualDuration" | "bounce">>>;
