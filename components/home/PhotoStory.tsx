"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { gradientCss } from "@/lib/character/design";

// Photo to 3D, shown with a real run of the builder's own pipeline: a portrait (a free AI
// picture made for the Cornerstone template), its cut-out from MediaPipe's MagicTouch model on the
// device, and the standee the journey made from it. The 3D loads only when the section is near.

const CharacterView = dynamic(() => import("@/components/character/CharacterView"), { ssr: false });

/** The portrait's own stage, as the journey drew it from the photo's colours. */
const STOPS = ["#1a0d08", "#7f5d4a", "#433025"];

const WAYS = [
  { name: "Standee", text: "Your photo on a shaped stand that turns in 3D. Faces stay exactly as they are, so it suits a portfolio." },
  { name: "Soft 3D", text: "The cut-out inflated into a soft, rounded shape, like a toy. Good for mascots, logos and pets." },
  { name: "AI sculpt", text: "A free AI vision model reads the picture into parts, builds them, compares the result with the photo and corrects it, the img2threejs way." },
];

export default function PhotoStory() {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setNear(true), io.disconnect()), { rootMargin: "200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const stage = gradientCss(STOPS, "glow", 160, [50, 42]);
  return (
    <div className="hp" ref={box}>
      <ol className="hp-flow">
        <li className="hp-card" style={{ "--d": "0ms" } as React.CSSProperties}>
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/home/portrait.webp" alt="A portrait photo of a woman in a grey suit" width={686} height={806} loading="lazy" />
          </figure>
          <h3>
            <span className="mono">1</span> Your photo
          </h3>
          <p>A person, a product, a pet or a logo.</p>
        </li>
        <li className="hp-card" style={{ "--d": "140ms" } as React.CSSProperties}>
          <figure className="hp-cut">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/home/portrait-cut.webp" alt="The same portrait with the background removed" width={686} height={806} loading="lazy" />
            <i className="hp-tap" aria-hidden="true" />
          </figure>
          <h3>
            <span className="mono">2</span> Cut out on your device
          </h3>
          <p>Google&apos;s MagicTouch model finds the subject in your browser. Tap to pick another one.</p>
        </li>
        <li className="hp-card" style={{ "--d": "280ms" } as React.CSSProperties}>
          <figure className="hp-3d" style={{ background: stage }}>
            {near ? (
              <CharacterView className="hp-view" label="The portrait as a 3D standee" config={{ src: "/home/standee.glb", poster: "/home/standee.webp", name: "Photo standee", stops: STOPS, motion: "float", react: "both", scroll: "none", entrance: true, turn: -20, speed: 0.9 }} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/home/standee.webp" alt="The portrait as a 3D standee" width={384} height={384} loading="lazy" />
            )}
          </figure>
          <h3>
            <span className="mono">3</span> Made 3D, colours and all
          </h3>
          <p>Its colours become the site&apos;s stage, accent and type, like any character.</p>
        </li>
      </ol>
      <ul className="hp-ways">
        {WAYS.map((w) => (
          <li key={w.name}>
            <strong>{w.name}</strong>
            <span>{w.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
