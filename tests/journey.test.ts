import { describe, expect, it } from "vitest";
import { cleanMask, hasCutout, maskFromAlpha, maskShare, reliefMesh, subjectMask, type PixelImage } from "@/lib/character/relief";
import { MAX_PARTS, normalizeSpec, SAMPLE_SPEC, specBounds } from "@/lib/character/sculpt";
import { answer, MAX_QUESTIONS, nameGiven, normalizeBrief, ruleStep, startBrief, summary, type Brief, type ChatTurn } from "@/lib/journey/brief";

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

  it("keeps a character chosen on the home page and does not ask for one", () => {
    const b: Brief = { ...startBrief("A fantasy game studio"), star: "character-dragon-001", character: "the baby dragon" };
    const fields: string[] = [];
    const turns: ChatTurn[] = [{ role: "me", text: b.idea }];
    let brief: Brief = b;
    let step = ruleStep(brief, turns);
    while (!step.done) {
      fields.push(step.field!);
      turns.push({ role: "ai", text: step.reply, chips: step.chips, field: step.field, multi: step.multi });
      turns.push({ role: "me", text: step.chips[0] });
      brief = answer(step.brief, step.field, step.chips[0]);
      step = ruleStep(brief, turns);
    }
    expect(fields).not.toContain("character");
    expect(step.reply).toMatch(/starring the baby dragon\. Your character is ready below/);
    // The AI's own idea of a character never replaces it; the star survives the server's round trip.
    expect(normalizeBrief({ character: "a friendly robot" }, b).character).toBe("the baby dragon");
    expect(normalizeBrief({ ...b }, startBrief(b.idea)).star).toBe("character-dragon-001");
    expect(normalizeBrief({ star: "<script>" }, startBrief(b.idea)).star).toBeUndefined();
    // Naming another character in the chat after all: theirs wins.
    const changed = answer(b, "character", "A knight");
    expect(changed.character).toBe("A knight");
    expect(changed.star).toBeUndefined();
  });

  it("asks for the name unless the line gave one", () => {
    const first = (idea: string) => ruleStep(startBrief(idea), [{ role: "me", text: idea }]).field;
    expect(first("A fantasy game studio")).toBe("name");
    expect(first("A burger joint in Lahore called Smash")).not.toBe("name");
  });

  it("words the name question for where it comes in the chat", () => {
    expect(nameGiven(startBrief("A burger joint in Lahore called Smash"))).toBe(true);
    expect(nameGiven(startBrief("A fantasy game studio"))).toBe(false);
    const later: ChatTurn[] = [
      { role: "ai", text: "How should it feel?", field: "tone" },
      { role: "me", text: "Playful" },
    ];
    const b = startBrief("A fantasy game studio");
    expect(ruleStep(b, []).reply).toBe("Great idea. What is it called?");
    const mid = ruleStep({ ...b, tone: "Playful" }, later);
    expect(mid.field).toBe("name");
    expect(mid.reply).not.toMatch(/great idea/i);
    expect(mid.reply).toMatch(/And what is it called\?$/);
    const p = startBrief("A portfolio for a 3D motion designer");
    expect(ruleStep(p, []).reply).toMatch(/^Let's start with you\./);
    expect(ruleStep({ ...p, tone: "Playful" }, later).reply).not.toMatch(/let's start/i);
  });
});

describe("a saved site comes back whole", () => {
  it("keeps every library section the person added, with its own settings", async () => {
    const { TEMPLATES, loadContent } = await import("@/lib/templates");
    const store = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    try {
      const t = TEMPLATES.find((x) => x.id === "orbit") || TEMPLATES[0];
      const extras = [
        { block: "pricing-plans", props: { heading: "Plans" } },
        { block: "count-up-stats", props: { heading: "Numbers", items: [{ value: 9 }] } },
      ];
      store.set(`xp-template:v2:${t.id}`, JSON.stringify({ ...t.content, extras: [...extras, null, { block: 7 }] }));
      const c = loadContent(t);
      expect(c.extras).toEqual(extras);
      expect(c.brand).toEqual(t.content.brand);
    } finally {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  });
});

describe("words by rules, in the right voice", () => {
  it("reads the role a portfolio is for", async () => {
    const { roleOf, article, portfolioBusiness } = await import("@/lib/voice");
    expect(roleOf("Portfolio for a 3D motion designer called Sara Khan")).toBe("3D motion designer");
    expect(roleOf("My personal portfolio as a UX designer")).toBe("UX designer");
    expect(roleOf("Personal website for a frontend developer in Lahore")).toBe("frontend developer");
    expect(roleOf("3D artist portfolio")).toBe("3D artist");
    expect(roleOf("Sara's photography portfolio")).toBe("photographer");
    expect(roleOf("portfolio")).toBe("");
    expect(article("UX designer")).toBe("a");
    expect(article("illustrator")).toBe("an");
    expect(article("3D artist")).toBe("a");
    expect(article("SEO expert")).toBe("an");
    expect(portfolioBusiness("3D motion designer")).toBe("photo");
    expect(portfolioBusiness("frontend developer")).toBe("consulting");
    expect(portfolioBusiness("YouTuber")).toBe("creator");
  });

  it("asks a portfolio for the person's name instead of guessing one", () => {
    const b = startBrief("Portfolio for a 3D motion designer");
    expect(b.kind).toBe("portfolio");
    expect(b.name).toBe("");
    expect(b.what).toBe("3D motion designer");
    expect(b.cta).toBe("Work with me");
    expect(ruleStep(b, []).field).toBe("name");
    expect(startBrief("Portfolio for a 3D motion designer called Sara Khan").name).toBe("Sara Khan");
  });

  it("writes a portfolio in the first person and a business in its own words", async () => {
    const { planFromBrief, rulesTexts } = await import("@/lib/journey/plan");
    const { templateById } = await import("@/lib/templates");
    const orbit = templateById("orbit")!;
    const d = { id: "x", name: "x", note: "", accent: "#7f5d4a", accent2: "#c49a7a", tintHue: 30, tint: 0.2, mode: "dark", gradient: { style: "glow", angle: 160, light: ["#fff", "#eee", "#ddd"], dark: ["#111", "#222", "#333"] }, fonts: { pair: "x", display: "Fredoka", body: "Nunito" }, radius: "soft", motion: "calm" } as never;
    const sara = { ...startBrief("Portfolio for a 3D motion designer called Sara Khan"), tone: "Playful" };
    const words = rulesTexts(orbit, planFromBrief(sara, orbit, d));
    expect(words["hero.title"]).toBe("Sara Khan, 3D motion designer.");
    expect(words["hero.text"]).toMatch(/^I'm a 3D motion designer\./);
    expect(words["about.title"]).toBe("Hi, I'm Sara");
    expect(words["nav.links.0.label"]).toBe("Work");
    expect(Object.values(words).join(" ")).not.toMatch(/videos every week|small studio|\bwe\b/i);

    const crumb = startBrief("A cosy bakery in Lahore called Crumb");
    const w2 = rulesTexts(orbit, planFromBrief(crumb, orbit, d));
    expect(w2["features.kicker"]).toBe("How it works");
    expect(w2["about.text"]).toMatch(/^Crumb is a /);
    expect(w2["contact.title"]).toBe("Visit or write to Crumb");
    expect(w2["hero.title"]).toMatch(/^[A-Z]/);
    expect(w2["hero.tags"]).not.toMatch(/Design|Story/);
    expect(words["hero.tags"]).toBe("3D animation, Motion design, Product visuals");
  });
});

describe("one person's voice", () => {
  it("turns a company's line into the first person", async () => {
    const { firstPerson } = await import("@/lib/voice");
    expect(firstPerson("Tell us a little about what you need and we will get back to you within a day.")).toBe("Tell me a little about what you need and I will get back to you within a day.");
    expect(firstPerson("We're a small team. Our work is ours. Talk to us.")).toBe("I'm a small team. My work is mine. Talk to me.");
    expect(firstPerson("Made in the US")).toBe("Made in the US");
  });
});
