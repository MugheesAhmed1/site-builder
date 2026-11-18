import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { contentScript, countChanges, extractMedia, getPath, schemaProblems, setPath, type SchemaGroup } from "@/lib/template-schema.mjs";
import { TEMPLATES } from "@/lib/templates";
import { CATEGORIES } from "@/lib/categories";
import { cleanEntryName, detectKind, draftContent, pruneDependencies, readArchive } from "@/scripts/import-template.mjs";

const schema = [
  {
    group: "G",
    fields: [
      { path: "brand.name", label: "Name", type: "text" as const },
      { path: "theme.ink", label: "Ink", type: "color" as const },
      { path: "items", label: "Items", type: "list" as const, fields: [{ path: "title", label: "Title", type: "text" as const }, { path: "n", label: "N", type: "number" as const, min: 0, max: 9 }] },
    ],
  },
];
const content = { brand: { name: "Moss" }, theme: { ink: "#112233" }, items: [{ title: "A", n: 1 }] };

describe("template schema and content", () => {
  it("accepts a schema that covers every value", () => {
    expect(schemaProblems(schema, content)).toEqual([]);
  });

  it("flags values with no field, missing values and wrong types", () => {
    const errs = schemaProblems(schema, { ...content, extra: { word: "x" }, theme: { ink: "red" }, items: [{ title: "A", n: 12, more: 1 }] });
    expect(errs.join("\n")).toMatch(/extra\.word is in content\.json but has no field/);
    expect(errs.join("\n")).toMatch(/theme\.ink: color field needs a #rrggbb colour/);
    expect(errs.join("\n")).toMatch(/items\[0\]\.n: 12 is outside 0 to 9/);
    expect(errs.join("\n")).toMatch(/items\[0\]\.more has no field/);
    expect(schemaProblems(schema, { theme: { ink: "#000000" }, items: [] }).join("\n")).toMatch(/brand\.name is not in content\.json/);
  });

  it("sets and reads nested values without changing the original", () => {
    const next = setPath(content, "brand.name", "Fern");
    expect(getPath(next, "brand.name")).toBe("Fern");
    expect(content.brand.name).toBe("Moss");
  });

  it("writes a content script that cannot close its script tag", () => {
    const js = contentScript({ a: "</script><script>alert(1)</script>" });
    expect(js).not.toContain("</script>");
    const w: { __XP__?: { a: string } } = {};
    new Function("window", js)(w);
    expect(w.__XP__?.a).toBe("</script><script>alert(1)</script>");
  });

  it("moves uploads out into media files and reuses repeats", () => {
    const pic = "data:image/png;base64,iVBORw0KGgo=";
    const { content: c, files } = extractMedia({ a: pic, b: [pic, "https://x.test/p.png"], v: "data:video/mp4;base64,AAAA" });
    expect(c).toEqual({ a: "./media/upload-1.png", b: ["./media/upload-1.png", "https://x.test/p.png"], v: "./media/upload-2.mp4" });
    expect(files.map((f) => f.path)).toEqual(["media/upload-1.png", "media/upload-2.mp4"]);
  });

  it("counts changes", () => {
    expect(countChanges(content, content)).toBe(0);
    expect(countChanges(setPath(setPath(content, "brand.name", "X"), "theme.ink", "#000000"), content)).toBe(2);
  });
});

describe("importing a project zip", () => {
  it("refuses paths that leave the folder", () => {
    expect(() => cleanEntryName("../evil.js")).toThrow();
    expect(() => cleanEntryName("a/../../evil.js")).toThrow();
    expect(() => cleanEntryName("/etc/passwd")).toThrow();
    expect(cleanEntryName("src/App.tsx")).toBe("src/App.tsx");
  });

  it("drops secrets, dependencies and lockfiles, and unwraps one top folder", async () => {
    const zip = new JSZip();
    zip.file("proj/index.html", '<html><head><title>Proj</title></head><body><h1>Hello there</h1><script type="module" src="/src/main.tsx"></script></body></html>');
    zip.file("proj/.env", "GEMINI_API_KEY=secret");
    zip.file("proj/node_modules/x/index.js", "");
    zip.file("proj/bun.lock", "");
    zip.file("proj/src/main.tsx", 'import React from "react";');
    zip.file("proj/package.json", JSON.stringify({ dependencies: { react: "19", "@google/genai": "1" }, devDependencies: { vite: "6" } }));
    const files = await readArchive(await zip.generateAsync({ type: "nodebuffer" }));
    expect(Object.keys(files).sort()).toEqual(["index.html", "package.json", "src/main.tsx"]);
    expect(detectKind(files)).toBe("vite");
    expect(pruneDependencies(files).removed).toEqual(["@google/genai"]);
    const draft = draftContent(files, "Proj");
    expect(draft.content.brand.name).toBe("Proj");
    expect(draft.content.words).toEqual({ heading1: "Hello there" });
    expect(schemaProblems(draft.schema as SchemaGroup[], draft.content)).toEqual([]);
  });
});

describe("registered templates", () => {
  it("has every imported template", () => {
    expect(TEMPLATES.map((t) => t.id).sort()).toEqual(["distill", "fernhollow", "jack", "lithos", "milo", "mossline", "stride"]);
  });

  for (const t of TEMPLATES) {
    it(`${t.id}: every value has a field, and it is filed under real business types`, () => {
      const dir = join(process.cwd(), "templates", t.id);
      const c = JSON.parse(readFileSync(join(dir, "content.json"), "utf8"));
      expect(schemaProblems(t.schema, c)).toEqual([]);
      expect(t.content).toEqual(c);
      expect(t.business.length).toBeGreaterThan(0);
      for (const b of t.business) expect(CATEGORIES.some((x) => x.id === b), b).toBe(true);
      expect(t.sector).toBeTruthy();
      expect(t.licence.holder).toBeTruthy();
      expect(existsSync(join(dir, "source", ".env"))).toBe(false);
      expect(readFileSync(join(dir, "source", "index.html"), "utf8")).toContain('<script src="./xp-content.js"></script>');
      // Every template takes library blocks, and has a field to add them.
      expect(Array.isArray(c.extras)).toBe(true);
      expect(t.schema.some((g) => g.fields.some((f) => f.path === "extras" && f.type === "blocks"))).toBe(true);
    });
  }

  it("files Mossline as a product (climate data) site and Fernhollow as a studio", () => {
    expect(TEMPLATES.find((t) => t.id === "mossline")?.business[0]).toBe("product");
    expect(TEMPLATES.find((t) => t.id === "fernhollow")?.business[0]).toBe("agency");
  });
});
