// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CONCEPTS, changeConcept } from "@/packages/experience-core";
import { createProject } from "@/lib/project";
import { briefInput } from "@/lib/experience";
import { prerender } from "@/lib/prerender";
import { ENGINES } from "@/template/src/scenes/engines";
import { visibleSections } from "@/template/src/content/sections";

// The renderer (PRD sections 4, 12 and 45): every concept draws as scenes over a stage, the
// words are real HTML before any script runs, and the editor's hooks are in place.

const data = (p: ReturnType<typeof createProject>) => ({ kind: p.kind, design: p.design, content: p.content, experience: p.experience });

describe("renderer", () => {
  it("has an engine for every concept's stage", () => {
    for (const c of CONCEPTS) expect(ENGINES[c.engine as keyof typeof ENGINES], c.id).toBeTruthy();
  });

  it("writes every scene as a section, in order, with the stage and the words", () => {
    for (const q of ["Website for my coffee shop called Morning Ritual in Islamabad", "Portfolio for me, I'm a product designer called Sara Malik", "Website for my law firm called Hart & Vale in Dubai"]) {
      const p = createProject({ query: q });
      const html = prerender(data(p));
      expect(html, q).toContain('class="pf xp-root');
      expect(html).toContain("xp-stage xp-stage-" + p.experience!.stage.engine);
      const shown = visibleSections(p.kind, p.content);
      const ids = [...html.matchAll(/<section id="pf-([a-z-]+)"/g)].map((m) => m[1]);
      expect(ids[0]).toBe("top");
      expect(ids.length).toBe(shown.length - p.experience!.scenes.filter((s) => s.hidden).length);
      const words = p.kind === "website" ? (p.content as any).hero.headline : (p.content as any).hero.tagline || (p.content as any).hero.name;
      // Split headlines keep their words as text.
      expect(html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ")).toContain(words.split(" ")[0]);
    }
  });

  it("renders every concept without throwing", () => {
    const base = createProject({ query: "Website for my studio called North Light in Oslo" });
    for (const c of CONCEPTS) {
      const e = changeConcept(base.experience!, briefInput(base), c.id);
      const html = prerender({ ...data(base), experience: e });
      expect(html.length, c.id).toBeGreaterThan(1000);
      expect(html).toContain('data-concept="' + c.id + '"');
    }
  });

  it("keeps content visible without JavaScript and marks entrances for the script", () => {
    const p = createProject({ query: "Website for my bakery in Lahore" });
    const html = prerender(data(p));
    expect(html).not.toContain('data-anim="on"');
    expect(html).toContain("data-enter=");
  });
});
