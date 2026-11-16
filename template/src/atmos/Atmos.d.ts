import type { ReactNode, RefObject } from "react";
export function atmosLevel(intensity: unknown): { n: number; still: boolean; amount: number; pointer: boolean; focus: boolean };
export function Atmosphere(props: { id: string; accent?: string; intensity?: number; host?: RefObject<HTMLElement | null>; className?: string; still?: boolean; tint?: "scene" | "brand"; settings?: Record<string, number | boolean | string>; name?: string; words?: string[] }): ReactNode;
export function AtmosHero(props: {
  id: string;
  accent?: string;
  intensity?: number;
  layout?: string;
  wordmark?: string;
  stats?: { label: string; value: string }[];
  cue?: string;
  still?: boolean;
  className?: string;
  sectionId?: string;
  extra?: ReactNode;
  tint?: "scene" | "brand";
  children?: ReactNode;
}): ReactNode;
export function AtmosThumb(props: { id: string; className?: string }): ReactNode;
