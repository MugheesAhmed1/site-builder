import { NextResponse } from "next/server";
import { buildContent, catalog, cleanWords, localPlan, localTexts, normalizePlan, slotBrief, slotsOf, type MasterPlan } from "@/lib/animator";
import { callGemini, geminiKey, limited, parseJson } from "@/lib/gemini";
import { CATEGORIES } from "@/lib/categories";
import { templateById } from "@/lib/templates";
import { resolveArtPlan } from "@/lib/animator-art";

// The animator engine's two AI steps (lib/animator.ts), on the server so the Gemini key stays here.
//   POST { step: "plan", query }          -> { plan }      the master prompt and its choices
//   POST { step: "write", plan }          -> { texts }     every word slot of the chosen template
// Without a key, or when the model does not answer, both fall back to the rules, so a person
// always gets a site.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BODY = 20_000;

const HOUSE = [
  "Never invent facts that would mislead a visitor: no prices, awards, certifications, years in business, client names, review scores or guarantees.",
  "Where a number is part of the design (a stat, a step number), use honest generic ones such as step numbers, or phrase it without a figure.",
  "Do not use em dashes or en dashes. No emoji, no markdown, no hashtags.",
  "Avoid cliches such as 'elevate', 'unlock', 'seamless', 'cutting-edge', 'look no further', 'world-class'.",
].join("\n");

const PLAN_SYSTEM = `You are the creative director of a website studio. From a short query you write the master prompt for one website or portfolio and choose how it is built from the studio's templates and blocks.
${HOUSE}
Expand short place names (isb is Islamabad, lhr is Lahore, khi is Karachi). If the query names no business, invent a short, believable, local-sounding name.
Choose the template whose feel suits the business best even if it was made for another trade: every word, colour and font in it will be rewritten.
Choose 2 to 5 blocks in page order that help this business (for a clinic: before and after, counting numbers, a numbered list for the visit, a contact form). Use effects only when the motion is lively or bold.
Return JSON with exactly these keys:
{"kind":"website|portfolio","business":"<one business id>","name":"","city":"","audience":"","tone":"","accent":"#rrggbb","fonts":{"display":"<Google Fonts family>","body":"<Google Fonts family>"},"motion":"calm|lively|bold","template":"<template id>","blocks":["<block id>"],"prompt":"<the master prompt: 8 to 14 lines covering who the business is, audience, offer, voice, the story the page tells from top to bottom, the look (colour, type, imagery), motion, and the call to action>",
"artDirection":{"visualStyle":"<e.g. luxury editorial>","mood":"<one or two words>","density":"minimal|balanced|rich","depth":<1-10>,"lighting":"studio|cinematic|natural|night|interior|urban","typography":"editorial-serif|grotesk|mono-tech|rounded","composition":"hero-object|split|centered|immersive","styleTags":["<3 to 5 of: luxury, premium, minimal, editorial, realistic, stylized, low-poly, playful, cinematic, futuristic, warm, natural, classic, vintage>"],"preferredVisuals":["<3 or 4>"],"avoid":["<2 or 3>"]},
"assets":[{"role":"hero-product|hero-character|supporting|lighting","query":"<what the visitor should see, described in words, e.g. premium black sunglasses>","style":["<style tags>"],"colors":["<colour words>"]}]}
Art direction comes first and every visual follows it. In "assets" describe concepts only (one hero, a lighting mood such as "studio softbox", optionally one supporting object). NEVER write a file name, a path, a URL or a brand: the studio's own library resolves each description to a licensed local file.`;

const WRITE_SYSTEM = `You are a senior copywriter writing every word of one website, following a master prompt.
${HOUSE}
You get a JSON object of slots. Each has "what" (where it sits on the page) and "example" (the words the template had, written for a different business). Write new words for THIS business in each slot.
Match each example's role and length closely: a one-word menu label stays one word, a button stays 1 to 4 words, a headline stays as short as the example. If the example has several lines, write the same number of lines; if its lines use " | " to separate parts, keep the same number of parts in each line, in the same order.
Keep labels such as "Menu", "Close", "Send" plain and useful. Keep the business name exactly as given.
Return one JSON object with exactly the same keys and your new text as each value.`;

const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BODY) return bad("Too much at once.", 413);
  let body: { step?: string; query?: string; plan?: Partial<MasterPlan> };
  try {
    body = JSON.parse(raw);
  } catch {
    return bad("Bad request.");
  }
  const apiKey = geminiKey();
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";

  if (body.step === "plan") {
    const query = String(body.query || "").trim().slice(0, 300);
    if (query.length < 3) return bad("Say what the business is, for example: dentist clinic in isb.");
    const fallback = localPlan(query);
    const withAssets = (p: MasterPlan): MasterPlan => (p.art && p.assets ? { ...p, resolved: resolveArtPlan({ art: p.art, assets: p.assets }) } : p);
    if (!apiKey) return NextResponse.json({ ok: true, plan: withAssets(fallback), note: "no-key" });
    if (limited(ip)) return NextResponse.json({ ok: true, plan: withAssets(fallback), note: "busy" });
    try {
      const { text, model } = await callGemini(PLAN_SYSTEM, `Query: ${JSON.stringify(query)}\n\nWhat the rules already understood (improve on it): ${JSON.stringify({ business: fallback.business, kind: fallback.kind, city: fallback.city, name: fallback.name })}\n\nBusiness ids: ${JSON.stringify(catalogIds())}\n\nStudio catalogue:\n${JSON.stringify(catalog())}`, apiKey, { temperature: 0.9, maxTokens: 3000, timeout: 25_000 });
      const plan = normalizePlan({ ...(parseJson(text) as Record<string, unknown>), source: "gemini", model }, fallback);
      return NextResponse.json({ ok: true, plan: withAssets(plan) });
    } catch {
      return NextResponse.json({ ok: true, plan: withAssets(fallback), note: "model-failed" });
    }
  }

  if (body.step === "write") {
    const fallback = localPlan(String(body.plan?.query || "website"));
    const plan = normalizePlan((body.plan || {}) as Record<string, unknown>, fallback);
    const t = templateById(plan.template);
    if (!t) return bad("Unknown template.");
    const rules = localTexts(t, plan);
    if (!apiKey) return NextResponse.json({ ok: true, texts: rules, note: "no-key" });
    if (limited(ip)) return NextResponse.json({ ok: true, texts: rules, note: "busy" });
    const slots = slotsOf(t, buildContent(t, plan));
    // Up to three parts at once, so a long template is written well within the time limit.
    const parts: (typeof slots)[] = [];
    for (let i = 0; i < slots.length; i += 55) parts.push(slots.slice(i, i + 55));
    const brief = `Master prompt:\n${plan.prompt}\n\nBusiness name: ${plan.name}${plan.city ? `\nCity: ${plan.city}` : ""}\nVoice: ${plan.tone}`;
    const results = await Promise.allSettled(
      parts.slice(0, 3).map((part) => callGemini(WRITE_SYSTEM, `${brief}\n\nSlots:\n${JSON.stringify(slotBrief(part))}`, apiKey, { temperature: 0.8, maxTokens: 8192, timeout: 45_000 })),
    );
    const texts: Record<string, string> = { ...rules };
    let model = "";
    results.forEach((r, i) => {
      if (r.status !== "fulfilled") return;
      model = r.value.model;
      try {
        const data = parseJson(r.value.text) as Record<string, unknown>;
        for (const s of parts[i]) if (typeof data[s.key] === "string" && (data[s.key] as string).trim()) texts[s.key] = cleanWords(data[s.key] as string, Math.max(80, s.example.length * 3));
      } catch {
        /* that part keeps the template's words with the new name */
      }
    });
    const written = Object.keys(texts).length - Object.keys(rules).filter((k) => texts[k] === rules[k]).length;
    return NextResponse.json({ ok: true, texts, model, written, total: slots.length, note: written ? undefined : "model-failed" });
  }

  return bad("Bad request.");
}

const catalogIds = () => CATEGORIES.map((c) => c.id);

export async function GET() {
  return NextResponse.json({ enabled: !!geminiKey() }, { headers: { "cache-control": "no-store" } });
}
