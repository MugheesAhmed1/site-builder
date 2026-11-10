# Portfolio Builder

A web app that turns a résumé into a personal portfolio website, step by step, with Claude:

1. **Résumé**: upload a PDF (or paste text). Claude extracts your details; you fix anything in a form.
2. **Design system**: pick a preset (Ledger, Minimal, Neon, Editorial) and tune colours, fonts, corner roundness, animation, hero layout and experience style. Live preview with your own details. You can also describe changes in words.
3. **Questions**: Claude asks 5–7 questions (target role, achievements with numbers, tone, links). Each has a suggested answer.
4. **Portfolio**: Claude writes the site. Preview on desktop and phone, edit every word, turn sections on/off and reorder them, ask Claude for changes, undo.
5. **Deploy**: download a ready React (Vite) project and follow the on-screen steps to publish it free on Vercel.

You approve each step before the next. Changing an earlier step marks later ones "Needs refresh". Everything is saved in your browser; use **Back up all** on the home page to keep a copy.

## Put the builder online (Vercel)

1. Put this folder in a GitHub repository (upload the files on github.com, or `git push`).
2. On https://vercel.com/new, import the repository. Vercel detects Next.js.
3. Before clicking **Deploy**, open **Environment Variables** and add `ANTHROPIC_API_KEY` with a key from https://console.anthropic.com (API keys). Billing is per use.
4. Optional: add `ACCESS_CODE` so only people who know the code can use your key (they enter it under **Settings** in the app).
5. Click **Deploy**.

Visitors can also paste their own Anthropic key under **Settings**; it stays in their browser and is sent only to your server for their requests.

## Run it on your computer

Needs Node.js 20+.

```bash
npm install
cp .env.example .env.local   # then put your key in .env.local
npm run dev                  # open http://localhost:3000
```

To click through without a key, set `MOCK_AI=1` in `.env.local`. Claude is replaced by a fictional sample person.

## Where things live

| What | File |
|---|---|
| Claude's instructions for each step | `lib/prompts.ts` |
| The call to Claude (model, streaming) | `app/api/ai/route.ts` |
| Design presets (incl. "Ledger") | `lib/presets.ts` |
| The portfolio itself (React + CSS, also what users download) | `template/src/Portfolio.jsx`, `template/src/portfolio.css` |
| Builder screens | `app/build/[id]/page.tsx`, `components/` |

The portfolio template is the same code in the preview and in the download, so what you see is what ships. After editing anything in `template/`, `npm run dev` / `npm run build` re-bundles it automatically.

Uses the `claude-opus-5-5` model. A full run (read résumé, questions, write portfolio) is three calls.

## Later: Android app

The builder is a normal website, so the quickest path to an APK is wrapping it with Capacitor or publishing it as a PWA. Not built yet.
