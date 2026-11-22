"use client";

import { gradientCss, RADIUS_PX, type DesignSystem } from "@/lib/character/design";
import { categoryById } from "@/lib/categories";
import type { ModelInfo } from "@/lib/character/apply";
import type { Brief } from "@/lib/journey/brief";
import { stageOf } from "./design-tweak";

// A small page drawn with the design system alone, so a direction can be judged before any
// template: the stage with the character, the type, the buttons, the cards and their contrast.

export default function DesignPreview({ design, model, brief }: { design: DesignSystem; model: ModelInfo | null; brief: Brief }) {
  const { k, stops, dark } = stageOf(design);
  const cat = categoryById(brief.business);
  const r = RADIUS_PX[design.radius];
  const name = brief.name || "Your site";
  const display = `"${design.fonts.display}", ui-serif, Georgia, serif`;
  const body = `"${design.fonts.body}", ui-sans-serif, system-ui, sans-serif`;
  const heroInk = dark ? k.onDark : k.ink;
  const heroMuted = dark ? `color-mix(in oklab, ${k.onDark} 72%, transparent)` : k.muted;
  return (
    <figure className="jr-mock" aria-label="Preview of the design system" style={{ background: k.page, color: k.ink, fontFamily: body, borderColor: k.line }}>
      <div className="jr-mock-nav" style={{ borderColor: k.line }}>
        <b style={{ fontFamily: display }}>{name}</b>
        <span style={{ color: k.muted }}>About</span>
        <span style={{ color: k.muted }}>{brief.kind === "portfolio" ? "Work" : "Services"}</span>
        <i style={{ background: k.accent, color: k.onAccent, borderRadius: r }}>{brief.cta || cat.primaryCta}</i>
      </div>
      <div className="jr-mock-hero" style={{ background: gradientCss(stops, design.gradient.style, design.gradient.angle, [72, 48]), borderRadius: Math.min(r * 1.4, 28) }}>
        <div>
          <small style={{ color: heroMuted }}>{(brief.what || cat.kicker).slice(0, 40)}</small>
          <h4 style={{ fontFamily: display, color: heroInk }}>{brief.kind === "portfolio" ? `Hi, I'm ${name}.` : `${name}, made for you.`}</h4>
          <p style={{ color: heroMuted }}>{(brief.audience ? `For ${brief.audience.charAt(0).toLowerCase()}${brief.audience.slice(1)}` : cat.kicker).slice(0, 90)}</p>
          <span className="jr-mock-btns">
            <i style={{ background: k.accent, color: k.onAccent, borderRadius: r }}>{brief.cta || cat.primaryCta}</i>
            <i style={{ border: `1px solid ${heroMuted}`, color: heroInk, borderRadius: r }}>Learn more</i>
          </span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {model && <img src={model.preview} alt="" />}
      </div>
      <div className="jr-mock-cards">
        {(brief.sections.length ? brief.sections : cat.services).slice(0, 3).map((s, i) => (
          <div key={s} style={{ background: i === 1 ? k.surface2 : k.surface, borderColor: k.line, borderRadius: r }}>
            <span style={{ background: i === 1 ? k.accent2 : k.accent, borderRadius: Math.max(4, r / 2) }} />
            <b style={{ fontFamily: display }}>{s}</b>
            <small style={{ color: k.muted }}>A short line about it.</small>
          </div>
        ))}
      </div>
      <figcaption className="small muted">
        {design.fonts.display} and {design.fonts.body}, {design.radius} corners, {design.motion} motion
      </figcaption>
    </figure>
  );
}
