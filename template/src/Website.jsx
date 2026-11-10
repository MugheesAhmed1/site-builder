import { useEffect, useRef, useState } from "react";
import { palette, resolveScheme } from "./theme.js";
import { Counter, Icon, Section, fontsHref, themeStyle, useReveal, useSystemDark } from "./Portfolio.jsx";

// A one-page business website, driven by the same design system as the portfolio.
// Edit src/site-data.json to change words, prices, hours or sections.

const TITLES = {
  highlights: "At a glance",
  services: "What we offer",
  about: "About",
  process: "How it works",
  gallery: "Gallery",
  pricing: "Prices",
  testimonials: "What people say",
  faq: "Questions",
  visit: "Visit us",
  contact: "Contact",
};

const NAV = { services: "Services", about: "About", pricing: "Prices", faq: "FAQ", visit: "Visit", contact: "Contact" };

// "3000+" -> 3000 and "+", "4.9" -> 4.9. Anything else is shown as written.
function splitNumber(v) {
  const m = /^\s*([\d.,]+)\s*([^\d\s].*)?$/.exec(String(v));
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  return Number.isFinite(n) ? { value: n, suffix: m[2] || "" } : null;
}

function digits(s) {
  return (s || "").replace(/[^\d]/g, "");
}

function PhotoSlot({ label, preview, tall }) {
  return (
    <div className={"pf-photo-slot ws-slot" + (tall ? " is-tall" : "")}>
      <span>Photo: {label}</span>
      {preview && <small>Add an image link for this slot in the editor.</small>}
    </div>
  );
}

function Faq({ items }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="ws-faq">
      {items.map((f, i) => (
        <div className="ws-faq-item pf-reveal" key={i} style={{ "--i": i }}>
          <button className="ws-faq-q" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
            <span>{f.question}</span>
            <span className="ws-faq-sign" aria-hidden="true" />
          </button>
          <div className={"pf-impact" + (open === i ? " is-open" : "")}>
            <div>
              <p className="pf-muted ws-faq-a">{f.answer}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Website({ design, content, preview = false, scheme: forcedScheme }) {
  const rootRef = useRef(null);
  const c = content;
  const d = design;
  const systemDark = useSystemDark();
  const [override, setOverride] = useState(null);
  const scheme = forcedScheme || override || resolveScheme(d, systemDark);
  const pal = palette(d, scheme);
  const motion = d.motion || "subtle";
  const animate = motion !== "none";
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState("");

  const has = (s) => {
    if (s === "about") return c.about && c.about.paragraphs && c.about.paragraphs.filter(Boolean).length > 0;
    if (s === "visit") return c.visit && (c.visit.address || (c.visit.hours || []).length);
    if (s === "contact") return true;
    return Array.isArray(c[s]) && c[s].length > 0;
  };
  const visible = (c.sections || []).filter((s) => TITLES[s] && has(s));
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

  const h = c.hero;
  const ct = c.contact;
  const external = /^https?:|^tel:|^mailto:/.test(h.primaryHref || "");
  const secondaryHref = visible.includes("visit") && h.secondaryCta === "Find us" ? "#pf-visit" : visible.includes("services") ? "#pf-services" : "#pf-contact";
  const showImage = h.imageUrl || preview;

  const render = (s) => {
    switch (s) {
      case "highlights":
        return (
          <section id="pf-highlights" className="pf-stats-band" key={s} aria-label="At a glance">
            <div className="pf-container">
              <dl className="pf-stats">
                {c.highlights.map((x, i) => {
                  const n = splitNumber(x.value);
                  return (
                    <div className="pf-stat pf-reveal" key={i} style={{ "--i": i }}>
                      <dt className="pf-stat-label">{x.label}</dt>
                      <dd className="pf-stat-value">{n ? <Counter value={n.value} suffix={n.suffix} animate={animate} /> : x.value}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </section>
        );
      case "services":
        return (
          <Section id="services" title={TITLES.services} key={s}>
            <ul className="ws-menu">
              {c.services.map((x, i) => (
                <li className="ws-menu-row pf-reveal" key={i} style={{ "--i": i }}>
                  <div>
                    <h3 className="pf-h3">{x.name}</h3>
                    {x.description && <p className="pf-muted">{x.description}</p>}
                  </div>
                  {x.price && <span className="ws-price pf-mono">{x.price}</span>}
                </li>
              ))}
            </ul>
          </Section>
        );
      case "about":
        return (
          <Section id="about" title={c.about.heading || "About"} key={s}>
            <div className="pf-prose pf-reveal">
              {c.about.paragraphs.filter(Boolean).map((p, i) => (
                <p key={i} className={i === 0 ? "pf-lead" : undefined}>
                  {p}
                </p>
              ))}
            </div>
          </Section>
        );
      case "process":
        return (
          <Section id="process" title={TITLES.process} key={s}>
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
      case "gallery":
        return (
          <section id="pf-gallery" className="pf-section" key={s}>
            <div className="pf-container">
              <h2 className="pf-h2 pf-reveal ws-gallery-title">{TITLES.gallery}</h2>
              <div className="ws-gallery">
                {c.gallery.map((g, i) => (
                  <figure className={"ws-shot pf-reveal" + (i === 0 ? " is-lead" : "")} key={i} style={{ "--i": i }}>
                    {g.imageUrl ? <img src={g.imageUrl} alt={g.caption} loading="lazy" /> : <PhotoSlot label={g.caption} preview={preview} />}
                    {g.imageUrl && <figcaption className="pf-small pf-muted">{g.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            </div>
          </section>
        );
      case "pricing":
        return (
          <section id="pf-pricing" className="pf-section" key={s}>
            <div className="pf-container">
              <h2 className="pf-h2 pf-reveal ws-gallery-title">{TITLES.pricing}</h2>
              <div className="ws-plans">
                {c.pricing.map((p, i) => (
                  <article className={"ws-plan pf-reveal" + (p.featured ? " is-featured" : "")} key={i} style={{ "--i": i }}>
                    <div className="pf-row pf-between pf-baseline">
                      <h3 className="pf-h3">{p.name}</h3>
                      {p.featured && <span className="pf-small pf-accent-text">Most popular</span>}
                    </div>
                    <p className="ws-plan-price">
                      {p.price}
                      {p.period && <span className="pf-muted pf-small"> {p.period}</span>}
                    </p>
                    {p.features.length > 0 && (
                      <ul className="pf-bullets">
                        {p.features.map((f, j) => (
                          <li key={j}>{f}</li>
                        ))}
                      </ul>
                    )}
                    <a className={"pf-btn " + (p.featured ? "pf-btn-primary" : "pf-btn-quiet") + " ws-plan-cta"} href={external ? h.primaryHref : "#pf-contact"}>
                      Choose {p.name}
                    </a>
                  </article>
                ))}
              </div>
            </div>
          </section>
        );
      case "testimonials":
        return (
          <Section id="testimonials" title={TITLES.testimonials} key={s}>
            <div className="pf-quotes">
              {c.testimonials.map((x, i) => (
                <figure className="pf-quote pf-reveal" key={i} style={{ "--i": i }}>
                  <blockquote>“{x.quote}”</blockquote>
                  <figcaption className="pf-small pf-muted">
                    <strong>{x.name}</strong>
                    {x.role ? ", " + x.role : ""}
                  </figcaption>
                </figure>
              ))}
            </div>
          </Section>
        );
      case "faq":
        return (
          <Section id="faq" title={TITLES.faq} key={s}>
            <Faq items={c.faq} />
          </Section>
        );
      case "visit":
        return (
          <Section id="visit" title={TITLES.visit} key={s}>
            <div className="ws-visit pf-reveal">
              {c.visit.address && (
                <div>
                  <p className="pf-lead">{c.visit.address}</p>
                  {c.visit.mapUrl && (
                    <a className="pf-btn pf-btn-quiet ws-map" href={c.visit.mapUrl} target="_blank" rel="noreferrer">
                      Open in Maps <Icon name="arrow" />
                    </a>
                  )}
                </div>
              )}
              {c.visit.hours.length > 0 && (
                <dl className="ws-hours">
                  {c.visit.hours.map((x, i) => (
                    <div key={i}>
                      <dt>{x.days}</dt>
                      <dd className="pf-mono">{x.time}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </Section>
        );
      case "contact": {
        const actions = [
          ct.whatsapp && ["WhatsApp", "https://wa.me/" + digits(ct.whatsapp)],
          ct.phone && ["Call " + ct.phone, "tel:" + ct.phone.replace(/\s/g, "")],
          ct.instagram && ["Instagram", ct.instagram],
          ct.facebook && ["Facebook", ct.facebook],
          ct.linkedin && ["LinkedIn", ct.linkedin],
        ].filter(Boolean);
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
                {actions.map(([label, url], i) => (
                  <a key={label} className={"pf-btn " + (i === 0 && !ct.email ? "pf-btn-primary" : "pf-btn-quiet")} href={url} target={url.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </section>
        );
      }
      default:
        return null;
    }
  };

  const nav = visible.filter((s) => NAV[s]);
  const facts = [
    c.visit && c.visit.address && ["Find us", c.visit.address.split(",").slice(-2).join(",").trim()],
    c.visit && c.visit.hours && c.visit.hours[0] && ["Open", c.visit.hours[0].days + ", " + c.visit.hours[0].time],
    (ct.phone || ct.whatsapp) && ["Call or message", ct.phone || ct.whatsapp],
    !c.visit?.address && ct.email && ["Email", ct.email],
  ].filter(Boolean).slice(0, 3);

  return (
    <div ref={rootRef} className={"pf ws pf-scheme-" + scheme + (preview ? " pf-is-preview" : "")} data-motion={motion} data-density={d.density || "regular"} style={themeStyle(d, pal, scheme)}>
      <link rel="stylesheet" href={fontsHref(d.fonts)} />
      <header className="pf-nav">
        <div className="pf-container pf-nav-inner">
          <a href="#pf-top" className="pf-brand">
            {c.brand.name}
          </a>
          <nav className={"pf-nav-links" + (menuOpen ? " is-open" : "")} aria-label="Sections">
            {nav.map((s) => (
              <a key={s} href={"#pf-" + s} aria-current={activeId === s ? "true" : undefined} onClick={() => setMenuOpen(false)}>
                {NAV[s]}
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

      <section id="pf-top" className={"pf-hero" + (showImage ? " is-portrait" : "")}>
        <div className="pf-container pf-hero-inner">
          <div className="pf-hero-text">
            <p className="pf-hero-kicker pf-enter" style={{ "--i": 0 }}>
              <span className="pf-dot" aria-hidden="true" />
              <span>{h.kicker}</span>
            </p>
            <h1 className={"pf-display pf-enter" + ((h.headline || "").length > 34 ? " is-long" : "")} style={{ "--i": 1 }}>
              {h.headline}
            </h1>
            {h.sub && (
              <p className="pf-hero-sub pf-enter" style={{ "--i": 2 }}>
                {h.sub}
              </p>
            )}
            <div className="pf-row pf-wrap pf-hero-ctas pf-enter" style={{ "--i": 3 }}>
              <a className="pf-btn pf-btn-primary" href={h.primaryHref || "#pf-contact"} target={/^https?:/.test(h.primaryHref) ? "_blank" : undefined} rel="noreferrer">
                {h.primaryCta}
              </a>
              {h.secondaryCta && (
                <a className="pf-btn pf-btn-quiet" href={secondaryHref}>
                  {h.secondaryCta}
                </a>
              )}
            </div>
          </div>
          {showImage && (
            <figure className="pf-portrait ws-hero-img pf-enter" style={{ "--i": 2 }}>
              {h.imageUrl ? <img src={h.imageUrl} alt={c.brand.name} /> : <PhotoSlot label="main photo" preview={preview} tall />}
            </figure>
          )}
          {facts.length > 0 && (
            <dl className="pf-facts pf-enter" style={{ "--i": 4 }}>
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {visible.map(render)}

      <footer className="pf-footer">
        <div className="pf-container pf-row pf-between pf-wrap">
          <span className="pf-small pf-muted">
            © {new Date().getFullYear()} {c.brand.name}
          </span>
          <a href="#pf-top" className="pf-small pf-muted pf-inline-link">
            Back to top
          </a>
        </div>
      </footer>
    </div>
  );
}
