import { describe, expect, it, vi } from "vitest";
import { newProject } from "@/lib/store";
import { composeWebsite } from "@/lib/compose";
import { realAssets } from "@/lib/export";
import { generateDesign } from "@/lib/designs";
import { matchPack, packById } from "@/lib/packs";
import { intensityPatch, levelOf } from "@/lib/intensity";
import { directStory, normalizeStory, storyChapters } from "@/template/src/story.js";

vi.stubGlobal("window", { dispatchEvent: () => true });
vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => undefined });

describe("journeys and the animation engine", () => {
  it("starts new projects on a 3D journey with a world that suits them, and ships no generated pictures", () => {
    const p = newProject("Website for my bakery", "website", "food", "Crumb House");
    expect(p.design.heroStyle).toBe("journey");
    expect(p.design.intensity).toBe(10);
    expect(normalizeStory(p.design.story).scene).toBe("jungle");
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
    expect(intensityPatch(5, p.design, "food").heroStyle).not.toBe("journey");
    expect(intensityPatch(10, p.design, "food").heroStyle).toBe("journey");
    expect(levelOf(10).name).toBe("Insane");
    expect(levelOf(4).name).toBe("Creative");
  });

  it("rolls journeys into generated systems without changing their other choices", () => {
    const kinds = new Set(Array.from({ length: 60 }, (_, i) => generateDesign(i * 7919).heroStyle));
    expect(kinds.has("journey")).toBe(true);
    expect(kinds.has("cinema")).toBe(false);
  });

  it("recognises the Cinematic pack once applied", () => {
    const p = newProject("x", "website", "food", "X");
    const d = { ...p.design, ...packById("cinema")!.set };
    expect(matchPack(d)).toBe("cinema");
  });
});
