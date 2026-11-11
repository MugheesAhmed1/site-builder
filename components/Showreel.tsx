"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { CastStage } from "@/template/src/Cast.jsx";
import { Scene } from "@/template/src/Scenes.jsx";
import { castFor, categoryLabel, sceneFor } from "@/lib/fit";

// The home page centrepiece: a character with live widgets that changes every few seconds
// to show a different kind of site (a restaurant, a dentist, a CEO, a creator...).

const REEL = [
  { kind: "website", cat: "food", seed: 11, ctx: { stats: [{ value: "4.9", label: "Google rating" }, { value: "3000+", label: "Cakes a year" }], rating: "4.9", ratingLabel: "120 reviews", greeting: "Hi! Table for two tonight?", status: "Open until 11pm", tags: ["Dine in", "Takeaway", "Catering"], place: "Lahore", price: "Rs 1,450", priceLabel: "Chef's special", countdown: "Kitchen opens" } },
  { kind: "website", cat: "dentist", seed: 4, ctx: { stats: [{ value: "12k", label: "Smiles fixed" }, { value: "15", label: "Years of care" }], rating: "5.0", ratingLabel: "Patients love us", greeting: "Hi! Need a check-up this week?", status: "Taking new patients", tags: ["Whitening", "Braces", "Implants"], place: "Karachi", price: "From $49", priceLabel: "Check-up and clean", calendar: "Check-up" } },
  { kind: "portfolio", cat: "role-ceo", seed: 2, ctx: { stats: [{ value: "+32%", label: "Revenue this year" }, { value: "140", label: "People on the team" }], greeting: "Hi, I'm Amara. Founder and CEO.", status: "Open to board roles", tags: ["Strategy", "Fundraising", "Growth"], place: "Dubai", quote: "She turned a side project into a company.", quoteBy: "Forbes", award: "Founder of the year", awardYear: "2025" } },
  { kind: "website", cat: "creator", seed: 9, ctx: { stats: [{ value: "1.2M", label: "Followers" }, { value: "48M", label: "Views this year" }], greeting: "New video drops Friday!", status: "Live now", tags: ["Tech", "Travel", "Food"], place: "Istanbul" } },
  { kind: "portfolio", cat: "role-it", seed: 5, ctx: { stats: [{ value: "99.98%", label: "Uptime" }, { value: "2,400", label: "Devices managed" }], greeting: "Hi, I'm Bilal. IT manager.", status: "Systems all green", tags: ["Azure", "Networks", "Security"], place: "London" } },
  { kind: "website", cat: "hospital", seed: 3, ctx: { stats: [{ value: "24/7", label: "Emergency care" }, { value: "60+", label: "Specialists" }], greeting: "Hi! Which department do you need?", status: "Emergency open now", tags: ["Cardiology", "Maternity", "Imaging"], place: "Islamabad" } },
];

const BASE = { name: "", first: "You", place: "", status: "", greeting: "", stats: [] as { value: string; label: string }[], tags: [] as string[], steps: ["Plan", "Build", "Launch"] };

export default function Showreel() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (reduce || paused) return;
    const t = setInterval(() => setI((x) => (x + 1) % REEL.length), 4800);
    return () => clearInterval(t);
  }, [reduce, paused]);
  const item = REEL[i];
  const cast = castFor(item.cat, item.seed, true);
  return (
    <div className="reel" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}>
      <div className="reel-stage">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={i}
            className="reel-frame"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.03, filter: "blur(8px)" }}
            transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          >
            <Scene def={sceneFor(item.cat, item.seed * 17)} className="reel-scene" text={item.ctx.tags[0]} words={item.ctx.tags} />
            <CastStage character={cast.character} widgets={cast.widgets} ctx={{ ...BASE, ...item.ctx }} still={false} />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="reel-caption" aria-live="polite">
        <span className="small muted">A site for</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.b key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}>
            {categoryLabel(item.kind, item.cat).toLowerCase().replace(/^ceo/, "CEO").replace(/^it /, "IT ")}
          </motion.b>
        </AnimatePresence>
      </div>
      <div className="reel-dots" role="group" aria-label="Examples">
        {REEL.map((r, k) => (
          <button key={r.cat} aria-label={"Show " + categoryLabel(r.kind, r.cat)} aria-pressed={k === i} className={k === i ? "is-on" : ""} onClick={() => setI(k)}>
            <span />
          </button>
        ))}
      </div>
    </div>
  );
}
