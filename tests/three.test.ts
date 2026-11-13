import { describe, expect, it } from "vitest";
import { SCENES, SCENE_GROUPS, SCENE_TYPES, sceneOptions } from "../template/src/scenes.js";
import { scenesFor } from "../lib/fit";
import { THREE_SCENES } from "../template/src/three/index.jsx";

const three = SCENE_TYPES.filter((t) => t.group === "three").map((t) => t.id);

describe("real 3D scenes (three.js)", () => {
  it("has a Real 3D group with eight scenes, each drawn by the three.js kit", () => {
    expect(SCENE_GROUPS.some((g) => g.id === "three")).toBe(true);
    expect(three).toHaveLength(8);
    expect(Object.keys(THREE_SCENES).sort()).toEqual([...three].sort());
  });

  it("offers every 3D scene in all six palettes without renumbering older scenes", () => {
    for (const t of three) expect(SCENES.filter((s) => s.type === t)).toHaveLength(6);
    expect(SCENES.find((s) => s.id === "S-001")?.type).toBe("swarm");
    const firstThree = SCENES.findIndex((s) => s.group === "three");
    expect(SCENES.slice(firstThree).every((s) => s.group === "three" || s.group === "concept")).toBe(true);
  });

  it("gives 3D scenes settings the scene panel can show", () => {
    expect(sceneOptions("orb").map((o) => o.key)).toEqual(["speed", "tint", "side"]);
    expect(sceneOptions("galaxy").map((o) => o.key)).toEqual(["speed", "tint"]);
  });

  it("suggests 3D scenes for fitting categories", () => {
    expect(scenesFor("role-dev")).toContain("blocks");
    expect(scenesFor("agency")).toContain("knot");
    for (const c of ["agency", "product", "role-dev", "portfolio"]) expect(scenesFor(c).some((t) => three.includes(t))).toBe(true);
  });
});
