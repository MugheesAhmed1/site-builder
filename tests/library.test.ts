import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { schemaProblems } from "@/lib/template-schema.mjs";
import { BLOCKS, MEDIA, PALETTES, LIBRARY_FONTS, blockById, mediaFor } from "@/lib/library-blocks";
import { CATEGORIES } from "@/lib/categories";
import { TEMPLATES } from "@/lib/templates";

describe("shared library", () => {
  it("has sections, scenes and effects", () => {
    expect(BLOCKS.length).toBeGreaterThanOrEqual(18);
    for (const k of ["section", "scene", "effect"]) expect(BLOCKS.some((b) => b.kind === k), k).toBe(true);
    expect(new Set(BLOCKS.map((b) => b.id)).size).toBe(BLOCKS.length);
  });

  for (const b of BLOCKS) {
    it(`${b.id}: every setting has a field, real business types, a real source template`, () => {
      expect(schemaProblems([{ group: b.name, fields: b.fields }], b.defaults)).toEqual([]);
      expect(b.description.length).toBeGreaterThan(20);
      expect(b.business.length).toBeGreaterThan(0);
      for (const x of b.business) expect(CATEGORIES.some((c) => c.id === x), x).toBe(true);
      expect(TEMPLATES.some((t) => t.id === b.from), b.from).toBe(true);
      expect(existsSync(join(process.cwd(), "library", "blocks", `${b.id}.tsx`))).toBe(true);
      // Library pictures it uses by default are in the library.
      for (const v of JSON.stringify(b.defaults).match(/lib:[\w.-]+/g) || []) expect(existsSync(join(process.cwd(), "library", "media", v.slice(4))), v).toBe(true);
    });
  }

  it("collects the pictures, fonts and palettes of every template", () => {
    expect(MEDIA.some((m) => m.src.startsWith("/lib/media/"))).toBe(true);
    for (const t of TEMPLATES) expect(PALETTES.some((p) => p.from === t.id), t.id).toBe(true);
    expect(LIBRARY_FONTS.length).toBeGreaterThan(3);
    expect(mediaFor("image", ["dentist"]).length).toBeGreaterThan(0);
    expect(blockById("nope")).toBeUndefined();
  });

  it("is never imported by a block from outside the repo", () => {
    for (const b of BLOCKS) {
      const src = readFileSync(join(process.cwd(), "library", "blocks", `${b.id}.tsx`), "utf8");
      expect(src).not.toMatch(/from\s+["']https?:/);
    }
  });
});
