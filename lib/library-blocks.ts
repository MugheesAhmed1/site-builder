// The shared library (docs/LIBRARY.md): blocks taken from every template (sections, 3D scenes and
// effects), each with its own settings, plus every picture, film, font and palette the templates
// use. scripts/build-library.mjs writes the registry from library/blocks/*.json and the templates;
// the built blocks live in public/lib, and any template loads them when its content lists extras.
import registry from "./library.gen.json";
import type { Content, SchemaField } from "./template-schema.mjs";

export interface LibraryBlock {
  id: string;
  name: string;
  kind: "section" | "scene" | "effect";
  /** The template it was taken from. */
  from: string;
  description: string;
  tags: string[];
  /** Business types it suits best: ids from lib/categories.ts. */
  business: string[];
  /** Real WebGL: previews wait until someone asks for them to play. */
  heavy: boolean;
  fields: SchemaField[];
  defaults: Content;
  files: string[];
}

export interface LibraryMedia {
  src: string;
  type: "image" | "video";
  label: string;
  from: string[];
  business: string[];
}

export interface LibraryPalette {
  from: string;
  name: string;
  /** Colour name to value, as the template names them. */
  colors: Record<string, string>;
}

const R = registry as unknown as {
  blocks: LibraryBlock[];
  assets: { media: LibraryMedia[]; fonts: { family: string; from: string[] }[]; palettes: LibraryPalette[] };
};

export const BLOCKS = R.blocks;
export const MEDIA = R.assets.media;
export const FONTS_USED = R.assets.fonts;
export const LIBRARY_FONTS = R.assets.fonts.map((f) => f.family);
export const PALETTES = R.assets.palettes;

export const blockById = (id: string | undefined) => BLOCKS.find((b) => b.id === id);

export const KIND_LABEL: Record<LibraryBlock["kind"], string> = { section: "Section", scene: "3D scene", effect: "Effect" };

/** Pictures or films, the ones made for these business types first. */
export function mediaFor(kind: "image" | "video", business: string[]) {
  const fit = (m: LibraryMedia) => (m.business.some((b) => business.includes(b)) ? 1 : 0);
  return MEDIA.filter((m) => m.type === kind).sort((a, b) => fit(b) - fit(a));
}

/** The preview page of one block with its default settings. */
export const blockPreview = (id: string) => `/lib/preview.html#b=${encodeURIComponent(id)}`;
