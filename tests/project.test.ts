import { beforeEach, describe, expect, it, vi } from "vitest";

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  vi.stubGlobal("localStorage", { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) });
  vi.stubGlobal("window", { dispatchEvent: () => true });
  vi.stubGlobal("CustomEvent", class { constructor(public type: string, public init?: unknown) {} });
});

describe("project logic", () => {
  it("turns one line into a finished site", async () => {
    const { createProject, composeProject, same } = await import("@/lib/project");
    const p = createProject({ query: "Website for my bakery called Crumb House in Lahore" });
    expect(p.kind).toBe("website");
    expect(p.category).toBe("food");
    expect(p.answers.name).toBe("Crumb House");
    expect(p.content).toBeTruthy();
    expect(JSON.stringify(p.content)).toContain("Crumb House");
    // Writing the page is repeatable: the same details give the same page.
    expect(same(composeProject(p), composeProject(p))).toBe(true);
    const q = createProject({ query: "Portfolio for me, I'm a product manager" });
    expect(q.kind).toBe("portfolio");
    expect(q.category).toBe("role-pm");
    expect(q.input).toBeTruthy();
    expect(q.content).toBeTruthy();
  });

  it("starts from a category tile and a chosen scene", async () => {
    const { createProject } = await import("@/lib/project");
    const { SCENES } = await import("@/template/src/scenes.js");
    const scene = SCENES.find((s: { group: string }) => s.group === "concept")!;
    const p = createProject({ kind: "website", category: "dentist", label: "Dentist", sceneId: scene.id });
    expect(p.category).toBe("dentist");
    expect(p.query).toBe("Website for a dentist");
    expect(p.design.scene?.id).toBe(scene.id);
    expect(p.design.sceneMode).toBe("backdrop");
  });

  it("carries new details into the page and keeps hand edits", async () => {
    const { createProject, applyDetails, hasHandEdits } = await import("@/lib/project");
    let p = createProject({ query: "Website for my bakery called Crumb House in Lahore" });
    expect(hasHandEdits(p)).toBe(false);
    // A hand edit to the headline.
    const c = p.content as unknown as { hero: { headline: string; sub: string }; brand: { name: string } };
    p = { ...p, content: { ...p.content!, hero: { ...c.hero, headline: "Bread worth waking up for" } } as typeof p.content };
    expect(hasHandEdits(p)).toBe(true);
    // Then the name changes in Details.
    p = applyDetails(p, { answers: { ...p.answers, name: "Golden Crust" } });
    const d = p.content as unknown as { hero: { headline: string }; brand: { name: string } };
    expect(d.hero.headline).toBe("Bread worth waking up for");
    expect(d.brand.name).toBe("Golden Crust");
    expect(p.name).toBe("Golden Crust");
    expect(JSON.stringify(p.content)).not.toContain("Crumb House");
  });

  it("keeps the section order and adds sections the details make possible", async () => {
    const { createProject, applyDetails } = await import("@/lib/project");
    let p = createProject({ query: "Website for my bakery called Crumb House in Lahore" });
    const before = (p.content!.sections as string[]).slice();
    expect(before).not.toContain("testimonials");
    const moved = [...before.filter((s) => s !== "about"), "about"].filter((s) => s !== "contact").concat("contact");
    p = { ...p, content: { ...p.content!, sections: moved } as typeof p.content };
    p = applyDetails(p, { answers: { ...p.answers, testimonials: "Best cake in town. | Ayesha R." } });
    const after = p.content!.sections as string[];
    expect(after).toContain("testimonials");
    expect(after[after.length - 1]).toBe("contact");
    expect(after.indexOf("about")).toBeGreaterThan(after.indexOf(before[0]));
    expect(after.filter((s) => s !== "testimonials")).toEqual(moved);
  });

  it("changes the kind of site, rewrites, restores and duplicates", async () => {
    const { createProject, changeType, rewriteFromDetails, restoreVersion, duplicateProject, ensureProject } = await import("@/lib/project");
    const p = createProject({ query: "Website for my bakery called Crumb House in Lahore" });
    const d = changeType(p, "website", "dentist");
    expect(d.category).toBe("dentist");
    expect(d.answers.name).toBe("Crumb House");
    expect(d.design.plate).toBe("dentist");
    const f = changeType(p, "portfolio", "portfolio");
    expect(f.kind).toBe("portfolio");
    expect(f.input).toBeTruthy();
    expect(f.history.length).toBe(1);
    expect((f.content as unknown as { hero: { name: string } }).hero).toHaveProperty("role");
    const back = restoreVersion(f, 0);
    expect(back.content).toEqual(p.content);
    expect(rewriteFromDetails(p).history.length).toBe(1);
    const copy = duplicateProject(p);
    expect(copy.id).not.toBe(p.id);
    expect(copy.content).toEqual(p.content);
    expect(ensureProject({ ...p, content: null }).content).toEqual(p.content);
  });

  it("checks what a site still needs before launch", async () => {
    const { createProject, applyDetails } = await import("@/lib/project");
    const { readiness, PANELS, nextPanel } = await import("@/lib/flow");
    let p = createProject({ query: "Website for my bakery called Crumb House in Lahore" });
    expect(readiness(p).ready).toBe(false);
    p = applyDetails(p, { answers: { ...p.answers, what: "Cakes and fresh bread", phone: "+92 300 0000000" } });
    expect(readiness(p).ready).toBe(true);
    expect(PANELS.map((x) => x.id)).toEqual(["details", "design", "scenes", "motion", "page", "publish"]);
    expect(nextPanel("publish")).toBeNull();
  });

  it("builds every home page sample", async () => {
    const { SAMPLES, buildSample } = await import("@/lib/samples");
    for (const s of SAMPLES) {
      const p = buildSample(s);
      expect(p.content, s.id).toBeTruthy();
      expect((p.content!.sections as string[]).length, s.id).toBeGreaterThan(3);
    }
  });
});
