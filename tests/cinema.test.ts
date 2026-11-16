import { describe, expect, it, vi } from "vitest";
import { newProject } from "@/lib/store";
import { composeWebsite } from "@/lib/compose";
import { realAssets } from "@/lib/export";
import { generateDesign } from "@/lib/designs";
import { matchPack, packById } from "@/lib/packs";
import { intensityPatch, levelOf } from "@/lib/intensity";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ALL_ATMOSPHERES, ATMOS_IDS, SCENES, atmosOf, pickAtmos, sceneFiles, siteAtmos } from "@/template/src/atmos/catalog.js";
import { PAPER_SCENES } from "@/template/src/atmos/paper.js";
import { FRAGS } from "@/template/src/atmos/shaders.js";
import { OKAYBABE } from "@/template/src/atmos/vendor/okaybabe.js";

vi.stubGlobal("window", { dispatchEvent: () => true });
vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => undefined });

describe("journeys and the animation engine", () => {
  it("starts new projects on a cinematic background that suits them, and ships no generated pictures", () => {
    const p = newProject("Website for my bakery", "website", "food", "Crumb House");
    expect(p.design.heroStyle).toBe("atmos");
    expect(p.design.intensity).toBe(8);
    expect(p.design.atmos).toBe("morning-cafe");
    p.content = composeWebsite("food", { name: "Crumb House" });
    expect(realAssets(p)).toEqual(["/scenes/plates/morning-cafe.webp"]);
  });

  it("maps the intensity dial onto the engine's layers", () => {
    const p = newProject("x", "website", "food", "X");
    expect(intensityPatch(1, p.design, "food").sectionFx).toBe("none");
    expect(intensityPatch(5, p.design, "food").heroStyle).toBe("atmos");
    expect(intensityPatch(10, p.design, "food").heroStyle).toBe("atmos");
    expect(intensityPatch(3, { ...p.design, heroStyle: "portrait" }, "food").heroStyle).toBe("portrait");
    expect(intensityPatch(8, { ...p.design, heroStyle: "journey" }, "food").heroStyle).toBe("atmos");
    expect(levelOf(10).name).toBe("Insane");
    expect(levelOf(4).name).toBe("Creative");
  });

  it("rolls cinematic backgrounds into generated systems without changing their other choices", () => {
    const kinds = new Set(Array.from({ length: 60 }, (_, i) => generateDesign(i * 7919).heroStyle));
    expect(kinds.has("atmos")).toBe(true);
    expect(kinds.has("journey")).toBe(false);
    expect(kinds.has("cinema")).toBe(false);
  });

  it("has a renderer for every scene and picks one for every kind of site", () => {
    for (const a of ALL_ATMOSPHERES) {
      const ok = a.family === "plate" ? !!a.plate : a.family === "paper" ? PAPER_SCENES.some((x) => x.id === a.id) : Boolean(FRAGS[a.id as keyof typeof FRAGS]) || OKAYBABE.some((o) => o.id === a.id);
      expect(ok, a.id).toBe(true);
      expect(a.flat).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(new Set(ATMOS_IDS).size).toBe(ATMOS_IDS.length);
    expect(ALL_ATMOSPHERES.length).toBeGreaterThanOrEqual(70);
    expect(pickAtmos("florist", "")).toBe("night-meadow");
    expect(pickAtmos("product", "invoicing app")).toBe("violet-studio");
    expect(pickAtmos("law", "")).toBe("concrete");
    expect(ATMOS_IDS).toContain(pickAtmos("anything at all", ""));
    expect(atmosOf("silk")).toBe("chrome");
    expect(atmosOf("meadow")).toBe("night-meadow");
    expect(atmosOf("nope")).toBe("");
    expect(siteAtmos({ atmos: "noir" }, "food")).toBe("noir");
    expect(siteAtmos({}, "food")).toBe("pp-nectar");
    // Every scene carries one still picture, shown on devices without a graphics card.
    for (const s of SCENES) expect(existsSync(join("public", sceneFiles(s.id)[0]))).toBe(true);
  });

  it("recognises the Cinematic pack once applied", () => {
    const p = newProject("x", "website", "food", "X");
    const d = { ...p.design, ...packById("cinema")!.set };
    expect(matchPack(d)).toBe("cinema");
  });
});
