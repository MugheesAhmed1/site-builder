export type FieldType = "text" | "textarea" | "image" | "video" | "url" | "color" | "colors" | "font" | "number" | "toggle" | "select" | "list";
export interface SchemaField {
  path: string;
  label: string;
  type: FieldType;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  /** For lists: the fields of one item, with paths relative to the item. */
  fields?: SchemaField[];
  itemLabel?: string;
}
export interface SchemaGroup {
  group: string;
  fields: SchemaField[];
}
export type Content = Record<string, any>;
export const FIELD_TYPES: FieldType[];
export function getPath(obj: any, path: string): any;
export function setPath<T>(obj: T, path: string, value: unknown): T;
export function clone<T>(v: T): T;
export function schemaProblems(schema: SchemaGroup[], content: Content): string[];
export function contentScript(content: Content): string;
export function extractMedia(content: Content): { content: Content; files: { path: string; type: string; base64: string }[] };
export function countChanges(a: unknown, b: unknown): number;
