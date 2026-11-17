import { describe, expect, it } from "vitest";
import { CONCEPTS, ENVIRONMENTS, PACKS, PRESETS, changeConcept, changeWorld, conceptById, generateExperience, remix, setIntensity, surprise, useDirection } from "@/packages/experience-core";
import { experienceQA, licenceProblems, qualityGates } from "@/packages/quality-engine";
import { PRIMITIVES, primitive } from "@/template/src/motion/primitives";
import { createProject } from "@/lib/project";
import { briefInput } from "@/lib/experience";

// The experience core: the PRD's definition of done (section 77), the pipeline (section 7),
// the anti-template rule (section 56) and Experience QA (section 54).

const QUERIES = [
  "Website for my coffee shop called Morning Ritual in Islamabad",
  "A premium mountain resort in northern Pakistan",
  "Website for my bakery in Lahore",
  "Website for my law firm called Hart & Vale in Dubai",
  "Website for my startup Ledgerly, invoicing software for freelancers",
  "Website for my dental clinic in Karachi",
  "Website for my flower shop called Petal & Stem in London",
  "Website for my gym called Iron Hour in Toronto",
  "Website for my architecture studio in Berlin",
  "Website for my swim school called Little Dolphins in Sydney",
  "Website for my cyber security firm called Bastion Labs",
  "Website for my car rental company in Dubai",
  "Portfolio for me, I'm a product manager",
  "Portfolio for me, I'm a product designer called Sara Malik",
  "Portfolio for me, I'm a photographer",
  "Website for my kids party events company",
];

describe("definition of done (PRD 77)", () => {
  it("has at least 20 genuinely different concepts with the required mix", () => {
    expect(new Set(CONCEPTS.map((c) => c.id)).size).toBe(CONCEPTS.length);
    expect(CONCEPTS.length).toBeGreaterThanOrEqual(20);
    expect(CONCEPTS.filter((c) => c.flags.scroll).length).toBeGreaterThanOrEqual(10);
    expect(CONCEPTS.filter((c) => c.flags.object).length).toBeGreaterThanOrEqual(5);
    expect(CONCEPTS.filter((c) => c.flags.webgl).length).toBeGreaterThanOrEqual(5);
    expect(CONCEPTS.filter((c) => c.flags.character).length).toBeGreaterThanOrEqual(3);
    // Different means different stage engines, not one engine re-coloured.
    expect(new Set(CONCEPTS.map((c) => c.engine)).size).toBeGreaterThanOrEqual(12);
  });

  it("records the registry metadata of PRD 34 for every concept", () => {
    for (const c of CONCEPTS) {
      expect(c.compatibleIndustries.length, c.id).toBeGreaterThan(0);
      expect(c.mobileStrategy, c.id).toBeTruthy();
      expect(c.reducedMotionStrategy, c.id).toBeTruthy();
      expect(c.license, c.id).toBe("original");
      expect(c.beats.length, c.id).toBeGreaterThanOrEqual(4);
      expect(ENVIRONMENTS.some((e) => e.id === c.world), c.id + " world " + c.world).toBe(true);
    }
  });

  it("covers the presets, packs, environments and primitives the PRD lists", () => {
    expect(PRESETS.map((p) => p.name)).toEqual(["Cinematic Journey", "Interactive Character", "3D Product", "Liquid World", "Editorial Motion", "Scroll Story", "Digital Playground", "Kinetic Typography", "Product Simulation", "Minimal Luxury", "Retro Interactive", "Futuristic Interface"]);
    for (const p of PRESETS) for (const id of p.concepts) expect(conceptById(id), p.id + " " + id).toBeTruthy();
    expect(PACKS.map((p) => p.name)).toEqual(["Jungle Explorer", "Deep Ocean", "Space Voyage", "Digital Future"]);
    for (const p of PACKS) expect(conceptById(p.concept)).toBeTruthy();
    const env = ENVIRONMENTS.map((e) => e.id);
    for (const id of ["jungle", "forest", "mountains", "desert", "ocean", "underwater", "river", "waterfall", "clouds", "sky", "city", "street", "future-city", "neon", "architecture", "liquid", "particles", "fabric", "glass", "metallic", "paper", "ink", "fluid", "geometric", "space", "planets", "spacecraft", "holo", "digital"]) expect(env).toContain(id);
    const cats = new Set(PRIMITIVES.map((p) => p.category));
    for (const c of ["entrance", "scroll", "cursor", "click", "hover"]) expect(cats.has(c as never)).toBe(true);
    for (const p of PRIMITIVES) if (!p.mobileSupport && p.mobile && p.mobile !== "none") expect(primitive(p.mobile), p.id).toBeTruthy();
  });
});

describe("generation pipeline (PRD 7)", () => {
  it("passes Experience QA and every static quality gate for a wide range of businesses", () => {
    for (const q of QUERIES) {
      const p = createProject({ query: q });
      const e = p.experience!;
      expect(e.version).toBe(2);
      const failed = experienceQA(e).filter((c) => !c.pass);
      expect(failed, q + " → " + e.concept + ": " + failed.map((f) => f.id + " " + f.detail).join("; ")).toEqual([]);
      const gates = qualityGates({ experience: e, meta: { title: "Title", description: "A description that is long enough to pass the search check easily." }, contrast: [7], images: [] });
      expect(gates.filter((g) => !g.pass).map((g) => g.id), q).toEqual([]);
      expect(e.directions.map((d) => d.label)).toEqual(["A", "B", "C"]);
      expect(new Set(e.directions.map((d) => d.concept)).size).toBe(3);
      // The CTA is always the destination.
      const last = e.scenes[e.scenes.length - 1];
      expect(["cta", "contact"]).toContain(last.kind);
    }
  });

  it("picks concepts that fit the business", () => {
    const pick = (q: string) => createProject({ query: q }).experience!.directions.map((d) => d.concept);
    expect(pick("Website for my coffee shop called Morning Ritual in Islamabad")).toContain("bean-to-cup");
    expect(pick("Website for my bakery in Lahore")).toContain("dough-to-bread");
    expect(pick("Website for my law firm called Hart & Vale in Dubai")).toContain("case-file");
    expect(pick("Website for my dental clinic in Karachi")).toContain("tooth-care");
    expect(pick("A premium mountain resort in northern Pakistan")).toContain("mountain-journey");
    expect(pick("Website for my startup Ledgerly, invoicing software for freelancers")).toContain("product-simulation");
  });

  it("does not hand two identical requests the same site (PRD 56)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const e = generateExperience({ kind: "website", category: "food", query: "restaurant in Lahore" }, { seed: i * 7919 });
      seen.add(e.concept + "/" + e.scenes[0].entrance + "/" + e.motionLanguage);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("is deterministic for the same seed", () => {
    const a = generateExperience({ kind: "website", category: "food", query: "coffee in Lisbon" }, { seed: 42 });
    const b = generateExperience({ kind: "website", category: "food", query: "coffee in Lisbon" }, { seed: 42 });
    expect(a).toEqual(b);
  });

  it("uses intensity for complexity and only loads 3D when the concept asks for it at 7 and up (PRD 6, 17)", () => {
    const input = { kind: "website" as const, category: "product", query: "launching our new headphones" };
    const calm = generateExperience(input, { seed: 1, concept: "product-orbit", intensity: 2 });
    const show = generateExperience(input, { seed: 1, concept: "product-orbit", intensity: 10 });
    expect(calm.stage.webgl).toBeUndefined();
    expect(calm.technologies).not.toContain("three");
    expect(calm.profile).not.toBe("webgl");
    expect(show.stage.webgl).toBe("product3d");
    expect(show.profile).toBe("webgl");
    expect(show.technologies).toEqual(expect.arrayContaining(["three", "r3f", "drei"]));
    expect(show.budget.particles).toBeGreaterThan(calm.budget.particles);
    expect(show.scenes[0].duration).toBeGreaterThan(calm.scenes[0].duration);
    expect(calm.channels.cursor).toBeLessThan(show.channels.cursor);
    const flat = generateExperience(input, { seed: 1, concept: "product-orbit", intensity: 10, allow3d: false });
    expect(flat.stage.webgl).toBeUndefined();
    expect(setIntensity(flat, input, 9).stage.webgl).toBeUndefined();
    // GSAP never appears (licence), and every technology is on the register.
    for (const c of CONCEPTS) {
      const e = generateExperience(input, { seed: 3, concept: c.id, intensity: 10 });
      expect(e.technologies).not.toContain("gsap");
      expect(licenceProblems(e.technologies), c.id).toEqual([]);
    }
  });
});

describe("studio controls (PRD 30 to 32)", () => {
  const p = createProject({ query: "Website for my coffee shop called Morning Ritual in Lisbon" });
  const input = briefInput(p);
  const e = p.experience!;

  it("keeps the content when the concept, world or direction changes", () => {
    const next = changeConcept(e, input, "mountain-journey");
    expect(next.concept).toBe("mountain-journey");
    expect(next.scenes.map((s) => s.section)).toEqual(e.scenes.map((s) => s.section));
    const city = changeWorld(next, input, "desert");
    expect(city.concept).toBe("mountain-journey");
    expect(city.stage.params.world).toBe("desert");
    const ocean = changeWorld(next, input, "underwater");
    expect(ocean.concept).toBe("deep-ocean");
    const other = e.directions.find((d) => d.concept !== e.concept)!;
    expect(useDirection(e, input, other.label).concept).toBe(other.concept);
  });

  it("Surprise me finds a different direction", () => {
    const s = surprise(e, input);
    expect(s.concept).not.toBe(e.concept);
    expect(s.mode).not.toBe(e.mode);
  });

  it("understands plain remix requests", () => {
    expect(remix(e, input, "Make the animation calmer")!.experience.intensity).toBeLessThan(e.intensity);
    expect(remix(e, input, "Make it more cinematic")!.experience.mode).toBe("cinematic");
    expect(remix(e, input, "Make the website feel more playful")!.experience.mode).toBe("playful");
    expect(remix(e, input, "Replace the abstract environment with a mountain journey")!.experience.concept).toBe("mountain-journey");
    expect(remix(e, input, "hello")).toBeNull();
  });
});
