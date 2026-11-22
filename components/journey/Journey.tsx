"use client";

import "./journey.css";
import "@/components/character/character.css";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MODELS, modelInfo } from "@/components/character/ModelPicker";
import Interview from "./Interview";
import DesignStep from "./DesignStep";
import TemplateStep, { NEW_TEMPLATE } from "./TemplateStep";
import { applyTweak, type Tweak } from "./design-tweak";
import { designsFor } from "@/lib/character/match";
import { startBrief, type Brief, type ChatTurn } from "@/lib/journey/brief";
import { keepContent, type Content, type TemplateInfo } from "@/lib/templates";
import type { ModelInfo } from "@/lib/character/apply";
import type { DesignSystem } from "@/lib/character/design";
import type { CharacterPalette } from "@/lib/character/palette";

// The journey (docs/CHARACTER-JOURNEY.md), strictly in this order:
//   1. one line: what they want to build
//   2. the AI asks about it (Interview)
//   3. the character and the design system drawn from it (DesignStep)
//   4. the template library, shown as their own site; 5. pick one or create a new template (TemplateStep)
//   6. the studio, where every word, picture, colour, section and the model itself can change
// Progress is kept on this device (big files in IndexedDB), so a reload picks up where it was.

type Step = "idea" | "chat" | "design" | "template";

interface Saved {
  v: 1;
  step: Step;
  idea: string;
  turns: ChatTurn[];
  brief: Brief | null;
  chatDone: boolean;
  model: ModelInfo | null;
  palette: CharacterPalette | null;
  designId: string;
  tweak: Tweak;
  tid: string;
  blocks: string[] | null;
  /** The library model the home page handed over (?star=), once it has been put in place. */
  star?: string;
}

const KEY = "xp-journey:v1";
const EMPTY: Saved = { v: 1, step: "idea", idea: "", turns: [], brief: null, chatDone: false, model: null, palette: null, designId: "", tweak: {}, tid: "", blocks: null };

const STEPS: { id: Step | "studio"; label: string }[] = [
  { id: "idea", label: "Your idea" },
  { id: "chat", label: "Questions" },
  { id: "design", label: "Character and design" },
  { id: "template", label: "Template" },
  { id: "studio", label: "Customise" },
];

const EXAMPLES = ["A dentist clinic in Islamabad", "Portfolio for a 3D motion designer", "A cosy bakery in Lahore", "An electric bike shop", "A kids coding school", "A law firm in Karachi"];

export default function Journey() {
  const router = useRouter();
  const [s, setS] = useState<Saved>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [line, setLine] = useState("");
  const [designs, setDesigns] = useState<DesignSystem[]>([]);
  const [leaving, setLeaving] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const set = (p: Partial<Saved>) => setS((x) => ({ ...x, ...p }));

  // Pick up where they were, or start from a line passed in (?q=… from the home page), with the
  // character they chose there (?star=<library model id>) already in place.
  useEffect(() => {
    let live = true;
    (async () => {
      const params = new URLSearchParams(location.search);
      const q = params.get("q")?.trim() || "";
      const chosen = params.get("star") ? MODELS.find((m) => m.id === params.get("star")) : undefined;
      let saved: Saved | null = null;
      try {
        const raw = JSON.parse(localStorage.getItem(KEY) || "null");
        if (raw && raw.v === 1) {
          const { hydrate } = await import("@/lib/blobstore");
          saved = { ...EMPTY, ...(await hydrate(raw)) };
        }
      } catch {
        /* a bad copy: start again */
      }
      if (!live) return;
      // The character is put in place once per line: a reload keeps any change they made after.
      const star = chosen ? { model: modelInfo(chosen), palette: null, star: chosen.id } : {};
      const starred = (b: Brief): Brief => (chosen ? { ...b, star: chosen.id, character: "the " + chosen.name.toLowerCase() } : b);
      if (q && (!saved || saved.idea !== q)) {
        setS({ ...EMPTY, idea: q, step: "chat", brief: starred(startBrief(q)), ...star });
        setLine(q);
      } else if (saved) {
        // The same line again with another character: keep their answers, swap the star.
        setS(chosen && saved.star !== chosen.id ? { ...saved, ...star, designId: "", brief: saved.brief && starred(saved.brief) } : saved);
        setLine(saved.idea);
      }
      setLoaded(true);
    })();
    return () => {
      live = false;
    };
  }, []);

  // Keep progress (big model files go to IndexedDB, the rest to localStorage).
  useEffect(() => {
    if (!loaded) return;
    const id = setTimeout(async () => {
      try {
        const { dehydrate } = await import("@/lib/blobstore");
        localStorage.setItem(KEY, JSON.stringify(await dehydrate(s, "journey")));
      } catch {
        /* private mode: progress lasts for this visit only */
      }
    }, 400);
    return () => clearTimeout(id);
  }, [s, loaded]);

  // The design directions follow the character.
  useEffect(() => {
    let live = true;
    if (!s.model || !s.brief) return setDesigns([]);
    const words = [s.brief.character, s.brief.tone, s.brief.what, s.model.name, s.brief.colors].filter(Boolean);
    designsFor(s.model.preview, words, { palette: s.palette, business: s.brief.business }).then((r) => {
      if (!live) return;
      setDesigns(r.designs);
      setS((x) => (r.designs.some((d) => d.id === x.designId) ? x : { ...x, designId: r.designs[0]?.id || "" }));
    });
    return () => {
      live = false;
    };
  }, [s.model?.preview, s.palette, s.brief?.business]); // eslint-disable-line react-hooks/exhaustive-deps

  const base = designs.find((d) => d.id === s.designId) || designs[0] || null;
  const design = useMemo(() => (base ? applyTweak(base, s.tweak) : null), [base, s.tweak]);

  useEffect(() => {
    if (loaded) top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [s.step]); // eslint-disable-line react-hooks/exhaustive-deps

  function begin(idea = line) {
    const q = idea.trim();
    if (q.length < 3) return;
    setLine(q);
    setS({ ...EMPTY, idea: q, step: "chat", brief: startBrief(q) });
    const u = new URL(location.href);
    u.searchParams.set("q", q);
    history.replaceState(null, "", u);
  }

  async function customise(t: TemplateInfo, c: Content) {
    setLeaving(true);
    await keepContent(t.id, c);
    router.push(`/templates/${t.id}?from=journey`);
  }

  function restart() {
    setS(EMPTY);
    setLine("");
    const u = new URL(location.href);
    u.searchParams.delete("q");
    history.replaceState(null, "", u);
  }

  const reached: Record<Step | "studio", boolean> = {
    idea: true,
    chat: !!s.idea,
    design: s.chatDone,
    template: s.chatDone && !!s.model && !!design,
    studio: false,
  };
  const at = STEPS.findIndex((x) => x.id === s.step);

  return (
    <div className={`jr jr-at-${s.step}`} ref={top}>
      <nav className="jr-steps" aria-label="Steps">
        <ol>
          {STEPS.map((x, i) => {
            const can = x.id !== "studio" && reached[x.id] && x.id !== s.step;
            return (
              <li key={x.id} className={i < at ? "is-done" : i === at ? "is-now" : ""} aria-current={i === at ? "step" : undefined}>
                <button type="button" disabled={!can} onClick={() => can && set({ step: x.id as Step })}>
                  <span className="jr-step-n">{i + 1}</span>
                  <span className="jr-step-l">{x.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
        {s.idea && (
          <button type="button" className="linklike small jr-restart" onClick={restart}>
            Start over
          </button>
        )}
      </nav>

      {s.step === "idea" && (
        <section className="jr-idea-step" aria-labelledby="jr-h">
          <p className="eyebrow">
            <span className="mono">Step 1 · Your idea</span>
          </p>
          <h1 id="jr-h">What do you want to build?</h1>
          <p className="lede">One line is enough. A few quick questions follow, then a 3D character, a design system drawn from it, and a whole site you can change in every detail.</p>
          <form
            className="jr-line"
            onSubmit={(e) => {
              e.preventDefault();
              begin();
            }}
          >
            <label className="sr-only" htmlFor="jr-line">
              What do you want to build?
            </label>
            <input id="jr-line" value={line} onChange={(e) => setLine(e.target.value)} placeholder="A dentist clinic in Islamabad" autoComplete="off" maxLength={300} autoFocus />
            <button type="submit" className="btn btn-primary" disabled={line.trim().length < 3}>
              Start
            </button>
          </form>
          <div className="jr-chips" aria-label="Examples">
            {EXAMPLES.map((x) => (
              <button key={x} type="button" className="chip chip-sm" onClick={() => begin(x)}>
                {x}
              </button>
            ))}
          </div>
        </section>
      )}

      {s.step === "chat" && s.brief && (
        <>
          <header className="jr-head">
            <p className="eyebrow">
              <span className="mono">Step 2 · Questions</span>
            </p>
            <h1>A few questions about it</h1>
          </header>
          <Interview idea={s.idea} brief={s.brief} turns={s.turns} done={s.chatDone} onChange={(brief, turns, chatDone) => set({ brief, turns, chatDone })} onNext={() => set({ step: "design" })} />
        </>
      )}

      {s.step === "design" && s.brief && (
        <DesignStep
          brief={s.brief}
          model={s.model}
          designs={designs}
          design={design}
          designId={s.designId}
          tweak={s.tweak}
          onModel={(model, palette) => set({ model, palette: palette ?? null })}
          onDesign={(designId) => set({ designId })}
          onTweak={(tweak) => set({ tweak })}
          onNext={() => set({ step: "template" })}
        />
      )}

      {s.step === "template" && s.brief && design && (
        <TemplateStep
          brief={s.brief}
          design={design}
          model={s.model}
          tid={s.tid}
          blocks={s.blocks}
          onPick={(tid) => set({ tid })}
          onBlocks={(blocks) => set({ blocks, tid: NEW_TEMPLATE })}
          onCustomise={customise}
        />
      )}

      {leaving && (
        <p className="jr-leaving" role="status">
          Opening the studio…
        </p>
      )}
    </div>
  );
}
