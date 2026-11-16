import { describe, expect, it } from "vitest";
import { composeWebsite } from "@/lib/compose";
import { applyCopy, cleanText, collectCopy, diffCopy, localPolish } from "@/lib/refine";

describe("AI polish (Gemini) helpers", () => {
  const c = composeWebsite("food", { name: "Crumb House", email: "hi@crumb.test", phone: "+92 300 0000000" });

  it("sends words only, never contact details or links", () => {
    const copy = collectCopy(c);
    expect(copy["hero.headline"]).toBe(c.hero.headline);
    const all = Object.values(copy).join(" ");
    expect(all).not.toContain("hi@crumb.test");
    expect(Object.keys(copy).some((k) => /email|phone|href|Url|price/i.test(k))).toBe(false);
  });

  it("applies only offered fields and ignores anything else in the reply", () => {
    const next = applyCopy(c, { "hero.headline": "Fresh bread — every morning", "contact.email": "evil@x.test", "__proto__.x": "y" } as Record<string, string>);
    expect(next.hero.headline).toBe("Fresh bread, every morning");
    expect(next.contact.email).toBe(c.contact.email);
    expect(c.hero.headline).not.toBe(next.hero.headline);
  });

  it("tidies locally without a key", () => {
    const out = localPolish({ "hero.sub": "we  bake bake bread for you every day in lahore", "hero.primaryCta": "Click here to see the full menu now" });
    expect(out["hero.sub"]).toBe("We bake bread for you every day in lahore.");
    expect(out["hero.primaryCta"].split(" ").length).toBeLessThanOrEqual(4);
    expect(diffCopy({ a: "x" }, { a: "x" })).toEqual([]);
    expect(cleanText("a — b")).toBe("a, b");
  });
});
