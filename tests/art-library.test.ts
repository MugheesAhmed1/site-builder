import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ART, ART_CHARACTERS } from "../template/src/library-art.js";
import { CHARACTERS, FAMILIES } from "../template/src/cast.js";
import { realAssets } from "../lib/export";

const pub = (f: string) => join(process.cwd(), "public", f);

describe("free public art library", () => {
  it("has every picture on disk, with a licence and a credit entry", () => {
    expect(existsSync(pub("/real/library/LICENSES.txt"))).toBe(true);
    const credits = JSON.parse(readFileSync(pub("/real/library/CREDITS.json"), "utf8"));
    const credited = new Set(credits.map((c: { file: string }) => c.file));
    for (const src of Object.values(ART) as string[]) {
      expect(existsSync(pub(src)), src).toBe(true);
      expect(credited.has(src), src).toBe(true);
    }
    for (const c of credits) expect(["MIT", "Apache-2.0"]).toContain(c.licence);
  });

  it("offers every picture as a character in a known family", () => {
    const fams = new Set(FAMILIES.map((f) => f.id));
    const ids = new Set(CHARACTERS.map((c) => c.id));
    expect(ids.size).toBe(CHARACTERS.length);
    for (const c of ART_CHARACTERS) {
      expect(fams.has(c.family), c.id).toBe(true);
      expect(existsSync(pub(c.src as string)), c.id).toBe(true);
    }
  });

  it("puts the licence file into a download that uses a library picture", () => {
    const p = { design: { scene: null, cast: { character: ART_CHARACTERS[0] } }, content: null, kind: "website", category: "general" } as never;
    expect(realAssets(p)).toContain("/real/library/LICENSES.txt");
  });
});
