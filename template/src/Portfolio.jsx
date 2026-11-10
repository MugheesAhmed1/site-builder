import { useEffect, useMemo, useRef, useState } from "react";
import { palette, resolveScheme } from "./theme.js";

// The whole portfolio, driven by two objects:
//   design: neutral hue, one accent, fonts, corner radius, motion level, layout choices
//   content: every word on the page, plus which sections show and in what order
// Edit src/portfolio-data.json to change the site without touching this file.
//
// Design direction follows three public skill sets: Taste Skill (brief first, restrained
// labels, no dashes in copy), Impeccable (OKLCH tinted neutrals, one accent, hierarchy from
// type and space rather than boxes) and Emil Kowalski's motion rules (ease-out curves,
// short durations, press states, hover only on fine pointers, reduced motion respected).

const SECTION_TITLES = {
  stats: "Impact",
  about: "About",
  process: "How I work",
  experience: "Experience",
  projects: "Work",
  skills: "Skills",
  education: "Education",
  certifications: "Certifications",
  testimonials: "Kind words",
  contact: "Contact",
};

export function fontsHref(fonts) {
  const fams = Array.from(new Set([fonts.display, fonts.body, fonts.mono])).filter(Boolean);
  const q = fams.map((f) => "family=" + encodeURIComponent(f).replace(/%20/g, "+") + ":wght@400;500;600;700").join("&");
  return "https://fonts.googleapis.com/css2?" + q + "&display=swap";
}

function refCode(s, i) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return "REF " + String(h % 100000).padStart(5, "0") + "/" + String(i + 1).padStart(2, "0");
}

const isCurrent = (end) => /present|current|now/i.test(end || "");

export function useSystemDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const on = (e) => setDark(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return dark;
}

// Adds .is-in to .pf-reveal blocks the first time they scroll into view.
export function useReveal(rootRef, key) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll(".pf-reveal:not(.is-in)");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef, key]);
}

export function Counter({ value, suffix, animate }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(animate ? 0 : value);
  useEffect(() => {
    const el = ref.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!animate || reduce || !el || !("IntersectionObserver" in window)) {
      setShown(value);
      return;
    }
    let raf;
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - start) / 900);
        setShown(value * (1 - Math.pow(1 - p, 4)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, animate]);
  const decimals = Number.isInteger(value) ? 0 : 1;
  return (
    <span ref={ref}>
      {shown.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

// Cycles through short role labels with a quick crossfade (expressive motion only).
function RoleCycle({ roles, animate }) {
  const list = roles.filter(Boolean);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!animate || list.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % list.length), 2600);
    return () => clearInterval(t);
  }, [animate, list.length]);
  if (!list.length) return null;
  return (
    <span className="pf-role" aria-live="off">
      <span key={i} className="pf-role-item">
        {list[i % list.length]}
      </span>
    </span>
  );
}

export function Icon({ name }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (name === "sun")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  if (name === "moon")
    return (
      <svg {...common}>
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
    );
  if (name === "menu")
    return (
      <svg {...common}>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    );
  if (name === "arrow")
    return (
      <svg {...common} width={16} height={16}>
        <path d="M7 17 17 7M8 7h9v9" />
      </svg>
    );
  return null;
}

// CSS variables for one design system and colour scheme. Shared with Website.jsx.
export function themeStyle(d, pal, scheme) {
  return {
    "--pf-bg": pal.bg,
    "--pf-surface": pal.surface,
    "--pf-text": pal.text,
    "--pf-muted": pal.muted,
    "--pf-border": pal.border,
    "--pf-accent": pal.accent,
    "--pf-on-accent": pal.onAccent,
    "--pf-radius": d.radius + "px",
    "--pf-font-display": `'${d.fonts.display}', ui-sans-serif, system-ui, sans-serif`,
    "--pf-font-body": `'${d.fonts.body}', ui-sans-serif, system-ui, sans-serif`,
    "--pf-font-mono": `'${d.fonts.mono}', ui-monospace, monospace`,
    colorScheme: scheme,
  };
}

export function Section({ id, title, children, wide }) {
  return (
    <section id={"pf-" + id} className={"pf-section" + (wide ? " pf-section-wide" : "")}>
      <div className="pf-container pf-split">
        <h2 className="pf-h2 pf-reveal">{title}</h2>
        <div className="pf-split-body">{children}</div>
      </div>
    </section>
  );
}

function Tags({ items }) {
  if (!items || !items.length) return null;
  return <p className="pf-tags">{items.join(" · ")}</p>;
}

function Experience({ items, style }) {
  if (style === "ledger") {
    return (
      <ol className="pf-ledger">
        {items.map((x, i) => (
          <li className="pf-ledger-row pf-reveal" key={i} style={{ "--i": i }}>
            <div className="pf-ledger-meta pf-mono">
              <span>
                {x.start} to {x.end}
              </span>
              <span className="pf-quiet">{refCode(x.company + x.role, i)}</span>
            </div>
            <div className="pf-ledger-main">
              <h3 className="pf-h3">
                {x.role}, <span className="pf-at">{x.company}</span>
              </h3>
              {x.summary && <p className="pf-muted">{x.summary}</p>}
              <ul className="pf-bullets">
                {x.highlights.map((h, j) => (
                  <li key={j}>{h}</li>
                ))}
              </ul>
              <Tags items={x.tags} />
            </div>
            <span className={"pf-status pf-mono" + (isCurrent(x.end) ? " is-active" : "")}>{isCurrent(x.end) ? "Active" : "Settled"}</span>
          </li>
        ))}
      </ol>
    );
  }
  if (style === "timeline") {
    return (
      <ol className="pf-timeline">
        {items.map((x, i) => (
          <li className="pf-tl-item pf-reveal" key={i} style={{ "--i": i }}>
            <span className={"pf-tl-dot" + (isCurrent(x.end) ? " is-active" : "")} aria-hidden="true" />
            <div className="pf-mono pf-small pf-muted">
              {x.start} to {x.end}
              {x.location ? ", " + x.location : ""}
            </div>
            <h3 className="pf-h3">
              {x.role}, <span className="pf-at">{x.company}</span>
            </h3>
            {x.summary && <p className="pf-muted">{x.summary}</p>}
            <ul className="pf-bullets">
              {x.highlights.map((h, j) => (
                <li key={j}>{h}</li>
              ))}
            </ul>
            <Tags items={x.tags} />
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ol className="pf-explist">
      {items.map((x, i) => (
        <li className="pf-reveal" key={i} style={{ "--i": i }}>
          <div className="pf-row pf-between pf-baseline">
            <h3 className="pf-h3">{x.company}</h3>
            <span className="pf-mono pf-small pf-muted">
              {x.start} to {x.end}
            </span>
          </div>
          <p className="pf-role-line">{x.role}</p>
          {x.summary && <p className="pf-muted">{x.summary}</p>}
          <ul className="pf-bullets">
            {x.highlights.map((h, j) => (
              <li key={j}>{h}</li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

function Project({ p, featured, index }) {
  const [open, setOpen] = useState(false);
  const Title = p.link ? "a" : "span";
  return (
    <article className={"pf-project" + (featured ? " is-featured" : "")} style={{ "--i": index }}>
      <div className="pf-project-head">
        {p.category && <span className="pf-small pf-muted">{p.category}</span>}
      </div>
      <h3 className="pf-h3 pf-project-title">
        <Title {...(p.link ? { href: p.link, target: "_blank", rel: "noreferrer", className: "pf-project-link" } : {})}>
          {p.name}
          {p.link && <Icon name="arrow" />}
        </Title>
      </h3>
      <p className="pf-muted">{p.summary}</p>
      {p.impact && (
        <>
          <button className="pf-text-btn" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? "Hide result" : "Show result"}
          </button>
          <div className={"pf-impact" + (open ? " is-open" : "")}>
            <div>
              <p>{p.impact}</p>
            </div>
          </div>
        </>
      )}
      <Tags items={p.tags} />
    </article>
  );
}

function Projects({ items }) {
  const cats = useMemo(() => ["All", ...Array.from(new Set(items.map((p) => p.category).filter(Boolean)))], [items]);
  const [cat, setCat] = useState("All");
  const shown = cat === "All" ? items : items.filter((p) => p.category === cat);
  return (
    <>
      {cats.length > 2 && (
        <div className="pf-filters" role="group" aria-label="Filter projects">
          {cats.map((c) => (
            <button key={c} aria-pressed={c === cat} className={"pf-chip" + (c === cat ? " is-active" : "")} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
      )}
      <div className="pf-projects" key={cat}>
        {shown.map((p, i) => (
          <Project p={p} key={p.name} index={i} featured={i === 0 && shown.length > 2} />
        ))}
      </div>
    </>
  );
}

export function CopyEmail({ email }) {
  const [copied, setCopied] = useState(false);
  if (!email) return null;
  return (
    <button
      className="pf-btn pf-btn-quiet"
      onClick={() => {
        navigator.clipboard?.writeText(email).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      <span key={copied ? "y" : "n"} className="pf-swap">
        {copied ? "Copied" : "Copy email"}
      </span>
    </button>
  );
}

export default function Portfolio({ design, content, preview = false, scheme: forcedScheme }) {
  const rootRef = useRef(null);
  const c = content;
  const d = design;
  const systemDark = useSystemDark();
  const [override, setOverride] = useState(null);
  const scheme = forcedScheme || override || resolveScheme(d, systemDark);
  const pal = palette(d, scheme);
  const motion = d.motion || "subtle";
  const animate = motion !== "none";
  const [activeId, setActiveId] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const hasData = (s) => {
    if (s === "about") return c.about && c.about.paragraphs && c.about.paragraphs.length > 0;
    if (s === "contact") return true;
    return Array.isArray(c[s]) && c[s].length > 0;
  };
  const visible = (c.sections || []).filter((s) => SECTION_TITLES[s] && hasData(s));

  useReveal(rootRef, JSON.stringify(c) + motion);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActiveId(e.target.id.replace("pf-", ""));
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    root.querySelectorAll(".pf-section").forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [visible.join(",")]);

  const style = themeStyle(d, pal, scheme);

  const h = c.hero;
  // Keep the menu short: minor sections drop out of the nav when there are many.
  let nav = visible.filter((s) => s !== "stats");
  if (nav.length > 6) nav = nav.filter((s) => !["certifications", "education", "testimonials", "process"].includes(s));
  const portrait = d.heroStyle === "portrait" && (h.photoUrl || preview);
  const roles = h.rotatingRoles && h.rotatingRoles.length ? h.rotatingRoles : [h.role];

  const render = (s) => {
    switch (s) {
      case "stats":
        return (
          <section id="pf-stats" className="pf-stats-band" key={s} aria-label="Impact">
            <div className="pf-container">
            <dl className="pf-stats">
              {c.stats.map((x, i) => (
                <div className="pf-stat pf-reveal" key={i} style={{ "--i": i }}>
                  <dt className="pf-stat-label">{x.label}</dt>
                  <dd className="pf-stat-value">
                    <Counter value={Number(x.value) || 0} suffix={x.suffix} animate={animate} />
                  </dd>
                </div>
              ))}
            </dl>
            </div>
          </section>
        );
      case "about":
        return (
          <Section id="about" title={c.about.heading || "About"} key={s}>
            <div className="pf-prose pf-reveal">
              {c.about.paragraphs.map((p, i) => (
                <p key={i} className={i === 0 ? "pf-lead" : undefined}>
                  {p}
                </p>
              ))}
            </div>
          </Section>
        );
      case "process":
        return (
          <Section id="process" title="How I work" key={s}>
            <ol className="pf-process">
              {c.process.map((x, i) => (
                <li className="pf-process-row pf-reveal" key={i} style={{ "--i": i }}>
                  <span className="pf-mono pf-quiet">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="pf-h3">{x.title}</h3>
                  <p className="pf-muted">{x.description}</p>
                </li>
              ))}
            </ol>
          </Section>
        );
      case "experience":
        return (
          <Section id="experience" title={d.experienceStyle === "ledger" ? "Career ledger" : "Experience"} key={s}>
            <Experience items={c.experience} style={d.experienceStyle} />
          </Section>
        );
      case "projects":
        return (
          <section id="pf-projects" className="pf-section" key={s}>
            <div className="pf-container">
              <h2 className="pf-h2 pf-reveal pf-projects-title">Selected work</h2>
              <Projects items={c.projects} />
            </div>
          </section>
        );
      case "skills":
        return (
          <Section id="skills" title="Skills" key={s}>
            <dl className="pf-skills">
              {c.skills.map((g, i) => (
                <div className="pf-skill-row pf-reveal" key={i} style={{ "--i": i }}>
                  <dt>{g.group}</dt>
                  <dd>{g.items.join(", ")}</dd>
                </div>
              ))}
            </dl>
          </Section>
        );
      case "education":
        return (
          <Section id="education" title="Education" key={s}>
            <ul className="pf-plainlist">
              {c.education.map((x, i) => (
                <li className="pf-reveal" key={i} style={{ "--i": i }}>
                  <span>
                    <strong>{x.degree}</strong>
                    <span className="pf-muted">, {x.school}</span>
                  </span>
                  <span className="pf-mono pf-small pf-muted">{x.year}</span>
                </li>
              ))}
            </ul>
          </Section>
        );
      case "certifications":
        return (
          <Section id="certifications" title="Certifications" key={s}>
            <ul className="pf-plainlist">
              {c.certifications.map((x, i) => (
                <li className="pf-reveal" key={i} style={{ "--i": i }}>
                  <span>
                    {x.link ? (
                      <a className="pf-inline-link" href={x.link} target="_blank" rel="noreferrer">
                        <strong>{x.name}</strong>
                      </a>
                    ) : (
                      <strong>{x.name}</strong>
                    )}
                    <span className="pf-muted">, {x.issuer}</span>
                  </span>
                  <span className="pf-mono pf-small pf-muted">{x.year}</span>
                </li>
              ))}
            </ul>
          </Section>
        );
      case "testimonials":
        return (
          <Section id="testimonials" title="Kind words" key={s}>
            <div className="pf-quotes">
              {c.testimonials.map((x, i) => (
                <figure className="pf-quote pf-reveal" key={i} style={{ "--i": i }}>
                  <blockquote>“{x.quote}”</blockquote>
                  <figcaption className="pf-small pf-muted">
                    <strong>{x.name}</strong>, {x.role}
                  </figcaption>
                </figure>
              ))}
            </div>
          </Section>
        );
      case "contact": {
        const ct = c.contact;
        const links = [
          ["LinkedIn", ct.linkedin],
          ["GitHub", ct.github],
          ["Website", ct.website],
        ].filter(([, u]) => u);
        return (
          <section id="pf-contact" className="pf-section pf-contact" key={s}>
            <div className="pf-container">
              <h2 className="pf-h2 pf-reveal">{ct.heading}</h2>
              {ct.blurb && <p className="pf-muted pf-contact-blurb pf-reveal">{ct.blurb}</p>}
              {ct.email && (
                <a className="pf-email pf-reveal" href={"mailto:" + ct.email}>
                  {ct.email}
                </a>
              )}
              <div className="pf-row pf-wrap pf-contact-actions pf-reveal">
                <CopyEmail email={ct.email} />
                {links.map(([label, url]) => (
                  <a key={label} className="pf-btn pf-btn-quiet" href={url} target="_blank" rel="noreferrer">
                    {label}
                  </a>
                ))}
                {ct.phone && <span className="pf-mono pf-small pf-muted">{ct.phone}</span>}
              </div>
            </div>
          </section>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div ref={rootRef} className={"pf pf-scheme-" + scheme + (preview ? " pf-is-preview" : "")} data-motion={motion} data-density={d.density || "regular"} style={style}>
      <link rel="stylesheet" href={fontsHref(d.fonts)} />
      <header className="pf-nav">
        <div className="pf-container pf-nav-inner">
          <a href="#pf-top" className="pf-brand">
            {h.name}
          </a>
          <nav className={"pf-nav-links" + (menuOpen ? " is-open" : "")} aria-label="Sections">
            {nav.map((s) => (
              <a key={s} href={"#pf-" + s} aria-current={activeId === s ? "true" : undefined} onClick={() => setMenuOpen(false)}>
                {s === "projects" ? "Work" : SECTION_TITLES[s]}
              </a>
            ))}
          </nav>
          <div className="pf-row pf-nav-tools">
            {!forcedScheme && (
              <button className="pf-icon-btn" aria-label={scheme === "dark" ? "Switch to light theme" : "Switch to dark theme"} onClick={() => setOverride(scheme === "dark" ? "light" : "dark")}>
                <Icon name={scheme === "dark" ? "sun" : "moon"} />
              </button>
            )}
            <button className="pf-icon-btn pf-menu-btn" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>

      <section id="pf-top" className={"pf-hero" + (portrait ? " is-portrait" : "")}>
        <div className="pf-container pf-hero-inner">
          <div className="pf-hero-text">
            <p className="pf-hero-kicker pf-enter" style={{ "--i": 0 }}>
              {h.availability && <span className="pf-dot" aria-hidden="true" />}
              <span>
                {h.name}
                {h.role ? ", " + h.role : ""}
              </span>
            </p>
            <h1 className={"pf-display pf-enter" + ((h.tagline || "").length > 34 ? " is-long" : "")} style={{ "--i": 1 }}>
              {h.tagline}
            </h1>
            {h.intro && (
              <p className="pf-hero-sub pf-enter" style={{ "--i": 2 }}>
                {h.intro}
              </p>
            )}
            <div className="pf-row pf-wrap pf-hero-ctas pf-enter" style={{ "--i": 3 }}>
              <a className="pf-btn pf-btn-primary" href="#pf-contact">
                Get in touch
              </a>
              {visible.includes("projects") && (
                <a className="pf-btn pf-btn-quiet" href="#pf-projects">
                  See my work
                </a>
              )}
              {h.resumeUrl && (
                <a className="pf-btn pf-btn-quiet" href={h.resumeUrl} target="_blank" rel="noreferrer">
                  Download CV
                </a>
              )}
            </div>
          </div>
          {portrait && (
            <figure className="pf-portrait pf-enter" style={{ "--i": 2 }}>
              {h.photoUrl ? (
                <img src={h.photoUrl} alt={"Portrait of " + h.name} />
              ) : (
                <div className="pf-photo-slot">
                  <span>Photo placeholder</span>
                  <small>Add a link under hero, photo URL. Only shows here in the builder.</small>
                </div>
              )}
            </figure>
          )}
          <dl className="pf-facts pf-enter" style={{ "--i": 4 }}>
            {h.location && (
              <div>
                <dt>Based in</dt>
                <dd>{h.location}</dd>
              </div>
            )}
            <div>
              <dt>Focus</dt>
              <dd>
                <RoleCycle roles={roles} animate={motion === "expressive"} />
              </dd>
            </div>
            {h.availability && (
              <div>
                <dt>Status</dt>
                <dd className="pf-accent-text">{h.availability}</dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      {visible.map(render)}

      <footer className="pf-footer">
        <div className="pf-container pf-row pf-between pf-wrap">
          <span className="pf-small pf-muted">
            © {new Date().getFullYear()} {h.name}
          </span>
          <a href="#pf-top" className="pf-small pf-muted pf-inline-link">
            Back to top
          </a>
        </div>
      </footer>
    </div>
  );
}
