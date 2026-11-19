// @vitest-environment node
import { describe, expect, it } from "vitest";
import { prerender } from "@/lib/prerender";
import { localDraft, normalizePrd, prdFromText, widgetFor, nextReqId, allRequirements } from "@/lib/prd";
import { buildFromPrd, syncPrd } from "@/lib/prd-build";
import { checkCoverage, markupCoverage } from "@/lib/prd-coverage";
import { direct, directedSpec, DIRECTOR_IDS } from "@/template/src/director";
import { visibleSections } from "@/template/src/content/sections";
import type { WebsiteContent } from "@/template/src/content/types";

// The PRD journey: one line -> a PRD -> edits -> a site with every PRD section and requirement on it.

const html = (p: ReturnType<typeof buildFromPrd>) => prerender({ kind: p.kind, design: p.design, content: p.content, experience: p.experience });

describe("PRD", () => {
  it("drafts a complete PRD from one line by rules", () => {
    for (const idea of ["How the human heart works", "dentist clinic in isb", "launch page for our new running shoe", "portfolio for a wedding photographer"]) {
      const prd = localDraft(idea);
      expect(prd.sections.length, idea).toBeGreaterThanOrEqual(5);
      expect(allRequirements(prd).length).toBeGreaterThan(5);
      const ids = allRequirements(prd).map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(new Set(prd.sections.map((s) => s.id)).size).toBe(prd.sections.length);
    }
    expect(localDraft("How the human heart works").sections[0].visual.asset).toBe("glb");
    expect(localDraft("How the human heart works").director).toBe("scientific");
  });

  it("cleans whatever Gemini returns", () => {
    const prd = normalizePrd({ title: "X", sections: [{ title: "One", requirements: ["Users can book a visit", { id: "R1", text: "Show the address" }, { id: "R1", text: "dup" }], visual: { asset: "nope", director: "scientific" } }, { title: "" }], accent: "red" }, "a clinic");
    expect(prd.sections.length).toBe(1);
    const r = prd.sections[0].requirements;
    expect(r.map((x) => x.id)).toEqual(["R1", "R2", "R3"].filter((id) => r.some((x) => x.id === id)));
    expect(new Set(r.map((x) => x.id)).size).toBe(3);
    expect(r.find((x) => x.text === "Users can book a visit")?.kind).toBe("functional");
    expect(prd.accent).toMatch(/^#[0-9a-f]{6}$/i);
    expect(nextReqId(prd)).toBe("R4");
  });

  it("turns functional requirements into working widgets", () => {
    expect(widgetFor("Visitors can book an appointment").widget).toBe("form");
    expect(widgetFor("Visitors can book an appointment").fields).toContain("Date");
    expect(widgetFor("Subscribe to the newsletter").fields).toEqual(["Email"]);
    expect(widgetFor("An FAQ where answers open on click").widget).toBe("faq");
    expect(widgetFor("Visitors can click each chamber to learn about it").widget).toBe("explore");
    expect(widgetFor("Visitors can search the glossary").widget).toBe("search");
    expect(widgetFor("Show key statistics as large numbers").widget).toBe("stats");
  });

  it("reads a written PRD document", () => {
    const prd = prdFromText("# Bloom Bakery\n\n## About us\nFamily bakery since forever.\n\n## Features\n- Customers can order a cake online\n- Show the opening hours\n\n## Contact\nhello@bloom.test\n");
    expect(prd.sections.map((s) => s.title)).toEqual(["About us", "Features", "Contact"]);
    expect(prd.sections[1].requirements.map((r) => r.kind)).toEqual(["functional", "content"]);
    expect(prd.contact.email).toBe("hello@bloom.test");
  });
});

describe("PRD to site", () => {
  it("puts every PRD section and requirement on the page", () => {
    for (const idea of ["How the human heart works", "dentist clinic in isb", "boutique hotel in murree"]) {
      const prd = localDraft(idea);
      const p = buildFromPrd(prd);
      const c = p.content as WebsiteContent;
      expect(c.blocks!.length).toBe(prd.sections.length);
      expect(visibleSections("website", c)[0]).toBe("b-" + prd.sections[0].id);
      expect(checkCoverage(prd, c, p.experience).ok, idea).toBe(true);
      const cov = markupCoverage(prd, html(p));
      expect(cov.problems, idea).toEqual([]);
      expect(cov.ok).toBe(true);
    }
  });

  it("fails when a requirement or a section goes missing", () => {
    const prd = localDraft("How the human heart works");
    const p = buildFromPrd(prd);
    const c = p.content as WebsiteContent;
    const dropReq = { ...c, blocks: c.blocks!.map((b, i) => (i === 1 ? { ...b, reqs: b.reqs.slice(1) } : b)) };
    const lost = checkCoverage(prd, dropReq, p.experience);
    expect(lost.ok).toBe(false);
    expect(lost.problems[0]).toContain(prd.sections[1].requirements[0].id);
    expect(markupCoverage(prd, html({ ...p, content: dropReq })).ok).toBe(false);
    const dropSection = { ...c, sections: c.sections.filter((s) => s !== "b-" + prd.sections[2].id) };
    expect(checkCoverage(prd, dropSection, p.experience).ok).toBe(false);
    expect(markupCoverage(prd, html({ ...p, content: dropSection })).ok).toBe(false);
    const hidden = { ...p.experience!, scenes: p.experience!.scenes.map((s, i) => (i === 3 ? { ...s, hidden: true } : s)) };
    expect(checkCoverage(prd, c, hidden).ok).toBe(false);
  });

  it("keeps the person's section choices when the PRD is rebuilt", () => {
    const prd = localDraft("dentist clinic in isb");
    const p = buildFromPrd(prd);
    const c = p.content as WebsiteContent;
    c.blocks![1].spec = { ...c.blocks![1].spec, layout: "editorial", director: "luxury" };
    c.blocks![1].spec.hero = { ...c.blocks![1].spec.hero, src: "data:image/png;base64,AAAA" };
    const edited = { ...prd, sections: prd.sections.map((s, i) => (i === 1 ? { ...s, title: "Our story", requirements: [...s.requirements, { id: nextReqId(prd), kind: "content" as const, text: "Name the lead dentist" }] } : s)) };
    const q = buildFromPrd(edited, { ...p, content: c });
    const b = (q.content as WebsiteContent).blocks![1];
    expect(b.heading).toBe("Our story");
    expect(b.spec.layout).toBe("editorial");
    expect(b.spec.director).toBe("luxury");
    expect(b.spec.hero.src).toBe("data:image/png;base64,AAAA");
    expect(checkCoverage(edited, q.content as WebsiteContent, q.experience).ok).toBe(true);
    expect(markupCoverage(edited, html(q)).ok).toBe(true);
  });

  it("writes on-page word changes back into the PRD", () => {
    const prd = localDraft("dentist clinic in isb");
    const p = buildFromPrd(prd);
    const c = structuredClone(p.content as WebsiteContent);
    c.blocks![2].heading = "Treatments";
    c.blocks![2].reqs[0].text = "List every treatment";
    const next = syncPrd(prd, c);
    expect(next.sections[2].title).toBe("Treatments");
    expect(next.sections[2].requirements[0].text).toBe("List every treatment");
  });
});

describe("Director", () => {
  it("gives every direction its own tokens", () => {
    const seen = new Set(DIRECTOR_IDS.map((d) => JSON.stringify({ ...direct(d), id: 0, label: 0, note: 0 })));
    expect(seen.size).toBe(DIRECTOR_IDS.length);
  });

  it("blends a second direction for movement: same template, different experience", () => {
    const sc = direct("scientific", "cinematic");
    expect(sc.asset.environment).toBe("lab");
    expect(sc.asset.lighting).toBe("lab");
    expect(sc.camera.move).toBe("orbit");
    expect(sc.transition).toBe("depth");
    expect(sc.tone).toBe("dark");
    const em = direct("editorial", "minimal");
    expect(em.tone).toBe("light");
    expect(em.transition).toBe("fade");
    expect(em.camera.move).toBe("static");
    expect(em.intensity).toBeLessThan(sc.intensity);
    const a = directedSpec("scientific", { lead: true, heroType: "glb", secondary: "cinematic" });
    const b = directedSpec("editorial", { lead: true, heroType: "glb", secondary: "minimal" });
    expect(a.background.type).toBe("environment");
    expect(b.background.type).not.toBe("environment");
    expect(a.layout).not.toBe(b.layout);
  });

  it("draws the section from its parameters", () => {
    const prd = localDraft("How the human heart works");
    const p = buildFromPrd(prd);
    const c = p.content as WebsiteContent;
    for (const layout of ["fullscreen", "split", "centered", "asymmetric", "editorial"] as const)
      for (const hero of ["glb", "image", "video", "illustration", "particles", "none"] as const)
        for (const bg of ["solid", "gradient", "image", "video", "environment", "particles"] as const) {
          const blocks = c.blocks!.map((b, i) => (i === 0 ? { ...b, spec: { ...b.spec, layout, hero: { ...b.spec.hero, type: hero }, background: { ...b.spec.background, type: bg } } } : b));
          const out = html({ ...p, content: { ...c, blocks } });
          expect(out).toContain(`data-layout="${layout}"`);
          expect(out).toContain(`data-bg="${bg}"`);
          expect(markupCoverage(prd, out).ok).toBe(true);
        }
  });
});
