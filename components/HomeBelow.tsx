"use client";

import { motion, useReducedMotion } from "motion/react";
import Icon from "@/components/Icon";
import { LIBRARY } from "@/lib/designs";
import { CATEGORY_GROUPS, iconFor } from "@/lib/fit";
import type { SiteKind } from "@/lib/types";
import { CHARACTERS } from "@/template/src/cast.js";
import { CastCharacter } from "@/template/src/Cast.jsx";
import ConceptShowcase from "@/components/ConceptShowcase";

// The home page below the first screen: categories, the two builders and the marquees.
// It is its own chunk so the headline and the form become usable first.
export default function HomeBelow({ startKind }: { startKind: (k: SiteKind, cat?: string, label?: string, sceneId?: string) => void }) {
  const reduce = useReducedMotion();
  return (
    <>
        <ConceptShowcase startKind={startKind} />

        <section className="cat-section" aria-labelledby="cat-title">
          <div className="cat-head">
            <h2 id="cat-title">Start from your category</h2>
            <p className="muted">Each one comes with characters, widgets, live scenes and animations that suit it. You can still choose from everything later.</p>
          </div>
          <div className="cat-groups">
            {CATEGORY_GROUPS.map((g, gi) => (
              <div key={g.title} className="cat-group">
                <h3 className="cat-group-title">
                  {g.title}
                  <span className="mono muted"> {g.items.length}</span>
                </h3>
                <div className="cat-grid">
                  {g.items.map((c, i) => (
                    <motion.button
                      key={c.id}
                      type="button"
                      className="cat-chip"
                      onClick={() => startKind(g.kind, c.id, c.id === "portfolio" ? undefined : c.label)}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1], delay: Math.min(i * 0.03, 0.4) + gi * 0.05 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <span className="cat-chip-art" aria-hidden="true">
                        <CastCharacter def={iconFor(c.id)} size={48} />
                      </span>
                      <span className="cat-chip-label">{c.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="entry-grid" aria-label="Choose a builder">
          {(
            [
              {
                k: "portfolio" as const,
                title: "Portfolio Studio",
                text: "A full form for your experience, projects, results, skills, services, testimonials, awards and your own sections. Import a résumé to fill it in seconds.",
                points: ["Résumé import", "17 roles", "Case studies or card grid"],
              },
              {
                k: "website" as const,
                title: "Website Builder",
                text: "For a shop, clinic, studio, café or any business. Plain questions with suggested answers, set by the kind of business you run.",
                points: ["22 business types", "Menu, prices, team, hours", "WhatsApp and maps"],
              },
            ]
          ).map((c, i) => (
            <motion.button
              key={c.k}
              type="button"
              className={"entry-card entry-" + c.k}
              onClick={() => startKind(c.k)}
              onPointerMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty("--mx", e.clientX - r.left + "px");
                e.currentTarget.style.setProperty("--my", e.clientY - r.top + "px");
              }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.45 + i * 0.1 }}
              whileHover={reduce ? undefined : { y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="entry-art" aria-hidden="true">
                {c.k === "portfolio" ? (
                  <>
                    <span className="art-avatar">SM</span>
                    <span className="art-line w70" />
                    <span className="art-line w45" />
                    <span className="art-cards">
                      <span />
                      <span />
                      <span />
                    </span>
                  </>
                ) : (
                  <>
                    <span className="art-bar" />
                    <span className="art-line w60" />
                    <span className="art-menu">
                      <span />
                      <span />
                      <span />
                    </span>
                  </>
                )}
              </span>
              <span className="entry-body">
                <span className="entry-title">{c.title}</span>
                <span className="entry-text">{c.text}</span>
                <span className="entry-points">
                  {c.points.map((x) => (
                    <span key={x}>{x}</span>
                  ))}
                </span>
                <span className="entry-go">
                  Start {c.k === "portfolio" ? "a portfolio" : "a website"}
                  <Icon name="arrow" size={16} />
                </span>
              </span>
            </motion.button>
          ))}
        </section>

        <section className="ds-marquee" aria-label="Some of the design systems">
          <div className="ds-track">
            {[0, 1].map((r) => (
              <ul key={r} aria-hidden={r === 1 || undefined}>
                {LIBRARY.slice(0, 24).map((d) => (
                  <li key={d.id}>
                    <span className="ds-swatch" style={{ background: d.accent }} />
                    {d.preset}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </section>

        <section className="char-marquee" aria-label="Some of the characters">
          <div className="char-track">
            {[0, 1].map((r) => (
              <ul key={r} aria-hidden={r === 1 || undefined}>
                {CHARACTERS.filter((_, i) => i % 19 === 0).map((c) => (
                  <li key={c.id}>
                    <CastCharacter def={c} size={64} />
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </section>
    </>
  );
}
