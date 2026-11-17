import { describe, expect, it } from "vitest";
import { applyPreset, changeMode, findImprovements, makeBetter, refreshExperience, set3d, setChannels, setControl, setIntensity } from "@/packages/experience-core";
import { experienceQA } from "@/packages/quality-engine";
import { briefInput, experienceFor } from "@/lib/experience";
import { panelById, PANELS } from "@/lib/flow";
import { createProject } from "@/lib/project";

// The studio's controls (PRD sections 30, 33, 48, 65 and 66) work on the Experience JSON and
// keep what the person chose through every later rebuild.

const make = (q: string) => {
  const p = createProject({ query: q });
  return { ...p, experience: p.experience ?? experienceFor(p) };
};

describe("studio controls", () => {
  it("has the five controls of PRD section 30, then Publish, and old links still land", () => {
    expect(PANELS.map((x) => x.title)).toEqual(["Content", "Experience", "Design", "Motion", "Page", "Publish"]);
    expect(panelById("details").id).toBe("content");
    expect(panelById("scenes").id).toBe("experience");
    expect(panelById("refine").id).toBe("content");
  });

  it("Make it better finds weaknesses, fixes them, and the fixes survive a rebuild", () => {
    const p = make("Website for my coffee shop called Morning Ritual in Islamabad");
    const e = setIntensity(p.experience, briefInput(p), 6);
    const found = findImprovements(e, { density: "compact", sections: 8 });
    expect(found.length).toBeGreaterThan(0);
    expect(found.some((x) => x.id === "spacing" && x.design?.density === "regular")).toBe(true);
    const ids = found.map((x) => x.id);
    const better = makeBetter(e, briefInput(p), ids);
    expect(better.better).toEqual(expect.arrayContaining(ids.filter((id) => id !== "spacing")));
    // Nothing applied is offered again, and the experience still passes QA.
    const again = findImprovements(better).map((x) => x.id);
    for (const id of ids) if (id !== "spacing") expect(again).not.toContain(id);
    expect(experienceQA(better).filter((c) => !c.pass && !c.runtime)).toEqual([]);
    const rebuilt = refreshExperience(better, briefInput(p));
    expect(rebuilt.better).toEqual(better.better);
    expect(rebuilt.scenes.map((s) => s.entrance)).toEqual(better.scenes.map((s) => s.entrance));
  });

  it("varies repeated entrances", () => {
    const p = make("Website for my law firm called Hart & Vale in Dubai");
    const e = setIntensity(p.experience, briefInput(p), 6);
    const rest = (x: typeof e) => x.scenes.slice(1).map((s) => s.entrance);
    if (findImprovements(e).some((x) => x.id === "vary")) {
      const after = makeBetter(e, briefInput(p), ["vary"]);
      expect(new Set(rest(after)).size).toBeGreaterThan(1);
    }
  });

  it("Motion dials switch to Custom and win over the intensity", () => {
    const p = make("Website for my gym called Iron Hour in Toronto");
    const input = briefInput(p);
    const custom = setChannels(p.experience, input, { cursor: 0, typography: 3 });
    expect(custom.control).toBe("custom");
    expect(custom.channels.cursor).toBe(0);
    const louder = setIntensity(custom, input, 10);
    expect(louder.channels.cursor).toBe(0);
    expect(louder.channels.typography).toBe(3);
    const smart = setControl(louder, input, "smart");
    expect(smart.channels.cursor).toBeGreaterThan(0);
  });

  it("changes the interaction, applies presets, and turns 3D off", () => {
    const p = make("Website for my dental clinic in Karachi");
    const input = briefInput(p);
    const playful = changeMode(p.experience, input, "playful");
    expect(playful.mode).toBe("playful");
    const lux = applyPreset(p.experience, input, "minimal-luxury");
    expect(lux.preset).toBe("minimal-luxury");
    expect(lux.intensity).toBeLessThanOrEqual(4);
    const deep = setIntensity(applyPreset(p.experience, input, "3d-product"), input, 9);
    expect(deep.stage.webgl).toBeTruthy();
    const flat = set3d(deep, input, false);
    expect(flat.noWebgl).toBe(true);
    expect(flat.stage.webgl).toBeUndefined();
    expect(refreshExperience(flat, input).noWebgl).toBe(true);
  });
});
