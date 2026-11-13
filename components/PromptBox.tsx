"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { CATEGORIES } from "@/lib/categories";
import { ROLES } from "@/lib/fit";
import { createProject, readRequest, studioPath, type CreateOptions } from "@/lib/project";
import { saveProject } from "@/lib/store";
import type { SiteKind } from "@/lib/types";

// The one-line prompt: say what you want, see what we understood, start. Used on the home
// page (over the film scene) and on Your sites.

export const EXAMPLES = [
  "Website for my bakery called Crumb House in Lahore",
  "Portfolio for me, I'm a product manager",
  "Site for my dental clinic in Karachi",
  "Landing page for my invoicing app",
  "Wedding photography business in Islamabad",
  "I'm a UX designer and want to show my work",
];

// Make the project, save it and open the studio. Everything that starts a site goes
// through here, so a tile, a concept and a typed line all behave the same.
export function useStartSite() {
  const router = useRouter();
  return (o: CreateOptions) => {
    const p = createProject(o);
    saveProject(p);
    router.push(studioPath(p));
  };
}

// "Dentist" reads as "a business website for dentist"; acronyms such as CEO keep their capitals.
const lower = (s: string) => (/^[A-Z][A-Z]/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));

// Types the examples into the empty box, one after another.
function useTypedHint(on: boolean) {
  const [text, setText] = useState(EXAMPLES[0]);
  useEffect(() => {
    if (!on || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let i = 0;
    let n = EXAMPLES[0].length;
    let dir = -1;
    let hold = 40;
    const t = setInterval(() => {
      if (hold > 0) return void hold--;
      n += dir;
      const full = EXAMPLES[i];
      if (n <= 0) {
        i = (i + 1) % EXAMPLES.length;
        dir = 1;
        n = 0;
      } else if (n >= full.length && dir === 1) {
        dir = -1;
        hold = 45;
      }
      setText(EXAMPLES[i].slice(0, Math.max(n, 0)));
    }, 42);
    return () => clearInterval(t);
  }, [on]);
  return text;
}

export default function PromptBox({ variant = "plain", id = "q" }: { variant?: "hero" | "plain"; id?: string }) {
  const start = useStartSite();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<SiteKind | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const read = useMemo(() => readRequest(query, kind, category), [query, kind, category]);
  const hint = useTypedHint(!query);
  const reset = () => (setKind(null), setCategory(null));

  return (
    <form
      className={"prompt prompt-" + variant}
      onSubmit={(e) => {
        e.preventDefault();
        start({ query, kind: read.kind, category: read.category });
      }}
    >
      <label className="sr-only" htmlFor={id}>
        Describe the site you want
      </label>
      <div className="prompt-row">
        <input
          id={id}
          value={query}
          placeholder={hint || " "}
          autoComplete="off"
          enterKeyHint="go"
          onChange={(e) => {
            setQuery(e.target.value);
            reset();
          }}
        />
        <button className="btn btn-primary prompt-go" type="submit">
          Build it
          <Icon name="arrow" size={16} />
        </button>
      </div>
      <div className="prompt-read" aria-live="polite">
        <span className="prompt-read-label">We&apos;ll build</span>
        <span className="prompt-pick">
          <select
            aria-label="Kind of site"
            value={read.kind}
            onChange={(e) => {
              setKind(e.target.value as SiteKind);
              setCategory(null);
            }}
          >
            <option value="website">a business website</option>
            <option value="portfolio">a personal portfolio</option>
          </select>
        </span>
        <span className="prompt-read-label">for</span>
        <span className="prompt-pick">
          <select aria-label={read.kind === "portfolio" ? "Your role" : "Type of business"} value={read.category} onChange={(e) => setCategory(e.target.value)}>
            {read.kind === "portfolio"
              ? [...ROLES, { id: "portfolio", label: "Any role" }].map((r) => (
                  <option key={r.id} value={r.id}>
                    {lower(r.label)}
                  </option>
                ))
              : CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {lower(c.label)}
                  </option>
                ))}
          </select>
        </span>
        {(read.hints.name || read.hints.city) && (
          <span className="prompt-read-label">
            {read.hints.name ? "called " + read.hints.name : ""}
            {read.hints.city ? " in " + read.hints.city : ""}
          </span>
        )}
      </div>
    </form>
  );
}
