"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { FAMILIES, SKINS, WIDGET_KINDS, type CharacterDef, type WidgetDef } from "@/template/src/cast.js";
import { CastCharacter, CastWidget } from "@/template/src/Cast.jsx";
import { palette } from "@/template/src/theme.js";
import { themeStyle } from "@/template/src/shared.jsx";
import { useCastLibrary } from "@/lib/library";
import CategorySelect from "@/components/CategorySelect";
import { categoryLabel, fitFor, fitsCharacter, fitsWidget } from "@/lib/fit";
import type { Design } from "@/lib/types";

// The Characters step: 520 characters and 512 widgets, all already animated. Pick one
// character and up to six widgets; the site is then built around them (the opening scene,
// a pinned scroll story, a live widget wall and a character that peeks in near the end).

const PAGE = 36;
const MAX_WIDGETS = 6;

const SAMPLE = {
  name: "Your name",
  first: "You",
  place: "Your city",
  status: "Available now",
  greeting: "Hi! Say hello any time.",
  stats: [
    { value: "48", label: "Projects shipped" },
    { value: "12k", label: "Monthly visitors" },
    { value: "98%", label: "Happy clients" },
  ],
  tags: ["Design", "Brand", "Web", "Motion"],
  steps: ["Plan", "Build", "Launch"],
  rating: "4.9",
  ratingLabel: "from 120 reviews",
  quote: "The best decision we made all year.",
  quoteBy: "A happy client",
  price: "From $900",
  priceLabel: "Starter package",
};

type Ctx = typeof SAMPLE;

export default function CastPicker({ design, onChange, ctx, kind, category }: { design: Design; onChange: (patch: Partial<Design>) => void; ctx?: Partial<Ctx>; kind: string; category: string }) {
  const lib = useCastLibrary();
  const [suit, setSuit] = useState(category);
  const [scope, setScope] = useState<"fit" | "all">("fit");
  const fit = fitFor(suit);
  const suitKind = suit === "portfolio" || suit.startsWith("role-") ? "portfolio" : "website";
  const [tab, setTab] = useState<"characters" | "widgets">("characters");
  const [family, setFamily] = useState("all");
  const [wkind, setKind] = useState("all");
  const [skin, setSkin] = useState("all");
  const [shown, setShown] = useState(PAGE);
  const cast = design.cast;
  const chosenWidgets = (cast?.widgets ?? []) as WidgetDef[];
  const data = { ...SAMPLE, ...ctx } as Ctx;
  const pal = palette(design, design.mode === "dark" ? "dark" : "light");
  const vars = themeStyle(design, pal, design.mode === "dark" ? "dark" : "light") as React.CSSProperties;

  const chars = useMemo(() => {
    const list = lib.characters.filter((c) => (family === "all" || c.family === family) && (scope === "all" || family !== "all" || fitsCharacter(c, fit)));
    // Best fitting families first, in the order the category lists them.
    return scope === "fit" ? [...list].sort((a, b) => fit.families.indexOf(a.family) - fit.families.indexOf(b.family)) : list;
  }, [lib.characters, family, scope, fit]);
  const widgets = useMemo(() => {
    const list = lib.widgets.filter((w) => (wkind === "all" || w.kind === wkind) && (skin === "all" || w.skin === skin) && (scope === "all" || wkind !== "all" || fitsWidget(w, fit)));
    return scope === "fit" ? [...list].sort((a, b) => fit.widgets.indexOf(a.kind) - fit.widgets.indexOf(b.kind)) : list;
  }, [lib.widgets, wkind, skin, scope, fit]);
  const list = tab === "characters" ? chars : widgets;

  const setCharacter = (c: CharacterDef) => onChange({ cast: { character: c, widgets: chosenWidgets }, heroStyle: "stage" });
  const toggleWidget = (w: WidgetDef) => {
    if (!cast) return;
    const has = chosenWidgets.some((x) => x.id === w.id);
    const next = has ? chosenWidgets.filter((x) => x.id !== w.id) : [...chosenWidgets, w].slice(-MAX_WIDGETS);
    onChange({ cast: { ...cast, widgets: next }, heroStyle: "stage" });
  };
  const surprise = () => {
    const pool = chars.length ? chars : lib.characters;
    const c = pool[Math.floor(Math.random() * pool.length)];
    const s = SKINS[Math.floor(Math.random() * SKINS.length)].id;
    const kinds = (scope === "fit" ? fit.widgets.map((id) => ({ id })) : [...WIDGET_KINDS]).sort(() => Math.random() - 0.5).slice(0, MAX_WIDGETS);
    const ws = kinds.map((k) => lib.widgets.find((w) => w.kind === k.id && w.skin === s)).filter(Boolean) as WidgetDef[];
    onChange({ cast: { character: c, widgets: ws }, heroStyle: "stage" });
  };
  const resetPage = () => setShown(PAGE);

  return (
    <div className="cast-picker" style={vars}>
      <div className="panel cast-now">
        <div className="cast-now-char">{cast ? <CastCharacter def={cast.character} size={96} live /> : <span className="muted small">No character</span>}</div>
        <div className="cast-now-text">
          <span className="lbl">Your cast</span>
          <p className="cast-now-name">{cast ? cast.character.name : "Words only, no character"}</p>
          <p className="small muted">
            {cast ? `${chosenWidgets.length} of ${MAX_WIDGETS} widgets chosen. The opening, a scroll story and a widget wall are built around them.` : "Pick a character to build the site around it."}
          </p>
          <div className="cast-now-widgets">
            <AnimatePresence initial={false}>
              {chosenWidgets.map((w) => (
                <motion.button
                  key={w.id}
                  layout
                  className="chip chip-sm is-on"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                  onClick={() => toggleWidget(w)}
                  aria-label={"Remove " + w.name}
                >
                  {w.name}
                  <Icon name="x" size={12} />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>
        <div className="cast-now-actions">
          <button className="btn btn-sm" onClick={surprise}>
            <Icon name="shuffle" size={15} />
            Surprise me
          </button>
          {cast && (
            <button className="btn btn-ghost btn-sm" onClick={() => onChange({ cast: null })}>
              No character
            </button>
          )}
        </div>
      </div>

      <div className="panel stack" style={{ gap: 14 }}>
        <label className="toggle">
          <input type="checkbox" checked={design.castStory !== false} onChange={(e) => onChange({ castStory: e.target.checked })} disabled={!cast} />
          <span>
            <b>Scroll story</b>
            <span className="small muted"> The character stays on screen and turns as people scroll, while your steps and widgets arrive one by one.</span>
          </span>
        </label>
      </div>

      <div className="panel fit-bar">
        <CategorySelect value={suit} onChange={(v) => (setSuit(v), resetPage())} />
        <div className="seg" role="group" aria-label="Show">
          <button aria-pressed={scope === "fit"} className={scope === "fit" ? "is-on" : ""} onClick={() => (setScope("fit"), resetPage())}>
            Best for this
          </button>
          <button aria-pressed={scope === "all"} className={scope === "all" ? "is-on" : ""} onClick={() => (setScope("all"), resetPage())}>
            Everything
          </button>
        </div>
      </div>

      <div className="cast-tabs">
        <div className="seg" role="tablist" aria-label="Choose from">
          <button role="tab" aria-selected={tab === "characters"} className={tab === "characters" ? "is-on" : ""} onClick={() => (setTab("characters"), resetPage())}>
            Characters ({lib.characters.length})
          </button>
          <button role="tab" aria-selected={tab === "widgets"} className={tab === "widgets" ? "is-on" : ""} onClick={() => (setTab("widgets"), resetPage())}>
            Widgets ({lib.widgets.length})
          </button>
        </div>
        {tab === "characters" ? (
          <div className="chips-scroll" role="group" aria-label="Family">
            {[{ id: "all", name: scope === "fit" ? "Best families" : "Every family" }, ...(scope === "fit" ? FAMILIES.filter((f) => fit.families.includes(f.id)).sort((a, b) => fit.families.indexOf(a.id) - fit.families.indexOf(b.id)) : FAMILIES)].map((f) => (
              <button key={f.id} className={"chip chip-sm" + (family === f.id ? " is-on" : "")} aria-pressed={family === f.id} onClick={() => (setFamily(f.id), resetPage())}>
                {f.name}
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="chips-scroll" role="group" aria-label="Widget type">
              {[{ id: "all", name: scope === "fit" ? "Best types" : "Every type" }, ...(scope === "fit" ? WIDGET_KINDS.filter((k) => fit.widgets.includes(k.id)).sort((a, b) => fit.widgets.indexOf(a.id) - fit.widgets.indexOf(b.id)) : WIDGET_KINDS)].map((k) => (
                <button key={k.id} className={"chip chip-sm" + (wkind === k.id ? " is-on" : "")} aria-pressed={wkind === k.id} onClick={() => (setKind(k.id), resetPage())}>
                  {k.name}
                </button>
              ))}
            </div>
            <div className="chips-scroll" role="group" aria-label="Widget style">
              {[{ id: "all", name: "Every style" }, ...SKINS].map((k) => (
                <button key={k.id} className={"chip chip-sm" + (skin === k.id ? " is-on" : "")} aria-pressed={skin === k.id} onClick={() => (setSkin(k.id), resetPage())}>
                  {k.name}
                </button>
              ))}
            </div>
          </>
        )}
        <p className="hint">
          {list.length} {tab} shown{scope === "fit" ? ` that suit ${categoryLabel(suitKind, suit).toLowerCase()}` : ""}{lib.source === "github" ? ", including the latest from your GitHub library" : ""}. {tab === "widgets" ? (cast ? `Choose up to ${MAX_WIDGETS}; they fill with your own words and numbers.` : "Pick a character first.") : "Each one is already animated; the preview shows it on your site."}
        </p>
      </div>

      {tab === "characters" ? (
        <div className="cast-grid">
          {(list as CharacterDef[]).slice(0, shown).map((c) => {
            const on = cast?.character.id === c.id;
            return (
              <button key={c.id} type="button" className={"cast-tile" + (on ? " is-on" : "")} aria-pressed={on} onClick={() => setCharacter(c)}>
                <span className="cast-tile-art">
                  <CastCharacter def={c} size={112} />
                </span>
                <span className="cast-tile-meta">
                  <span className="mono muted">{c.id}</span>
                  <span className="cast-tile-name">{c.name}</span>
                </span>
                {on && (
                  <span className="mt-check" aria-hidden="true">
                    <Icon name="check" size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="cast-grid is-widgets">
          {(list as WidgetDef[]).slice(0, shown).map((w) => {
            const on = chosenWidgets.some((x) => x.id === w.id);
            return (
              <button key={w.id} type="button" className={"cast-tile" + (on ? " is-on" : "")} aria-pressed={on} disabled={!cast} onClick={() => toggleWidget(w)}>
                <span className="cast-tile-art is-widget">
                  <CastWidget def={w} ctx={data} />
                </span>
                <span className="cast-tile-meta">
                  <span className="mono muted">{w.id}</span>
                  <span className="cast-tile-name">{w.name}</span>
                </span>
                {on && (
                  <span className="mt-check" aria-hidden="true">
                    <Icon name="check" size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {list.length > shown && (
        <div className="row" style={{ justifyContent: "center" }}>
          <button className="btn" onClick={() => setShown((n) => n + PAGE)}>
            Show more ({list.length - shown} left)
          </button>
        </div>
      )}
    </div>
  );
}
