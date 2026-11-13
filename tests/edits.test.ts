import { describe, expect, it } from "vitest";
import { cleanCss, cleanHref, cleanSrc, editCss, EDIT_ICON_IDS, iconSvg, isEmptyEdit, patchEdits } from "@/template/src/edits.js";
import { palette } from "@/template/src/theme.js";
import { keepCast, newProject } from "@/lib/store";

describe("element edits", () => {
  it("turns an edit into CSS", () => {
    const css = editCss({ color: "#DC2626", bg: "linear-gradient(135deg, #111111, #222222)", size: 1.5, weight: 800, italic: true, radius: 12, hide: true });
    expect(css).toContain("color:#DC2626!important");
    expect(css).toContain("background:linear-gradient(135deg, #111111, #222222)!important");
    expect(css).toContain("font-size:calc(var(--pe-fs, 1em) * 1.5)!important");
    expect(css).toContain("font-weight:800!important");
    expect(css).toContain("font-style:italic!important");
    expect(css).toContain("border-radius:12px!important");
    expect(css).toContain("display:none!important");
  });

  it("sizes pictures and vectors by width, and recolours them with filters", () => {
    const css = editCss({ size: 2, tint: 90, sat: 1.5, blur: 4 }, "media");
    expect(css).toContain("width:calc(var(--pe-w, 100%) * 2)!important");
    expect(css).toContain("filter:hue-rotate(90deg) saturate(1.5) blur(4px)!important");
  });

  it("puts a background picture under a darkening veil", () => {
    const css = editCss({ bgImage: "./images/picture-1.jpg", bgDim: 0.4 });
    expect(css).toContain('linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4)),url("./images/picture-1.jpg") center/cover');
  });

  it("never lets a value break out of its CSS rule", () => {
    expect(cleanCss("red;}body{display:none")).toBe("redbodydisplay:none");
    expect(cleanCss("url(javascript:alert(1))")).not.toMatch(/url\(/i);
    expect(editCss({ color: "red}</style><script>" })).not.toMatch(/[<>{}]/);
  });

  it("only accepts real pictures and safe links", () => {
    expect(cleanSrc("data:image/png;base64,AAAA")).toBe("data:image/png;base64,AAAA");
    expect(cleanSrc("https://example.com/a.jpg")).toBe("https://example.com/a.jpg");
    expect(cleanSrc("./images/picture-2.webp")).toBe("./images/picture-2.webp");
    expect(cleanSrc("/real/props/cupcake.webp")).toBe("/real/props/cupcake.webp");
    expect(cleanSrc("javascript:alert(1)")).toBe("");
    expect(cleanSrc('https://x.com/a.jpg") ;}')).toBe("");
    expect(cleanSrc("../../etc/passwd")).toBe("");
    expect(cleanHref("javascript:alert(1)")).toBe("");
    expect(cleanHref("mailto:hi@example.com")).toBe("mailto:hi@example.com");
    expect(cleanHref("#pf-contact")).toBe("#pf-contact");
    expect(cleanHref("crumbhouse.pk/menu")).toBe("https://crumbhouse.pk/menu");
  });

  it("drops empty edits and fields that went back to the designed value", () => {
    expect(isEmptyEdit({ size: 1, opacity: 1, tint: 0 })).toBe(true);
    let e = patchEdits({}, "#pf-top|h1.pf-display|0", { color: "#FF0000" });
    expect(e["#pf-top|h1.pf-display|0"]).toEqual({ color: "#FF0000" });
    e = patchEdits(e, "#pf-top|h1.pf-display|0", { size: 1.2 });
    expect(e["#pf-top|h1.pf-display|0"]).toEqual({ color: "#FF0000", size: 1.2 });
    e = patchEdits(e, "#pf-top|h1.pf-display|0", { color: "", size: 1 });
    expect(e).toEqual({});
  });

  it("ships a set of free icons", () => {
    expect(EDIT_ICON_IDS.length).toBeGreaterThan(60);
    for (const id of EDIT_ICON_IDS) expect(iconSvg(id)).toMatch(/^<svg [^>]*viewBox="0 0 24 24"[^>]*><path d="[^"<>]+"\/><\/svg>$/);
  });
});

describe("page colours set by hand", () => {
  const base = { hue: 80, tint: 0.012, accent: "#2A5BD7", mode: "light" };
  it("win over the derived palette, per theme", () => {
    const d = { ...base, colors: { light: { bg: "#fff4e0", accent: "#C2410C" } } };
    expect(palette(d, "light").bg).toBe("#FFF4E0");
    expect(palette(d, "light").accent).toBe("#C2410C");
    expect(palette(d, "dark").bg).toBe(palette(base, "dark").bg);
  });
  it("keep button words readable on a hand-picked accent", () => {
    expect(palette({ ...base, colors: { light: { accent: "#FFE066" } } }, "light").onAccent).toBe("#111111");
    expect(palette({ ...base, colors: { light: { accent: "#1E1B4B" } } }, "light").onAccent).toBe("#FFFFFF");
  });
  it("ignore anything that is not a colour code", () => {
    expect(palette({ ...base, colors: { light: { bg: "red;}" } } }, "light").bg).toBe(palette(base, "light").bg);
  });
});

describe("switching design system", () => {
  it("keeps element edits but resets hand-picked page colours", () => {
    const p = newProject("Website for my bakery", "website", "food", "Crumb House");
    const prev = { ...p.design, edits: { "#pf-top|h1.pf-display|0": { color: "#FF0000" } }, colors: { light: { bg: "#FFFFFF" } } };
    const next = keepCast(prev, { ...p.design, id: "OTHER" });
    expect(next.edits).toEqual(prev.edits);
    expect(next.colors).toBeUndefined();
  });
});
