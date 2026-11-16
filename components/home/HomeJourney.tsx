"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import PromptBox from "@/components/PromptBox";
import "@/template/src/three/journey.css";

// The home page opens on the product's own best trick: a scroll journey. The visitor flies
// through the ocean (or a jungle, or deep space) while the creature watches the cursor, and
// the prompt sits in the first chapter. It is the same renderer every Insane site uses.

type JourneyProps = { world: string; creature?: string; chapters: { kicker?: string; title: string; text?: string }[]; cta?: React.ReactNode };
const Journey = dynamic(() => import("@/template/src/three/journey.jsx").then((m) => m.default as React.ComponentType<JourneyProps>), {
  ssr: false,
  loading: () => <section className="jr jr-loading home-jr-loading" aria-hidden="true" />,
});

const WORLDS = [
  { id: "ocean", label: "Ocean" },
  { id: "jungle", label: "Jungle" },
  { id: "cosmos", label: "Space" },
];

export default function HomeJourney() {
  const [world, setWorld] = useState("ocean");
  const chapters = [
    { kicker: "Free · no sign up · optional Gemini polish", title: "Say it in one line. Get a site that comes alive." },
    { kicker: "Scroll is the camera", title: "Your visitors don't scroll. They dive.", text: "Every section is a scene. The camera flies forward, particles thicken, words turn into view and the next section grows out of the last." },
    { kicker: "Characters with a mind", title: "It watches, reacts and listens.", text: "Point and it looks at you. Tap and it answers. Turn on listening and it dances to your voice. Scroll on and it swims away." },
    { kicker: "One dial", title: "From calm fades to a full 3D world.", text: "Pick an intensity from 1 to 10. Every level is built from the same engine, so you can turn it up or down at any time." },
  ];
  return (
    <div className="home-jr" style={{ "--pf-bg": "var(--bg)", "--pf-font-display": "var(--font-display)", "--pf-accent": "var(--accent)", "--pf-gutter": "20px" } as React.CSSProperties}>
      <Journey
        key={world}
        world={world}
        chapters={chapters}
        cta={
          <div className="home-jr-cta" id="start">
            <PromptBox variant="hero" />
            <div className="home-jr-worlds" role="radiogroup" aria-label="Try another world">
              <span>Try a world</span>
              {WORLDS.map((w) => (
                <button key={w.id} type="button" role="radio" aria-checked={world === w.id} className={world === w.id ? "is-on" : ""} onClick={() => setWorld(w.id)}>
                  {w.label}
                </button>
              ))}
            </div>
            <p className="home-jr-or">
              or <a href="#categories">pick your kind of business</a>, <Link href="/document">start from a document</Link>
            </p>
          </div>
        }
      />
    </div>
  );
}
