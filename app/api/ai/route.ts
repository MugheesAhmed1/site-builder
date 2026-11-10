import Anthropic from "@anthropic-ai/sdk";
import { buildPrompt, SYSTEM } from "@/lib/prompts";
import { mockAnswer } from "@/lib/mock";
import type { AiRequest } from "@/lib/types";

// The only place that talks to Claude. The browser sends a task (extract, questions,
// build, revise, design) and gets Claude's answer streamed back as plain text.

export const runtime = "nodejs";
export const maxDuration = 300;

const MODEL = "claude-opus-5-5";
const ERROR_MARK = "\n[[ERROR]]";

export async function POST(request: Request) {
  const accessCode = process.env.ACCESS_CODE;
  if (accessCode && request.headers.get("x-access-code") !== accessCode) {
    return new Response("Wrong or missing access code. Add it in Settings.", { status: 401 });
  }

  let body: AiRequest;
  try {
    body = (await request.json()) as AiRequest;
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY || request.headers.get("x-anthropic-key") || "";
  const encoder = new TextEncoder();

  if (!apiKey) {
    if (process.env.MOCK_AI === "1") {
      const text = mockAnswer(body);
      const stream = new ReadableStream({
        async start(controller) {
          for (let i = 0; i < text.length; i += 400) {
            controller.enqueue(encoder.encode(text.slice(i, i + 400)));
            await new Promise((r) => setTimeout(r, 15));
          }
          controller.close();
        },
      });
      return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    return new Response(
      "No Anthropic API key. Set ANTHROPIC_API_KEY on the server, or paste your own key in Settings.",
      { status: 401 }
    );
  }

  const { content, effort } = buildPrompt(body);
  const client = new Anthropic({ apiKey });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const s = client.beta.messages.stream({
          model: MODEL,
          max_tokens: 32000,
          system: SYSTEM,
          messages: [{ role: "user", content }],
          output_config: { effort },
          // If a safety check declines the request, Anthropic retries it on a suitable model.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        });
        s.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
        const final = await s.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode(`${ERROR_MARK} Claude declined this request. Try rewording it.`));
        } else if (final.stop_reason === "max_tokens") {
          controller.enqueue(encoder.encode(`${ERROR_MARK} The answer was too long and got cut off. Try again.`));
        }
      } catch (err) {
        let msg = "Something went wrong talking to Claude.";
        if (err instanceof Anthropic.AuthenticationError) msg = "The Anthropic API key was rejected. Check it in Settings or on the server.";
        else if (err instanceof Anthropic.RateLimitError) msg = "Rate limited by Anthropic. Wait a minute and try again.";
        else if (err instanceof Anthropic.APIError) msg = `Anthropic API error (${err.status ?? "network"}): ${err.message}`;
        else if (err instanceof Error) msg = err.message;
        controller.enqueue(encoder.encode(`${ERROR_MARK} ${msg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
