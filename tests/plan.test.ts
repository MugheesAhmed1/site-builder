import { describe, expect, it } from "vitest";
import { CAPS, COMPS, LOGICS, LOOKS, MOTIONS, OPENINGS, SCENE_TYPES, buildPlan, filmPlan, typeOf } from "@/library/character/plan";
import { NOW } from "@/library/character/scene-kit";
import { SCENE_CAPS, SCENE_COMPS, SCENE_LOGICS, SCENE_LOOKS, SCENE_MOTIONS, SCENE_OPENINGS, SCENE_TYPES as SCHEMA_TYPES, hasPlan, normalizeFilm, schemaProblems } from "@/lib/template-schema.mjs";
import { TEMPLATES, templateById } from "@/lib/templates";
import { buildContent, emailFor, localPlan, localTexts, slotsOf } from "@/lib/animator";
import { composeContent } from "@/lib/character/apply";
import { designOptions } from "@/lib/character/design";
import { paletteFromPixels } from "@/lib/character/palette";

// The templates' stories (library/character/plan.ts, docs/FILM-TEMPLATES.md): every template is told
// around one 3D figure by a plan of scenes. What can be checked without a browser is checked here;
// how it looks is checked frame by frame in one (docs/FILM-TEMPLATES.md, "Checking a template").

const planned = TEMPLATES.filter((t) => hasPlan(t.content));
const SHAPES = [
  { narrow: false, flat: false },
  { narrow: false, flat: true },
  { narrow: true, flat: false },
  { narrow: true, flat: true },
];

describe("the vocabulary of a story", () => {
  it("is the same in the schema as in what draws it", () => {
    expect([...SCENE_TYPES]).toEqual(SCHEMA_TYPES);
    expect(COMPS).toEqual(SCENE_COMPS);
    expect(CAPS).toEqual(SCENE_CAPS);
    expect([...LOGICS]).toEqual(SCENE_LOGICS);
    expect([...LOOKS]).toEqual(SCENE_LOOKS);
    expect([...OPENINGS]).toEqual(SCENE_OPENINGS);
    expect([...MOTIONS]).toEqual(SCENE_MOTIONS);
  });

  it("reads a scene's type from the start of its name", () => {
    expect(typeOf("hero")).toBe("hero");
    expect(typeOf("cards-work")).toBe("cards");
    expect(typeOf("steps_2")).toBe("steps");
    expect(typeOf("faq3")).toBe("faq");
    expect(typeOf("nonsense-here")).toBeNull();
  });

  it("leaves out scenes that are off, unknown or empty, and keeps the order it was given", () => {
    const p = filmPlan(
      {
        film: {
          order: "hero cards-a steps-b nothing stats-c faq-d finale hero",
          hero: { title: "Hi {name}" },
          "cards-a": { on: true, items: [{ title: "One" }] },
          "steps-b": { on: false, items: [{ title: "Two" }] },
          "stats-c": { items: [] },
          "faq-d": { items: [{ q: "Q?", a: "A." }] },
          finale: { title: "End" },
        },
      },
      "Acme",
    )!;
    expect(p.scenes.map((s) => s.id)).toEqual(["hero", "cards-a", "faq-d", "finale"]);
    expect(p.scenes[0].title).toBe("Hi Acme");
  });

  it("takes no more items than a scene has room for", () => {
    const items = Array.from({ length: 12 }, (_, i) => ({ title: `T${i}`, value: `${i}`, label: "l" }));
    const p = filmPlan({ film: { order: "cards-a stats-b plans-c", "cards-a": { items }, "stats-b": { items }, "plans-c": { items } } })!;
    expect(p.scenes.map((s) => s.items.length)).toEqual([CAPS.cards, CAPS.stats, CAPS.plans]);
  });

  it("is whole whatever the film holds", () => {
    expect(filmPlan({})).toBeNull();
    expect(filmPlan({ film: { order: "  " } })).toBeNull();
    const f = normalizeFilm({ order: "hero cards-a", hero: { title: "x" }, "cards-a": { items: [{ title: "a" }] } });
    expect(f.order).toBe("hero cards-a");
    expect(f.logic).toBeTruthy();
    expect(LOOKS).toContain(f.look);
  });
});

describe.each(planned.map((t) => [t.id, t] as const))("the story of %s", (_id, t) => {
  const film = t.content.film;
  const ids = String(film.order).split(/[\s,]+/).filter(Boolean);

  it("lists only scenes it holds, once each, of a type it knows", () => {
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(typeOf(id), id).not.toBeNull();
      expect(film[id] && typeof film[id] === "object", id).toBe(true);
    }
    expect(ids[0]).toBe("hero");
    expect(ids[ids.length - 1]).toBe("finale");
  });

  it("holds a figure, a look and a logic from the vocabulary", () => {
    expect(String(t.content.character?.src)).toMatch(/^\/assets\/3d\/.+\.glb$/);
    expect(LOGICS).toContain(film.logic);
    expect(LOOKS).toContain(film.look);
    expect(OPENINGS).toContain(film.opening);
    expect(MOTIONS).toContain(film.motion);
    for (const id of ids) expect(COMPS[typeOf(id)!], id).toContain(film[id].comp);
  });

  it("has a field for every value in it", () => {
    expect(schemaProblems(t.schema, t.content)).toEqual([]);
  });

  it("plays whole on every shape of screen: keys in order, ids unique, every element in before it leaves", () => {
    const plan = filmPlan(t.content, String(t.content.brand?.name || t.name))!;
    expect(plan.scenes.length).toBeGreaterThan(3);
    for (const v of SHAPES) {
      const s = buildPlan(plan, v, true);
      const where = `${t.id} ${v.narrow ? "phone" : "wide"} ${v.flat ? "flat" : "tall"}`;
      for (let i = 1; i < s.keys.length; i++) expect(s.keys[i].t, where).toBeGreaterThan(s.keys[i - 1].t);
      for (const k of s.keys) {
        expect(k.cx, where).toBeGreaterThanOrEqual(0);
        expect(k.cx, where).toBeLessThanOrEqual(1);
        expect(k.w, where).toBeGreaterThan(0.04);
        expect(k.w, where).toBeLessThanOrEqual(1.05);
        expect(k.h, where).toBeGreaterThan(0.04);
        expect(k.h, where).toBeLessThanOrEqual(1);
      }
      const names = s.els.map((e) => e.id);
      expect(new Set(names).size, where).toBe(names.length);
      for (const e of s.els) {
        const f = e.fade;
        expect(f[0], `${where} ${e.id}`).toBeLessThanOrEqual(f[1]);
        expect(f[1], `${where} ${e.id}`).toBeLessThanOrEqual(f[2]);
        expect(f[2], `${where} ${e.id}`).toBeLessThanOrEqual(f[3]);
        if (f[0] > NOW) expect(f[0], `${where} ${e.id}`).toBeGreaterThanOrEqual(-10);
      }
      // The scenes lie end to end and the track is as long as they are.
      let at = 0;
      for (const sc of s.scenes) {
        expect(sc.at, where).toBe(at);
        at += sc.len;
      }
      expect(s.len, where).toBeGreaterThanOrEqual(at - 1);
    }
  });

  it("shows a phone one card at a time, and a wide screen all of them", () => {
    const cards = ids.find((id) => typeOf(id) === "cards" && film[id].on !== false);
    if (!cards) return;
    const plan = filmPlan(t.content, t.name)!;
    const n = plan.scenes.find((s) => s.id === cards)!.items.length;
    const wide = buildPlan(plan, SHAPES[0], true).els.filter((e) => e.id.startsWith(`${cards}-i`));
    expect(wide.length).toBe(n);
  });
});

describe("a story on another business's template (the journey)", () => {
  it("keeps no numbers, prices, people, quotes or pictures that belong to the template's own business", () => {
    const t = templateById("ironhouse")!;
    const plan = { ...localPlan("a bakery called Honey and Rye in Lahore"), template: "ironhouse" };
    expect(t.business).not.toContain(plan.business);
    const c = buildContent(t, plan);
    for (const id of ["stats-gym", "gallery-programs", "plans-membership", "people-coaches", "voices"]) expect(c.film[id].on, id).toBe(false);
    // What stays tells the new business's own story, with its own contact line.
    expect(c.film["facts-timetable"].on).toBe(true);
    const visit = c.film["visit-find"];
    expect(visit.items.map((i: { value: string }) => i.value).join(" ")).toContain(emailFor("Honey and Rye"));
    expect(JSON.stringify(c.film)).not.toMatch(/train@ironhouse|555|ironhouse\.gym/i);
    expect(JSON.stringify(c.film)).toContain(`mailto:${emailFor("Honey and Rye")}`);
    // The story is the new business's, so no scene still says what a gym is.
    const slots = slotsOf(t, c).filter((s) => s.key.startsWith("film."));
    expect(slots.length).toBeGreaterThan(5);
  });

  it("writes the scenes' words by rules, about the business", () => {
    const t = templateById("ironhouse")!;
    const plan = { ...localPlan("a bakery called Honey and Rye in Lahore"), template: "ironhouse" };
    const texts = localTexts(t, plan);
    expect(texts["film.hero.title"]).toBeTruthy();
    expect(texts["film.steps-course.title"] ?? texts["film.facts-timetable.title"]).toMatch(/Honey and Rye/);
    expect(texts["film.facts-timetable.items.0.label"]).toBeTruthy();
    expect(Object.values(texts).join(" ")).not.toMatch(/Iron Strength|Fight Club/);
  });

  it("leaves a story made for this business as it is, with its own contact addresses swapped for the new one", () => {
    const t = templateById("ironhouse")!;
    const plan = { ...localPlan("a gym called Forge in Austin"), template: "ironhouse" };
    if (!t.business.includes(plan.business)) return;
    const c = buildContent(t, plan);
    expect(c.film["stats-gym"].on).toBe(true);
    expect(JSON.stringify(c.film)).not.toMatch(/train@ironhouse/i);
  });
});

describe("colour scenes in the journey", () => {
  const p = paletteFromPixels(new Uint8ClampedArray(Array.from({ length: 4000 }, (_, i) => [226, 112, 44, 255][i % 4])))!;
  const d = designOptions(p, ["playful"])[0];
  const lithos = templateById("lithos")!;

  it("stay where the template's own figure stays", () => {
    const own = { asset: lithos.content.character.src, preview: lithos.content.character.poster, name: "Rocks", category: "nature" };
    const c = composeContent(lithos.content, lithos.roles, d, own);
    expect(c.film["paint-strata"].on).toBe(true);
  });

  it("go when a person or an animal takes the figure's place, and stay for a car", () => {
    const robot = { asset: "/assets/3d/character/character-robot-001.glb", preview: "/x.webp", name: "Robot", category: "character" };
    expect(composeContent(lithos.content, lithos.roles, d, robot).film["paint-strata"].on).toBe(false);
    const car = { asset: "/assets/3d/vehicle/vehicle-hypercar-black-001.glb", preview: "/x.webp", name: "Car", category: "vehicle" };
    expect(composeContent(lithos.content, lithos.roles, d, car).film["paint-strata"].on).toBe(true);
  });
});
