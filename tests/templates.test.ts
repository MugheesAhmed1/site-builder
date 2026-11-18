import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { applyToText, cleanUrl, occurrences, plan, slotProblems } from "@/lib/template-apply.mjs";
import { TEMPLATES } from "@/lib/templates";
import { cleanEntryName, detectKind, draftSlots, pruneDependencies, readArchive } from "@/scripts/import-template.mjs";

const slot = (d: string, extra = {}) => ({ key: "k", label: "K", default: d, ...extra });

describe("applying template slots", () => {
  it("escapes for HTML text and attributes", () => {
    const r = plan([slot("Mossline")], { k: `Tom & "Jerry" <b>` });
    expect(applyToText("index.html", "<title>Mossline</title>", r)).toBe("<title>Tom &amp; &quot;Jerry&quot; &lt;b&gt;</title>");
  });

  it("escapes for JS strings inside an HTML script", () => {
    const r = plan([slot("Mossline")], { k: `a'b"c` });
    const out = applyToText("index.html", `<script>const n = 'Mossline';</script>`, r);
    expect(out).toBe(`<script>const n = 'a\\u0027b\\u0022c';</script>`);
    expect(new Function(out.slice(8, -9) + "; return n;")()).toBe(`a'b"c`);
  });

  it("uses entities in JSX text and JSX attributes, escapes in JS strings", () => {
    const r = plan([slot("Fernhollow")], { k: "A{b}<c>" });
    const src = `const t = 'About Fernhollow';\n<a aria-label="Fernhollow">Fernhollow</a>`;
    const out = applyToText("App.tsx", src, r);
    expect(out).toContain(`aria-label="A{b}&lt;c&gt;"`);
    expect(out).toContain(`>A&#123;b&#125;&lt;c&gt;</a>`);
    expect(out).toContain(`'About A\\u007bb\\u007d\\u003cc\\u003e'`);
  });

  it("matches words wrapped over several lines", () => {
    const r = plan([slot("one two three")], { k: "new" });
    expect(applyToText("App.tsx", "<p>\n  one two\n  three\n</p>", r)).toBe("<p>\n  new\n</p>");
    expect(occurrences("one\n two  three", "one two three")).toHaveLength(1);
  });

  it("replaces longer defaults first and skips unchanged values", () => {
    const r = plan([slot("Moss", { key: "a" }), slot("Moss line", { key: "b" })], { a: "X", b: "Moss line" });
    expect(r.map((x) => x.key)).toEqual(["a"]);
    const both = plan([slot("Moss", { key: "a" }), slot("Moss line", { key: "b" })], { a: "X", b: "Y" });
    expect(applyToText("a.html", "Moss line and Moss", both)).toBe("Y and X");
  });

  it("accepts only https or site-relative picture addresses", () => {
    expect(cleanUrl("javascript:alert(1)")).toBe("");
    expect(cleanUrl("http://x.test/a.png")).toBe("");
    expect(cleanUrl("https://x.test/a'b.png")).toBe("https://x.test/a%27b.png");
    expect(cleanUrl("./media/pic.webp")).toBe("./media/pic.webp");
  });

  it("flags a slot that would hit code, not text", () => {
    expect(slotProblems("a.js", "const Title=1;", slot("Title"))).toHaveLength(1);
    expect(slotProblems("a.js", 'x("Title")', slot("Title"))).toHaveLength(0);
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
    expect(draftSlots(files, "Proj").map((s: { default: string }) => s.default)).toEqual(["Proj", "Hello there"]);
  });
});

describe("registered templates", () => {
  it("has Mossline and Fernhollow", () => {
    expect(TEMPLATES.map((t) => t.id).sort()).toEqual(["fernhollow", "mossline"]);
  });

  for (const t of TEMPLATES) {
    it(`${t.id}: every slot is in its source`, () => {
      const dir = join(process.cwd(), "templates", t.id, "source");
      const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
      const texts = walk(dir)
        .filter((p) => /\.(html|tsx?|css)$/.test(p))
        .map((p) => readFileSync(p, "utf8"));
      for (const s of t.slots) expect(texts.some((x) => occurrences(x, s.default).length), s.key).toBe(true);
      expect(t.licence.holder).toBeTruthy();
      expect(existsSync(join(dir, ".env"))).toBe(false);
    });
  }
});
