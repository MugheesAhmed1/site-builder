# Site Builder

Type one line, such as "website for my bakery in Lahore" or "portfolio for me, I'm a product manager", and get a React site you can download and publish for free.

**No AI anywhere.** Everything runs in the browser:

- **Reading the request.** Keyword rules in `lib/categories.ts` decide portfolio or website, and which of 12 business types it is. You can change the guess.
- **Questions.** These are fixed lists in `lib/questions.ts`. There is one list for portfolios and one for websites, tailored to the business type: it asks for hours and an address only where people visit, and for prices only where it fits. Most questions come with a suggested answer.
- **Résumé.** PDFs are read on the device with pdf.js (`lib/resume.ts`), and the text is split by common headings and date ranges. Nothing is uploaded.
- **Words.** Rules and templates in `lib/compose.ts` write every section. Numbers in results become counters, skills are grouped and steps are set per role or business. There are no em or en dashes.
- **Design systems.** `lib/designs.ts` has 240 systems: 4 hand-made and 236 generated from curated type pairings, accents, neutral tints, shapes and layouts. You can work with them in these ways:
  - Every person gets their own system, seeded from their name, request and chosen tone.
  - **Shuffle** makes a brand-new system.
  - **Remix** re-rolls one part: colour, type, shape or layout.
  - **Lock** keeps a part fixed while you shuffle.
  - **Save** keeps your own systems for later.
- **Colour optimizer.** There are seven harmony options: matched, analogous, complementary, split, triadic, calm and vivid. You can also build around a brand colour. Contrast ratios are shown for light and dark, and accents are adjusted automatically to pass WCAG AA (4.5 to 1).

The downloaded site is a Vite and React project (`template/`). All words and settings live in `src/site-data.json`. Design follows the Taste Skill, Impeccable and Emil Kowalski rules: OKLCH tinted neutrals, one accent, ease-out motion under 300ms, press states, hover only on real pointers, and reduced motion respected.

## Run the builder

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

To deploy the builder itself on Vercel, import the repository. It needs no environment variables and no API keys.

## Files

- `app/page.tsx`: the home page, where you type your request.
- `app/build/[id]/page.tsx`: the five steps (start, questions, design, your site, deploy).
- `components/DesignEditor.tsx`: tune, shuffle, remix, lock, optimize, and the library.
- `template/src/Portfolio.jsx` and `Website.jsx`: the two site templates, also used for the live preview.
- `template/src/theme.js`: OKLCH palettes for light and dark, with contrast fitting.
