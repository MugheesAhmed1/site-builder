// Google Gemini on the server, shared by /api/refine and /api/animate. The key lives in the
// GEMINI_API_KEY environment variable and never reaches the browser or the repo. Free-tier
// models are tried in order until one answers.

export const MODELS = [process.env.GEMINI_MODEL, "gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-flash-latest"].filter(Boolean) as string[];
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/";

export const geminiKey = () => (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "").trim();

// A small per-instance limit so one open tab cannot run through the free quota.
const hits = new Map<string, number[]>();
export function limited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 12;
}

export async function callGemini(system: string, user: string, apiKey: string, opts: { temperature?: number; maxTokens?: number; timeout?: number } = {}): Promise<{ text: string; model: string }> {
  let last = "No model answered";
  for (const model of MODELS) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), opts.timeout ?? 18_000);
    try {
      const res = await fetch(ENDPOINT + encodeURIComponent(model) + ":generateContent", {
        method: "POST",
        signal: ctl.signal,
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { responseMimeType: "application/json", temperature: opts.temperature ?? 0.7, maxOutputTokens: opts.maxTokens ?? 4096 },
        }),
      });
      if (!res.ok) {
        last = `${model}: ${res.status}`;
        if (res.status === 400 || res.status === 401 || res.status === 403) break; // a key problem: other models will say the same
        continue;
      }
      const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (text) return { text, model };
      last = `${model}: empty answer`;
    } catch (e) {
      last = `${model}: ${(e as Error).name === "AbortError" ? "timed out" : "unreachable"}`;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(last);
}

export function parseJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  return JSON.parse(t);
}

