"use client";

import { useHomeCharacter } from "./HomeCharacter";
import type { Showcase } from "./showcase";

// A slow river of library models. Any one of them can become the page's star: the opening takes
// it, and the whole page reads its colours the way a generated site would.

export default function ModelMarquee({ rows }: { rows: Showcase[][] }) {
  const c = useHomeCharacter();
  const choose = (m: Showcase) => {
    c?.pickModel(m);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("top")?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
  };
  return (
    <div className="hm">
      {rows.map((row, r) => (
        <div className={`hm-row ${r % 2 ? "is-back" : ""}`} key={r} style={{ "--hm-t": `${row.length * 4.5}s` } as React.CSSProperties}>
          <ul className="hm-track">
            {[...row, ...row].map((m, n) => {
              const copy = n >= row.length;
              return (
                <li key={m.id + (copy ? "-b" : "")} aria-hidden={copy || undefined}>
                  <button type="button" tabIndex={copy ? -1 : undefined} className={c?.s.id === m.id ? "is-on" : ""} onClick={() => choose(m)} aria-label={`Make the ${m.name.toLowerCase()} the star`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.preview} alt="" width={112} height={112} loading="lazy" decoding="async" />
                    <span>{m.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
