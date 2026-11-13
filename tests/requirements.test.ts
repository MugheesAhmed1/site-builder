import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { composeWebsite } from "@/lib/compose";
import { docxToText, docxXmlToText } from "@/lib/docx";
import { rows, websiteQuestions } from "@/lib/questions";
import { parseRequirements, projectFromBrief, reviseBrief } from "@/lib/requirements";
import { REQUIREMENTS_TEMPLATE, SAMPLE_PRD } from "@/lib/requirements-sample";
import { looksLikeProject } from "@/lib/store";
import type { WebsiteContent } from "@/lib/types";

const fixture = (name: string) => readFileSync(new URL("./fixtures/" + name, import.meta.url), "utf8");

describe("reading a product requirements document (Markdown, tables)", () => {
  const b = parseRequirements(SAMPLE_PRD, "sample-prd.md");
  const a = b.answers;

  it("finds the name, the offer and the kind of business", () => {
    expect(a.name).toBe("Ledgerly");
    expect(a.what).toBe("Invoicing app");
    expect(b.category).toBe("product");
    expect(a.headline).toBe("Get paid without the awkward emails");
    expect(a.audience).toContain("freelance designers and developers");
    expect(a.about).toMatch(/^Ledgerly is an invoicing app/);
  });

  it("reads features from a table, in priority order, without what is left for later", () => {
    const names = rows(a.services).map((r) => r[0]);
    expect(names).toEqual(["Two minute invoices", "Polite reminders", "Online payments", "Income at a glance", "Expense tracking"]);
    expect(a.services).not.toMatch(/Payroll|Must|F-1/);
    expect(rows(a.services)[0][2]).toMatch(/^Pick a client/);
  });

  it("reads plans, steps, questions and the section of its own", () => {
    expect(rows(a.pricing)).toEqual([
      ["Starter", "Free", "", "3 invoices a month, 1 client reminder"],
      ["Pro", "Rs 1,500", "per month", "Unlimited invoices, Online payments, Automatic reminders"],
      ["Studio", "Rs 4,000", "per month", "Everything in Pro, 5 team seats, Shared client list"],
    ]);
    expect(rows(a.process).map((r) => r[0])).toEqual(["Create your account", "Send your first invoice", "Get paid"]);
    expect(rows(a.faq)).toHaveLength(3);
    expect(rows(a.faq)[0]).toEqual(["Do my clients need an account?", "No. They open the invoice from a link and pay from there."]);
    expect(a.customTitle).toBe("Why Ledgerly");
    expect(rows(a.customItems)).toHaveLength(3);
  });

  it("reads tone, brand colour, the first action and contact details", () => {
    expect(a.tone).toBe("Modern and technical");
    expect(b.brandColour).toBe("#2F6FED");
    expect(a.cta).toBe("Start a free trial");
    expect(a.email).toBe("hello@ledgerly.pk");
    expect(a.phone).toBe("+92 300 5550123");
    expect(a.instagram).toBe("https://instagram.com/ledgerly.pk");
    expect(b.missing).toEqual([]);
  });

  it("leaves out sections that are not for visitors", () => {
    const all = JSON.stringify(a);
    expect(all).not.toMatch(/Blog|Customer login|week one|Sana Iqbal/);
  });

  it("says where each thing came from", () => {
    expect(b.found.find((f) => f.id === "services")?.from).toBe('"Features"');
    expect(b.found.find((f) => f.id === "pricing")?.value).toBe("3 plans: Starter, Pro, Studio");
  });
});

describe("reading a plain text brief (numbered headings, wrapped lines, bullets)", () => {
  const b = parseRequirements(fixture("bakery-brief.txt"), "bakery-brief.txt");
  const a = b.answers;

  it("finds the business", () => {
    expect(a.name).toBe("Crumb House");
    expect(a.what).toBe("Family bakery");
    expect(a.city).toBe("Lahore");
    expect(b.category).toBe("food");
    expect(a.audience).toBe("families and office teams in Gulberg and DHA");
    expect(a.tone).toBe("Warm and friendly");
    expect(a.cta).toBe("Message on WhatsApp");
  });

  it("reads the menu with prices", () => {
    expect(rows(a.services)).toEqual([
      ["Sourdough loaf", "Rs 650"],
      ["Butter croissant", "Rs 280"],
      ["Celebration cakes", "From Rs 4,500", "Made to order, two days notice"],
      ["Coffee and tea", "Rs 350"],
      ["Catering boxes", "", "Breakfast for offices, minimum ten people"],
    ]);
  });

  it("reads quotes, hours, address and pages", () => {
    expect(rows(a.testimonials)).toEqual([
      ["Best sourdough in Lahore, by a mile.", "Ayesha R", "Gulberg"],
      ["They made my daughter's cake exactly as she drew it.", "Bilal K"],
    ]);
    expect(rows(a.hours)).toEqual([["Mon to Sat", "7am to 9pm"], ["Sun", "8am to 2pm"]]);
    expect(a.address).toBe("14 Main Boulevard, Gulberg III, Lahore");
    expect(a.whatsapp).toBe("+92 300 555 0142");
    expect(b.pages).toEqual(["Home", "Menu", "Our story", "Custom cakes", "Contact"]);
  });

  it("does not use the author's email or a target as a fact", () => {
    expect(a.email ?? "").toBe("");
    expect(a.highlights ?? "").toBe("");
    expect(JSON.stringify(a)).not.toMatch(/hina\.personal|200 online orders/);
  });
});

describe("reading a business requirements document (requirement language, sub-headings, Q and A)", () => {
  const b = parseRequirements(fixture("clinic-brd.md"), "clinic-brd.md");
  const a = b.answers;

  it("finds the business from labelled lines", () => {
    expect(a.name).toBe("BrightSmile Dental");
    expect(a.city).toBe("Karachi");
    expect(a.what).toBe("Dental clinic");
    expect(b.category).toBe("dentist");
    expect(a.tone).toBe("Calm and minimal");
    expect(a.cta).toBe("Book an appointment");
  });

  it("turns requirements into short offers and drops later phases and non-functional ones", () => {
    const names = rows(a.services).map((r) => r[0]);
    expect(names).toEqual(["Book an appointment online", "List every treatment", "Read about each dentist", "Show opening hours", "Download aftercare instructions"]);
    expect(a.services).not.toMatch(/FR-|P0|shall|must|portal|WCAG|two seconds/i);
  });

  it("reads the team, the questions and the numbers presented as facts", () => {
    expect(rows(a.team).map((r) => r.slice(0, 2))).toEqual([["Dr. Sara Malik", "Principal dentist"], ["Dr. Omar Sheikh", "Orthodontist"]]);
    expect(rows(a.faq).map((r) => r[0])).toEqual(["Do you treat children?", "Do you take insurance?"]);
    expect(rows(a.highlights)).toEqual([["15", "years in practice"], ["12,000+", "patients treated"], ["4.9", "Google rating"]]);
  });

  it("does not lift contact details from the stakeholder list", () => {
    expect(a.email ?? "").toBe("");
    expect(b.missing).toEqual(["contact details"]);
  });
});

describe("documents that give little", () => {
  it("an unfilled template reads as empty, not as its prompts", () => {
    const b = parseRequirements(REQUIREMENTS_TEMPLATE, "template.md");
    expect(b.read).toEqual({});
    expect(b.category).toBe("general");
    expect(b.missing).toHaveLength(5);
  });

  it("a filled template reads back", () => {
    const filled = REQUIREMENTS_TEMPLATE.replace("(your business name)", "Northside Motors")
      .replace("Business name:", "Business name: Northside Motors")
      .replace(/Industry: .*/, "Industry: Car garage")
      .replace("City:", "City: Islamabad")
      .replace(/\(Two to four sentences.*\)/, "Northside Motors services and repairs cars the same day.")
      .replace("- \n- \n- \n", "- Oil change - Rs 6,000\n- Brake service - Pads and discs checked and replaced\n- Full inspection\n")
      .replace("Email:", "Email: hello@northside.example")
      .replace(/\(A few words:.*\)/, "Bold and confident.");
    const b = parseRequirements(filled);
    expect(b.answers.name).toBe("Northside Motors");
    expect(b.category).toBe("auto");
    expect(b.answers.city).toBe("Islamabad");
    expect(rows(b.answers.services)).toEqual([["Oil change", "Rs 6,000"], ["Brake service", "", "Pads and discs checked and replaced"], ["Full inspection"]]);
    expect(b.answers.tone).toBe("Bold and loud");
    expect(b.answers.email).toBe("hello@northside.example");
  });

  it("free prose with no headings still gives a name, a place and a story", () => {
    const b = parseRequirements("Website for Atlas Legal\n\nAtlas Legal is a law firm in Lahore that helps families with property and inheritance cases. The firm has worked since 2009 and wants a classic, elegant website where people can book a call.");
    expect(b.answers.name).toBe("Atlas Legal");
    expect(b.category).toBe("law");
    expect(b.answers.city).toBe("Lahore");
    expect(b.answers.about).toMatch(/^Atlas Legal is a law firm/);
    expect(b.answers.services).toBeTruthy(); // the usual services for a law firm stand in
    expect(b.read.services).toBeUndefined();
  });

  it("never throws on odd input", () => {
    for (const t of ["", "   \n\n", "|||\n|---|\n", "# \n## \n- \n: :", "a: b\n".repeat(500), "1. \n2. \n", "((((", "####### x", "**", "Q:\nA:"]) {
      expect(() => parseRequirements(t)).not.toThrow();
    }
  });

  it("answers stay inside the one-line row format", () => {
    const b = parseRequirements("# Acme\n\n## Features\n\n- Search | filter: find things fast | really\n- Alerts - get a ping\nwhen it matters\n");
    for (const line of b.answers.services.split("\n")) expect(line.split("|").length).toBeLessThanOrEqual(3);
    expect(rows(b.answers.services)[1]).toEqual(["Alerts", "", "Get a ping when it matters"]);
  });
});

describe("Word documents", () => {
  const p = (inner: string, pr = "") => `<w:p>${pr ? `<w:pPr>${pr}</w:pPr>` : ""}${inner}</w:p>`;
  const r = (t: string, bold = false) => `<w:r>${bold ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${t}</w:t></w:r>`;
  const xml = `<?xml version="1.0"?><w:document xmlns:w="x"><w:body>
    ${p(r("Website brief: Petal &amp; Stem"), '<w:pStyle w:val="Title"/>')}
    ${p(r("Overview"), '<w:pStyle w:val="Heading1"/>')}
    ${p(r("Petal &amp; Stem is a ") + r("flower shop") + r(" in Karachi that delivers the same day."))}
    ${p(r("Services", true))}
    ${p(r("Bouquets"), '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>')}
    ${p(r("Wedding flowers"), '<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>')}
    ${p(r("Pricing"), '<w:pStyle w:val="Heading2"/>')}
    <w:tbl><w:tr><w:tc>${p(r("Plan"))}</w:tc><w:tc>${p(r("Price"))}</w:tc><w:tc>${p(r("Includes"))}</w:tc></w:tr>
    <w:tr><w:tc>${p(r("Weekly"))}</w:tc><w:tc>${p(r("Rs 3,000"))}</w:tc><w:tc>${p(r("One bouquet, Free delivery"))}</w:tc></w:tr></w:tbl>
    <w:sectPr/></w:body></w:document>`;

  it("keeps headings, lists and tables", () => {
    const text = docxXmlToText(xml);
    expect(text).toContain("# Website brief: Petal & Stem");
    expect(text).toContain("# Overview");
    expect(text).toContain("**Services**");
    expect(text).toContain("- Bouquets");
    expect(text).toContain("| Weekly | Rs 3,000 | One bouquet, Free delivery |");
  });

  it("reads a real .docx file end to end", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", xml);
    const b = parseRequirements(await docxToText(await zip.generateAsync({ type: "uint8array" })), "brief.docx");
    expect(b.answers.name).toBe("Petal & Stem");
    expect(b.category).not.toBe("general");
    expect(b.answers.city).toBe("Karachi");
    expect(rows(b.answers.services).map((x) => x[0])).toEqual(["Bouquets", "Wedding flowers"]);
    expect(rows(b.answers.pricing)[0]).toEqual(["Weekly", "Rs 3,000", "", "One bouquet, Free delivery"]);
  });

  it("says so when the file is not a Word document", async () => {
    await expect(docxToText(new Uint8Array([1, 2, 3]))).rejects.toThrow(/Word file/);
    const zip = new JSZip();
    zip.file("hello.txt", "hi");
    await expect(docxToText(await zip.generateAsync({ type: "uint8array" }))).rejects.toThrow(/isn't a Word document/);
  });
});

describe("from the document to a site", () => {
  const brief = parseRequirements(SAMPLE_PRD, "sample-prd.md");

  it("builds a project that opens on the preview with the site already written", () => {
    const p = projectFromBrief(brief, "build");
    expect(looksLikeProject(p)).toBe(true);
    expect(p.kind).toBe("website");
    expect(p.category).toBe("product");
    expect(p.docName).toBe("sample-prd.md");
    expect(p.steps.motion).toBe("approved");
    expect(p.steps.build).toBe("draft");
    expect(p.design.accent).toBe("#2F6FED");
    const c = p.content as WebsiteContent;
    expect(c.brand.name).toBe("Ledgerly");
    expect(c.hero.headline).toBe("Get paid without the awkward emails");
    expect(c.hero.primaryCta).toBe("Start a free trial");
    expect(c.services).toHaveLength(5);
    expect(c.pricing.map((x) => x.name)).toEqual(["Starter", "Pro", "Studio"]);
    expect(c.process.map((x) => x.title)).toEqual(["Create your account", "Send your first invoice", "Get paid"]);
    expect(c.faq[0].question).toBe("Do my clients need an account?");
    expect(c.custom[0].title).toBe("Why Ledgerly");
    expect(c.contact.email).toBe("hello@ledgerly.pk");
    for (const s of ["services", "process", "pricing", "custom", "faq", "contact"] as const) expect(c.sections).toContain(s);
  });

  it("or stops at the questions so every answer can be checked", () => {
    const p = projectFromBrief(brief, "check");
    expect(p.steps.questions).toBe("draft");
    expect(p.content).toBeNull();
  });

  it("every answer it fills is one the questions step can edit", () => {
    for (const f of ["sample-prd.md", "bakery-brief.txt", "clinic-brd.md"]) {
      const b = f === "sample-prd.md" ? brief : parseRequirements(fixture(f), f);
      const ids = new Set(websiteQuestions(b.category).map((q) => q.id));
      for (const k of Object.keys(b.read)) expect(ids.has(k), `${f}: ${k}`).toBe(true);
    }
  });

  it("correcting the kind of business keeps what was read", () => {
    const b = reviseBrief(brief, "consulting", { ...brief.read, name: "Ledgerly Pro", city: "" });
    expect(b.category).toBe("consulting");
    expect(b.answers.name).toBe("Ledgerly Pro");
    expect(b.answers.city).toBeUndefined();
    expect(b.answers.services).toBe(brief.answers.services);
  });

  it("typed answers for headline, steps and questions work without a document too", () => {
    const c = composeWebsite("food", { name: "Crumb", what: "Bread", headline: "Bread worth the walk.", faq: "Do you deliver? | Yes, daily.", process: "Order | Message us\nCollect | From the shop" });
    expect(c.hero.headline).toBe("Bread worth the walk");
    expect(c.faq).toEqual([{ question: "Do you deliver?", answer: "Yes, daily." }]);
    expect(c.process).toHaveLength(2);
    const plain = composeWebsite("food", { name: "Crumb", what: "Bread" });
    expect(plain.faq.length).toBeGreaterThan(1);
    expect(plain.process).toHaveLength(3);
  });
});
