import { NextResponse } from "next/server";
import { VISION_MODELS, callGemini, geminiKey, imagePart, limited, parseJson, type GeminiPart } from "@/lib/gemini";
import { REVIEW_SYSTEM, SPEC_SYSTEM, normalizeSpec } from "@/lib/character/sculpt";

// Photo to 3D, the img2threejs way (lib/character/sculpt.ts, docs/CHARACTER-JOURNEY.md), on the
// server so the Gemini key stays here. The browser builds and renders the model; this route only
// reads pictures.
//   POST { step: "spec", image }                  -> { spec }   the picture read into a part tree
//   POST { step: "review", image, render, spec }  -> { spec }   the render compared with the picture, corrected
// Without a key the browser makes a relief from the photo instead (lib/character/relief.ts).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BODY = 3_000_000;

const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BODY) return bad("That picture is too big. Try one under 2 MB.", 413);
  let body: { step?: string; image?: string; render?: string; spec?: unknown; hint?: string };
  try {
    body = JSON.parse(raw);
  } catch {
    return bad("Bad request.");
  }
  const apiKey = geminiKey();
  if (!apiKey) return NextResponse.json({ ok: false, note: "no-key", error: "The AI sculptor is not set up here, so a relief is made from the photo instead." });
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (limited(ip)) return NextResponse.json({ ok: false, note: "busy", error: "The AI sculptor is busy. A relief is made from the photo instead." });
  const image = imagePart(String(body.image ?? ""));
  if (!image) return bad("Send the picture as a PNG, JPEG or WebP.");
  const hint = String(body.hint ?? "").replace(/\s+/g, " ").trim().slice(0, 160);

  if (body.step === "spec") {
    const parts: GeminiPart[] = [image, { text: `Rebuild the main subject of this picture.${hint ? ` The person says it is: ${hint}.` : ""}` }];
    try {
      const { text, model } = await callGemini(SPEC_SYSTEM, parts, apiKey, { models: VISION_MODELS, temperature: 0.35, maxTokens: 8192, timeout: 50_000 });
      const spec = normalizeSpec(parseJson(text));
      if (!spec) return NextResponse.json({ ok: false, note: "model-failed", error: "The sculptor could not read that picture." });
      return NextResponse.json({ ok: true, spec, model });
    } catch {
      return NextResponse.json({ ok: false, note: "model-failed", error: "The sculptor did not answer in time." });
    }
  }

  if (body.step === "review") {
    const spec = normalizeSpec(body.spec);
    const render = imagePart(String(body.render ?? ""));
    if (!spec || !render) return bad("Send the picture, the render and the spec.");
    const parts: GeminiPart[] = [
      { text: "Reference picture:" },
      image,
      { text: "Render of the current model:" },
      render,
      { text: `Current spec:\n${JSON.stringify(spec)}${hint ? `\nThe person says it is: ${hint}.` : ""}` },
    ];
    try {
      const { text, model } = await callGemini(REVIEW_SYSTEM, parts, apiKey, { models: VISION_MODELS, temperature: 0.25, maxTokens: 8192, timeout: 50_000 });
      const next = normalizeSpec(parseJson(text));
      return NextResponse.json({ ok: true, spec: next && next.parts.length >= Math.min(4, spec.parts.length) ? next : spec, model, kept: !next });
    } catch {
      return NextResponse.json({ ok: true, spec, kept: true, note: "model-failed" });
    }
  }

  return bad("Bad request.");
}

export async function GET() {
  return NextResponse.json({ enabled: !!geminiKey() }, { headers: { "cache-control": "no-store" } });
}
