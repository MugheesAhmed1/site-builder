import { describe, expect, it } from "vitest";
import { CONCEPT_STYLES, SCENES, SCENE_OPTIONS, sceneAssets, sceneOptions } from "../template/src/scenes.js";
import { CONCEPT_TYPES, conceptAlias, conceptInfo, conceptsFor } from "../template/src/concepts.js";
import { LIVE, LOOKS_FOR, resolve } from "../template/src/live/catalog.js";
import { MODEL_NAMES, model } from "../template/src/live/models.js";
import { ACTS } from "../template/src/live/acts.js";
import { sceneFor } from "../lib/fit";

const concepts = SCENES.filter((s) => s.group === "concept");

describe("scene concepts", () => {
  it("has concepts in every style", () => {
    for (const st of CONCEPT_STYLES) expect(concepts.filter((s) => s.style === st.id).length).toBeGreaterThan(3);
    expect(concepts.length).toBe(CONCEPT_TYPES.length);
  });

  it("needs no picture files", () => {
    for (const s of concepts) expect(sceneAssets(s)).toEqual([]);
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

  it("leads old concepts to the scenes that replaced them", () => {
    for (const old of ["monkey", "tiger", "safari", "c-rocket", "n-moonwhale", "p-horse", "bamboo"]) expect(conceptAlias(old), old).not.toBeNull();
    expect(conceptAlias("whale")).toBe("whale");
    expect(conceptAlias("not-a-scene")).toBeNull();
  });
});

describe("living scene engine", () => {
  it("builds every model without broken numbers", () => {
    for (const name of MODEL_NAMES) {
      const m = model(name);
      expect(m.verts, name).toBeGreaterThan(100);
      expect(m.data.every((v: number) => Number.isFinite(v)), name).toBe(true);
      expect(m.points.every((v: number) => Number.isFinite(v)), name).toBe(true);
      const max = Math.max(...m.index);
      expect(max, name).toBeLessThan(m.verts);
    }
  });

  it("resolves every scene in every look it offers", () => {
    for (const id of Object.keys(LIVE))
      for (const look of LOOKS_FOR[id as keyof typeof LOOKS_FOR] ?? ["real"]) {
        const sc = resolve(id, look, {});
        expect(sc, id + look).toBeTruthy();
        for (const a of sc.actors) {
          expect(MODEL_NAMES, `${id} ${a.model}`).toContain(a.model);
          expect(Object.keys(ACTS), `${id} ${a.act}`).toContain(a.act);
        }
      }
  });

  it("takes people's settings and ignores nonsense", () => {
    const sc = resolve("whale", "real", { speed: 99, amount: "x", side: "left", tint: "#ff0000", sky: "nope" });
    expect(sc.speed).toBe(3);
    expect(sc.amount).toBe(1);
    expect(sc.actors[0].face[0]).toBeGreaterThan(0);
  });

  it("lists the settings each concept offers", () => {
    for (const t of CONCEPT_TYPES) {
      const opts = SCENE_OPTIONS[t.id];
      expect(opts.length, t.id).toBeGreaterThan(3);
      for (const o of opts) expect(["color", "range", "select"]).toContain(o.kind);
    }
    expect(sceneOptions("whale").find((o) => o.key === "look")?.options?.length).toBeGreaterThan(1);
    expect(sceneOptions("constellation")).toEqual([]);
    expect(conceptInfo("p-whale")?.look).toBe("particle");
  });
});
