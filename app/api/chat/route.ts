import { NextResponse } from "next/server";
import { callGemini, geminiKey, limited, parseJson, type GeminiTurn } from "@/lib/gemini";
import { CATEGORIES } from "@/lib/categories";
import { MAX_QUESTIONS, answer, charactersFor, closeSummary, nameGiven, normalizeBrief, ruleStep, sectionsFor, startBrief, summary, type Brief, type BriefField, type ChatStep, type ChatTurn } from "@/lib/journey/brief";

// Step 2 of the journey (docs/CHARACTER-JOURNEY.md): the interview, on the server so the Gemini
// key stays here.
//   POST { idea, brief?, turns }  ->  { step }   the next question with answers to tap, or the summary
// Gemini (free tier, Flash Lite first) asks; without a key, when the quota is busy or when its
// answer does not hold up, the rules ask instead, so the interview always moves on.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BODY = 24_000;
const FIELDS: BriefField[] = ["name", "what", "audience", "tone", "sections", "character", "colors", "cta", "email"];

const SYSTEM = `You are the friendly interviewer of a website studio. A person typed one line about what they want to build. You ask short questions, one at a time, to fill in a brief, then stop.
Rules:
- Ask at most ${MAX_QUESTIONS} questions in total. Never ask for something the person already said.
- Each question is one or two short sentences, warm and plain. React to their last answer in a few words first.
- Every question offers 3 to 6 short answers to tap ("chips"), written for THIS idea. The person can also type their own.
- Cover, in a sensible order: the name (if missing, or if a note says it is only a guess), who it is for, how it should feel, what the site must have (multi: true, chips are sections or features), and always, as the last or second last question, the 3D character the whole site is built around.
- The character question: the site stars one 3D model on a coloured gradient, and every colour and font follows it. Offer characters that suit the idea (for a dentist: a friendly robot, a smiling kid, a giant tooth; for a portfolio: "Me, from my photo", an astronaut; for a product: "Our product, from a photo"). Chips may only name everyday things, animals, vehicles, characters such as a robot, astronaut, dragon, warrior, kid, fox, or "Me, from my photo" / "Our logo, from a picture" / "Our product, from a photo". Never a brand or a copyrighted character.
- If the brief has "star", the person already chose the character (brief.character) before the chat: never ask about the character, and name it in the summary.
- Colours: by default they come from the character; ask only if useful, offering "From the character" first.
- Update the brief from every answer: keep what is known, add what was said. Never invent facts (prices, awards, years).
- No em dashes, no emoji, no markdown.
- When the brief has name, audience, tone, sections and character, set done to true and make "reply" a one or two sentence summary of the site to be built: its name, who it is for, how it feels and its star. Do not end with a question; the studio adds the next step itself.
Return JSON exactly like:
{"reply":"<reaction and question, or the summary>","chips":["<3 to 6 answers>"],"field":"<${FIELDS.join("|")}>","multi":false,"done":false,"brief":{"kind":"website|portfolio","business":"<one business id>","name":"","what":"<what it is or offers, a few words; for a portfolio, the person's role, like 3D motion designer>","audience":"","tone":"","sections":[""],"character":"<the character in words>","colors":"","city":"","email":"","cta":"<main action, 1 to 4 words>"}}`;

const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

function turnsOf(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(-24).flatMap((t) => {
    if (!t || typeof t !== "object") return [];
    const r = t as Record<string, unknown>;
    const role = r.role === "ai" ? "ai" : r.role === "me" ? "me" : null;
    const text = String(r.text ?? "").slice(0, 600).trim();
    if (!role || !text) return [];
    const field = FIELDS.includes(r.field as BriefField) ? (r.field as BriefField) : undefined;
    return [{ role, text, field, chips: Array.isArray(r.chips) ? r.chips.slice(0, 6).map((c) => String(c).slice(0, 60)) : undefined, multi: r.multi === true }];
  });
}

/** Holds Gemini's step to the rules: a real question with chips, a known field, within the limit. */
function checked(raw: Record<string, unknown>, base: Brief, turns: ChatTurn[]): ChatStep | null {
  const brief = normalizeBrief(raw.brief, base);
  const asked = turns.filter((t) => t.role === "ai" && t.field).length;
  const reply = String(raw.reply ?? "").replace(/[–—]/g, ",").replace(/\s+/g, " ").trim().slice(0, 420);
  if (!reply) return null;
  const done = raw.done === true || asked >= MAX_QUESTIONS;
  if (done) {
    if (!brief.character) brief.character = charactersFor(brief)[0];
    if (!brief.sections.length) brief.sections = sectionsFor(brief).slice(0, 4);
    return { reply: raw.done === true ? closeSummary(reply, brief) : summary(brief), chips: [], brief, done: true, source: "gemini" };
  }
  const field = FIELDS.includes(raw.field as BriefField) ? (raw.field as BriefField) : undefined;
  const chips = (Array.isArray(raw.chips) ? raw.chips : []).map((c) => String(c).replace(/\s+/g, " ").trim().slice(0, 48)).filter(Boolean).slice(0, 6);
  if (!field || chips.length < 2) return null;
  // The character was chosen before the chat: the rules take the next question instead.
  if (field === "character" && brief.star) return null;
  return { reply, chips, field, multi: raw.multi === true || field === "sections", brief, done: false, source: "gemini" };
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BODY) return bad("Too much at once.", 413);
  let body: { idea?: string; brief?: unknown; turns?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return bad("Bad request.");
  }
  const idea = String(body.idea ?? "").trim().slice(0, 300);
  if (idea.length < 3) return bad("Say in one line what you want to build.");
  const turns = turnsOf(body.turns);
  // The rules read the last answer into the brief first, so a fallback never loses it.
  let brief = normalizeBrief(body.brief, startBrief(idea));
  const lastAi = [...turns].reverse().find((t) => t.role === "ai");
  const lastMe = turns.length && turns[turns.length - 1].role === "me" ? turns[turns.length - 1] : null;
  if (lastAi && lastMe) brief = answer(brief, lastAi.field, lastMe.text);
  const rules = ruleStep(brief, turns);

  const apiKey = geminiKey();
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (!apiKey) return NextResponse.json({ ok: true, step: rules, note: "no-key" });
  if (limited(ip)) return NextResponse.json({ ok: true, step: rules, note: "busy" });

  // A name the studio only guessed from the description ("Fantasy Game Studio") is not theirs yet.
  const guessed = brief.name && !nameGiven(brief) && !turns.some((t) => t.role === "ai" && t.field === "name");
  const note = guessed ? `\n\nNote: the name ${JSON.stringify(brief.name)} is only a guess from the description. Do not call it that yet: ask what it is called, offering the guess as one of the chips.` : "";
  const contents: GeminiTurn[] = [
    { role: "user", parts: [{ text: `What I want to build: ${JSON.stringify(idea)}\n\nWhat the studio already understood (business ids: ${CATEGORIES.map((c) => c.id).join(", ")}):\n${JSON.stringify(brief)}${note}` }] },
    ...turns.map((t): GeminiTurn => ({ role: t.role === "ai" ? "model" : "user", parts: [{ text: t.role === "ai" ? JSON.stringify({ reply: t.text, chips: t.chips ?? [], field: t.field ?? "" }) : t.text }] })),
  ];
  if (contents[contents.length - 1].role !== "user") contents.push({ role: "user", parts: [{ text: "Start the interview." }] });
  try {
    const { text, model } = await callGemini(SYSTEM, contents, apiKey, { temperature: 0.7, maxTokens: 1400, timeout: 16_000 });
    const step = checked(parseJson(text) as Record<string, unknown>, brief, turns);
    if (step) return NextResponse.json({ ok: true, step, model });
    return NextResponse.json({ ok: true, step: rules, note: "model-failed" });
  } catch {
    return NextResponse.json({ ok: true, step: rules, note: "model-failed" });
  }
}

export async function GET() {
  return NextResponse.json({ enabled: !!geminiKey() }, { headers: { "cache-control": "no-store" } });
}
