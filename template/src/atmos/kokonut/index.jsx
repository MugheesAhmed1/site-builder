// The Kokonut UI backgrounds (MIT, see LICENSE.txt) as scenes. Each entry names the component,
// its settings (shown in the builder's Scenes panel and saved per site) and how the site's own
// words and pictures feed it: the business name is stirred in ink, the services become the
// shapes that fall into the opening, and the rain and halftone scenes look at a living photo.
import { lazy, Suspense, useEffect, useState } from "react";
import "./kokonut.css";

const C = {
  "kk-paths": lazy(() => import("./background-paths.tsx")),
  "kk-dots": lazy(() => import("./dot-field.tsx")),
  "kk-flow": lazy(() => import("./flow-field.tsx")),
  "kk-topo": lazy(() => import("./topo-background.tsx")),
  "kk-halftone": lazy(() => import("./halftone-background.tsx")),
  "kk-drape": lazy(() => import("./drape-background.tsx")),
  "kk-caustics": lazy(() => import("./caustics-background.tsx")),
  "kk-rain": lazy(() => import("./rain-glass-background.tsx")),
  "kk-ink": lazy(() => import("./ink-background.tsx")),
  "kk-shapes": lazy(() => import("./shape-hero.tsx")),
};

import { kkDefaults } from "../controls.js";

const PILLS = ["kk-pill kk-outline", "kk-pill kk-solid", "kk-pill kk-outline", "kk-pill kk-accent"];
const DOTS = ["kk-s16 kk-accent", "kk-s12 kk-solid", "kk-s20 kk-outline", "kk-s14 kk-outline"];
function shapesFrom(words) {
  // Without the site's words (the scene pictures), plain pills of different lengths.
  const list = (words && words.length ? words : [4, 9, 6, 12, 5, 8, 7].map((n) => "\u00a0".repeat(n * 2))).slice(0, 14);
  const out = [];
  list.forEach((w, i) => {
    out.push({ id: "w" + i, content: w, className: PILLS[i % PILLS.length] });
    if (i % 2 === 1) out.push({ id: "d" + i, className: DOTS[(i >> 1) % DOTS.length] });
  });
  return out;
}

/**
 * One Kokonut scene, filling its parent. Mounted only in the browser (never in the
 * prerendered HTML), so the page paints first and the scene arrives after.
 * ctx: { name, words, image, still, tone (light or dark), accent, brand (true: ink in the accent) }
 */
export function KokonutScene({ id, settings, ctx, onReady }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(true);
    const t = setTimeout(() => onReady && onReady(), 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  const Comp = C[id];
  if (!on || !Comp) return null;
  const s = { ...kkDefaults(id), ...(settings || {}) };
  if (ctx.still) {
    if ("interactive" in s) s.interactive = false;
    for (const k of ["speed", "wind", "rain"]) if (k in s) s[k] = k === "rain" ? Math.min(s[k], 0.2) : 0;
  }
  const extra = {};
  if (id === "kk-ink") extra.text = ctx.name || "\u00a0";
  if (id === "kk-shapes") extra.shapes = shapesFrom(ctx.words);
  if ((id === "kk-rain" || id === "kk-halftone") && ctx.image) extra.src = ctx.image;
  return (
    <div className={"kk-host kk-tone-" + (ctx.tone || "light")} data-kk={id} data-brand={ctx.brand ? "" : undefined} style={{ "--kk-brand": ctx.accent, "--kk-accent": ctx.accent }}>
      <Suspense fallback={null}>
        <Comp {...s} {...extra} className="kk-fill">
          {null}
        </Comp>
      </Suspense>
    </div>
  );
}
