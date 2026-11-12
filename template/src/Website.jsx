import { useMemo, useRef, useState } from "react";
import { palette, resolveScheme } from "./theme.js";
import { Backdrop, LiveTiles, Stage } from "./rich.jsx";
import { CastCharacter, CastStage, CastStory, Peek, WidgetWall, castContext } from "./Cast.jsx";
import { Scene } from "./Scenes.jsx";
import { Carousel, Film, Flight, Grain, LineLoader, ScrollWords, SmoothScroll } from "./studio.jsx";
import { Arc, Sphere, Track, propsFor, useFogSwitch, useScramble } from "./showpiece.jsx";
import { Extras } from "./extras.jsx";
import { Avatar, Counter, cleanContent, Headline, Icon, Marquee, Progress, QuoteSlider, Section, Wide, fontsHref, motionAttrs, themeStyle, useActiveSection, useReveal, useSpotlight, useSystemDark } from "./shared.jsx";

// A one-page business website, driven by the same design system and animation styles
// as the portfolio. Edit src/site-data.json to change words, prices, hours or sections.
// Section order follows proven landing patterns per business type (ui-ux-pro-max).

const NAV = { services: "Services", about: "About", gallery: "Gallery", team: "Team", pricing: "Prices", faq: "FAQ", visit: "Visit", contact: "Contact" };

function splitNumber(v) {
  const m = /^\s*([\d.,]+)\s*([^\d\s].*)?$/.exec(String(v));
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  return Number.isFinite(n) ? { value: n, suffix: m[2] || "" } : null;
}

function digits(s) {
  return (s || "").replace(/[^\d]/g, "");
}

function PhotoSlot({ label, preview, path }) {
  return (
    <div className="pf-photo-slot ws-slot" data-img={path} data-img-empty="">
      <span>Photo: {label}</span>
      {preview && <small>Click Edit on page, then click here to upload or paste a photo.</small>}
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

function Services({ items, style }) {
  const priced = items.some((x) => x.price);
  const mode = style === "menu" && !priced ? "rows" : style;
  if (mode === "bento") {
    return (
      <div className="pf-bento">
        {items.map((x, i) => (
          <article className="pf-bento-cell pf-card pf-reveal" key={i} style={{ "--i": i }}>
            <span className="pf-mono pf-quiet">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="pf-h3">{x.name}</h3>
            {x.description && <p className="pf-muted">{x.description}</p>}
            {x.price && <p className="pf-price pf-mono">{x.price}</p>}
          </article>
        ))}
      </div>
    );
  }
  if (mode === "rows") {
    return (
      <ol className="pf-index">
        {items.map((x, i) => (
          <li className="pf-index-row pf-reveal" key={i} style={{ "--i": i }}>
            <span className="pf-mono pf-quiet">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h3 className="pf-index-title">{x.name}</h3>
              {x.description && <p className="pf-muted">{x.description}</p>}
            </div>
            {x.price && <span className="ws-price pf-mono">{x.price}</span>}
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ul className="ws-menu">
      {items.map((x, i) => (
        <li className="ws-menu-row pf-reveal" key={i} style={{ "--i": i }}>
          <div>
            <h3 className="pf-h3">{x.name}</h3>
            {x.description && <p className="pf-muted">{x.description}</p>}
          </div>
          <span className="ws-leader" aria-hidden="true" />
          {x.price && <span className="ws-price pf-mono">{x.price}</span>}
        </li>
      ))}
    </ul>
  );
}

export default function Website({ design, content, preview = false, scheme: forcedScheme }) {
  const rootRef = useRef(null);
  const c = useMemo(() => cleanContent(content), [content]);
  const d = design;
  const systemDark = useSystemDark();
  const [override, setOverride] = useState(null);
  const scheme = forcedScheme || override || resolveScheme(d, systemDark);
  const pal = palette(d, scheme);
  const animated = d.motion !== "none" && d.anim !== "M-000";
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState("");
  const arr = (k) => (Array.isArray(c[k]) ? c[k] : []);

  const has = (s) => {
    if (s === "about") return c.about && (c.about.paragraphs || []).filter(Boolean).length > 0;
    if (s === "visit") return c.visit && (c.visit.address || (c.visit.hours || []).length);
    if (s === "contact") return true;
    if (s === "cta") return !!(c.cta && c.cta.heading);
    if (s === "tiles") return arr("highlights").length > 0 || arr("services").length > 0;
    return arr(s).length > 0;
  };
  const visible = (c.sections || []).filter(has);
  useReveal(rootRef, JSON.stringify(c) + JSON.stringify(d), d);
  useScramble(rootRef, d.motion !== "none" && d.anim !== "M-000" && !!d.scramble, JSON.stringify(c) + (d.scramble ? 1 : 0));
  const fog = useFogSwitch();
  useSpotlight(rootRef, animated && d.hover === "spotlight");
  useActiveSection(rootRef, visible.join(","), setActiveId);

  const h = c.hero;
  const ct = c.contact || {};
  const hero = d.heroStyle || "statement";
  const external = /^https?:|^tel:|^mailto:/.test(h.primaryHref || "");
  const secondaryHref = visible.includes("visit") && h.secondaryCta === "Find us" ? "#pf-visit" : visible.includes("services") ? "#pf-services" : "#pf-contact";
  const showImage = h.imageUrl || preview;
  const facts = [
    c.visit && c.visit.address && ["Find us", c.visit.address.split(",").slice(-2).join(",").trim()],
    c.visit && c.visit.hours && c.visit.hours[0] && ["Open", c.visit.hours[0].days + ", " + c.visit.hours[0].time],
    (ct.phone || ct.whatsapp) && ["Call or message", ct.phone || ct.whatsapp],
    !(c.visit && c.visit.address) && ct.email && ["Email", ct.email],
  ]
    .filter(Boolean)
    .slice(0, 3);

  const kicker = (
    <p className="pf-hero-kicker pf-enter" style={{ "--i": 0 }}>
      <span className="pf-dot" aria-hidden="true" />
      <span>{h.kicker}</span>
    </p>
  );
  const headline = <Headline text={h.headline} mode={animated ? motionAttrs(d)["data-headline"] : "none"} className={"pf-display" + ((h.headline || "").length > 34 ? " is-long" : "")} />;
  const sub = h.sub && (
    <p className="pf-hero-sub pf-enter" style={{ "--i": 2 }}>
      {h.sub}
    </p>
  );
  const ctas = (
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
  );
  const factList = facts.length > 0 && (
    <dl className="pf-facts pf-enter" style={{ "--i": 4 }}>
      {facts.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );

  const hl = arr("highlights");
  const rating = hl.find((x) => /rating|stars|review/i.test(x.label));
  const openNow = c.visit && c.visit.hours && c.visit.hours[0];
  const widgets = [
    rating ? { type: "rating", value: rating.value, label: rating.value + " " + rating.label } : hl[0] && { type: "stat", label: hl[0].label, value: hl[0].value },
    { type: "chat", text: `Hi! ${h.primaryCta ? h.primaryCta + " in one tap." : "Message us any time."}` },
    openNow ? { type: "status", text: openNow.days + ", " + openNow.time } : hl[1] && { type: "stat", label: hl[1].label, value: hl[1].value },
    arr("services").length > 0 && { type: "tags", items: arr("services").map((x) => x.name) },
  ].filter(Boolean);

  const cast = d.cast && d.cast.character ? d.cast : null;
  const ctx = castContext("website", c);
  const storySteps = (arr("process").length >= 2 ? arr("process").map((x) => ({ title: x.title, text: x.description })) : arr("services").map((x) => ({ title: x.name, text: x.description }))).slice(0, 5);

  const scene = d.scene && d.scene.type ? d.scene : null;
  const sceneMode = d.sceneMode || "backdrop";
  const sceneEl = (cls) => (
    <Scene def={scene} className={cls} text={c.brand.name} words={arr("services").map((x) => x.name).slice(0, 8)} image={h.imageUrl} alt={c.brand.name} preview={preview} imgPath="hero.imageUrl" />
  );
  const filmSrc = h.videoUrl || d.video || "";
  const filmOn = animated && (filmSrc ? d.film !== false : preview && d.film === true);
  const flySentence = String((c.about && (c.about.paragraphs || []).find(Boolean)) || h.sub || "").split(/(?<=[.!?])\s/)[0].slice(0, 160);
  const flyTiles = (arr("gallery").some((g) => g.imageUrl) ? arr("gallery").map((g) => ({ label: g.caption, image: g.imageUrl })) : arr("services").map((x) => ({ label: x.name }))).filter((t) => t.label || t.image);
  const showpiece = animated ? d.showpiece || "none" : "none";
  const spItems = [...arr("gallery").filter((g) => g.imageUrl).map((g) => ({ title: g.caption, image: g.imageUrl })), ...arr("services").map((x) => ({ title: x.name, note: x.price || x.description })), ...arr("team").map((m) => ({ title: m.name, note: m.role, image: m.photoUrl }))];
  const trackBlocks = showpiece === "track" ? [
    c.about && (c.about.paragraphs || []).find(Boolean) ? { kind: "text", head: c.about.heading || "About", text: (c.about.paragraphs || []).find(Boolean) } : null,
    arr("services").length ? { kind: "list", head: "What we do", lines: arr("services").slice(0, 6).map((x) => x.name) } : null,
    arr("testimonials").length ? { kind: "quote", head: arr("testimonials")[0].name, text: arr("testimonials")[0].quote } : null,
    arr("highlights").length ? { kind: "stats", head: "In numbers", lines: arr("highlights").map((x) => x.value + "  " + x.label) } : null,
    arr("process").length ? { kind: "list", head: "How it works", lines: arr("process").slice(0, 5).map((x, i) => String(i + 1).padStart(2, "0") + "  " + x.title) } : null,
    c.contact && (c.contact.phone || c.contact.email) ? { kind: "list", head: "Say hello", lines: [c.contact.phone, c.contact.email, c.visit && c.visit.address].filter(Boolean) } : null,
  ].filter(Boolean) : [];
  const renderHero = () => {
    if (hero === "stage") {
      return (
        <div className="pf-container pf-hero-stage">
          <div className="pf-hero-text">
            {kicker}
            {headline}
            {sub}
            {ctas}
          </div>
          {scene && sceneMode === "visual" ? (
            <div className="pf-scene-visual pf-enter" style={{ "--i": 2 }}>
              {sceneEl("")}
            </div>
          ) : cast ? <CastStage character={cast.character} widgets={cast.widgets} ctx={ctx} still={!animated} /> : <Stage name={c.brand.name} kind="blob" widgets={widgets} still={!animated} />}
        </div>
      );
    }
    if (hero === "centered") {
      return (
        <div className="pf-container pf-hero-centered">
          {kicker}
          {headline}
          {sub}
          {ctas}
          {showImage && (
            <figure className="ws-hero-wide pf-enter" style={{ "--i": 4 }}>
              {h.imageUrl ? <img src={h.imageUrl} alt={c.brand.name} data-img="hero.imageUrl" /> : <PhotoSlot label="wide opening photo" preview={preview} path="hero.imageUrl" />}
            </figure>
          )}
        </div>
      );
    }
    if (hero === "split") {
      const hl = arr("highlights").slice(0, 3);
      return (
        <div className="pf-container pf-hero-split">
          <div className="pf-hero-text">
            {kicker}
            {headline}
            {sub}
            {ctas}
          </div>
          <aside className="pf-hero-panel pf-enter" style={{ "--i": 3 }}>
            <div className="pf-row" style={{ gap: 14 }}>
              <Avatar name={c.brand.name} size={52} />
              <div>
                <strong>{c.brand.name}</strong>
                <p className="pf-small pf-muted">{c.brand.category}</p>
              </div>
            </div>
            {hl.length > 0 && (
              <dl className="pf-panel-stats">
                {hl.map((x, i) => {
                  const n = splitNumber(x.value);
                  return (
                    <div key={i}>
                      <dd>{n ? <Counter value={n.value} suffix={n.suffix} animate={animated} /> : x.value}</dd>
                      <dt>{x.label}</dt>
                    </div>
                  );
                })}
              </dl>
            )}
            {facts.map(([k, v]) => (
              <p className="pf-small" key={k}>
                <span className="pf-muted">{k}: </span>
                {v}
              </p>
            ))}
          </aside>
        </div>
      );
    }
    return (
      <div className={"pf-container pf-hero-inner" + (showImage && hero === "portrait" ? " is-portrait" : "")}>
        <div className="pf-hero-text">
          {kicker}
          {headline}
          {sub}
          {ctas}
        </div>
        {showImage && hero === "portrait" && (
          <figure className="pf-portrait ws-hero-img pf-enter" style={{ "--i": 2 }}>
            {h.imageUrl ? <img src={h.imageUrl} alt={c.brand.name} data-img="hero.imageUrl" /> : <PhotoSlot label="main photo" preview={preview} path="hero.imageUrl" />}
          </figure>
        )}
        {factList}
      </div>
    );
  };

  const render = (s) => {
    switch (s) {
      case "tiles":
        if (cast && cast.widgets.length) return <WidgetWall key={s} widgets={cast.widgets} ctx={ctx} />;
        return <LiveTiles key={s} stats={hl} words={arr("services").map((x) => x.name).slice(0, 6)} place={c.visit && c.visit.address ? c.visit.address.split(",").slice(-1)[0].trim() : ""} status={openNow ? "Open " + openNow.days : ""} />;
      case "highlights":
        if (hero === "split") return null;
        return (
          <section id="pf-highlights" className="pf-stats-band" key={s} aria-label="At a glance">
            <div className="pf-container">
              <dl className="pf-stats">
                {c.highlights.map((x, i) => {
                  const n = splitNumber(x.value);
                  return (
                    <div className="pf-stat pf-reveal" key={i} style={{ "--i": i }}>
                      <dt className="pf-stat-label">{x.label}</dt>
                      <dd className="pf-stat-value">{n ? <Counter value={n.value} suffix={n.suffix} animate={animated} /> : x.value}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </section>
        );
      case "clients":
        return animated && d.marquee ? (
          <div key={s} className="ws-clients">
            <p className="pf-container pf-small pf-muted ws-clients-label">Trusted by</p>
            <Marquee items={c.clients} label="Clients" />
          </div>
        ) : (
          <section key={s} className="ws-clients">
            <div className="pf-container">
              <p className="pf-small pf-muted ws-clients-label">Trusted by</p>
              <ul className="ws-client-list">
                {c.clients.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </section>
        );
      case "services":
        return (
          <Wide id="services" title={c.servicesTitle || "What we offer"} key={s}>
            <Services items={c.services} style={d.serviceStyle || "menu"} />
          </Wide>
        );
      case "about":
        return (
          <Section id="about" title={c.about.heading || "About"} key={s}>
            <div className="pf-prose pf-reveal">
              {c.about.paragraphs.filter(Boolean).map((p, i) =>
                i === 0 && animated && d.scrollWords !== false ? (
                  <ScrollWords key={i} text={p} className="pf-lead" />
                ) : (
                  <p key={i} className={i === 0 ? "pf-lead" : undefined}>
                    {p}
                  </p>
                )
              )}
            </div>
          </Section>
        );
      case "process":
        return (
          <Section id="process" title="How it works" key={s}>
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
          <Wide id="gallery" title="Gallery" key={s}>
            {d.carousel && animated ? (
              <Carousel items={c.gallery.map((g) => ({ title: g.caption, image: g.imageUrl }))} label="Gallery" preview={preview} pathOf={(i) => "gallery." + i + ".imageUrl"} />
            ) : (
            <div className="ws-gallery">
              {c.gallery.map((g, i) => (
                <figure className={"ws-shot pf-reveal" + (i === 0 ? " is-lead" : "")} key={i} style={{ "--i": i }}>
                  {g.imageUrl ? <img src={g.imageUrl} alt={g.caption} loading="lazy" data-img={"gallery." + i + ".imageUrl"} /> : <PhotoSlot label={g.caption} preview={preview} path={"gallery." + i + ".imageUrl"} />}
                  {g.imageUrl && <figcaption className="pf-small">{g.caption}</figcaption>}
                </figure>
              ))}
            </div>
            )}
          </Wide>
        );
      case "team":
        return (
          <Wide id="team" title="The people" key={s}>
            <div className="ws-team">
              {c.team.map((m, i) => (
                <article className="ws-member pf-card pf-reveal" key={i} style={{ "--i": i }}>
                  {m.photoUrl ? <img className="ws-member-photo" src={m.photoUrl} alt={m.name} loading="lazy" data-img={"team." + i + ".photoUrl"} /> : <span data-img={"team." + i + ".photoUrl"} data-img-empty=""><Avatar name={m.name} size={64} /></span>}
                  <h3 className="pf-h3">{m.name}</h3>
                  {m.role && <p className="pf-small pf-accent-text">{m.role}</p>}
                  {m.bio && <p className="pf-muted pf-small">{m.bio}</p>}
                </article>
              ))}
            </div>
          </Wide>
        );
      case "pricing":
        return (
          <Wide id="pricing" title="Prices" key={s}>
            <div className="ws-plans">
              {c.pricing.map((p, i) => (
                <article className={"ws-plan pf-card pf-reveal" + (p.featured ? " is-featured" : "")} key={i} style={{ "--i": i }}>
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
          </Wide>
        );
      case "testimonials":
        return (
          <section id="pf-testimonials" className="pf-section" key={s}>
            <div className="pf-container">
              <QuoteSlider items={c.testimonials} />
            </div>
          </section>
        );
      case "faq":
        return (
          <Section id="faq" title="Questions" key={s}>
            <Faq items={c.faq} />
          </Section>
        );
      case "cta":
        return (
          <section id="pf-cta" className="pf-band" key={s}>
            {cast && animated && <Peek character={cast.character} />}
            <div className="pf-container pf-band-inner pf-reveal">
              <div>
                <h2 className="pf-band-title">{c.cta.heading}</h2>
                {c.cta.text && <p className="pf-band-text">{c.cta.text}</p>}
              </div>
              <a className="pf-btn pf-btn-invert" href={h.primaryHref || "#pf-contact"} target={/^https?:/.test(h.primaryHref) ? "_blank" : undefined} rel="noreferrer">
                {c.cta.button || h.primaryCta}
              </a>
            </div>
          </section>
        );
      case "visit":
        return (
          <Section id="visit" title="Visit us" key={s}>
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
      case "custom":
        return (
          <div key={s}>
            {c.custom
              .filter((x) => x.title)
              .map((cs, k) => (
                <Section id={"custom-" + k} title={cs.title} key={k}>
                  <div className="pf-custom">
                    {cs.items.map((it, i) => (
                      <div className="pf-custom-item pf-reveal" key={i} style={{ "--i": i }}>
                        {it.title && <h3 className="pf-h3">{it.title}</h3>}
                        {it.text && <p className="pf-muted">{it.text}</p>}
                      </div>
                    ))}
                  </div>
                </Section>
              ))}
          </div>
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
            {cast && animated && <Peek character={cast.character} />}
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

  const nav = visible.filter((s) => NAV[s]).slice(0, 6);

  return (
    <div ref={rootRef} className={"pf ws pf-scheme-" + scheme + (preview ? " pf-is-preview" : "")} {...motionAttrs(d)} style={themeStyle(d, pal, scheme)}>
      <link rel="stylesheet" href={fontsHref(d.fonts)} />
      <Progress on={animated && d.progress} />
      <SmoothScroll on={animated && d.smooth !== false} preview={preview} />
      {fog.layer}
      {animated && d.grain && <Grain />}
      {animated && d.loader === "line" && <LineLoader text={h.kicker || h.role || (c.meta && c.meta.title) || ""} preview={preview} />}
      {animated && <Extras rootRef={rootRef} design={d} label={c.brand.name} preview={preview} />}
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
              <button className="pf-icon-btn" aria-label={scheme === "dark" ? "Switch to light theme" : "Switch to dark theme"} onClick={() => (d.fogSwitch !== false && d.motion !== "none" ? fog.run(() => setOverride(scheme === "dark" ? "light" : "dark"), scheme !== "dark") : setOverride(scheme === "dark" ? "light" : "dark"))}>
                <Icon name={scheme === "dark" ? "sun" : "moon"} />
              </button>
            )}
            <button className="pf-icon-btn pf-menu-btn" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>

      <section id="pf-top" className={"pf-hero pf-hero--" + hero}>
        {animated && <Backdrop kind={d.backdrop} />}
        {animated && scene && sceneMode === "backdrop" && sceneEl("pf-scene-backdrop")}
        {renderHero()}
      </section>

      {filmOn && <Film src={filmSrc} steps={storySteps} title={arr("process").length >= 2 ? "How it works" : "What we do"} highlights={arr("highlights").map((x) => ({ label: x.label, value: x.value }))} preview={preview} path="hero.videoUrl" kicker={c.brand.name} />}

      {!(filmSrc && filmOn) && showpiece !== "track" && cast && animated && d.castStory !== false && storySteps.length >= 2 && <CastStory character={cast.character} widgets={cast.widgets} ctx={ctx} steps={storySteps} title={arr("process").length >= 2 ? "How it works" : "What we do"} />}

      {showpiece === "sphere" && <Sphere props={propsFor(c.brand && c.brand.category)} items={spItems} title={"Explore"} />}
      {showpiece === "arc" && <Arc props={propsFor(c.brand && c.brand.category)} items={spItems} title={"Explore"} />}
      {showpiece === "track" && <Track blocks={trackBlocks} title={c.brand.name} mascot={cast ? <CastCharacter def={cast.character} size={180} /> : null} />}

      {visible.map(render)}

      {animated && d.flight !== false && flyTiles.length >= 3 && flySentence.split(" ").length >= 8 && <Flight sentence={flySentence} tiles={flyTiles} title={flySentence} />}

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
