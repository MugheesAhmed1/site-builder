import { describe, expect, it } from "vitest";
import { buildContent, cityOf, localPlan, localTexts, normalizePlan, shiftColor, slotsOf } from "@/lib/animator";
import { getPath, schemaProblems } from "@/lib/template-schema.mjs";
import { TEMPLATES, templateById } from "@/lib/templates";

describe("animator engine", () => {
  it("reads a short query", () => {
    const p = localPlan("dentist clinic in isb");
    expect(p.business).toBe("dentist");
    expect(p.city).toBe("Islamabad");
    expect(p.name).toContain("Islamabad");
    expect(templateById(p.template)).toBeTruthy();
    expect(p.blocks).toContain("contact-form");
    expect(p.prompt).toMatch(/Islamabad/);
    expect(cityOf("bakery in lhr")).toBe("Lahore");
    expect(localPlan("portfolio for a 3d artist").kind).toBe("portfolio");
  });

  it("writes the opening by rules when no model does", () => {
    const p = localPlan("dentist clinic in isb");
    const texts = localTexts(templateById(p.template)!, p);
    expect(Object.values(texts).join(" ")).toMatch(/Islamabad|dental|check-up/i);
  });

  it("keeps only what it can use from a model's plan", () => {
    const f = localPlan("gym in karachi");
    const p = normalizePlan({ template: "nope", blocks: ["nope", "count-up-stats", "count-up-stats"], accent: "red", business: "fitness", name: "Iron — House" }, f);
    expect(p.template).toBe(f.template);
    expect(p.blocks).toEqual(["count-up-stats"]);
    expect(p.accent).toBe(f.accent);
    expect(p.name).toBe("Iron , House".replace(" ,", ","));
  });

  it("moves colours to the accent hue and keeps their lightness", () => {
    expect(shiftColor("#000000", "#1f9ebd")).toBe("#000000");
    expect(shiftColor("#ff5a1f", "#1f9ebd")).not.toBe("#ff5a1f");
    expect(shiftColor("nonsense", "#1f9ebd")).toBe("nonsense");
  });

  for (const t of TEMPLATES) {
    it(`${t.id}: builds a complete, editable site for a dentist`, () => {
      const plan = { ...localPlan("dentist clinic in isb"), template: t.id };
      const slots = slotsOf(t, buildContent(t, plan));
      expect(slots.length).toBeGreaterThan(10);
      const texts = Object.fromEntries(slots.map((s) => [s.key, "Calm, careful dentistry"]));
      const c = buildContent(t, plan, { texts });
      expect(schemaProblems(t.schema, c)).toEqual([]);
      expect(c.extras.length).toBe(plan.blocks.length);
      expect(getPath(c, slots[0].key)).toBe("Calm, careful dentistry");
      // The template owner's contact address is never left on the new site.
      expect(JSON.stringify(c)).not.toMatch(/"email":"(?!hello@islamabaddentalstudio\.com")[^"]+"/i);
    });
  }
});
