// The character runtime: what a template loads (as xp-lib/xp-character.js) when its content has a
// 3D character. Every element marked data-xp-character gets the character drawn into it, from
// content.character (the model, its pose, motion and finish) and content.design (the gradient
// behind it, whose colours light it). "hero" is the main spot; "echo" shows it again lower on the
// page, turned the other way and calmer. In the builder's preview it follows every change.
import { mountCharacter, type CharacterConfig, type CharacterView } from "./engine";
import { createFilm, type Film } from "./film";

type Data = Record<string, any>;

declare global {
  interface Window {
    __XP__?: Data;
    __XP_HASH__?: Data;
    __XP_PREVIEW__?: boolean;
    __XP_LITE__?: boolean;
    __XP_CHAR_ON__?: boolean;
  }
}

const num = (v: unknown, d: number) => (typeof v === "number" && isFinite(v) ? v : d);
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const pick = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d);

/** The settings for one spot on the page, from the content and the spot's own data attributes. */
export function configFor(data: Data, el: HTMLElement): CharacterConfig | null {
  const c = data.character || {};
  const src = str(c.src).trim();
  if (!src) return null;
  const slot = el.getAttribute("data-xp-character") || "hero";
  const d = data.design || {};
  const stops = Array.isArray(d.stops) ? d.stops.filter((x: unknown) => typeof x === "string") : [];
  const base: CharacterConfig = {
    src,
    poster: str(c.poster),
    name: str(c.name),
    scale: num(c.scale, 1),
    turn: num(c.turn, -18),
    tilt: num(c.tilt, 0),
    lift: num(c.lift, 0),
    motion: pick(c.motion, ["float", "sway", "spin", "still"] as const, "float"),
    clip: str(c.clip),
    react: pick(c.react, ["follow", "drag", "both", "none"] as const, "both"),
    scroll: pick(c.scroll, ["turn", "rise", "zoom", "film", "none"] as const, "turn"),
    finish: pick(c.finish, ["original", "paint", "clay", "chrome"] as const, "original"),
    paint: str(c.paint),
    parts: str(c.parts),
    screen: str(c.screen),
    shadow: c.shadow !== false,
    studio: c.studio !== false,
    speed: num(c.speed, 1),
    stops,
    light: str(d.light),
    entrance: true,
  };
  if (slot === "echo") Object.assign(base, { turn: base.turn! + 42, scroll: base.scroll === "film" ? "film" : "none", react: base.react === "none" ? "none" : "follow", scale: base.scale! * 0.92 });
  if (slot === "badge") Object.assign(base, { scroll: "none", react: "none", motion: base.motion === "still" ? "still" : "float", shadow: false, quality: "low" });
  // A spot can set its own pose: data-xp-turn="30" data-xp-scale="0.8" data-xp-scroll="none" ...
  const a = el.dataset;
  if (a.xpTurn) base.turn = num(Number(a.xpTurn), base.turn!);
  if (a.xpScale) base.scale = base.scale! * num(Number(a.xpScale), 1);
  if (a.xpLift) base.lift = num(Number(a.xpLift), base.lift!);
  if (a.xpScroll) base.scroll = pick(a.xpScroll, ["turn", "rise", "zoom", "film", "none"] as const, base.scroll!);
  if (a.xpReact) base.react = pick(a.xpReact, ["follow", "drag", "both", "none"] as const, base.react!);
  if (a.xpMotion) base.motion = pick(a.xpMotion, ["float", "sway", "spin", "still"] as const, base.motion!);
  return base;
}

const STYLE = `.xp-char{display:block;-webkit-tap-highlight-color:transparent}
.xp-char-canvas:active{cursor:grabbing}
.xp-char--failed .xp-char-canvas{display:none}
@media (prefers-reduced-motion: reduce){.xp-char-canvas,.xp-char-poster{transition:none!important}}`;

function start() {
  if (window.__XP_CHAR_ON__) return;
  window.__XP_CHAR_ON__ = true;
  let data: Data = window.__XP_HASH__ || window.__XP__ || {};
  const views = new Map<HTMLElement, CharacterView>();
  const style = document.createElement("style");
  style.textContent = STYLE;
  document.head.appendChild(style);

  // Thumbnails (the builder's template library) show the picture only: no WebGL.
  const lite = !!window.__XP_LITE__;

  // The film: one stage over the whole page instead of a model in each spot (film.ts).
  let film: Film | null = null;
  let filmView: CharacterView | null = null;
  let filmHero: HTMLElement | null = null;
  const stopFilm = () => {
    filmView?.dispose();
    film?.dispose();
    film = null;
    filmView = null;
    filmHero = null;
  };
  const filmOpts = () => ({ wordmark: str(data.character?.wordmark).slice(0, 40), stops: Array.isArray(data.design?.stops) ? data.design.stops : [] });

  let lastCount = -1;
  const sync = () => {
    const spots = Array.from(document.querySelectorAll<HTMLElement>("[data-xp-character]"));
    // The film runs when the hero spot asks for it, on a page big enough to scroll through.
    const hero = spots.find((el) => (el.getAttribute("data-xp-character") || "hero") === "hero") || null;
    const heroCfg = hero && !lite ? configFor(data, hero) : null;
    const filmOn = !!heroCfg && heroCfg.scroll === "film" && window.innerHeight > 200;
    if (!filmOn || (filmHero && filmHero !== hero)) stopFilm();
    if (filmOn && hero && heroCfg) {
      const cfg = { ...heroCfg, poster: "", entrance: true, react: heroCfg.react === "none" ? ("none" as const) : ("follow" as const) };
      if (!film) {
        film = createFilm(document, hero, filmOpts());
        filmHero = hero;
        const f = film;
        filmView = mountCharacter(f.stage, { ...cfg, film: f });
        filmView.ready.then((ok) => ok && film === f && f.live());
      } else {
        film.update(filmOpts());
        filmView?.update(cfg);
        film.measure();
      }
    }
    lastCount = spots.length;
    const filmed = (el: HTMLElement) => filmOn && (el.getAttribute("data-xp-character") || "hero") !== "badge";
    for (const [el, v] of views) {
      if (!el.isConnected || !spots.includes(el) || filmed(el)) {
        v.dispose();
        views.delete(el);
      }
    }
    for (const el of spots) {
      if (filmed(el)) continue;
      const cfg = configFor(data, el);
      const v = views.get(el);
      if (!cfg) {
        if (v) v.dispose(), views.delete(el);
        continue;
      }
      if (lite) {
        let img = el.querySelector<HTMLImageElement>("img.xp-char-poster");
        if (!img && cfg.poster) {
          img = document.createElement("img");
          img.className = "xp-char-poster";
          img.alt = "";
          Object.assign(img.style, { position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "contain" });
          el.appendChild(img);
        }
        if (img && cfg.poster) img.src = cfg.poster;
        continue;
      }
      if (v) v.update(cfg);
      else views.set(el, mountCharacter(el, cfg));
    }
  };

  sync();
  // Templates draw their spots with React, after this script or again later: follow them.
  let pending = 0;
  new MutationObserver(() => {
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      const spots = document.querySelectorAll("[data-xp-character]");
      let changed = spots.length !== lastCount || (!!filmHero && !filmHero.isConnected);
      if (!changed) for (const el of views.keys()) if (!el.isConnected) changed = true;
      if (changed) sync();
    });
  }).observe(document.body, { childList: true, subtree: true });

  if (window.__XP_PREVIEW__) {
    window.addEventListener("message", (e) => {
      if (e.source !== window.parent || !e.data || e.data.type !== "xp-data") return;
      data = e.data.data || {};
      // After the template has drawn the new content.
      requestAnimationFrame(() => requestAnimationFrame(sync));
    });
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
