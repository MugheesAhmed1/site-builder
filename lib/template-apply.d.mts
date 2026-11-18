export type SlotType = "text" | "image";

export interface TemplateSlot {
  key: string;
  label: string;
  group?: string;
  type?: SlotType;
  /** The exact text (or picture address) as it appears in the template's files. */
  default: string;
  /** Long text gets a bigger box. */
  long?: boolean;
}

export interface Replacement {
  key: string;
  type: SlotType;
  from: string;
  to: string;
}

export function fileKind(path: string): "html" | "js" | "jsx" | "css" | "json" | "text" | null;
export function cleanUrl(v: string): string;
export function plan(slots: TemplateSlot[], values: Record<string, string> | undefined): Replacement[];
export function applyToText(path: string, text: string, replacements: Replacement[]): string;
export function occurrences(text: string, needle: string): { index: number; length: number }[];
export function slotProblems(path: string, text: string, slot: TemplateSlot): string[];
