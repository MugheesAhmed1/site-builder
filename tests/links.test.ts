import { describe, expect, it } from "vitest";
import { cleanContent, safeUrl } from "@/template/src/shared.jsx";

describe("link safety", () => {
  it("keeps ordinary links", () => {
    for (const u of ["https://example.com/a?b=1", "http://x.org", "mailto:a@b.co", "tel:+923001234567", "#pf-contact", "/real/people/chef.webp", "./images/picture-1.png", "instagram.com/crumbhouse", "wa.me/923001234567"]) {
      expect(safeUrl(u)).toBe(u);
    }
  });

  it("drops script and data links, however they are written", () => {
    for (const u of ["javascript:alert(1)", "  JaVaScRiPt:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:msgbox(1)", "\tjavascript:alert(1)"]) {
      expect(safeUrl(u)).toBe("");
    }
  });

  it("allows only picture data URLs for picture fields", () => {
    const img = "data:image/png;base64,iVBORw0KGgo=";
    expect(safeUrl(img, true)).toBe(img);
    expect(safeUrl("data:image/svg+xml;base64,PHN2Zz4=", true)).toBe("");
    expect(safeUrl(img, false)).toBe("");
  });

  it("cleans nested content by field name only", () => {
    const out = cleanContent({ hero: { primaryHref: "javascript:x", imageUrl: "data:image/webp;base64,AAAA", headline: "javascript:is a word" }, projects: [{ link: "data:text/html,x", name: "ok" }], contact: { github: "javascript:1", email: "a@b.co" } }) as never as Record<string, Record<string, unknown>>;
    expect(out.hero.primaryHref).toBe("");
    expect(out.hero.imageUrl).toBe("data:image/webp;base64,AAAA");
    expect(out.hero.headline).toBe("javascript:is a word");
    expect((out.projects as unknown as { link: string }[])[0].link).toBe("");
    expect(out.contact.github).toBe("");
    expect(out.contact.email).toBe("a@b.co");
  });
});
