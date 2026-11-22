// Matching a site to its character (docs/CHARACTER-JOURNEY.md): the model's colours are read from
// its picture, grown into the five design systems, and poured into a template, either just the
// stage behind the character or the whole site. Browser side (it reads pictures).
import { applyDesign, characterFrom, stageStops, type ModelInfo, type TemplateRoles } from "./apply";
import { designOptions, moodWords, tradeAccent, type DesignSystem } from "./design";
import { paletteFromWords, type CharacterPalette } from "./palette";
import { paletteOfStill } from "./photo";

type Content = Record<string, any>;

/** The five design systems for a model, from its picture (or its colour words when that fails). */
export async function designsFor(poster: string, words: string[], opts: { palette?: CharacterPalette | null; business?: string } = {}): Promise<{ palette: CharacterPalette; designs: DesignSystem[] }> {
  const palette = opts.palette || (poster ? await paletteOfStill(poster) : null) || paletteFromWords(words);
  return { palette, designs: designOptions(palette, moodWords(words), tradeAccent(opts.business || "")) };
}

/** The model in a template's content, with the stage behind it matched to its colours. */
export function withModel(content: Content, roles: TemplateRoles, m: ModelInfo, d: DesignSystem | null, whole = false): Content {
  const base = whole && d ? applyDesign(content, roles, d) : { ...content, design: { ...(content.design || {}) }, character: { ...(content.character || {}) } };
  const next: Content = { ...base, character: characterFrom(m, base.character) };
  if (d) {
    next.design = { ...next.design, stops: stageStops(d, roles), style: d.gradient.style, angle: d.gradient.angle, image: "" };
    next.character.paint = d.accent;
  }
  return next;
}
