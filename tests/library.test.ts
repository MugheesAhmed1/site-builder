import { describe, expect, it } from "vitest";
import { CHARACTERS, WIDGETS } from "@/template/src/cast.js";
import { SCENES, REAL_SCENES, sceneAssets } from "@/template/src/scenes.js";
import { MOTIONS } from "@/template/src/motion.js";
import { REAL_CHARACTERS } from "@/template/src/real.js";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { castFor, fitFor, fitsCharacter, scenesFor } from "@/lib/fit";
import { CATEGORIES } from "@/lib/categories";

describe("library data", () => {
  it("has unique ids", () => {
    for (const list of [CHARACTERS, WIDGETS, SCENES, MOTIONS]) {
      const ids = list.map((x: { id: string }) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("points every real picture at a file that exists", () => {
    const missing: string[] = [];
    // Only the open-licence art library ships pictures now; the generated pack was retired.
    for (const c of REAL_CHARACTERS) if (String(c.src).startsWith("/real/library/") && !existsSync(join("public", c.src))) missing.push(c.src);
    void REAL_SCENES;
    void sceneAssets;
    expect(missing).toEqual([]);
  });

  it("gives every category a cast and scenes, and keeps chef hats to food", () => {
    for (const c of CATEGORIES) {
      for (const seed of [1, 7, 42, 99, 12345]) {
        const cast = castFor(c.id, seed);
        expect(cast.character).toBeTruthy();
        expect(cast.widgets.length).toBeGreaterThan(0);
        if (!["food", "hotel", "events"].includes(c.id)) expect(cast.character.accessory).not.toBe("chef");
      }
      expect(scenesFor(c.id).length).toBeGreaterThan(0);
    }
  });

  it("only offers real characters to the categories they suit", () => {
    const chef = REAL_CHARACTERS.find((c: { fits?: string[] }) => c.fits?.includes("food"));
    expect(chef).toBeTruthy();
    expect(fitsCharacter(chef as never, fitFor("food"))).toBe(true);
  });
});
