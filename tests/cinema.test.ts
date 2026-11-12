import { existsSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { newProject } from "@/lib/store";
import { composeWebsite } from "@/lib/compose";
import { realAssets } from "@/lib/export";
import { generateDesign } from "@/lib/designs";
import { matchPack, packById } from "@/lib/packs";
import { CATEGORIES } from "@/lib/categories";
import { PLATE_IDS, platePath } from "@/template/src/plates.js";

vi.stubGlobal("window", { dispatchEvent: () => true });
vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => undefined });

describe("cinema openings", () => {
  it("has a scene picture for every plate id", () => {
    for (const id of PLATE_IDS) expect(existsSync("public" + platePath(id)), id).toBe(true);
  });

  it("finds a scene for every business category, by id and by label", () => {
    for (const c of CATEGORIES) {
      expect(platePath(c.id)).toMatch(/^\/real\/cinema\/[\w-]+\.webp$/);
      const byLabel = platePath(c.label);
      expect(c.id === "general" || byLabel !== "/real/cinema/general.webp", c.label).toBe(true);
    }
    expect(platePath("portfolio", "Senior software engineer")).toBe("/real/cinema/dev.webp");
    expect(platePath("portfolio", "Brand designer")).toBe("/real/cinema/design.webp");
  });

  it("starts new projects on the film-scene look and ships the scene with the download", () => {
    const p = newProject("Website for my bakery", "website", "food", "Crumb House");
    expect(p.design.heroStyle).toBe("cinema");
    expect(p.design.chrome).toBe("pill");
    p.content = composeWebsite("food", { name: "Crumb House" });
    expect(realAssets(p)).toContain("/real/cinema/food.webp");
  });

  it("rolls cinema pieces into generated systems without changing their other choices", () => {
    const kinds = new Set(Array.from({ length: 60 }, (_, i) => generateDesign(i * 7919).heroStyle));
    expect(kinds.has("cinema")).toBe(true);
    expect(kinds.has("stage")).toBe(true);
  });

  it("recognises the Cinematic pack once applied", () => {
    const p = newProject("x", "website", "food", "X");
    const d = { ...p.design, ...packById("cinema")!.set };
    expect(matchPack(d)).toBe("cinema");
  });
});
