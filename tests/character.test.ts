import { describe, expect, it } from "vitest";
import { contrast, ensureContrast, luminance } from "@/lib/character/color";
import { paletteFromPixels, paletteFromWords } from "@/lib/character/palette";
import { designOptions, readable, tokens } from "@/lib/character/design";
import { applyDesign, characterFrom, composeContent, guessRoles, modeFor, rolesOf, stageFor, stageStops } from "@/lib/character/apply";
import { characterDefaults, defaultStops, schemaProblems, withCharacter } from "@/lib/template-schema.mjs";
import { TEMPLATES } from "@/lib/templates";
import { ASSETS } from "@/packages/asset-library";

const HEX = /^#[0-9a-f]{6}$/i;

/** A picture's pixels: 70% one colour, 30% another, some transparent. */
function pixels(a: [number, number, number], b: [number, number, number], n = 4000) {
  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const c = i % 10 < 7 ? a : b;
    const clear = i % 13 === 0;
    out.set([...c, clear ? 0 : 255], i * 4);
  }
  return out;
}

describe("character colours", () => {
  it("lifts a colour until it reads", () => {
    const fixed = ensureContrast("#777777", "#808080", 4.5);
    expect(contrast(fixed, "#808080")).toBeGreaterThanOrEqual(4.5);
  });

  it("finds a character's colours, dominant first, ignoring clear pixels", () => {
    const p = paletteFromPixels(pixels([226, 112, 44], [40, 70, 160]))!;
    expect(p).toBeTruthy();
    expect(p.dominant).toMatch(HEX);
    // the orange covers most of the picture
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(p.dominant.slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(b);
    expect(p.colors.length).toBeGreaterThanOrEqual(2);
  });

  it("is the same every time for the same picture", () => {
    const a = paletteFromPixels(pixels([20, 160, 120], [240, 200, 60]));
    const b = paletteFromPixels(pixels([20, 160, 120], [240, 200, 60]));
    expect(a).toEqual(b);
  });

  it("offers five design systems whose words read in both modes", () => {
    for (const p of [paletteFromPixels(pixels([226, 112, 44], [40, 70, 160]))!, paletteFromPixels(pixels([240, 240, 240], [30, 30, 30]))!, paletteFromWords(["pink", "dragon", "playful"])]) {
      const opts = designOptions(p, ["playful", "cute"]);
      expect(opts).toHaveLength(5);
      // Choosing a direction is choosing a font style too.
      expect(new Set(opts.map((d) => d.fonts.display)).size).toBeGreaterThanOrEqual(4);
      for (const d of opts) {
        for (const mode of ["light", "dark"] as const) {
          const r = readable(tokens(d, mode));
          expect(r.problems, `${d.id} ${mode}`).toEqual([]);
        }
        expect(luminance(d.gradient.dark[0])).toBeLessThan(0.1);
        expect(luminance(d.gradient.light[0])).toBeGreaterThan(0.6);
      }
    }
  });
});

describe("design into templates", () => {
  const p = paletteFromPixels(pixels([226, 112, 44], [40, 70, 160]))!;
  const options = designOptions(p, ["playful"]);

  it("every template gives every colour and font a part", () => {
    for (const t of TEMPLATES) {
      expect(t.roles, t.id).toBeTruthy();
      for (const k of Object.keys(t.content.theme?.colors || {})) expect(t.roles.colors[k], `${t.id} ${k}`).toBeTruthy();
      for (const k of Object.keys(t.content.theme?.fonts || {})) expect(t.roles.fonts?.[k], `${t.id} font ${k}`).toBeTruthy();
    }
  });

  it("pours each design system into each template with readable words and a stage of the right tone", () => {
    for (const t of TEMPLATES) {
      for (const d of options) {
        const c = applyDesign(t.content, t.roles, d);
        expect(schemaProblems(t.schema, c), `${t.id} ${d.id}`).toEqual([]);
        for (const v of Object.values(c.theme.colors)) expect(v).toMatch(HEX);
        const role = (r: string) => Object.entries(t.roles.colors).find(([, x]) => x === r)?.[0];
        const ink = role("ink");
        const page = role("page");
        if (ink && page) expect(contrast(c.theme.colors[ink], c.theme.colors[page]), `${t.id} ${d.id}`).toBeGreaterThanOrEqual(4.5);
        // the stage keeps the template's tone, or follows the mode where the template shows both
        const stage = luminance(c.design.stops[0]);
        if (stageFor(d, t.roles) === "dark") expect(stage, `${t.id} ${d.id}`).toBeLessThan(0.179);
        else expect(stage, `${t.id} ${d.id}`).toBeGreaterThan(0.179);
        expect(c.design.stops).toEqual(stageStops(d, t.roles));
        // the template keeps its own mode unless it can show both
        expect(modeFor(d, t.roles)).toBe((t.roles.modes || [t.roles.mode]).includes(d.mode === "auto" ? t.roles.mode : d.mode) ? (d.mode === "auto" ? t.roles.mode : d.mode) : t.roles.mode);
      }
    }
  });

  it("takes the design's typefaces where the template has a slot for them", () => {
    const t = TEMPLATES.find((x) => x.id === "tidewater")!;
    const d = options[0];
    const c = applyDesign(t.content, t.roles, d);
    expect(c.theme.fonts.display).toBe(d.fonts.display);
    expect(c.theme.fonts.body).toBe(d.fonts.body);
    const distill = TEMPLATES.find((x) => x.id === "distill")!;
    const c2 = applyDesign(distill.content, distill.roles, d);
    expect(c2.theme.fonts.mono).toBe(distill.content.theme.fonts.mono);
  });

  it("puts a library model in with its picture, paintable parts and credit", () => {
    const kid = ASSETS.find((a) => a.id === "character-kid-001")!;
    const ch = characterFrom({ asset: kid.asset, preview: kid.preview, name: kid.name, display: kid.display as { tint?: string }, category: kid.category }, characterDefaults().character);
    expect(ch.src).toBe(kid.asset);
    expect(ch.poster).toBe(kid.preview);
    expect(ch.parts).toBe("clay");
    const t = TEMPLATES.find((x) => x.id === "cornerstone")!;
    const c = composeContent(t.content, t.roles, options[1], { asset: kid.asset, preview: kid.preview, name: kid.name, credit: "Kid by someone (CC BY 4.0)" });
    expect(c.character.src).toBe(kid.asset);
    expect(c.character.credit).toMatch(/CC BY/);
    expect(c.character.paint).toBe(options[1].accent);
    expect(schemaProblems(t.schema, c)).toEqual([]);
  });

  it("guesses parts for a template that has no roles", () => {
    const r = guessRoles({ colors: { bg: "#0b0b0c", text: "#ffffff", accent: "#ff5500", accentSoft: "#331100", border: "#222222" }, fonts: { heading: "Anton", body: "Inter", mono: "JetBrains Mono" } });
    expect(r.mode).toBe("dark");
    expect(r.colors).toEqual({ bg: "page", text: "ink", accent: "accent", accentSoft: "soft", border: "line" });
    expect(r.fonts).toEqual({ heading: "display", body: "body", mono: "keep" });
    expect(rolesOf({ content: { theme: { colors: { page: "#ffffff" } } } }).mode).toBe("light");
  });
});

describe("the character in a template's content", () => {
  it("starts a dark-stage template on a dark gradient even when its page is light", () => {
    const tw = TEMPLATES.find((x) => x.id === "tidewater")!;
    expect(luminance(tw.content.design.stops[0])).toBeLessThan(0.179);
    expect(luminance(defaultStops(tw.content.theme.colors, "light")[0])).toBeGreaterThan(0.179);
  });

  it("adds the credit line and the picture's tone to every template", () => {
    const w = withCharacter([{ group: "Business", fields: [{ path: "brand.name", label: "Name", type: "text" }] }], { brand: { name: "A" } });
    const paths = w.schema.flatMap((g: { fields: { path: string }[] }) => g.fields.map((f) => f.path));
    expect(paths).toContain("character.credit");
    expect(paths).toContain("design.imageTone");
    expect(schemaProblems(w.schema, w.content)).toEqual([]);
  });
});
