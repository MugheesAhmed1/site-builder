"use client";

import Link from "next/link";
import { useState } from "react";
import PromptBox from "@/components/PromptBox";
import { AtmosHero } from "@/template/src/atmos/Atmos.jsx";
import { atmosById } from "@/template/src/atmos/catalog.js";

// The home page opens on the product's own best trick: a living, cinematic background (the
// same renderer every generated site uses) with the prompt centred over it. The visitor can
// switch backgrounds to see what their site could open on.

const SHOW = ["chrome", "meadow", "dust", "summit", "garden", "constellation", "horizon", "noir"];

export default function HomeJourney() {
  const [id, setId] = useState("chrome");
  const meta = atmosById(id);
  return (
    <AtmosHero id={id} accent="#8b5cf6" intensity={8} layout="center" cue="Scroll" className="home-at">
      <p className="at-pill home-at-pill">
        <span className="home-at-dot" aria-hidden="true" />
        Free · no sign up · optional Gemini polish
      </p>
      <h1>
        Say it in one line. Get a site that <em className="serif-i">feels like a film.</em>
      </h1>
      <p className="at-sub">Cinematic backgrounds, centred type and glass details, written from your own words. Download it as a site you own.</p>
      <div className="home-jr-cta" id="start">
        <PromptBox variant="hero" />
        <div className="home-jr-worlds home-at-switch" role="radiogroup" aria-label="Try a background">
          <span>Try a background</span>
          {SHOW.map((a) => (
            <button key={a} type="button" role="radio" aria-checked={id === a} className={id === a ? "is-on" : ""} onClick={() => setId(a)}>
              {atmosById(a).label}
            </button>
          ))}
        </div>
        <p className="home-jr-or">
          {meta.note} Or <a href="#categories">pick your kind of business</a>, <Link href="/document">start from a document</Link>
        </p>
      </div>
    </AtmosHero>
  );
}
