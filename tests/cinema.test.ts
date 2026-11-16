import { describe, expect, it, vi } from "vitest";
import { newProject } from "@/lib/store";
import { composeWebsite } from "@/lib/compose";
import { realAssets } from "@/lib/export";
import { generateDesign } from "@/lib/designs";
import { matchPack, packById } from "@/lib/packs";
import { intensityPatch, levelOf } from "@/lib/intensity";
import { directStory, normalizeStory, storyChapters } from "@/template/src/story.js";
import { ALL_ATMOSPHERES, ATMOS_IDS, atmosOf, pickAtmos, siteAtmos } from "@/template/src/atmos/catalog.js";
import { FRAGS } from "@/template/src/atmos/shaders.js";
import { OKAYBABE } from "@/template/src/atmos/vendor/okaybabe.js";

vi.stubGlobal("window", { dispatchEvent: () => true });
vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => undefined });

describe("journeys and the animation engine", () => {
  it("starts new projects on a cinematic background that suits them, and ships no generated pictures", () => {
    const p = newProject("Website for my bakery", "website", "food", "Crumb House");
    expect(p.design.heroStyle).toBe("atmos");
    expect(p.design.intensity).toBe(8);
    expect(p.design.atmos).toBe("meadow");
    p.content = composeWebsite("food", { name: "Crumb House" });
    expect(realAssets(p).some((f) => /^\/real\/(cinema|animals|fish|mascots|people|plates|props|sprites)\//.test(f))).toBe(false);
  });

  it("normalises any spec, including Gemini's words for worlds", () => {
    expect(normalizeStory({ scene: "underwater" }).scene).toBe("ocean");
    expect(normalizeStory({ scene: "space" }).character).toBe("whale");
    expect(normalizeStory({ scene: "forest", character: "dragon" }).character).toBe("parrot");
    expect(normalizeStory(null).characterBehavior.length).toBeGreaterThan(0);
    expect(directStory("product", "invoicing app").scene).toBe("cosmos");
  });

  it("writes chapters from the site's own words", () => {
    const c = composeWebsite("food", { name: "Crumb House" });
    const ch = storyChapters("website", c);
    expect(ch.length).toBeGreaterThanOrEqual(2);
    expect(ch[0].title).toBe(c.hero.headline);
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

  it("has a shader for every atmosphere and picks one for every kind of site", () => {
    for (const a of ALL_ATMOSPHERES) expect(Boolean(FRAGS[a.id as keyof typeof FRAGS]) || OKAYBABE.some((o) => o.id === a.id)).toBe(true);
    expect(new Set(ATMOS_IDS).size).toBe(ATMOS_IDS.length);
    expect(pickAtmos("florist", "")).toBe("meadow");
    expect(pickAtmos("product", "invoicing app")).toBe("dust");
    expect(pickAtmos("law", "")).toBe("summit");
    expect(ATMOS_IDS).toContain(pickAtmos("anything at all", ""));
    expect(atmosOf("silk")).toBe("chrome");
    expect(atmosOf("nope")).toBe("");
    expect(siteAtmos({ atmos: "noir" }, "food")).toBe("noir");
    expect(siteAtmos({}, "food")).toBe("meadow");
  });

  it("recognises the Cinematic pack once applied", () => {
    const p = newProject("x", "website", "food", "X");
    const d = { ...p.design, ...packById("cinema")!.set };
    expect(matchPack(d)).toBe("cinema");
  });
});
