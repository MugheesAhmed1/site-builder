import { describe, expect, it } from "vitest";
import { freeBox } from "@/library/character/film";
import { characterFrom } from "@/lib/character/apply";
import { characterDefaults } from "@/lib/template-schema.mjs";

// The film (library/character/film.ts, docs/FILM.md): the parts that do not need a browser.
// The camera moves themselves are checked in a real browser (see docs/FILM.md).

const grid = (rows: number, cols: number, taken: (r: number, c: number) => boolean) =>
  Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => taken(r, c)));

describe("finding room for the model", () => {
  it("takes the empty side next to words on the left", () => {
    // Words fill the left half of a 24 x 16 screen.
    const b = freeBox(grid(16, 24, (_r, c) => c < 12), 2, 200, 200, 1440, 900);
    expect(b).not.toBeNull();
    expect(b!.x).toBeGreaterThanOrEqual(720);
    expect(b!.w).toBeGreaterThan(500);
  });

  it("finds the gap between two columns of cards", () => {
    const b = freeBox(grid(16, 24, (_r, c) => c < 7 || c >= 17), 0.6, 200, 200, 1440, 900);
    expect(b).not.toBeNull();
    expect(b!.x).toBeGreaterThanOrEqual(7 * 60);
    expect(b!.x + b!.w).toBeLessThanOrEqual(17 * 60);
  });

  it("gives up when the screen is full, so the model steps aside", () => {
    expect(freeBox(grid(16, 24, () => true), 1, 200, 200, 1440, 900)).toBeNull();
    // Only a thin strip is free: too small for the model.
    expect(freeBox(grid(16, 24, (_r, c) => c !== 5), 1, 200, 200, 1440, 900)).toBeNull();
  });

  it("prefers a box the model's shape fills", () => {
    // A wide strip at the bottom and a tall strip at the right are both free.
    const taken = grid(16, 24, (r, c) => r < 10 && c < 18);
    const wide = freeBox(taken, 2.4, 200, 150, 1440, 900)!;
    const tall = freeBox(taken, 0.5, 200, 150, 1440, 900)!;
    expect(wide.w / wide.h).toBeGreaterThan(tall.w / tall.h);
  });
});

describe("the film is the default", () => {
  it("new characters travel with the page, with the studio set on", () => {
    const d = characterDefaults({}, "dark") as { character: Record<string, unknown> };
    expect(d.character.scroll).toBe("film");
    expect(d.character.studio).toBe(true);
    expect(d.character.wordmark).toBe("");
  });

  it("picking a model starts the film but keeps a scroll motion the person chose", () => {
    const m = { asset: "/assets/3d/vehicle/x.glb", preview: "/x.webp", name: "Car", category: "vehicle" };
    expect(characterFrom(m, {}).scroll).toBe("film");
    expect(characterFrom(m, { scroll: "turn" }).scroll).toBe("film");
    expect(characterFrom(m, { scroll: "zoom" }).scroll).toBe("zoom");
    expect(characterFrom(m, { scroll: "none" }).scroll).toBe("none");
    expect(characterFrom(m, { studio: false }).studio).toBe(false);
  });
});
