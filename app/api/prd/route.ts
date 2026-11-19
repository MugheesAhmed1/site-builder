import { NextResponse } from "next/server";
import { callGemini, geminiKey, limited, parseJson } from "@/lib/gemini";
import { localDraft, normalizePrd, type Prd } from "@/lib/prd";
import { DIRECTOR_IDS } from "@/template/src/director";

// The first step of the PRD journey, on the server so the Gemini key stays here.
//   POST { step: "draft", idea }           -> { prd }   Gemini drafts the PRD from one line
//   POST { step: "section", prd, title }   -> { section } one more section, written to fit the PRD
// Without a key, or when the free quota is busy, the rules draft it, so a person always gets a PRD.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BODY = 60_000;

const HOUSE = [
  "Never invent facts that would mislead a visitor: no prices, awards, certifications, years in business, client names, review scores or guarantees. Use clearly generic placeholders where a real figure is needed.",
  "For educational or scientific subjects, be accurate: write only facts that are well established.",
  "Do not use em dashes or en dashes. No emoji, no markdown, no hashtags.",
  "Avoid cliches such as 'elevate', 'unlock', 'seamless', 'cutting-edge', 'look no further', 'world-class'.",
].join("\n");

const VISUAL = `"visual":{"subject":"<what the section shows, in words, e.g. realistic human heart; never a file, URL or brand>","asset":"glb|image|video|illustration|particles|none","director":"<${DIRECTOR_IDS.join("|")}>","secondary":"<optional second director for movement>","layout":"fullscreen|split|centered|asymmetric|editorial","background":"solid|gradient|image|video|environment|particles","animation":"float|reveal|orbit|scroll|parallax|morph|particles"}`;

const SECTION = `{"id":"<kebab-case>","title":"<section heading as it will appear>","purpose":"<why the section exists, one line>","content":"<the words the section says: 1 to 3 sentences>","items":[{"title":"","text":"","value":"<optional short value such as a price or number>"}],"requirements":[{"id":"R<n>","kind":"content|functional","text":"<one testable requirement>"}],${VISUAL}}`;

const DRAFT_SYSTEM = `You are a senior product manager and creative director. From one line you write the PRD (product requirements document) for one website. The website will be generated strictly from this PRD: every section becomes a section of the site and every requirement must appear on it, so write requirements that a web page can meet.
${HOUSE}
Write 5 to 9 sections in page order. The first section is the opening screen. The last section closes with the main action.
Each section has 1 to 5 requirements. A "content" requirement is something the page must say or show ("Explain the four chambers of the heart"). A "functional" requirement is something a visitor must be able to do ("Visitors can click each chamber to read what it does", "A booking form with name, email, date and time", "An FAQ where answers open on click", "Visitors can subscribe by email", "Show key statistics as large numbers", "A video plays the heartbeat", "Visitors can search the glossary"). Number requirement ids R1, R2, R3 across the whole PRD.
Give items whenever a section lists things (steps, chambers, services, plans, questions with answers, numbers with labels).
For each section pick a visual direction. Directors: cinematic, luxury, editorial, documentary, futuristic, minimal, scientific, playful, immersive, product. Use a 3D asset ("glb") where a real object is the subject (an organ, a product, a vehicle, a planet); describe it in "subject".
Return JSON with exactly these keys:
{"title":"","name":"<site or business name>","summary":"<2 to 3 sentences>","audience":"","goals":["",""],"tone":"","director":"<the overall director>","accent":"#rrggbb","cta":{"label":"<1 to 3 words>"},"contact":{"email":"","phone":"","address":""},"sections":[${SECTION}]}`;

const SECTION_SYSTEM = `You are a senior product manager. Write ONE more section for an existing website PRD, fitting its story, tone and director.
${HOUSE}
Return JSON with exactly this shape: ${SECTION}`;

const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BODY) return bad("Too much at once.", 413);
  let body: { step?: string; idea?: string; prd?: Prd; title?: string };
  try {
    body = JSON.parse(raw);
  } catch {
    return bad("Bad request.");
  }
  const apiKey = geminiKey();
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";

  if (body.step === "draft") {
    const idea = String(body.idea || "").trim().slice(0, 300);
    if (idea.length < 3) return bad("Say in a few words what the website is for.");
    if (!apiKey || limited(ip)) return NextResponse.json({ ok: true, prd: localDraft(idea), ai: false, note: apiKey ? "Gemini is busy, so the rules drafted this PRD." : "Gemini is not set up here, so the rules drafted this PRD." });
    try {
      const { text, model } = await callGemini(DRAFT_SYSTEM, JSON.stringify({ idea }), apiKey, { temperature: 0.75, maxTokens: 8192, timeout: 40_000 });
      const prd = normalizePrd({ ...(parseJson(text) as object), idea, source: "gemini", model }, idea, "gemini");
      return NextResponse.json({ ok: true, prd, ai: true, model });
    } catch (e) {
      return NextResponse.json({ ok: true, prd: localDraft(idea), ai: false, note: "Gemini did not answer (" + (e as Error).message + "), so the rules drafted this PRD." });
    }
  }

  if (body.step === "section") {
    const prd = body.prd;
    const title = String(body.title || "").trim().slice(0, 90);
    if (!prd || !title) return bad("Name the section to add.");
    const fallback = { id: "", title, purpose: "", content: "", items: [], requirements: [{ kind: "content", text: `Explain ${title.toLowerCase()}` }], visual: { subject: "", asset: "none", director: prd.director } };
    if (!apiKey || limited(ip)) return NextResponse.json({ ok: true, section: fallback, ai: false });
    try {
      const brief = { title: prd.title, summary: prd.summary, tone: prd.tone, director: prd.director, sections: (prd.sections || []).map((s) => s.title), lastRequirement: (prd.sections || []).flatMap((s) => s.requirements || []).length, newSection: title };
      const { text } = await callGemini(SECTION_SYSTEM, JSON.stringify(brief), apiKey, { temperature: 0.7, maxTokens: 2048, timeout: 25_000 });
      return NextResponse.json({ ok: true, section: { ...(parseJson(text) as object), title }, ai: true });
    } catch {
      return NextResponse.json({ ok: true, section: fallback, ai: false });
    }
  }

  return bad("Unknown step.");
}
