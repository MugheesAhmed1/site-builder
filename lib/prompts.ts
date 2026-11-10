import type { AiRequest } from "./types";

// The instructions Claude gets at each step. Edit the wording here to change how
// the builder writes. Every task answers with JSON only, so the app can show it in forms.

export const SYSTEM = `You are the writer and designer inside Portfolio Builder, an app that turns a person's résumé into a personal portfolio website.

Ground rules:
- Use only facts from the résumé and the person's answers. Never invent employers, dates, numbers, clients, awards or links. If a number would help but is not given, leave it out rather than guess.
- Write in plain, confident, specific language. Lead with outcomes. No buzzword soup, no filler, no clichés like "passionate about", "results-driven" or "leveraging", no emojis.
- Never use em dashes or en dashes (— or –) anywhere. Use commas, full stops or the word "to" for ranges.
- Keep the person's own vocabulary and names exactly (companies, products, titles).
- Reply with one JSON object only, no Markdown fences and no commentary before or after it.`;

const PROFILE_SHAPE = `{
  "name": string, "headline": string, "location": string, "email": string, "phone": string,
  "links": [{"label": string, "url": string}],
  "summary": string,
  "experience": [{"company": string, "role": string, "start": string, "end": string, "location": string, "bullets": [string]}],
  "projects": [{"name": string, "description": string, "tags": [string], "link": string}],
  "skills": [string],
  "education": [{"school": string, "degree": string, "year": string}],
  "certifications": [{"name": string, "issuer": string, "year": string}]
}`;

const CONTENT_SHAPE = `{
  "meta": {"title": string, "description": string},
  "hero": {"name": string, "role": string, "rotatingRoles": [string], "tagline": string, "intro": string, "location": string, "availability": string, "photoUrl": string, "resumeUrl": string},
  "stats": [{"value": number, "suffix": string, "label": string}],
  "about": {"heading": string, "paragraphs": [string]},
  "process": [{"title": string, "description": string}],
  "experience": [{"company": string, "role": string, "start": string, "end": string, "location": string, "summary": string, "highlights": [string], "tags": [string]}],
  "projects": [{"name": string, "category": string, "summary": string, "impact": string, "tags": [string], "link": string}],
  "skills": [{"group": string, "items": [string]}],
  "education": [{"school": string, "degree": string, "year": string}],
  "certifications": [{"name": string, "issuer": string, "year": string, "link": string}],
  "testimonials": [{"quote": string, "name": string, "role": string}],
  "contact": {"heading": string, "blurb": string, "email": string, "phone": string, "linkedin": string, "github": string, "website": string},
  "sections": [one or more of "stats","about","process","experience","projects","skills","education","certifications","testimonials","contact", in display order]
}`;

const DESIGN_SHAPE = `{
  "preset": string,
  "mode": "auto" | "light" | "dark",
  "hue": number 0-360 (the slight tint in backgrounds, text and lines),
  "tint": number 0-0.04 (how strong that tint is; 0.01 is subtle),
  "accent": hex (the single accent colour),
  "fonts": {"display": Google Font name, "body": Google Font name, "mono": Google Font name},
  "radius": number 0-24,
  "motion": "none" | "subtle" | "expressive",
  "heroStyle": "statement" | "portrait",
  "experienceStyle": "ledger" | "timeline" | "list"
}`;

type Block =
  | { type: "text"; text: string }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } };

export function buildPrompt(req: AiRequest): { content: Block[]; effort: "low" | "medium" | "high" } {
  switch (req.task) {
    case "extract": {
      const content: Block[] = [];
      if (req.pdfBase64) {
        content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: req.pdfBase64 } });
      }
      content.push({
        type: "text",
        text: `${req.resumeText ? `Résumé text:\n"""\n${req.resumeText}\n"""\n\n` : ""}Read this résumé and extract it into this JSON shape:
${PROFILE_SHAPE}

Copy facts faithfully. Use "" or [] for anything missing. Keep each bullet as written (lightly tidied). Put dates as written, e.g. "Jan 2022" and "Present".`,
      });
      return { content, effort: "low" };
    }
    case "questions":
      return {
        effort: "medium",
        content: [
          {
            type: "text",
            text: `Here is the person's profile, taken from their résumé:
${JSON.stringify(req.profile, null, 2)}

Their chosen look: ${req.design.preset} preset, ${req.design.motion} motion.

Ask 5 to 7 short questions whose answers will make their portfolio clearly better than the résumé alone. Prioritise:
1. Who the portfolio is for (target role, industry, recruiters vs clients).
2. The 2-3 achievements or projects to feature, and any real numbers behind them (users, revenue, growth, time saved).
3. How they like to work (their method or process), if it fits their field.
4. Tone (e.g. confident and formal, warm and friendly, playful).
5. Links and assets: LinkedIn, GitHub, a photo URL, a hosted résumé URL, availability status.
6. Anything missing from the résumé that a visitor would want to see.

Skip anything the profile already answers. For each question give a suggested answer drawn from the résumé, so they can accept it with one click.

Reply with JSON: {"questions": [{"id": "q1", "question": string, "why": string (one short line on how it improves the site), "suggested": string}]}`,
          },
        ],
      };
    case "build": {
      const qa = req.questions
        .map((q) => `Q: ${q.question}\nA: ${q.answer.trim() || `${q.suggested} (suggested default, not confirmed)`}`)
        .join("\n\n");
      return {
        effort: "medium",
        content: [
          {
            type: "text",
            text: `Write the content for this person's portfolio website.

Profile from their résumé:
${JSON.stringify(req.profile, null, 2)}

Their answers:
${qa}

Design they chose: ${req.design.preset} (experience shown as ${req.design.experienceStyle}).

Return JSON in exactly this shape:
${CONTENT_SHAPE}

Guidance:
- hero.tagline: the big headline. One sharp statement of the value they bring, 9 words or fewer so it fits on two lines. Specific to them, not a generic slogan.
- hero.intro: one sentence, 20 words or fewer, with concrete proof (years, domain, scale).
- hero.role: their title. hero.rotatingRoles: 2-3 short focus labels (2-3 words each). hero.availability: short status like "Open to new roles", or "" if unknown.
- stats: 3-4 numbers that come straight from the résumé or answers (e.g. years of experience you can compute from dates, users reached). value is a plain number, suffix like "+", "K+", "%" or " yrs". If there are no real numbers, return [].
- about: heading is a short specific phrase (not "About me"); 2-3 short paragraphs in first person, the first one the strongest.
- process: 3-5 steps of how they work, only if it fits their field and their answers; otherwise [].
- experience: newest first. summary is one line; highlights are 2-4 outcome-led bullets rewritten from their résumé; tags are 2-5 skills or domains.
- projects: their real projects or notable products from their roles. category groups them for filter tabs (use 2-4 categories). impact is one line with a result, or "" if none is known.
- skills: 3-5 groups.
- testimonials: [] unless the person supplied real quotes.
- sections: include only sections that have content, in the order that best sells this person. Always end with "contact".
- Leave photoUrl, resumeUrl, links as "" unless given.`,
          },
        ],
      };
    }
    case "revise":
      return {
        effort: "medium",
        content: [
          {
            type: "text",
            text: `Here is the current content of the person's portfolio:
${JSON.stringify(req.content, null, 2)}

For reference, their résumé profile:
${JSON.stringify(req.profile, null, 2)}

They asked for this change:
"""${req.instruction}"""

Apply the change and return the complete updated content JSON in the same shape. Keep everything they did not ask to change exactly as it is.`,
          },
        ],
      };
    case "design":
      return {
        effort: "low",
        content: [
          {
            type: "text",
            text: `Here is a portfolio's current design system:
${JSON.stringify(req.design, null, 2)}
${req.profile ? `\nThe portfolio belongs to: ${req.profile.name}, ${req.profile.headline}.` : ""}

They asked: """${req.instruction}"""

Return the complete updated design JSON in this shape:
${DESIGN_SHAPE}

Use one accent colour only. Avoid purple-to-blue palettes and default fonts like Inter, Roboto or Arial. The app derives readable light and dark palettes from hue, tint and accent automatically. Keep values they did not ask to change.`,
          },
        ],
      };
  }
}
