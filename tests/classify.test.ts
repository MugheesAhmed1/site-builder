import { describe, expect, it } from "vitest";
import { classify, extractHints } from "@/lib/categories";
import { classifyRole } from "@/lib/fit";
import { removeDashes } from "@/lib/text";

describe("reading the request", () => {
  it.each([
    ["Website for my bakery called Crumb House in Lahore", "website", "food"],
    ["Site for my dental clinic in Karachi", "website", "dentist"],
  ])("%s", (q, kind, cat) => {
    const r = classify(q);
    expect(r.kind).toBe(kind);
    expect(r.category).toBe(cat);
  });

  it.each([
    ["Portfolio for me, I'm a product manager", "role-pm"],
    ["I'm a UX designer and want to show my work", "role-designer"],
  ])("%s", (q, role) => {
    expect(classify(q).kind).toBe("portfolio");
    expect(classifyRole(q)).toBe(role);
  });

  it("finds a name and a city", () => {
    expect(extractHints("Website for my bakery called Crumb House in Lahore")).toMatchObject({ name: "Crumb House", city: "Lahore" });
  });

  it("never writes em or en dashes", () => {
    expect(removeDashes("Open 9–5 — every day")).not.toMatch(/[–—]/);
  });
});
