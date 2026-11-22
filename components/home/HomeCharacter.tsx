"use client";

import "./home-character.css";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import CharacterView from "@/components/character/CharacterView";
import Icon from "@/components/Icon";
import { designOptions, moodWords, tokens, tradeAccent, type DesignSystem, type Tokens } from "@/lib/character/design";
import { paletteFromPixels } from "@/lib/character/palette";
import { FIRST, SHOWCASE, type Showcase } from "./showcase";

// The home page's opening, and the one idea the whole product rests on: a 3D character, and a
// site that follows it. The page itself does what a generated site does: when the character
// changes, its colours are read from the model's still (the journey's own code), a design system
// is drawn from them, and the page's accent, stage and tint move to it. Three.js loads only after
// the page is usable; until then the model's still stands in (CharacterView keeps it up until
// three.js has drawn the model, so the stage is never empty).

export interface Look {
  /** The design system the journey would offer first, and all five it draws. */
  d: DesignSystem;
  ds: DesignSystem[];
  k: Tokens;
}

interface HomeCharacter {
  i: number;
  s: Showcase;
  /** The characters on offer: the showcase, and one picked from the library further down. */
  list: Showcase[];
  look: Look | null;
  looks: (Look | null)[];
  /** True once the visitor chose a character themselves. */
  picked: boolean;
  pick: (i: number) => void;
  /** Makes any library model the star, from anywhere on the page. */
  pickModel: (s: Showcase) => void;
  /** Stops the turning to the next character for a while (the visitor is looking at this one). */
  hold: (on: boolean) => void;
}

const Ctx = createContext<HomeCharacter | null>(null);
export const useHomeCharacter = () => useContext(Ctx);

/** A character's design system, from its still, as the journey draws it. */
async function lookOf(s: Showcase): Promise<Look | null> {
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = s.preview;
    await img.decode();
    const k = Math.min(1, 128 / Math.max(img.naturalWidth, img.naturalHeight, 1));
    const w = Math.max(8, Math.round(img.naturalWidth * k));
    const h = Math.max(8, Math.round(img.naturalHeight * k));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const x = c.getContext("2d", { willReadFrequently: true });
    if (!x) return null;
    x.drawImage(img, 0, 0, w, h);
    const p = paletteFromPixels(x.getImageData(0, 0, w, h).data);
    if (!p) return null;
    const ds = designOptions(p, moodWords(s.words), tradeAccent(s.business));
    return ds[0] ? { d: ds[0], ds, k: tokens(ds[0], "dark") } : null;
  } catch {
    return null;
  }
}

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const saveData = () => typeof navigator !== "undefined" && !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

/** Holds the current character for the whole page and paints the page in its colours. */
export function HomeCharacterProvider({ className, children }: { className?: string; children: React.ReactNode }) {
  const [i, setI] = useState(0);
  const [guest, setGuest] = useState<Showcase | null>(null);
  const [byId, setById] = useState<Record<string, Look | null>>({});
  const [picked, setPicked] = useState(false);
  const [holding, setHolding] = useState(false);
  const [heroSeen, setHeroSeen] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const list = useMemo(() => (guest ? [...SHOWCASE, guest] : SHOWCASE), [guest]);

  // Every showcase character's design, one after another (a 128 px still each, so it is cheap).
  useEffect(() => {
    let live = true;
    (async () => {
      for (const s of SHOWCASE) {
        const l = await lookOf(s);
        if (!live) return;
        setById((x) => ({ ...x, [s.id]: l }));
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!guest || guest.id in byId) return;
    let live = true;
    lookOf(guest).then((l) => live && setById((x) => ({ ...x, [guest.id]: l })));
    return () => {
      live = false;
    };
  }, [guest, byId]);

  // The next character every few seconds, while the opening is on screen and nobody has chosen.
  useEffect(() => {
    const hero = root.current?.querySelector(".ch");
    if (!hero) return;
    const io = new IntersectionObserver(([e]) => setHeroSeen(e.isIntersecting), { threshold: 0.35 });
    io.observe(hero);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (picked || holding || !heroSeen || reduced() || saveData()) return;
    const t = setInterval(() => !document.hidden && setI((n) => (n + 1) % SHOWCASE.length), 6500);
    return () => clearInterval(t);
  }, [picked, holding, heroSeen]);

  const s = list[Math.min(i, list.length - 1)];
  const look = byId[s.id] ?? null;
  useEffect(() => {
    const el = root.current;
    if (!el || !look) return;
    const { d, k } = look;
    const set = (n: string, v: string) => el.style.setProperty(n, v);
    set("--hc-a", k.accent);
    set("--hc-a2", k.accent2);
    set("--hc-bg", k.page);
    set("--hc-on", k.onAccent);
    set("--hc-s1", d.gradient.dark[0]);
    set("--hc-s2", d.gradient.dark[1]);
    set("--hc-s3", d.gradient.dark[2]);
    // The page behind the page (what shows when a phone bounces past the end) matches it too.
    document.body.style.backgroundColor = k.page;
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, [look]);

  const value: HomeCharacter = {
    i: Math.min(i, list.length - 1),
    s,
    list,
    look,
    looks: list.map((x) => byId[x.id] ?? null),
    picked,
    pick: (n) => {
      setPicked(true);
      setI(n);
    },
    pickModel: (m) => {
      setPicked(true);
      const k = SHOWCASE.findIndex((x) => x.id === m.id);
      if (k >= 0) return setI(k);
      setGuest(m);
      setI(SHOWCASE.length);
    },
    hold: setHolding,
  };
  return (
    <Ctx.Provider value={value}>
      <div ref={root} className={`hc ${className || ""}`.trim()}>
        {children}
      </div>
    </Ctx.Provider>
  );
}

/** Types a line into the empty box, letter by letter, then holds it. */
function useTyped(text: string, on: boolean) {
  const [shown, setShown] = useState(text);
  useEffect(() => {
    if (!on || reduced()) return setShown(text);
    let n = 0;
    setShown("");
    const t = setInterval(() => {
      n++;
      setShown(text.slice(0, n));
      if (n >= text.length) clearInterval(t);
    }, 38);
    return () => clearInterval(t);
  }, [text, on]);
  return shown;
}

const fontsLoaded = new Set<string>();
/** Just the letters "Aa" of a design's display face, so the type token shows the real typeface. */
function loadFace(family: string) {
  if (!family || fontsLoaded.has(family)) return;
  fontsLoaded.add(family);
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@600&text=Aa&display=swap`;
  document.head.appendChild(l);
}

export function CharacterHero() {
  const c = useHomeCharacter()!;
  const { i, s, list, look, looks, picked, pick, hold } = c;
  const router = useRouter();
  const [line, setLine] = useState("");
  const [three, setThree] = useState(false);
  const [ask, setAsk] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const hint = useTyped(s.line || "What are you building?", !line);

  // Three.js after the page is quiet; on phones after the first touch or a few seconds. Someone
  // saving data sees the stills until they pick a character.
  useEffect(() => {
    if (saveData()) return;
    let done = false;
    const go = () => !done && ((done = true), setThree(true));
    const phone = window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;
    if (phone) {
      for (const ev of ["pointerdown", "scroll", "keydown"]) window.addEventListener(ev, go, { once: true, passive: true });
      const t = setTimeout(go, 3500);
      return () => clearTimeout(t);
    }
    const w = window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number };
    const later = () => (w.requestIdleCallback ? w.requestIdleCallback(go, { timeout: 2000 }) : setTimeout(go, 900));
    if (document.readyState === "complete") later();
    else window.addEventListener("load", later, { once: true });
  }, []);
  useEffect(() => {
    if (picked) setThree(true);
  }, [picked]);

  useEffect(() => {
    if (look) loadFace(look.d.fonts.display);
  }, [look]);

  // The line goes to the journey, and the character with it when it is theirs: they picked it,
  // or they are starting from the line that came with it.
  const start = (typed: string) => {
    const v = (typed.trim() || s.line).trim();
    if (v.length < 3) {
      setAsk(true);
      input.current?.focus();
      return;
    }
    const star = picked || !typed.trim() ? "&star=" + encodeURIComponent(s.id) : "";
    router.push("/create?q=" + encodeURIComponent(v) + star);
  };
  const d = look?.d;
  const k = look?.k;
  const lower = s.name.toLowerCase();

  return (
    <section className="ch" id="top" aria-labelledby="ch-title">
      <div className="ch-bg" aria-hidden="true" />
      <div className="ch-grid">
        <div className="ch-copy">
          <p className="ch-eyebrow">
            <i aria-hidden="true" />
            Free · No account · Your files to keep
          </p>
          <h1 id="ch-title" className="ch-title">
            Build a website <em>around a 3D character.</em>
          </h1>
          <p className="ch-sub">Say what you&apos;re building in one line. Pick a character, or turn your photo into one, and every colour, font and motion of your site follows it.</p>
          <form
            id="start"
            className="ch-prompt"
            onSubmit={(e) => {
              e.preventDefault();
              start(line);
            }}
          >
            <label className="sr-only" htmlFor="ch-q">
              What are you building?
            </label>
            <input
              id="ch-q"
              ref={input}
              value={line}
              onChange={(e) => (setLine(e.target.value), setAsk(false))}
              placeholder={hint || " "}
              autoComplete="off"
              enterKeyHint="go"
              maxLength={300}
              aria-describedby="ch-note"
            />
            <button type="submit" className="ch-go">
              Start
              <Icon name="arrow" size={16} />
            </button>
          </form>
          <p className="ch-note" id="ch-note" aria-live="polite">
            {ask ? (
              <>First, say what you&apos;re building: a business, a portfolio, an app.</>
            ) : s.line ? (
              <>
                Press Start to try <q>{s.line}</q>, or type your own.
              </>
            ) : (
              <>Type what you&apos;re building, and the {lower} will star in it.</>
            )}
          </p>
        </div>

        <div className="ch-stage" onPointerEnter={() => hold(true)} onPointerLeave={() => hold(false)}>
          <div className="ch-rings" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="ch-model">
            {three ? (
              <CharacterView
                className="ch-view"
                label={`${s.name}, the 3D character this page follows`}
                config={{ src: s.asset, poster: s.preview, name: s.name, stops: d?.gradient.dark || FIRST.stops, scale: s.scale ?? 1, motion: d?.motion === "bold" ? "sway" : "float", react: "both", scroll: "none", entrance: true, speed: d?.motion === "calm" ? 0.8 : 1.05 }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="ch-poster" src={s.preview} alt={`${s.name}, the 3D character this page follows`} width={512} height={512} fetchPriority="high" />
            )}
          </div>
          <ul className="ch-tokens" aria-label="The design system drawn from this character">
            <li className="ch-t ch-t-accent">
              <b style={{ background: k?.accent || FIRST.accent }} aria-hidden="true" />
              <span>
                Accent
                <code>{(k?.accent || FIRST.accent).toUpperCase()}</code>
              </span>
            </li>
            <li className="ch-t ch-t-type">
              <b style={{ fontFamily: d ? `"${d.fonts.display}", var(--font-display)` : undefined }} aria-hidden="true">
                Aa
              </b>
              <span>
                Type
                <code>{d ? `${d.fonts.display} / ${d.fonts.body}` : "From the character"}</code>
              </span>
            </li>
            <li className="ch-t ch-t-motion">
              <b aria-hidden="true">
                <i />
                <i />
                <i />
              </b>
              <span>
                Motion
                <code>{d ? d.motion : "…"}</code>
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="ch-pick" role="radiogroup" aria-label="Choose the character">
        {list.map((x, n) => (
          <button
            key={x.id}
            type="button"
            role="radio"
            aria-checked={n === i}
            className={n === i ? "is-on" : ""}
            onClick={() => pick(n)}
            style={{ "--sw": looks[n]?.k.accent || "transparent" } as React.CSSProperties}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={x.preview} alt="" width={52} height={52} loading={n < 3 ? "eager" : "lazy"} />
            <span>{x.name}</span>
          </button>
        ))}
      </div>
      <p className="ch-follow">The colours of this whole page come from the character. Pick another and watch them follow.</p>
    </section>
  );
}
