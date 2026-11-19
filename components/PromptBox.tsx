"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { CATEGORIES } from "@/lib/categories";
import { ROLES } from "@/lib/fit";
import { readRequest, type CreateOptions } from "@/lib/project";
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

// Every site now starts from a PRD: a typed line, a tile or a concept all open the PRD
// journey at /create with that line, where Gemini drafts the PRD for the person to edit.
export function useStartSite() {
  const router = useRouter();
  return (o: CreateOptions) => {
    const line = (o.query ?? "").trim() || (o.label ? (o.kind === "portfolio" ? "Portfolio for a " : "Website for a ") + o.label.toLowerCase() : "");
    const look = o.style === "luxury" ? "luxury" : o.style === "playful" ? "playful" : o.style === "minimal" ? "minimal" : o.style === "bold" || o.style === "experimental" ? "futuristic" : o.mode === "cinematic" ? "cinematic" : o.mode === "editorial" ? "editorial" : "";
    // A portfolio starts from the person's resume.
    if (o.kind === "portfolio") return router.push("/create?kind=portfolio" + (line ? "&q=" + encodeURIComponent(line) : ""));
    router.push("/create?q=" + encodeURIComponent(line) + (look ? "&director=" + look : ""));
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

const STYLES = ["minimal", "bold", "playful", "luxury", "experimental"] as const;
const EXPERIENCES = [
  { id: "editorial", label: "Editorial" },
  { id: "cinematic", label: "Cinematic" },
  { id: "world", label: "Interactive" },
  { id: "playful", label: "Playful" },
] as const;
const CHIPS = ["A modern coffee shop in Lahore serving specialty coffee and fresh pastries", "A premium mountain resort", "Portfolio for a product designer", "Invoicing app for freelancers"];

export default function PromptBox({ variant = "plain", id = "q", controls = false }: { variant?: "hero" | "plain"; id?: string; controls?: boolean }) {
  const start = useStartSite();
  const [query, setQuery] = useState("");
  // PRD section 28: optional controls; one sentence alone is always enough.
  const [style, setStyle] = useState<(typeof STYLES)[number] | undefined>();
  const [mode, setMode] = useState<(typeof EXPERIENCES)[number]["id"] | undefined>();
  const [intensity, setIntensity] = useState<number | undefined>();
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
        start({ query, kind: read.kind, category: read.category, style, mode, intensity });
      }}
    >
      <label className={controls ? "prompt-q" : "sr-only"} htmlFor={id}>
        What are you building?
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
          {controls ? "Create your website" : "Build it"}
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
                    {c.id === "general" ? "any kind of business" : lower(c.label)}
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
      {controls && (
        <>
          <div className="prompt-chips" aria-label="Examples">
            {CHIPS.map((c) => (
              <button key={c} type="button" className="prompt-chip" onClick={() => (setQuery(c), reset())}>
                {c}
              </button>
            ))}
          </div>
          <details className="prompt-more">
            <summary>Style, motion and experience</summary>
            <div className="prompt-ctl">
              <span className="prompt-ctl-label" id={id + "-style"}>
                Style
              </span>
              <div className="prompt-seg" role="group" aria-labelledby={id + "-style"}>
                {STYLES.map((x) => (
                  <button key={x} type="button" aria-pressed={style === x} onClick={() => setStyle(style === x ? undefined : x)}>
                    {x[0].toUpperCase() + x.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="prompt-ctl">
              <label className="prompt-ctl-label" htmlFor={id + "-motion"}>
                Motion
              </label>
              <div className="prompt-range">
                <span>Calm</span>
                <input id={id + "-motion"} type="range" min={1} max={10} value={intensity ?? 6} onChange={(e) => setIntensity(Number(e.target.value))} aria-valuetext={intensity ? `${intensity} of 10` : "Chosen for you"} />
                <span>Insane</span>
              </div>
            </div>
            <div className="prompt-ctl">
              <span className="prompt-ctl-label" id={id + "-xp"}>
                Experience
              </span>
              <div className="prompt-seg" role="group" aria-labelledby={id + "-xp"}>
                {EXPERIENCES.map((x) => (
                  <button key={x.id} type="button" aria-pressed={mode === x.id} onClick={() => setMode(mode === x.id ? undefined : x.id)}>
                    {x.label}
                  </button>
                ))}
              </div>
            </div>
          </details>
        </>
      )}
    </form>
  );
}
