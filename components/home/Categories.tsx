"use client";

import { useState } from "react";
import { useStartSite } from "@/components/PromptBox";
import { CATEGORY_GROUPS, iconFor } from "@/lib/fit";
import { CastCharacter } from "@/template/src/Cast.jsx";

// Start from a kind of business or a role. Each tile opens a site with the questions,
// characters, scenes and animation that suit it.
export default function Categories() {
  const start = useStartSite();
  const [group, setGroup] = useState(0);
  const g = CATEGORY_GROUPS[group];
  return (
    <div className="cats">
      <div className="seg cats-seg" role="tablist" aria-label="Who is the site for">
        {CATEGORY_GROUPS.map((x, i) => (
          <button key={x.title} type="button" role="tab" aria-selected={group === i} className={group === i ? "is-on" : ""} onClick={() => setGroup(i)}>
            {x.title} <span className="mono">{x.items.length}</span>
          </button>
        ))}
      </div>
      <div className="cats-grid" key={g.title}>
        {g.items.map((c, i) => (
          <button key={c.id} type="button" className="cat-tile" style={{ ["--i" as string]: Math.min(i, 14) }} onClick={() => start({ kind: g.kind, category: c.id, label: c.id === "portfolio" ? undefined : c.label, vary: true })}>
            <span className="cat-tile-art" aria-hidden="true">
              <CastCharacter def={iconFor(c.id)} size={46} />
            </span>
            <span className="cat-tile-label">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
