"use client";

import { useState } from "react";
import { useStartSite } from "@/components/PromptBox";
import { CATEGORY_GROUPS } from "@/lib/fit";
import { thumbOf, pickAtmos } from "@/template/src/atmos/catalog.js";

// Start from a kind of business or a role. Each tile shows the scene that kind of site opens
// in, and opens a site with the questions, scene and animation that suit it.
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
              <img src={thumbOf(pickAtmos(c.id, c.label))} alt="" loading="lazy" decoding="async" width="92" height="58" />
            </span>
            <span className="cat-tile-label">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
