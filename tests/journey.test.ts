import { describe, expect, it } from "vitest";
import { cleanMask, hasCutout, maskFromAlpha, maskShare, reliefMesh, subjectMask, type PixelImage } from "@/lib/character/relief";
import { MAX_PARTS, normalizeSpec, SAMPLE_SPEC, specBounds } from "@/lib/character/sculpt";
import { answer, MAX_QUESTIONS, normalizeBrief, ruleStep, startBrief, summary, type ChatTurn } from "@/lib/journey/brief";

/** A w x h picture: `paint(x, y)` gives each pixel's RGBA. */
function picture(w: number, h: number, paint: (x: number, y: number) => [number, number, number, number?]): PixelImage {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b, a = 255] = paint(x, y);
    data.set([r, g, b, a], (y * w + x) * 4);
  }
  return { width: w, height: h, data };
}

const inDisc = (x: number, y: number, cx: number, cy: number, r: number) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

/** How much of the disc the mask covers, and how much of the mask lies outside the disc. */
function fit(mask: Uint8Array, w: number, h: number, cx: number, cy: number, r: number) {
  let disc = 0, hit = 0, spill = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = inDisc(x, y, cx, cy, r);
    disc += d ? 1 : 0;
    if (mask[y * w + x]) d ? hit++ : spill++;
  }
  return { covered: hit / disc, spill: spill / Math.max(1, hit + spill) };
}

describe("photo cut-out by colour and edges", () => {
  it("finds a red ball on a white background", () => {
    const img = picture(96, 96, (x, y) => (inDisc(x, y, 48, 52, 26) ? [214, 48, 40] : [248, 248, 246]));
    const m = subjectMask(img);
    const f = fit(m, 96, 96, 48, 52, 26);
    expect(f.covered).toBeGreaterThan(0.85);
    expect(f.spill).toBeLessThan(0.05);
  });

  it("finds a pale cup on a pale, shaded background by its outline", () => {
    // a soft vertical gradient behind, a slightly darker disc with a darker rim
    const img = picture(120, 120, (x, y) => {
      const bg = 236 - y * 0.15;
      if (inDisc(x, y, 60, 66, 30)) return inDisc(x, y, 60, 66, 27) ? [214, 206, 188] : [150, 140, 120];
      return [bg, bg, bg - 4];
    });
    const f = fit(subjectMask(img), 120, 120, 60, 66, 30);
    expect(f.covered).toBeGreaterThan(0.8);
    expect(f.spill).toBeLessThan(0.08);
  });

  it("keeps a picture's own transparency", () => {
    const img = picture(64, 64, (x, y) => (inDisc(x, y, 32, 32, 18) ? [20, 120, 220, 255] : [0, 0, 0, 0]));
    expect(hasCutout(img)).toBe(true);
    const f = fit(subjectMask(img), 64, 64, 32, 32, 18);
    expect(f.covered).toBeGreaterThan(0.85);
    expect(f.spill).toBe(0);
  });

  it("turns a model's certainty into a clean mask: one shape, holes filled", () => {
    const w = 64, h = 64;
    const alpha = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (inDisc(x, y, 30, 34, 20) && !inDisc(x, y, 30, 34, 5)) alpha[i] = 230; // a ring: its hole gets filled
      if (inDisc(x, y, 58, 6, 3)) alpha[i] = 250; // a speck far away: dropped
    }
    const m = maskFromAlpha(alpha, w, h);
    expect(m[34 * w + 30]).toBe(1);
    expect(m[6 * w + 58]).toBe(0);
    expect(maskShare(m)).toBeGreaterThan(0.25);
    expect(maskShare(cleanMask(new Uint8Array(w * h), w, h))).toBe(0);
  });
});

describe("relief mesh", () => {
  const img = picture(80, 100, (x, y) => (inDisc(x, y, 40, 50, 30) ? [240, 160, 30] : [255, 255, 255]));

  for (const style of ["puffy", "standee"] as const) {
    it(`builds a closed ${style} solid that stands on the floor`, () => {
      const mesh = reliefMesh(img, { style, grid: 60 })!;
      expect(mesh).not.toBeNull();
      expect(mesh.indices.length % 3).toBe(0);
      expect(mesh.groups.map((g) => g.material)).toContain(0);
      expect(mesh.groups.reduce((n, g) => n + g.count, 0)).toBe(mesh.indices.length);
      let minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (let i = 0; i < mesh.positions.length; i += 3) {
        minY = Math.min(minY, mesh.positions[i + 1]);
        maxY = Math.max(maxY, mesh.positions[i + 1]);
        minZ = Math.min(minZ, mesh.positions[i + 2]);
        maxZ = Math.max(maxZ, mesh.positions[i + 2]);
      }
      expect(minY).toBeGreaterThanOrEqual(-0.01);
      expect(maxY).toBeGreaterThan(1.5);
      expect(maxZ - minZ).toBeGreaterThan(0.05); // it has depth
      expect(mesh.coverage).toBeGreaterThan(0.2);
      expect(Math.max(...mesh.indices)).toBeLessThan(mesh.positions.length / 3);
    });
  }

  it("gives up on an empty picture instead of making a sliver", () => {
    expect(reliefMesh(picture(40, 40, () => [255, 255, 255]))).toBeNull();
  });
});

describe("sculpt specs (the img2threejs way)", () => {
  it("accepts the sample and keeps it the right size", () => {
    const s = normalizeSpec(SAMPLE_SPEC)!;
    expect(s.parts.length).toBe(SAMPLE_SPEC.parts.length);
    const b = specBounds(s);
    expect(b.max[1] - b.min[1]).toBeGreaterThan(0);
  });

  it("repairs what a model might send: bad shapes, colours, loops and too many parts", () => {
    const parts = Array.from({ length: MAX_PARTS + 20 }, (_, i) => ({
      id: `p${i}`,
      parent: i === 0 ? "p1" : "p0", // p0 and p1 point at each other
      shape: i % 7 === 0 ? "blob" : "sphere",
      size: [1, 1, 1],
      position: [0, i * 0.1, 0],
      material: "skin",
    }));
    const s = normalizeSpec({ subject: "x", kind: "creature", materials: { skin: { color: "not a colour" } }, parts })!;
    expect(s).not.toBeNull();
    expect(s.parts.length).toBeLessThanOrEqual(MAX_PARTS);
    for (const p of s.parts) {
      expect(["sphere", "box", "capsule", "cylinder", "cone", "torus", "lathe"]).toContain(p.shape);
    }
    for (const m of Object.values(s.materials)) expect(m.color).toMatch(/^#[0-9a-f]{6}$/i);
    // no part is its own ancestor
    const byId = new Map(s.parts.map((p) => [p.id, p]));
    for (const p of s.parts) {
      const seen = new Set<string>();
      let q = p.parent ? byId.get(p.parent) : undefined;
      while (q) {
        expect(seen.has(q.id)).toBe(false);
        seen.add(q.id);
        q = q.parent ? byId.get(q.parent) : undefined;
      }
    }
  });

  it("refuses nonsense", () => {
    expect(normalizeSpec(null)).toBeNull();
    expect(normalizeSpec({ parts: [] })).toBeNull();
  });
});

describe("the interview, by the rules", () => {
  it("reads the line, asks one thing at a time and finishes", () => {
    let brief = startBrief("A cosy bakery in Lahore called Crumb & Co");
    expect(brief.business).toBe("food");
    const turns: ChatTurn[] = [{ role: "me", text: brief.idea }];
    let step = ruleStep(brief, turns);
    let asked = 0;
    while (!step.done) {
      asked++;
      expect(step.reply.length).toBeGreaterThan(5);
      expect(step.chips.length).toBeGreaterThan(0);
      turns.push({ role: "ai", text: step.reply, chips: step.chips, field: step.field, multi: step.multi });
      const pick = step.multi ? step.chips.slice(0, 3).join(", ") : step.chips[0];
      turns.push({ role: "me", text: pick });
      brief = answer(step.brief, step.field, pick);
      step = ruleStep(brief, turns);
      expect(asked).toBeLessThanOrEqual(MAX_QUESTIONS);
    }
    expect(step.brief.sections.length).toBeGreaterThan(0);
    expect(step.brief.character).not.toBe("");
    expect(step.reply).toMatch(/plan/i);
  });

  it("keeps a portfolio a portfolio and reads 'from the character' as no colour wish", () => {
    const b = startBrief("Portfolio for a product designer, Sara Khan");
    expect(b.kind).toBe("portfolio");
    expect(answer({ ...b, colors: "red" }, "colors", "From the character").colors).toBe("");
    expect(answer(b, "email", "not an email").email).toBe("");
    expect(summary(b)).toMatch(/portfolio/);
  });

  it("keeps the brief whole whatever the model returns", () => {
    const base = startBrief("A dentist in Karachi");
    const b = normalizeBrief({ business: "spaceships", name: "   ", sections: "Prices, Team", email: "x" }, base);
    expect(b.business).toBe(base.business);
    expect(b.name).toBe(base.name);
    expect(b.sections).toEqual(["Prices", "Team"]);
    expect(b.email).toBe("");
    expect(normalizeBrief("garbage", base)).toEqual(base);
  });
});
