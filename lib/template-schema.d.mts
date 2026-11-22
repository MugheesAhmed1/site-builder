export type FieldType = "text" | "textarea" | "image" | "video" | "model" | "url" | "color" | "colors" | "font" | "number" | "toggle" | "select" | "list" | "blocks";
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
/** The 3D character's fields: the model, its motion and finish, and the gradient it stands on. */
export const CHARACTER_GROUPS: SchemaGroup[];
/** A starting gradient (base, glow, second) from a template's colours, for a dark or light stage. */
export function defaultStops(colors?: Record<string, string>, tone?: "dark" | "light"): [string, string, string];
export function characterDefaults(colors?: Record<string, string>, tone?: "dark" | "light"): { character: Content; design: Content };
/** A template's schema and content with the character's groups and defaults in place. */
export function withCharacter(schema: SchemaGroup[], content: Content, roles?: { stage?: "dark" | "light" }): { schema: SchemaGroup[]; content: Content };
