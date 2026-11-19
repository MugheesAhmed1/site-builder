// Which content sections a site actually shows, shared by the generator (to storyboard the
// scenes) and the renderer (to draw them). Content is kept apart from presentation
// (PRD section 45): this file only reads it.

type AnyContent = Record<string, any>;

const list = (c: AnyContent, k: string) => (Array.isArray(c[k]) ? c[k].filter(Boolean) : []);

/** A site made from a PRD opens on its lead block instead of the standard hero. */
export function blockLed(c: AnyContent | null | undefined): boolean {
  return !!c && Array.isArray(c.blocks) && c.blocks.some((b: AnyContent) => b && b.lead);
}

export function blockOf(c: AnyContent, id: string): { b: AnyContent; i: number } | null {
  if (!id.startsWith("b-") || !Array.isArray(c.blocks)) return null;
  const i = c.blocks.findIndex((b: AnyContent) => b && "b-" + b.id === id);
  return i >= 0 ? { b: c.blocks[i], i } : null;
}

export function hasSection(kind: string, c: AnyContent, id: string, preview = false): boolean {
  if (id === "hero") return true;
  if (id.startsWith("b-")) return !!blockOf(c, id);
  const ct = c.contact || {};
  if (id === "about") return !!c.about && (c.about.paragraphs || []).filter(Boolean).length > 0;
  if (id === "cta") return !!(c.cta && c.cta.heading);
  if (id === "contact") return preview || !!(ct.email || ct.phone || ct.whatsapp || ct.instagram || ct.facebook || ct.linkedin || ct.github || ct.website || (c.visit && c.visit.address));
  if (id === "visit") return !!c.visit && !!(c.visit.address || (c.visit.hours || []).length);
  if (id === "gallery") return list(c, "gallery").some((g: AnyContent) => g.imageUrl || preview);
  if (id === "tiles") return kind === "website" ? list(c, "highlights").length > 0 : list(c, "stats").length > 0;
  if (id === "custom") return list(c, "custom").some((g: AnyContent) => (g.items || []).length);
  return list(c, id).length > 0;
}

/** The hero, then every section in the person's order that has something to show. */
export function visibleSections(kind: string, c: AnyContent | null | undefined, preview = false): string[] {
  if (!c) return ["hero"];
  const order: string[] = Array.isArray(c.sections) ? c.sections : [];
  const seen = new Set<string>();
  const led = blockLed(c);
  const out: string[] = led ? [] : ["hero"];
  for (const id of order) {
    if (seen.has(id) || id === "hero") continue;
    seen.add(id);
    // "tiles" is the old name for the numbers strip; it shows highlights or stats.
    if (hasSection(kind, c, id, preview)) out.push(id);
  }
  if (led && !out.length) out.push("hero");
  return out;
}
