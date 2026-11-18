import { NextResponse } from "next/server";
import { callGemini, geminiKey as key, limited, parseJson as parse } from "@/lib/gemini";
import { cleanText, type RefineRequest, type RefineResult } from "@/lib/refine";

// Server side only. The Gemini key lives in the GEMINI_API_KEY environment variable (set it
// in the Vercel project settings, or in .env.local when running locally) and never reaches
// the browser. Without a key the route answers { enabled: false } and the studio falls back
// to its local tidy-up, so the builder keeps working.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BODY = 40_000;

const RULES = [
  "You are a senior copywriter improving the words of a small website.",
  "Write in the same language as the input.",
  "Never invent facts: no new prices, numbers, awards, years, client names, locations, guarantees or claims that are not already in the input.",
  "Keep names of people, the business, products and places exactly as given.",
  "Do not use em dashes or en dashes. Do not use emoji, markdown, hashtags or quotation marks around whole lines.",
  "Headlines stay short (under 10 words). Buttons stay 1 to 4 words. Paragraphs stay about the same length or shorter.",
  "Plain, specific and warm beats clever. Avoid cliches such as 'elevate', 'unlock', 'seamless', 'cutting-edge', 'look no further'.",
].join("\n");

const TONE: Record<string, string> = {
  keep: "Keep the current tone.",
  warmer: "Make the tone warmer and more personal.",
  bolder: "Make the tone bolder and more confident, with punchier lines.",
  professional: "Make the tone calm, precise and professional.",
  playful: "Make the tone lighter and more playful, without jokes that could confuse.",
  shorter: "Make every line shorter and tighter; cut filler words.",
};

function prompt(r: RefineRequest): { system: string; user: string } {
  const tone = TONE[r.tone ?? "keep"] ?? TONE.keep;
  const note = r.note ? `\nThe owner adds: ${cleanText(r.note, 300)}` : "";
  if (r.task === "headline") {
    return {
      system: RULES,
      user: `${r.brief}\n${tone}${note}\nCurrent words:\n${JSON.stringify(r.copy)}\n\nWrite three different opening headline options for this site. Each has a headline (under 10 words) and a sub line (one sentence, under 28 words). Return JSON: {"headlines":[{"headline":"","sub":""}]}`,
    };
  }
  if (r.task === "faq") {
    return {
      system: RULES,
      user: `${r.brief}\n${tone}${note}\nCurrent words:\n${JSON.stringify(r.copy)}\n\nSuggest four common questions visitors to this site would ask that the site does not answer yet, with short honest answers based only on the words above. Where the answer depends on details you do not have, say to get in touch. Return JSON: {"faq":[{"question":"","answer":""}]}`,
    };
  }
  return {
    system: RULES,
    user: `${r.brief}\n${tone}${note}\nHere are the site's words as a JSON object of field id to text. Improve each one: clearer, more specific, better rhythm, no new facts. Return a JSON object with exactly the same keys and the improved text as values. Keep a value unchanged if it is already good.\n\n${JSON.stringify(r.copy)}`,
  };
}

export async function GET() {
  return NextResponse.json({ enabled: !!key() }, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  const apiKey = key();
  if (!apiKey) return NextResponse.json({ ok: false, source: "local", error: "no-key" } satisfies RefineResult, { status: 200 });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (limited(ip)) return NextResponse.json({ ok: false, source: "local", error: "Too many requests. Try again in a minute." } satisfies RefineResult, { status: 429 });

  const raw = await req.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ ok: false, source: "local", error: "Too much text at once." } satisfies RefineResult, { status: 413 });
  let body: RefineRequest;
  try {
    body = JSON.parse(raw) as RefineRequest;
  } catch {
    return NextResponse.json({ ok: false, source: "local", error: "Bad request." } satisfies RefineResult, { status: 400 });
  }
  if (!body || !["polish", "headline", "faq"].includes(body.task) || typeof body.copy !== "object" || !body.copy) {
    return NextResponse.json({ ok: false, source: "local", error: "Bad request." } satisfies RefineResult, { status: 400 });
  }
  const copy: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.copy).slice(0, 80)) if (typeof v === "string" && k.length < 80) copy[k] = v.slice(0, 600);
  const request: RefineRequest = { task: body.task, tone: body.tone, kind: body.kind === "portfolio" ? "portfolio" : "website", brief: cleanText(String(body.brief ?? ""), 300), copy, note: body.note };

  try {
    const { system, user } = prompt(request);
    const { text, model } = await callGemini(system, user, apiKey);
    const data = parse(text) as Record<string, unknown>;
    const result: RefineResult = { ok: true, source: "gemini", model };
    if (request.task === "polish") {
      const out: Record<string, string> = {};
      for (const k of Object.keys(copy)) if (typeof data[k] === "string") out[k] = cleanText(data[k] as string);
      result.copy = out;
    } else if (request.task === "headline") {
      const list = Array.isArray(data.headlines) ? data.headlines : [];
      result.headlines = list
        .filter((h): h is { headline: string; sub: string } => !!h && typeof h.headline === "string")
        .slice(0, 3)
        .map((h) => ({ headline: cleanText(h.headline, 120), sub: cleanText(String(h.sub ?? ""), 240) }));
    } else {
      const list = Array.isArray(data.faq) ? data.faq : [];
      result.faq = list
        .filter((f): f is { question: string; answer: string } => !!f && typeof f.question === "string" && typeof f.answer === "string")
        .slice(0, 6)
        .map((f) => ({ question: cleanText(f.question, 160), answer: cleanText(f.answer, 420) }));
    }
    return NextResponse.json(result);
  } catch (e) {
    // The message names the model and status only; the key is never part of it.
    return NextResponse.json({ ok: false, source: "local", error: "The writing service did not answer. Your words are unchanged." } satisfies RefineResult, { status: 502 });
  }
}
