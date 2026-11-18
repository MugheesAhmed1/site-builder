"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TemplateCard } from "@/components/home/ExperienceGallery";
import { CATEGORIES } from "@/lib/categories";
import { TEMPLATES } from "@/lib/templates";

// Every full template, filed by the business types it suits (lib/categories.ts). The choice is in
// the address (?business=agency) so a link can open a filtered list.
const TYPES = CATEGORIES.filter((c) => TEMPLATES.some((t) => t.business.includes(c.id)));

export default function TemplateIndex() {
  const [biz, setBiz] = useState("");

  useEffect(() => {
    const b = new URLSearchParams(location.search).get("business") || "";
    if (TYPES.some((x) => x.id === b)) setBiz(b);
  }, []);

  const pick = (b: string) => {
    setBiz(b);
    const u = new URL(location.href);
    if (b) u.searchParams.set("business", b);
    else u.searchParams.delete("business");
    history.replaceState(null, "", u);
  };

  // Best fit first: a template made for this business comes before one that also suits it.
  const list = TEMPLATES.filter((t) => !biz || t.business.includes(biz)).sort((a, b) => (biz ? a.business.indexOf(biz) - b.business.indexOf(biz) : 0));

  return (
    <div className="xg">
      <div className="xg-cats" role="tablist" aria-label="Business types">
        <button type="button" role="tab" aria-selected={!biz} className={"chip" + (!biz ? " is-on" : "")} onClick={() => pick("")}>
          Every business
        </button>
        {TYPES.map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={biz === c.id} className={"chip" + (biz === c.id ? " is-on" : "")} onClick={() => pick(c.id)}>
            {c.label} <span className="muted">{TEMPLATES.filter((t) => t.business.includes(c.id)).length}</span>
          </button>
        ))}
      </div>
      <div className="xg-grid">
        {list.map((t) => (
          <TemplateCard key={t.id} t={t} />
        ))}
      </div>
      <p className="xg-lab">
        Looking for something lighter? <Link href="/#gallery">See all live experiences</Link>
      </p>
    </div>
  );
}
