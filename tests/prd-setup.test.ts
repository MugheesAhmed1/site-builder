// @vitest-environment node
import { describe, expect, it } from "vitest";
import { prerender } from "@/lib/prerender";
import { localDraft, normalizePrd, prdFromProfile } from "@/lib/prd";
import { buildFromPrd } from "@/lib/prd-build";
import { checkCoverage, markupCoverage } from "@/lib/prd-coverage";
import { parseResume } from "@/lib/resume";
import { cleanSpec } from "@/template/src/director";
import type { WebsiteContent } from "@/template/src/content/types";

// The setup step (text and item choices per section) and the portfolio start (resume -> PRD).

const RESUME = `Ayesha Khan
Senior Product Designer | Lahore, Pakistan
ayesha@example.com | +92 300 1234567 | linkedin.com/in/ayeshak

Summary
Product designer with eight years of shaping fintech and health products, from research to shipped interface.

Experience
Senior Product Designer, Northwind Health
Jan 2021 - Present
- Led the redesign of the patient booking flow
- Built the design system used by four teams

Product Designer, Kite Pay
Mar 2017 - Dec 2020
- Designed the merchant dashboard

Skills
Figma, Prototyping, User research, Design systems

Education
BS Computer Science, LUMS, 2016`;

const html = (p: ReturnType<typeof buildFromPrd>) => prerender({ kind: p.kind, design: p.design, content: p.content, experience: p.experience });

describe("portfolio from a resume", () => {
  it("drafts a portfolio PRD with only facts from the resume", () => {
    const prd = prdFromProfile(parseResume(RESUME));
    expect(prd.kind).toBe("portfolio");
    expect(prd.name).toBe("Ayesha Khan");
    const ids = prd.sections.map((s) => s.title);
    expect(ids).toEqual(expect.arrayContaining(["Ayesha Khan", "About", "Experience", "Skills", "Education", "Contact"]));
    const exp = prd.sections.find((s) => s.title === "Experience")!;
    expect(exp.items.length).toBe(2);
    expect(exp.items[0].title).toContain("Northwind Health");
    expect(exp.visual.items).toBe("timeline");
    expect(prd.contact.email).toBe("ayesha@example.com");
  });

  it("builds a portfolio site with every section, requirement and the timeline", () => {
    const prd = normalizePrd(prdFromProfile(parseResume(RESUME)), "");
    expect(prd.kind).toBe("portfolio");
    const p = buildFromPrd(prd);
    expect(checkCoverage(p.prd!, p.content as WebsiteContent, p.experience).ok).toBe(true);
    const page = html(p);
    expect(markupCoverage(p.prd!, page).ok).toBe(true);
    expect(page).toContain('data-items="timeline"');
    expect(page).toContain("Northwind Health");
  });
});

describe("site setup choices", () => {
  it("keeps text and item choices through cleanSpec and a rebuild", () => {
    const prd = localDraft("Dentist clinic in Islamabad");
    const p = buildFromPrd(prd);
    const c = p.content as WebsiteContent;
    const blocks = c.blocks!.map((b, i) => (i === 1 ? { ...b, spec: { ...b.spec, text: { align: "end" as const, size: 1.4, face: "serif" as const, caps: true }, items: { style: "carousel" as const, images: true } } } : b));
    const set = { ...p, content: { ...c, blocks } };
    const again = buildFromPrd(prd, set);
    const b = (again.content as WebsiteContent).blocks![1];
    expect(b.spec.text).toMatchObject({ align: "end", size: 1.4, face: "serif", caps: true });
    expect(b.spec.items).toMatchObject({ style: "carousel", images: true });
    expect(cleanSpec(b.spec, b.spec).text?.align).toBe("end");
    const page = html(again);
    expect(page).toContain('data-talign="end"');
    expect(page).toContain('data-items="carousel"');
    expect(page).toMatch(/--xb-face:ui-serif/);
    expect(markupCoverage(again.prd!, page).ok).toBe(true);
  });
});
