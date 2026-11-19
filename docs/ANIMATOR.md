# Animator engine

One line in, a moving site out. At `/create`, a person types what the business is ("dentist clinic in isb") and the engine builds a whole site from the templates and the shared library, ready to change in the template studio or download.

## Steps

1. **Read the query** (`localPlan` in `lib/animator.ts`). The rules find the business type (`classify` in `lib/categories.ts`), site or portfolio, the city (short names like `isb`, `lhr`, `khi` expand), and a name. They rank the templates for that business (filed business types first, then the nearest feel from `NEAREST`) and pick library blocks made for it, with effects by motion level.
2. **Master prompt** (`POST /api/animate {step:"plan", query}`). Gemini, given the query, what the rules understood, and the catalogue of templates and blocks, writes the master prompt (who, audience, offer, voice, the page's story, look, motion, call to action) and chooses the name, accent, fonts, motion, template and blocks. `normalizePlan` keeps only valid choices and fills gaps from the rules.
3. **Write every word** (`POST /api/animate {step:"write", plan}`). `slotsOf` lists every text field of the chosen template and its blocks with the template's own words as the example (the examples the templates were built from). Gemini rewrites them in up to three parallel parts of 55, matching each example's role, length, line count and `a | b` parts. Links, emails, prices and numbers are never slots.
4. **Build** (`buildContent`). The template's content with the new words; the business name everywhere; the owner's contact emails replaced; every colour moved to the accent's hue with its own lightness kept, so contrast holds; heading and text fonts; calm sites switch off the loudest effects; blocks with business-matched library pictures.

The person can edit the master prompt and rewrite from it, switch template (the words are rewritten for it), change the accent and motion, then open it in the studio (`saveContent` then `/templates/<id>`), where every part stays editable, or download the site.

## Without Gemini

`GEMINI_API_KEY` (server only, in the Vercel project settings, never in the repo) switches the AI steps on. Without it, or when the free quota is busy, the plan comes from the rules and `localTexts` writes the opening, search text, services and call to action; the rest keep the template's words with the new name. A person always gets a site.

| Piece | File |
| --- | --- |
| Engine: plan, slots, colour shift, build | `lib/animator.ts` |
| Gemini calls, shared with `/api/refine` | `lib/gemini.ts` |
| API | `app/api/animate/route.ts` |
| Page | `app/create/page.tsx`, `components/create/Animator.tsx` |


## Art direction and 3D assets

The plan step also returns an art direction and an asset plan. Gemini or the rules describe the visuals in words, and never as file names or URLs. The server resolves each one against the asset library (docs/ASSETS.md), and the panel shows what was found, its cost and its licence. "Build it as a 3D experience instead" opens a studio project built around the resolved model.
