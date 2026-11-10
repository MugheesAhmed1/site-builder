import { useEffect, useMemo, useRef, useState } from "react";

// The whole portfolio, driven by two objects:
//   design  – colours, fonts, corner radius, animation level and layout choices
//   content – every word on the page, plus which sections show and in what order
// Edit src/portfolio-data.json to change the site without touching this file.

const SECTION_LABELS = {
  stats: "Impact",
  about: "About",
  process: "Method",
  experience: "Experience",
  projects: "Projects",
  skills: "Skills",
  education: "Education",
  certifications: "Certs",
  testimonials: "Kind words",
  contact: "Contact",
};

function fontsHref(fonts) {
  const fams = Array.from(new Set([fonts.heading, fonts.body, fonts.mono])).filter(Boolean);
  const q = fams.map((f) => "family=" + encodeURIComponent(f).replace(/%20/g, "+") + ":wght@400;500;600;700").join("&");
  return "https://fonts.googleapis.com/css2?" + q + "&display=swap";
}

function initials(name) {
  return (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function refCode(s, i) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return "REF-" + String(h % 100000).padStart(5, "0") + "-" + String(i + 1).padStart(2, "0");
}

function isCurrent(end) {
  return /present|current|now/i.test(end || "");
}

function useReveal(rootRef, deps) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll(".pf-reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function Counter({ value, suffix, animate }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(animate ? 0 : value);
  useEffect(() => {
    if (!animate) {
      setShown(value);
      return;
    }
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) {
      setShown(value);
      return;
    }
    let raf;
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const dur = 1400;
      const tick = (t) => {
        const p = Math.min(1, (t - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        setShown(value * eased);
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
      {shown.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

function Typewriter({ words, animate }) {
  const list = words && words.length ? words : [""];
  const [i, setI] = useState(0);
  const [text, setText] = useState(animate ? "" : list[0]);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    if (!animate) {
      setText(list[0]);
      return;
    }
    const word = list[i % list.length];
    let delay = deleting ? 35 : 70;
    if (!deleting && text === word) delay = 1600;
    if (deleting && text === "") delay = 300;
    const t = setTimeout(() => {
      if (!deleting && text === word) {
        if (list.length > 1) setDeleting(true);
      } else if (deleting && text === "") {
        setDeleting(false);
        setI((n) => n + 1);
      } else {
        setText(deleting ? word.slice(0, text.length - 1) : word.slice(0, text.length + 1));
      }
    }, delay);
    return () => clearTimeout(t);
  }, [text, deleting, i, animate, list]);
  return (
    <span className="pf-type">
      {text}
      {animate && <span className="pf-caret" aria-hidden="true" />}
    </span>
  );
}

function Section({ id, eyebrow, title, children }) {
  return (
    <section id={"pf-" + id} className="pf-section">
      <div className="pf-container">
        <div className="pf-section-head pf-reveal">
          <span className="pf-eyebrow">{eyebrow}</span>
          {title && <h2 className="pf-h2">{title}</h2>}
        </div>
        {children}
      </div>
    </section>
  );
}

function Experience({ items, style }) {
  if (style === "receipts") {
    return (
      <div className="pf-receipts">
        {items.map((x, i) => (
          <article className="pf-receipt pf-reveal" key={i} style={{ transitionDelay: i * 60 + "ms" }}>
            <header className="pf-receipt-top">
              <span className="pf-mono pf-muted">{refCode(x.company + x.role, i)}</span>
              <span className={"pf-status " + (isCurrent(x.end) ? "is-active" : "")}>
                {isCurrent(x.end) ? "ACTIVE" : "COMPLETED"}
              </span>
            </header>
            <div className="pf-receipt-main">
              <div>
                <h3 className="pf-h3">{x.role}</h3>
                <div className="pf-receipt-co">{x.company}</div>
              </div>
              <div className="pf-mono pf-receipt-date">
                {x.start} → {x.end}
              </div>
            </div>
            {x.summary && <p className="pf-muted">{x.summary}</p>}
            <div className="pf-receipt-rule" />
            <ul className="pf-bullets">
              {x.highlights.map((h, j) => (
                <li key={j}>{h}</li>
              ))}
            </ul>
            <footer className="pf-receipt-foot">
              <div className="pf-tags">
                {x.tags.map((t) => (
                  <span className="pf-tag" key={t}>
                    {t}
                  </span>
                ))}
              </div>
              {x.location && <span className="pf-mono pf-muted">{x.location}</span>}
            </footer>
          </article>
        ))}
      </div>
    );
  }
  if (style === "cards") {
    return (
      <div className="pf-grid pf-grid-2">
        {items.map((x, i) => (
          <article className="pf-card pf-lift pf-reveal" key={i} style={{ transitionDelay: i * 60 + "ms" }}>
            <div className="pf-mono pf-muted pf-small">
              {x.start} — {x.end}
            </div>
            <h3 className="pf-h3">{x.role}</h3>
            <div className="pf-receipt-co">{x.company}</div>
            {x.summary && <p className="pf-muted">{x.summary}</p>}
            <ul className="pf-bullets">
              {x.highlights.map((h, j) => (
                <li key={j}>{h}</li>
              ))}
            </ul>
            <div className="pf-tags">
              {x.tags.map((t) => (
                <span className="pf-tag" key={t}>
                  {t}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    );
  }
  return (
    <ol className="pf-timeline">
      {items.map((x, i) => (
        <li className="pf-tl-item pf-reveal" key={i}>
          <span className={"pf-tl-dot " + (isCurrent(x.end) ? "is-active" : "")} />
          <div className="pf-mono pf-muted pf-small">
            {x.start} — {x.end}
            {x.location ? " · " + x.location : ""}
          </div>
          <h3 className="pf-h3">
            {x.role} <span className="pf-receipt-co">@ {x.company}</span>
          </h3>
          {x.summary && <p className="pf-muted">{x.summary}</p>}
          <ul className="pf-bullets">
            {x.highlights.map((h, j) => (
              <li key={j}>{h}</li>
            ))}
          </ul>
          <div className="pf-tags">
            {x.tags.map((t) => (
              <span className="pf-tag" key={t}>
                {t}
              </span>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Projects({ items }) {
  const cats = useMemo(() => ["All", ...Array.from(new Set(items.map((p) => p.category).filter(Boolean)))], [items]);
  const [cat, setCat] = useState("All");
  const [open, setOpen] = useState(null);
  const shown = cat === "All" ? items : items.filter((p) => p.category === cat);
  return (
    <>
      {cats.length > 2 && (
        <div className="pf-filters pf-reveal" role="tablist">
          {cats.map((c) => (
            <button key={c} role="tab" aria-selected={c === cat} className={"pf-chip " + (c === cat ? "is-active" : "")} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
      )}
      <div className="pf-grid pf-grid-3">
        {shown.map((p, i) => (
          <article
            className={"pf-card pf-lift pf-project pf-reveal is-in " + (open === p.name ? "is-open" : "")}
            key={p.name + cat}
            style={{ animationDelay: i * 50 + "ms" }}
          >
            <div className="pf-project-top">
              {p.category && <span className="pf-tag pf-tag-accent">{p.category}</span>}
              {p.link && (
                <a className="pf-link-arrow" href={p.link} target="_blank" rel="noreferrer" aria-label={"Open " + p.name}>
                  ↗
                </a>
              )}
            </div>
            <h3 className="pf-h3">{p.name}</h3>
            <p className="pf-muted">{p.summary}</p>
            {p.impact && (
              <button className="pf-impact-btn" onClick={() => setOpen(open === p.name ? null : p.name)} aria-expanded={open === p.name}>
                {open === p.name ? "Hide impact" : "View impact"}
              </button>
            )}
            {p.impact && <div className="pf-impact">{p.impact}</div>}
            <div className="pf-tags">
              {p.tags.map((t) => (
                <span className="pf-tag" key={t}>
                  {t}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function CopyEmail({ email }) {
  const [copied, setCopied] = useState(false);
  if (!email) return null;
  return (
    <button
      className="pf-btn pf-btn-ghost"
      onClick={() => {
        navigator.clipboard?.writeText(email);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? "Copied ✓" : "Copy email"}
    </button>
  );
}

export default function Portfolio({ design, content }) {
  const rootRef = useRef(null);
  const c = content;
  const d = design;
  const animate = d.animation !== "none";
  const [activeId, setActiveId] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const sections = (c.sections || []).filter((s) => SECTION_LABELS[s]);
  const hasData = (s) => {
    if (s === "about") return c.about && c.about.paragraphs && c.about.paragraphs.length;
    if (s === "contact") return true;
    return Array.isArray(c[s]) && c[s].length > 0;
  };
  const visible = sections.filter(hasData);

  useReveal(rootRef, [JSON.stringify(c), d.animation]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveId(e.target.id.replace("pf-", ""));
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    root.querySelectorAll(".pf-section").forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [visible.join(",")]);

  const style = {
    "--pf-bg": d.colors.bg,
    "--pf-surface": d.colors.surface,
    "--pf-text": d.colors.text,
    "--pf-muted": d.colors.muted,
    "--pf-primary": d.colors.primary,
    "--pf-accent": d.colors.accent,
    "--pf-border": d.colors.border,
    "--pf-radius": d.radius + "px",
    "--pf-font-heading": `'${d.fonts.heading}', system-ui, sans-serif`,
    "--pf-font-body": `'${d.fonts.body}', system-ui, sans-serif`,
    "--pf-font-mono": `'${d.fonts.mono}', ui-monospace, monospace`,
  };

  const h = c.hero;
  const nav = visible.filter((s) => s !== "stats");

  const render = (s) => {
    switch (s) {
      case "stats":
        return (
          <section id="pf-stats" className="pf-section pf-section-tight" key={s}>
            <div className="pf-container">
              <div className="pf-stats">
                {c.stats.map((x, i) => (
                  <div className="pf-stat pf-reveal" key={i} style={{ transitionDelay: i * 80 + "ms" }}>
                    <div className="pf-stat-value">
                      <Counter value={Number(x.value) || 0} suffix={x.suffix} animate={animate} />
                    </div>
                    <div className="pf-stat-label">{x.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      case "about":
        return (
          <Section id="about" eyebrow="About" title={c.about.heading} key={s}>
            <div className="pf-about pf-reveal">
              {c.about.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </Section>
        );
      case "process":
        return (
          <Section id="process" eyebrow="Method" title="How I work" key={s}>
            <div className="pf-process">
              {c.process.map((x, i) => (
                <div className="pf-card pf-step pf-reveal" key={i} style={{ transitionDelay: i * 70 + "ms" }}>
                  <span className="pf-step-n pf-mono">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="pf-h3">{x.title}</h3>
                  <p className="pf-muted">{x.description}</p>
                </div>
              ))}
            </div>
          </Section>
        );
      case "experience":
        return (
          <Section id="experience" eyebrow="Experience" title={d.experienceStyle === "receipts" ? "Career ledger" : "Where I've worked"} key={s}>
            <Experience items={c.experience} style={d.experienceStyle} />
          </Section>
        );
      case "projects":
        return (
          <Section id="projects" eyebrow="Projects" title="Selected work" key={s}>
            <Projects items={c.projects} />
          </Section>
        );
      case "skills":
        return (
          <Section id="skills" eyebrow="Skills" title="What I bring" key={s}>
            <div className="pf-grid pf-grid-3">
              {c.skills.map((g, i) => (
                <div className="pf-card pf-reveal" key={i} style={{ transitionDelay: i * 60 + "ms" }}>
                  <h3 className="pf-h3">{g.group}</h3>
                  <div className="pf-tags">
                    {g.items.map((t) => (
                      <span className="pf-tag" key={t}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        );
      case "education":
        return (
          <Section id="education" eyebrow="Education" title="Learning" key={s}>
            <div className="pf-grid pf-grid-2">
              {c.education.map((x, i) => (
                <div className="pf-card pf-reveal" key={i}>
                  <div className="pf-mono pf-muted pf-small">{x.year}</div>
                  <h3 className="pf-h3">{x.degree}</h3>
                  <div className="pf-muted">{x.school}</div>
                </div>
              ))}
            </div>
          </Section>
        );
      case "certifications":
        return (
          <Section id="certifications" eyebrow="Certifications" title="Verified" key={s}>
            <div className="pf-grid pf-grid-3">
              {c.certifications.map((x, i) => {
                const inner = (
                  <>
                    <span className="pf-verified pf-mono">✓ VERIFIED</span>
                    <h3 className="pf-h3">{x.name}</h3>
                    <div className="pf-muted pf-small">
                      {x.issuer}
                      {x.year ? " · " + x.year : ""}
                    </div>
                  </>
                );
                return x.link ? (
                  <a className="pf-card pf-lift pf-reveal pf-cert" href={x.link} target="_blank" rel="noreferrer" key={i}>
                    {inner}
                  </a>
                ) : (
                  <div className="pf-card pf-reveal pf-cert" key={i}>
                    {inner}
                  </div>
                );
              })}
            </div>
          </Section>
        );
      case "testimonials":
        return (
          <Section id="testimonials" eyebrow="Kind words" title="What people say" key={s}>
            <div className="pf-grid pf-grid-2">
              {c.testimonials.map((x, i) => (
                <figure className="pf-card pf-quote pf-reveal" key={i}>
                  <blockquote>“{x.quote}”</blockquote>
                  <figcaption className="pf-muted pf-small">
                    <strong>{x.name}</strong> · {x.role}
                  </figcaption>
                </figure>
              ))}
            </div>
          </Section>
        );
      case "contact": {
        const ct = c.contact;
        return (
          <section id="pf-contact" className="pf-section pf-contact" key={s}>
            <div className="pf-container pf-reveal">
              <span className="pf-eyebrow">Contact</span>
              <h2 className="pf-h1 pf-gradient-text">{ct.heading}</h2>
              <p className="pf-lead pf-muted">{ct.blurb}</p>
              <div className="pf-row pf-wrap">
                {ct.email && (
                  <a className="pf-btn pf-btn-primary" href={"mailto:" + ct.email}>
                    {ct.email}
                  </a>
                )}
                <CopyEmail email={ct.email} />
                {ct.linkedin && (
                  <a className="pf-btn pf-btn-ghost" href={ct.linkedin} target="_blank" rel="noreferrer">
                    LinkedIn
                  </a>
                )}
                {ct.github && (
                  <a className="pf-btn pf-btn-ghost" href={ct.github} target="_blank" rel="noreferrer">
                    GitHub
                  </a>
                )}
                {ct.website && (
                  <a className="pf-btn pf-btn-ghost" href={ct.website} target="_blank" rel="noreferrer">
                    Website
                  </a>
                )}
              </div>
              {ct.phone && <p className="pf-mono pf-muted pf-small" style={{ marginTop: 20 }}>{ct.phone}</p>}
            </div>
          </section>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div ref={rootRef} className={"pf pf-mode-" + d.mode} data-anim={d.animation} style={style}>
      <link rel="stylesheet" href={fontsHref(d.fonts)} />
      <header className="pf-nav">
        <div className="pf-container pf-nav-inner">
          <a href="#pf-top" className="pf-brand">
            <span className="pf-brand-mark">{initials(h.name)}</span>
            <span className="pf-brand-name">{h.name}</span>
          </a>
          <nav className={"pf-nav-links " + (menuOpen ? "is-open" : "")}>
            {nav.map((s) => (
              <a key={s} href={"#pf-" + s} className={activeId === s ? "is-active" : ""} onClick={() => setMenuOpen(false)}>
                {SECTION_LABELS[s]}
              </a>
            ))}
          </nav>
          <div className="pf-row">
            {h.availability && (
              <span className="pf-pill">
                <span className="pf-pulse" />
                {h.availability}
              </span>
            )}
            <button className="pf-menu-btn" aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
              ☰
            </button>
          </div>
        </div>
      </header>

      <section id="pf-top" className={"pf-hero pf-hero-" + d.heroStyle}>
        <div className="pf-orb pf-orb-1" aria-hidden="true" />
        <div className="pf-orb pf-orb-2" aria-hidden="true" />
        <div className="pf-grid-bg" aria-hidden="true" />
        <div className="pf-container pf-hero-inner">
          <div className="pf-hero-text pf-reveal">
            {h.location && <div className="pf-eyebrow">{h.location}</div>}
            <h1 className="pf-display">
              {h.name}
              <span className="pf-display-role">
                <Typewriter words={h.rotatingRoles && h.rotatingRoles.length ? h.rotatingRoles : [h.role]} animate={animate} />
              </span>
            </h1>
            <p className="pf-lead">{h.tagline}</p>
            {h.intro && <p className="pf-muted">{h.intro}</p>}
            <div className="pf-row pf-wrap">
              <a className="pf-btn pf-btn-primary" href="#pf-contact">
                Get in touch
              </a>
              {h.resumeUrl && (
                <a className="pf-btn pf-btn-ghost" href={h.resumeUrl} target="_blank" rel="noreferrer">
                  Résumé
                </a>
              )}
              {visible.includes("projects") && (
                <a className="pf-btn pf-btn-ghost" href="#pf-projects">
                  See work
                </a>
              )}
            </div>
          </div>
          {d.heroStyle === "split" && (
            <div className="pf-hero-card pf-reveal">
              {h.photoUrl ? (
                <img src={h.photoUrl} alt={h.name} className="pf-photo" />
              ) : (
                <div className="pf-monogram">{initials(h.name)}</div>
              )}
              <div className="pf-hero-card-meta">
                <div className="pf-mono pf-small pf-muted">PROFILE · VERIFIED</div>
                <div className="pf-hero-card-role">{h.role}</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {visible.map(render)}

      <footer className="pf-footer">
        <div className="pf-container pf-row pf-between pf-wrap">
          <span className="pf-muted pf-small">
            © {new Date().getFullYear()} {h.name}
          </span>
          <a href="#pf-top" className="pf-muted pf-small">
            Back to top ↑
          </a>
        </div>
      </footer>
    </div>
  );
}
