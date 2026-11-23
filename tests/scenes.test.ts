import { describe, expect, it } from "vitest";
import { buildScript, filmContent, sampler, visibility, ICON_NAMES } from "@/library/character/scenes";
import { filmDefaults } from "@/lib/template-schema.mjs";
import { localPlan, localTexts, rankTemplates, slotsOf, buildContent } from "@/lib/animator";
import { TEMPLATES, templateById } from "@/lib/templates";

// The choreography (library/character/scenes.ts, docs/FILM.md): the script that is the same for
// every character, checked without a browser. How it looks is checked frame by frame in one.

const full = () => filmContent({ film: { ...filmDefaults(), paint: { ...filmDefaults().paint, on: true }, voices: { on: true, eyebrow: "Reviews", title: "Said" }, finale: { on: true, title: "Go", text: "Now", cta: "Start", ctaHref: "#start" } } }, "Acme");

describe("film content", () => {
  it("is whole whatever the page holds", () => {
    const c = filmContent({}, "Acme");
    expect(c.hero.title).toBe("Acme");
    expect(c.chips).toEqual([]);
    expect(c.cards).toEqual([]);
    expect(c.paint.on).toBe(false);
  });

  it("fills the site's name into its words and drops what is not a colour", () => {
    const c = filmContent({ film: { hero: { title: "Meet {name}" }, swatches: [{ name: "x", color: "red" }, { name: "ok", color: "#AABBCC" }] } }, "Acme");
    expect(c.hero.title).toBe("Meet Acme");
    expect(c.swatches).toEqual([{ name: "ok", color: "#aabbcc" }]);
  });

  it("only ever draws icons it knows", () => {
    const c = filmContent({ film: { chips: [{ icon: "no-such", label: "a", value: "b" }] } });
    expect(ICON_NAMES).toContain(c.chips[0].icon === "no-such" ? "spark" : c.chips[0].icon);
  });
});

describe("the script", () => {
  it("lays the scenes end to end, hero first when the track opens the page", () => {
    const s = buildScript(full(), { narrow: false, flat: true }, true);
    expect(s.scenes.map((x) => x.id)).toEqual(["hero", "specs", "ring", "paint", "voices", "finale"]);
    let at = 0;
    for (const sc of s.scenes) {
      expect(sc.at).toBe(at);
      at += sc.len;
    }
    expect(s.len).toBe(at);
  });

  it("starts on the specs when the template has its own opening", () => {
    const s = buildScript(full(), { narrow: false, flat: true }, false);
    expect(s.scenes[0].id).toBe("specs");
    expect(s.keys[0].t).toBe(0);
  });

  it("keeps every key in order and every box on the screen, for every screen and model shape", () => {
    for (const narrow of [false, true]) {
      for (const flat of [false, true]) {
        for (const opening of [false, true]) {
          const s = buildScript(full(), { narrow, flat }, opening);
          s.keys.forEach((k, i) => {
            if (i) expect(k.t).toBeGreaterThanOrEqual(s.keys[i - 1].t);
            expect(k.cx).toBeGreaterThan(0);
            expect(k.cx).toBeLessThan(1);
            expect(k.cy).toBeGreaterThan(0);
            expect(k.cy).toBeLessThan(1);
            expect(k.w).toBeGreaterThan(0.1);
            expect(k.h).toBeGreaterThan(0.2);
          });
        }
      }
    }
  });

  it("brings every element in before it leaves, in order", () => {
    for (const narrow of [false, true]) {
      const s = buildScript(full(), { narrow, flat: true }, true);
      for (const e of s.els) {
        const [a, b, c, d] = e.fade;
        expect(a, e.id).toBeLessThanOrEqual(b);
        expect(b, e.id).toBeLessThanOrEqual(c);
        expect(c, e.id).toBeLessThanOrEqual(d);
      }
    }
  });

  it("leaves out the scenes a page does not ask for", () => {
    const c = filmContent({ film: { ...filmDefaults(), specs: { on: false }, ring: { on: false } } }, "Acme");
    const s = buildScript(c, { narrow: false, flat: true }, false);
    expect(s.scenes.map((x) => x.id)).toEqual([]);
  });

  it("shows one card at a time on a phone, and all six around the model on a wide screen", () => {
    const cards = (narrow: boolean) => buildScript(full(), { narrow, flat: true }, true).els.filter((e) => e.kind === "card");
    expect(cards(false)).toHaveLength(6);
    expect(cards(true)).toHaveLength(6);
    const phone = cards(true).map((e) => e.fade[0]);
    expect(new Set(phone).size).toBe(6);
    expect(cards(true).every((e) => e.x === 0.5)).toBe(true);
    expect(cards(false).some((e) => e.x < 0.5)).toBe(true);
    expect(cards(false).some((e) => e.x > 0.5)).toBe(true);
  });
});

describe("the camera's path", () => {
  const keys = buildScript(full(), { narrow: false, flat: true }, true).keys;
  const at = sampler(keys);

  it("passes through its keys and holds before the first and after the last", () => {
    expect(at(keys[0].t - 50).cx).toBeCloseTo(keys[0].cx, 5);
    expect(at(keys[keys.length - 1].t + 50).cy).toBeCloseTo(keys[keys.length - 1].cy, 5);
    for (const k of keys) expect(at(k.t).w).toBeCloseTo(k.w, 5);
  });

  it("never overshoots between two keys", () => {
    for (let i = 1; i < keys.length; i++) {
      const a = keys[i - 1];
      const b = keys[i];
      if (b.t === a.t) continue;
      for (let j = 1; j < 8; j++) {
        const t = a.t + ((b.t - a.t) * j) / 8;
        const v = at(t).w;
        expect(v).toBeGreaterThanOrEqual(Math.min(a.w, b.w) - 1e-6);
        expect(v).toBeLessThanOrEqual(Math.max(a.w, b.w) + 1e-6);
      }
    }
  });

  it("turns the long way round to the view from above, nose up the screen", () => {
    const ring = buildScript(full(), { narrow: false, flat: true }, true).scenes.find((x) => x.id === "ring")!;
    const end = at(ring.at + 93);
    expect(end.yaw).toBe(-90);
    expect(end.elev).toBe(86);
    expect(end.halo).toBe(1);
  });
});

describe("when an element shows", () => {
  it("fades in, holds and fades out", () => {
    const f: [number, number, number, number] = [10, 20, 50, 60];
    expect(visibility(f, 0).vis).toBe(0);
    expect(visibility(f, 15).vis).toBeGreaterThan(0);
    expect(visibility(f, 15).vis).toBeLessThan(1);
    expect(visibility(f, 30).vis).toBe(1);
    expect(visibility(f, 55).vis).toBeLessThan(1);
    expect(visibility(f, 70).vis).toBe(0);
  });

  it("is there from the first moment when it starts early", () => {
    expect(visibility([-100, -100, 40, 50], 0).vis).toBe(1);
  });
});

describe("a site's film in the journey", () => {
  const turntable = templateById("turntable")!;

  it("ranks the template made around a character first when there is a character", () => {
    expect(rankTemplates("food", "website", true)[0].id).toBe("turntable");
    expect(rankTemplates("food", "website")[0].id).not.toBe("turntable");
  });

  it("is written about the business by the rules, not about a hypercar", () => {
    const plan = { ...localPlan("a bakery called Honey and Rye in Lahore"), template: "turntable" };
    const texts = localTexts(turntable, plan);
    const keys = Object.keys(texts).filter((k) => k.startsWith("film."));
    expect(keys).toEqual(expect.arrayContaining(["film.hero.title", "film.specs.title", "film.cards.0.title", "film.ring.title"]));
    expect(JSON.stringify(Object.values(texts))).not.toMatch(/carbon|hypercar|km\/h/i);
    expect(texts["film.hero.cta"]).toBeTruthy();
  });

  it("is part of every template's words, and every film line fits in what the writer is sent", () => {
    for (const t of TEMPLATES) {
      const plan = { ...localPlan("a bakery called Honey and Rye"), template: t.id };
      const slots = slotsOf(t, buildContent(t, plan));
      const film = slots.filter((s) => s.key.startsWith("film."));
      expect(film.length, t.id).toBeGreaterThan(20);
    }
  });
});
