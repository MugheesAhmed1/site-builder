"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { gradientCss } from "@/lib/character/design";
import { useHomeCharacter } from "./HomeCharacter";
import { FIRST, SHOWCASE } from "./showcase";

// How it works, as the journey really runs (docs/CHARACTER-JOURNEY.md): six steps told while the
// visitor scrolls. On wide screens a sticky screen beside the steps shows each one; on phones each
// step carries its own picture. Every picture uses the character the opening shows.

const STEPS = [
  { title: "Say it in one line", text: "A bakery in Lahore, a portfolio, an app. One line is enough to start." },
  { title: "Answer a few quick questions", text: "A short chat fills in who it is for, how it should feel and what it needs. Free AI asks; simple rules finish it if the AI is busy." },
  { title: "Pick the star", text: "A 3D character from the library, a GLB of your own, or one made from your photo, cut out right on your device." },
  { title: "Get a design system from it", text: "Its colours are read from the model and turned into five design systems: accent, type, light or dark, corners and motion, every pairing contrast-checked." },
  { title: "See every template as your site", text: "Each template is shown with your words, your colours and your character. Or create a new one, built around the character." },
  { title: "Change anything, then download", text: "Every word, picture, colour, section and the model itself stays editable. Download the finished site or its source. The files are yours." },
];

const POSTERS = ["ashgrove", "brightline", "jack", "tidewater"];

function Visual({ n }: { n: number }) {
  const c = useHomeCharacter();
  const s = c?.s ?? SHOWCASE[0];
  const look = c?.look;
  const stops = look?.d.gradient.dark || FIRST.stops;
  const stage = gradientCss(stops, "glow", 160, [50, 45]);
  const accent = look?.k.accent || FIRST.accent;
  const on = look?.k.onAccent || FIRST.onAccent;
  const display = look ? `"${look.d.fonts.display}", var(--font-display)` : undefined;

  if (n === 0)
    return (
      <div className="hj-v hj-v-line">
        <div className="hj-input">
          <span className="hj-typed" key={s.line}>
            {s.line}
          </span>
          <b style={{ background: accent, color: on }}>
            Start <Icon name="arrow" size={14} />
          </b>
        </div>
        <p className="hj-hint">No form to fill in. Just say it.</p>
      </div>
    );
  if (n === 1)
    return (
      <div className="hj-v hj-v-chat">
        <p className="hj-ai">Who is it for? The words and the feel follow them.</p>
        <p className="hj-chips">
          <span>Families</span>
          <span className="is-on" style={{ background: accent, color: on, borderColor: accent }}>
            Busy professionals
          </span>
          <span>Businesses</span>
        </p>
        <p className="hj-me">Busy professionals</p>
        <p className="hj-ai">Now the star of the site: a 3D character. What should it be?</p>
        <p className="hj-chips">
          <span className="is-on" style={{ borderColor: accent }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.preview} alt="" width={22} height={22} />
            {s.name}
          </span>
          <span>Me, from my photo</span>
        </p>
      </div>
    );
  if (n === 2)
    return (
      <div className="hj-v hj-v-pick">
        {SHOWCASE.slice(0, 5).map((x) => (
          <span key={x.id} className={x.id === s.id ? "is-on" : ""} style={x.id === s.id ? { borderColor: accent, background: stage } : undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={x.preview} alt="" width={96} height={96} loading="lazy" />
          </span>
        ))}
        <span className="hj-photo">
          <Icon name="upload" size={22} />
          From my photo
        </span>
      </div>
    );
  if (n === 3)
    return (
      <div className="hj-v hj-v-designs">
        {(look?.ds || []).slice(0, 5).map((d, i) => (
          <span key={d.id} className={i === 0 ? "is-on" : ""} style={i === 0 ? { borderColor: accent } : undefined}>
            <i style={{ background: gradientCss(d.gradient.dark, d.gradient.style, d.gradient.angle, [50, 45]) }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.preview} alt="" width={64} height={64} loading="lazy" />
            </i>
            <em>
              <u style={{ background: d.accent }} />
              <u style={{ background: d.accent2 }} />
            </em>
            <strong>{d.name}</strong>
            <small>{d.fonts.display}</small>
          </span>
        ))}
        {!look && <p className="hj-hint">Reading the character&apos;s colours…</p>}
      </div>
    );
  if (n === 4)
    return (
      <div className="hj-v hj-v-templates">
        <span className="hj-new" style={{ background: stage }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.preview} alt="" width={90} height={90} loading="lazy" />
          <b>New</b>
        </span>
        {POSTERS.map((id) => (
          <span key={id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/tpl/${id}/poster.webp`} alt="" width={240} height={150} loading="lazy" />
            <i style={{ background: stage }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.preview} alt="" width={40} height={40} loading="lazy" />
            </i>
          </span>
        ))}
      </div>
    );
  return (
    <div className="hj-v hj-v-studio">
      <div className="hj-fields">
        <label>
          Name
          <span>{s.line.match(/called (\w+)/)?.[1] || "Your name"}</span>
        </label>
        <label>
          Accent
          <span>
            <u style={{ background: accent }} /> {accent.toUpperCase()}
          </span>
        </label>
        <label>
          3D model
          <span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.preview} alt="" width={20} height={20} /> {s.name}
          </span>
        </label>
        <b className="hj-dl" style={{ background: accent, color: on }}>
          Download site
        </b>
      </div>
      <div className="hj-site" style={{ background: stage }}>
        <p style={{ fontFamily: display }}>{s.line}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={s.preview} alt="" width={120} height={120} loading="lazy" />
      </div>
    </div>
  );
}

export default function HomeJourney() {
  const [at, setAt] = useState(0);
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const items = [...(list.current?.querySelectorAll<HTMLElement>("[data-step]") || [])];
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) setAt(Number((e.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    items.forEach((x) => io.observe(x));
    return () => io.disconnect();
  }, []);
  return (
    <div className="hj">
      <div className="hj-screen" aria-hidden="true">
        <div className="hj-frame">
          <div className="hj-bar">
            <i />
            <i />
            <i />
            <span className="mono">step {at + 1} of 6</span>
          </div>
          {STEPS.map((_, n) => (
            <div key={n} className={`hj-slide ${n === at ? "is-on" : ""}`}>
              <Visual n={n} />
            </div>
          ))}
        </div>
      </div>
      <ol className="hj-steps" ref={list}>
        {STEPS.map((x, n) => (
          <li key={x.title} data-step={n} className={n === at ? "is-on" : ""}>
            <span className="hj-n mono">{String(n + 1).padStart(2, "0")}</span>
            <h3>{x.title}</h3>
            <p>{x.text}</p>
            <div className="hj-inline" aria-hidden="true">
              <Visual n={n} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
