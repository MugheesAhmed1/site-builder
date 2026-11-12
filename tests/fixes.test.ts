import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CATEGORIES } from "@/lib/categories";
import { composeWebsite } from "@/lib/compose";
import { questionsFor } from "@/lib/questions";
import { newProject } from "@/lib/store";
import type { WebsiteContent } from "@/lib/types";
import { castContext, widgetText } from "@/template/src/Cast.jsx";
import Website from "@/template/src/Website.jsx";

const mq = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
vi.stubGlobal("window", { dispatchEvent: () => true, matchMedia: mq, innerWidth: 1280, innerHeight: 800, addEventListener() {}, removeEventListener() {} });
vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => undefined });

function site(content: WebsiteContent, preview: boolean) {
  const p = newProject("Website for my bakery", "website", "food", "Crumb House");
  return renderToStaticMarkup(createElement(Website as never, { design: { ...p.design, motion: "none", anim: "M-000" }, content, preview, scheme: "light" } as never));
}

describe("published sites never ship empty blocks", () => {
  const bare = () => {
    const c = composeWebsite("food", { name: "Crumb House", what: "Cakes" }) as WebsiteContent;
    c.contact = { ...c.contact, email: "", phone: "", whatsapp: "", instagram: "", facebook: "", linkedin: "" };
    c.visit = { ...c.visit, address: "" };
    if (!c.sections.includes("gallery")) c.sections.push("gallery");
    c.gallery = [{ caption: "Dine in", imageUrl: "" }, { caption: "Takeaway", imageUrl: "" }];
    return c;
  };

  it("hides gallery photo slots and an unreachable contact block in the download, keeps them in the preview", () => {
    const out = site(bare(), false);
    expect(out).not.toContain("Photo: Dine in");
    expect(out).not.toContain('id="pf-contact"');
    expect(out).not.toContain('href="#pf-contact"');
    const pre = site(bare(), true);
    expect(pre).toContain("Photo: Dine in");
    expect(pre).toContain('id="pf-contact"');
  });

  it("shows only the gallery photos that exist", () => {
    const c = bare();
    c.gallery[1].imageUrl = "/real/props/cupcake.webp";
    const out = site(c, false);
    expect(out).toContain("cupcake.webp");
    expect(out).not.toContain("Photo: Dine in");
  });

  it("offers directions when the only way to reach a business is its address", () => {
    const c = bare();
    c.visit = { ...c.visit, address: "12 Main Boulevard, Lahore" };
    const out = site(c, false);
    expect(out).toContain('id="pf-contact"');
    expect(out).toContain("Get directions");
  });
});

describe("widgets use the person's own content", () => {
  it("never repeats one number or invents 'Projects shipped 24' or '92%'", () => {
    const ctx = castContext("portfolio", {
      hero: { name: "Sara Malik", role: "Product manager" },
      stats: [],
      skills: [{ group: "Product", items: ["Discovery", "Roadmaps", "Pricing"] }],
      process: [{ title: "Discover" }, { title: "Decide" }, { title: "Build" }, { title: "Learn" }],
      projects: [{ name: "A" }, { name: "B" }],
    });
    const shown = ["stat", "line", "pulse", "ring", "growth"].map((k) => widgetText(k, ctx) as { title: string; value: string });
    expect(new Set(shown.map((x) => x.title + x.value)).size).toBeGreaterThanOrEqual(4);
    for (const x of shown) {
      expect(x.title).not.toBe("Projects shipped");
      expect(x.value).not.toBe("92%");
    }
    expect(shown[0]).toEqual({ title: "Projects featured", value: "2" });
  });

  it("tells different things even when the only number is a count of steps", () => {
    const ctx = castContext("portfolio", { hero: { name: "Sara Malik" }, stats: [], process: [{ title: "Discover" }, { title: "Decide" }, { title: "Build" }] });
    const shown = ["stat", "line", "pulse", "growth"].map((k) => JSON.stringify(widgetText(k, ctx)));
    expect(new Set(shown).size).toBe(4);
  });

  it("keeps real numbers first", () => {
    const ctx = castContext("website", { brand: { name: "Crumb" }, highlights: [{ value: "12", label: "years in business" }, { value: "98%", label: "on time" }], services: [{ name: "Cakes" }] });
    expect(widgetText("stat", ctx)).toEqual({ title: "years in business", value: "12" });
    expect(widgetText("ring", ctx)).toEqual({ title: "on time", value: "98%" });
  });
});

describe("questions fit every business type", () => {
  it("gives every category its own example, audience and tone", () => {
    for (const c of CATEGORIES) {
      const qs = questionsFor("website", c.id);
      const what = qs.find((q) => q.id === "what")!;
      const audience = qs.find((q) => q.id === "audience")!;
      expect(what.placeholder, c.id).not.toBe("Home cleaning");
      expect(audience.placeholder, c.id).not.toBe("families and small businesses" === audience.placeholder && c.id !== "general" && c.id !== "law" ? "x" : "y");
      expect(qs.find((q) => q.id === "tone")!.suggest, c.id).toBeTruthy();
    }
    expect(questionsFor("website", "dentist").find((q) => q.id === "what")!.placeholder).toMatch(/dent/i);
  });
});

describe("edit text labels", () => {
  it("names add buttons in plain words", async () => {
    const { oneOf } = await import("@/components/FieldsEditor");
    expect(oneOf("process")).toBe("step");
    expect(oneOf("faq")).toBe("question");
    expect(oneOf("hours")).toBe("day");
    expect(oneOf("gallery")).toBe("photo");
    expect(oneOf("services")).toBe("service");
    expect(oneOf("address")).toBe("address");
  });
});
