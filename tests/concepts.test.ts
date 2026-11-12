import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CONCEPT_STYLES, SCENES, sceneAssets } from "../template/src/scenes.js";
import { CONCEPT_TYPES, conceptsFor } from "../template/src/concepts.js";
import { sceneFor } from "../lib/fit";

const concepts = SCENES.filter((s) => s.group === "concept");

describe("scene concepts", () => {
  it("has concepts in every style", () => {
    for (const st of CONCEPT_STYLES) expect(concepts.filter((s) => s.style === st.id).length).toBeGreaterThan(3);
    expect(concepts.length).toBe(CONCEPT_TYPES.length);
  });

  it("ships every picture a concept uses", () => {
    for (const s of concepts) {
      const files = sceneAssets(s);
      for (const f of files) expect(existsSync(join(process.cwd(), "public", f)), `${s.type}: ${f}`).toBe(true);
    }
  });

  it("keeps the older scene ids stable", () => {
    expect(SCENES.find((s) => s.id === "S-001")?.type).toBe("swarm");
    expect(new Set(SCENES.map((s) => s.id)).size).toBe(SCENES.length);
  });

  it("suits categories and starts new sites on a real-life concept", () => {
    expect(conceptsFor("food").length).toBeGreaterThan(2);
    expect(conceptsFor("unknown-category").length).toBeGreaterThan(2);
    for (const cat of ["food", "dentist", "role-pm", "portfolio", "general"]) expect(sceneFor(cat, 12345).group).toBe("concept");
  });
});
