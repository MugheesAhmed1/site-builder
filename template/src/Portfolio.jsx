import { useMemo, useRef, useState } from "react";
import { palette, resolveScheme } from "./theme.js";
import { useEdits } from "./edits.js";
import { Backdrop, LiveTiles, Stage } from "./rich.jsx";
import { CastCharacter, CastStage, CastStory, Peek, WidgetWall, castContext } from "./Cast.jsx";
import { Scene } from "./Scenes.jsx";
import { Carousel, Film, Flight, Grain, LineLoader, ScrollWords, SmoothScroll } from "./studio.jsx";
import { Arc, Sphere, Track, propsFor, useFogSwitch, useScramble } from "./showpiece.jsx";
import { Extras } from "./extras.jsx";
import { Badge, CinemaHero, CinemaStrip, CurtainMenu, GlassCta, ScatterHero, WordmarkFooter } from "./cinema.jsx";
import { plateFor } from "./plates.js";
import { Avatar, Counter, cleanContent, Headline, Icon, Marquee, Progress, QuoteSlider, Section, Wide, fontsHref, motionAttrs, themeStyle, useActiveSection, useReveal, useSpotlight, useSystemDark } from "./shared.jsx";

// The whole portfolio, driven by two objects:
//   design: colours, fonts, shape, layout choices and one of 728 animation styles
//   content: every word on the page, plus which sections show and in what order
// Edit src/site-data.json to change the site without touching this file.
//
// Direction: Taste Skill (brief first, restrained labels, no dashes in copy), Impeccable
// (OKLCH tinted neutrals, one accent, hierarchy from type and space), Emil Kowalski and
// ui-ux-pro-max motion rules (ease-out, transform and opacity only, reduced motion honoured).

const NAV_LABELS = {
  about: "About",
  services: "Services",
  experience: "Experience",
  projects: "Work",
  skills: "Skills",
  testimonials: "Kind words",
  contact: "Contact",
};

function refCode(s, i) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return "REF " + String(h % 100000).padStart(5, "0") + "/" + String(i + 1).padStart(2, "0");
}

const isCurrent = (end) => /present|current|now/i.test(end || "");

function Tags({ items }) {
  if (!items || !items.length) return null;
  return (
    <ul className="pf-tag-list">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

function Bullets({ items }) {
  if (!items || !items.length) return null;
  return (
    <ul className="pf-bullets">
      {items.map((h, j) => (
        <li key={j}>{h}</li>
      ))}
    </ul>
  );
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
              <Bullets items={x.highlights} />
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
            <Bullets items={x.highlights} />
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
          <div className="pf-row pf-between pf-baseline pf-wrap">
            <h3 className="pf-h3">{x.company}</h3>
            <span className="pf-mono pf-small pf-muted">
              {x.start} to {x.end}
            </span>
          </div>
          <p className="pf-role-line">{x.role}</p>
          {x.summary && <p className="pf-muted">{x.summary}</p>}
          <Bullets items={x.highlights} />
        </li>
      ))}
    </ol>
  );
}

function ProjectLink({ p, children, className = "" }) {
  if (!p.link) return <span className={className}>{children}</span>;
  return (
    <a className={className + " pf-project-link"} href={p.link} target="_blank" rel="noreferrer">
      {children}
      <Icon name="arrow" />
    </a>
  );
}

function Media({ src, label, n, path }) {
  if (src) return <img src={src} alt={label} loading="lazy" data-img={path} />;
  return (
    <div className="pf-media-fallback" aria-hidden="true" data-img={path} data-img-empty="">
      <span>{String(n).padStart(2, "0")}</span>
    </div>
  );
}

function Projects({ items, style }) {
  const cats = useMemo(() => ["All", ...Array.from(new Set(items.map((p) => p.category).filter(Boolean)))], [items]);
  const [cat, setCat] = useState("All");
  const shown = cat === "All" ? items : items.filter((p) => p.category === cat);
  const filters = cats.length > 2 && (
    <div className="pf-filters pf-reveal" role="group" aria-label="Filter projects">
      {cats.map((c) => (
        <button key={c} aria-pressed={c === cat} className={"pf-chip" + (c === cat ? " is-active" : "")} onClick={() => setCat(c)}>
          {c}
        </button>
      ))}
    </div>
  );
  if (style === "case") {
    return (
      <>
        {filters}
        <div className="pf-cases" key={cat}>
          {shown.map((p, i) => (
            <article className={"pf-case pf-card pf-reveal" + (i % 2 ? " is-flipped" : "")} key={p.name + i}>
              <div className="pf-case-media">
                <Media src={p.imageUrl} label={p.name} n={i + 1} path={"projects." + items.indexOf(p) + ".imageUrl"} />
              </div>
              <div className="pf-case-body">
                <p className="pf-small pf-muted">{[p.category, p.role].filter(Boolean).join(" · ")}</p>
                <h3 className="pf-h3 pf-case-title">
                  <ProjectLink p={p}>{p.name}</ProjectLink>
                </h3>
                <p className="pf-muted">{p.summary}</p>
                {p.impact && <p className="pf-impact-line">{p.impact}</p>}
                <Tags items={p.tags} />
              </div>
            </article>
          ))}
        </div>
      </>
    );
  }
  if (style === "index") {
    return (
      <>
        {filters}
        <ol className="pf-index" key={cat}>
          {shown.map((p, i) => (
            <li className="pf-index-row pf-reveal" key={p.name + i} style={{ "--i": i }}>
              <span className="pf-mono pf-quiet">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="pf-index-title">
                  <ProjectLink p={p}>{p.name}</ProjectLink>
                </h3>
                <p className="pf-muted">{p.summary}</p>
                {p.impact && <p className="pf-impact-line">{p.impact}</p>}
              </div>
              <span className="pf-small pf-muted pf-index-cat">{p.category || (p.tags || [])[0] || ""}</span>
            </li>
          ))}
        </ol>
      </>
    );
  }
  return (
    <>
      {filters}
      <div className="pf-projects" key={cat}>
        {shown.map((p, i) => (
          <article className={"pf-project pf-card pf-reveal" + (i === 0 && shown.length > 2 ? " is-featured" : "")} key={p.name + i} style={{ "--i": i }}>
            {p.imageUrl && (
              <div className="pf-project-media">
                <img src={p.imageUrl} alt={p.name} loading="lazy" data-img={"projects." + items.indexOf(p) + ".imageUrl"} />
              </div>
            )}
            <p className="pf-small pf-muted pf-project-head">{[p.category, p.role].filter(Boolean).join(" · ")}</p>
            <h3 className="pf-h3 pf-project-title">
              <ProjectLink p={p}>{p.name}</ProjectLink>
            </h3>
            <p className="pf-muted">{p.summary}</p>
            {p.impact && <p className="pf-impact-line">{p.impact}</p>}
            <Tags items={p.tags} />
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

export default function Portfolio({ design, content, preview = false, scheme: forcedScheme, editing = false }) {
  const rootRef = useRef(null);
  const c = useMemo(() => cleanContent(content), [content]);
  const d = design;
  const systemDark = useSystemDark();
  const [override, setOverride] = useState(null);
  const scheme = forcedScheme || override || resolveScheme(d, systemDark);
  const pal = palette(d, scheme);
  const animated = d.motion !== "none" && d.anim !== "M-000";
  const [activeId, setActiveId] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const arr = (k) => (Array.isArray(c[k]) ? c[k] : []);

  const hasData = (s) => {
    if (s === "about") return c.about && (c.about.paragraphs || []).filter(Boolean).length > 0;
    if (s === "contact") return true;
    if (s === "cta") return !!(c.cta && c.cta.heading);
    if (s === "tiles") return arr("stats").length > 0 || arr("skills").length > 0 || !!(c.hero && c.hero.location);
    return arr(s).length > 0;
  };
  const visible = (c.sections || []).filter(hasData);
  useReveal(rootRef, JSON.stringify(c) + JSON.stringify({ ...d, edits: 0, colors: 0 }), d);
  // Whatever the person changed by clicking it in the builder: colours, backgrounds, icons, labels.
  useEdits(rootRef, d.edits, editing);
  useScramble(rootRef, d.motion !== "none" && d.anim !== "M-000" && !!d.scramble, JSON.stringify(c) + (d.scramble ? 1 : 0));
  const fog = useFogSwitch();
  useSpotlight(rootRef, animated && d.hover === "spotlight");
  useActiveSection(rootRef, visible.join(","), setActiveId);

  const h = c.hero;
  const nav = visible.filter((s) => NAV_LABELS[s]).slice(0, 6);
  const photo = h.photoUrl;
  const hero = d.heroStyle || "statement";
  const skillsFlat = arr("skills").flatMap((g) => g.items || []);
  const ct = c.contact || {};
  const cast = d.cast && d.cast.character ? d.cast : null;
  const ctx = castContext("portfolio", c);
  const storySteps = (arr("process").length >= 2
    ? arr("process").map((x) => ({ title: x.title, text: x.description }))
    : arr("services").length >= 2
      ? arr("services").map((x) => ({ title: x.name, text: x.description }))
      : arr("projects").map((x) => ({ title: x.name, text: x.impact || x.summary }))
  ).slice(0, 5);

  const ctas = (
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
  );
  const kicker = (
    <p className="pf-hero-kicker pf-enter" style={{ "--i": 0 }}>
      {h.availability && <span className="pf-dot" aria-hidden="true" />}
      <span>
        {h.name}
        {h.role ? ", " + h.role : ""}
      </span>
    </p>
  );
  const accentFace = d.accentFace || "none";
  const cinematic = hero === "cinema" || hero === "scatter";
  const headline = <Headline text={h.tagline} accent={accentFace} mode={animated ? motionAttrs(d)["data-headline"] : "none"} className={"pf-display" + (cinematic ? " cn-on-photo" : "") + ((h.tagline || "").length > 34 ? " is-long" : "")} />;
  const intro = h.intro && (
    <p className="pf-hero-sub pf-enter" style={{ "--i": 2 }}>
      {h.intro}
    </p>
  );
  const facts = (
    <dl className="pf-facts pf-enter" style={{ "--i": 4 }}>
      {h.location && (
        <div>
          <dt>Based in</dt>
          <dd>{h.location}</dd>
        </div>
      )}
      {skillsFlat.length > 0 && (
        <div>
          <dt>Focus</dt>
          <dd>{skillsFlat.slice(0, 2).join(", ")}</dd>
        </div>
      )}
      {h.availability && (
        <div>
          <dt>Status</dt>
          <dd className="pf-accent-text">{h.availability}</dd>
        </div>
      )}
    </dl>
  );
  const portrait = (
    <figure className="pf-portrait pf-enter" style={{ "--i": 2 }}>
      {photo ? (
        <img src={photo} alt={"Portrait of " + h.name} data-img="hero.photoUrl" />
      ) : (
        <div className="pf-portrait-mono" data-img="hero.photoUrl" data-img-empty="">
          <Avatar name={h.name} size={120} />
          {preview && <small>Click Edit on page, then click here to upload or paste your photo.</small>}
        </div>
      )}
    </figure>
  );

  const first = (h.name || "").split(" ")[0];
  const widgets = [
    c.stats[0] && { type: "stat", label: c.stats[0].label, value: (c.stats[0].value ?? "") + (c.stats[0].suffix || "") },
    { type: "chat", text: first ? `Hi, I'm ${first}. ${h.role ? h.role + "." : ""} Say hello!` : "Hi there. Say hello!" },
    h.availability ? { type: "status", text: h.availability } : c.stats[1] && { type: "stat", label: c.stats[1].label, value: (c.stats[1].value ?? "") + (c.stats[1].suffix || "") },
    skillsFlat.length > 0 && { type: "tags", items: skillsFlat },
  ].filter(Boolean);

  const scene = d.scene && d.scene.type ? d.scene : null;
  const sceneMode = d.sceneMode || "backdrop";
  const sceneEl = (cls) => (
    <Scene def={scene} className={cls} text={h.name} words={(skillsFlat.length ? skillsFlat : arr("services").map((x) => x.name)).slice(0, 8)} image={h.photoUrl} alt={h.name} preview={preview} imgPath="hero.photoUrl" />
  );
  const filmSrc = h.videoUrl || d.video || "";
  const filmOn = animated && (filmSrc ? d.film !== false : preview && d.film === true);
  const flySentence = String(h.intro || (c.about && (c.about.paragraphs || []).find(Boolean)) || "").split(/(?<=[.!?])\s/)[0].slice(0, 160);
  const flyTiles = (arr("projects").filter((p) => p.imageUrl).length >= 3
    ? arr("projects").map((p) => ({ label: p.name, image: p.imageUrl }))
    : [arr("projects").map((p) => ({ label: p.name })), arr("services").map((x) => ({ label: x.name })), arr("skills").flatMap((g) => g.items || []).map((x) => ({ label: x }))].find((l) => l.length >= 3) || []).filter((t) => t.label || t.image);
  const showpiece = animated ? d.showpiece || "none" : "none";
  const spItems = [...arr("projects").map((p) => ({ title: p.name, note: p.category || p.role || p.impact, image: p.imageUrl, href: p.link })), ...arr("services").map((x) => ({ title: x.name, note: x.price || x.description })), ...arr("skills").flatMap((g) => (g.items || []).slice(0, 4)).map((x) => ({ title: x }))];
  const trackBlocks = showpiece === "track" ? [
    c.about && (c.about.paragraphs || []).find(Boolean) ? { kind: "text", head: "About", text: (c.about.paragraphs || []).find(Boolean) } : null,
    arr("skills").length ? { kind: "list", head: arr("skills")[0].group || "Skills", lines: (arr("skills")[0].items || []).slice(0, 6) } : null,
    arr("testimonials").length ? { kind: "quote", head: arr("testimonials")[0].name, text: arr("testimonials")[0].quote } : null,
    arr("stats").length ? { kind: "stats", head: "In numbers", lines: arr("stats").map((x) => (x.value ?? "") + (x.suffix || "") + "  " + x.label) } : null,
    arr("experience").length ? { kind: "list", head: "Where I've worked", lines: arr("experience").slice(0, 5).map((x) => x.company) } : null,
    c.contact && c.contact.email ? { kind: "list", head: "Contact", lines: [c.contact.email, h.location].filter(Boolean) } : null,
  ].filter(Boolean) : [];
  const plate = plateFor(d, "portfolio", h.role);
  const heroStats = arr("stats").map((x) => ({ value: (x.value ?? "") + (x.suffix || ""), label: x.label }));
  const people = arr("testimonials").map((t) => ({ name: t.name }));
  const renderHero = () => {
    if (hero === "cinema") {
      return (
        <CinemaHero plate={photo && d.plate === "photo" ? photo : plate} still={!animated} stats={heroStats}>
          <Badge text={[h.name, h.role].filter(Boolean).join(", ") + (h.availability ? " · " + h.availability : "")} people={people} />
          {headline}
          {intro}
          {ctas}
        </CinemaHero>
      );
    }
    if (hero === "scatter") {
      const subject = cast && cast.character && cast.character.src ? cast.character.src : "";
      return (
        <ScatterHero text={h.tagline} subject={subject} plate={photo || plate} props={[]} stats={heroStats} still={!animated}>
          {kicker}
          {intro}
          {ctas}
        </ScatterHero>
      );
    }
    if (hero === "stage") {
      return (
        <div className="pf-container pf-hero-stage">
          <div className="pf-hero-text">
            {kicker}
            {headline}
            {intro}
            {ctas}
          </div>
          {scene && sceneMode === "visual" ? (
            <div className="pf-scene-visual pf-enter" style={{ "--i": 2 }}>
              {sceneEl("")}
            </div>
          ) : cast ? <CastStage character={cast.character} widgets={cast.widgets} ctx={ctx} still={!animated} /> : <Stage name={h.name} kind="person" widgets={widgets} still={!animated} />}
        </div>
      );
    }
    if (hero === "centered") {
      return (
        <div className="pf-container pf-hero-centered">
          <div className="pf-enter" style={{ "--i": 0 }}>
            {photo ? <img className="pf-hero-avatar" src={photo} alt={"Portrait of " + h.name} data-img="hero.photoUrl" /> : <span data-img="hero.photoUrl" data-img-empty=""><Avatar name={h.name} size={72} /></span>}
          </div>
          {kicker}
          {headline}
          {intro}
          {ctas}
        </div>
      );
    }
    if (hero === "split") {
      const top = arr("stats").slice(0, 3);
      return (
        <div className="pf-container pf-hero-split">
          <div className="pf-hero-text">
            {kicker}
            {headline}
            {intro}
            {ctas}
          </div>
          <aside className="pf-hero-panel pf-enter" style={{ "--i": 3 }}>
            <div className="pf-row" style={{ gap: 14 }}>
              {photo ? <img className="pf-hero-avatar" src={photo} alt={"Portrait of " + h.name} data-img="hero.photoUrl" /> : <span data-img="hero.photoUrl" data-img-empty=""><Avatar name={h.name} size={56} /></span>}
              <div>
                <strong>{h.name}</strong>
                <p className="pf-small pf-muted">{[h.role, h.location].filter(Boolean).join(", ")}</p>
              </div>
            </div>
            {top.length > 0 && (
              <dl className="pf-panel-stats">
                {top.map((x, i) => (
                  <div key={i}>
                    <dd>
                      <Counter value={Number(x.value) || 0} suffix={x.suffix} animate={animated} />
                    </dd>
                    <dt>{x.label}</dt>
                  </div>
                ))}
              </dl>
            )}
            {h.availability && (
              <p className="pf-panel-status">
                <span className="pf-dot" aria-hidden="true" />
                {h.availability}
              </p>
            )}
          </aside>
        </div>
      );
    }
    return (
      <div className={"pf-container pf-hero-inner" + (hero === "portrait" ? " is-portrait" : "")}>
        <div className="pf-hero-text">
          {kicker}
          {headline}
          {intro}
          {ctas}
        </div>
        {hero === "portrait" && portrait}
        {facts}
      </div>
    );
  };

  const render = (s) => {
    switch (s) {
      case "tiles":
        if (cast && cast.widgets.length) return <WidgetWall key={s} widgets={cast.widgets} ctx={ctx} />;
        return <LiveTiles key={s} stats={c.stats} words={skillsFlat.slice(0, 6)} place={h.location} status={h.availability} />;
      case "stats":
        if (hero === "split") return null;
        return (
          <section id="pf-stats" className="pf-stats-band" key={s} aria-label="Impact">
            <div className="pf-container">
              <dl className="pf-stats">
                {c.stats.map((x, i) => (
                  <div className="pf-stat pf-reveal" key={i} style={{ "--i": i }}>
                    <dt className="pf-stat-label">{x.label}</dt>
                    <dd className="pf-stat-value">
                      <Counter value={Number(x.value) || 0} suffix={x.suffix} animate={animated} />
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
      case "services":
        return (
          <Wide id="services" title="What I can do for you" key={s}>
            <div className="pf-bento">
              {c.services.map((x, i) => (
                <article className="pf-bento-cell pf-card pf-reveal" key={i} style={{ "--i": i }}>
                  <span className="pf-mono pf-quiet">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="pf-h3">{x.name}</h3>
                  {x.description && <p className="pf-muted">{x.description}</p>}
                  {x.price && <p className="pf-price pf-mono">{x.price}</p>}
                </article>
              ))}
            </div>
          </Wide>
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
          <Wide id="projects" title="Selected work" key={s}>
            <Projects items={c.projects} style={d.projectStyle || "grid"} />
          </Wide>
        );
      case "skills":
        return (
          <Section id="skills" title="Skills and tools" key={s}>
            <div className="pf-skill-groups">
              {c.skills.map((g, i) => (
                <div className="pf-skill-group pf-reveal" key={i} style={{ "--i": i }}>
                  <h3 className="pf-small pf-skill-title">{g.group}</h3>
                  <ul className="pf-pills">
                    {g.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>
        );
      case "testimonials":
        return (
          <section id="pf-testimonials" className="pf-section" key={s}>
            <div className="pf-container">
              <QuoteSlider items={c.testimonials} />
            </div>
          </section>
        );
      case "awards":
      case "certifications":
      case "education":
      case "languages": {
        const title = { awards: "Awards", certifications: "Certifications", education: "Education", languages: "Languages" }[s];
        const rows =
          s === "education"
            ? c.education.map((x) => [x.degree, x.school, x.year])
            : s === "languages"
              ? c.languages.map((x) => [x.name, x.level, ""])
              : c[s].map((x) => [x.name, x.issuer, x.year, x.link]);
        return (
          <Section id={s} title={title} key={s}>
            <ul className="pf-plainlist">
              {rows.map(([a, b, y, link], i) => (
                <li className="pf-reveal" key={i} style={{ "--i": i }}>
                  <span>
                    {link ? (
                      <a className="pf-inline-link" href={link} target="_blank" rel="noreferrer">
                        <strong>{a}</strong>
                      </a>
                    ) : (
                      <strong>{a}</strong>
                    )}
                    {b && <span className="pf-muted">, {b}</span>}
                  </span>
                  {y && <span className="pf-mono pf-small pf-muted">{y}</span>}
                </li>
              ))}
            </ul>
          </Section>
        );
      }
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
      case "cta":
        if (d.ctaStyle === "glass") return <GlassCta key={s} plate={plate} heading={c.cta.heading} text={c.cta.text} button={c.cta.button || "Get in touch"} href="#pf-contact" />;
        return (
          <section id="pf-cta" className="pf-band" key={s}>
            {cast && animated && <Peek character={cast.character} />}
            <div className="pf-container pf-band-inner pf-reveal">
              <div>
                <h2 className="pf-band-title">{c.cta.heading}</h2>
                {c.cta.text && <p className="pf-band-text">{c.cta.text}</p>}
              </div>
              <a className="pf-btn pf-btn-invert" href="#pf-contact">
                {c.cta.button || "Get in touch"}
              </a>
            </div>
          </section>
        );
      case "contact": {
        const links = [
          ["LinkedIn", ct.linkedin],
          ["GitHub", ct.github],
          ["Website", ct.website],
        ].filter(([, u]) => u);
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

  const curtain = d.menu === "curtain";
  const navLinks = nav.map((s) => ({ href: "#pf-" + s, label: NAV_LABELS[s] }));
  const contactLinks = [
    ct.email && { href: "mailto:" + ct.email, label: ct.email },
    ct.linkedin && { href: ct.linkedin, label: "LinkedIn" },
    ct.github && { href: ct.github, label: "GitHub" },
    ct.website && { href: ct.website, label: "Website" },
  ].filter(Boolean).slice(0, 4);

  return (
    <div ref={rootRef} className={"pf pf-scheme-" + scheme + (preview ? " pf-is-preview" : "") + (editing ? " pf-is-editing" : "")} {...motionAttrs(d)} style={themeStyle(d, pal, scheme)}>
      <link rel="stylesheet" href={fontsHref(d.fonts, d.accentFace)} />
      <Progress on={animated && d.progress} />
      <SmoothScroll on={animated && d.smooth !== false} preview={preview} />
      {fog.layer}
      {animated && d.grain && <Grain />}
      {animated && d.loader === "line" && <LineLoader text={h.kicker || h.role || (c.meta && c.meta.title) || ""} preview={preview} />}
      {animated && <Extras rootRef={rootRef} design={d} label={h.name} preview={preview} />}
      <header className={"pf-nav" + (d.chrome === "pill" ? " pf-nav--pill" : "")}>
        <div className="pf-container pf-nav-inner">
          <a href="#pf-top" className="pf-brand">
            {h.name}
          </a>
          <nav className={"pf-nav-links" + (menuOpen && !curtain ? " is-open" : "")} aria-label="Sections">
            {nav.map((s) => (
              <a key={s} href={"#pf-" + s} aria-current={activeId === s ? "true" : undefined} onClick={() => setMenuOpen(false)}>
                {NAV_LABELS[s]}
              </a>
            ))}
          </nav>
          <div className="pf-row pf-nav-tools">
            {!forcedScheme && (
              <button className="pf-icon-btn" aria-label={scheme === "dark" ? "Switch to light theme" : "Switch to dark theme"} onClick={() => (d.fogSwitch !== false && d.motion !== "none" ? fog.run(() => setOverride(scheme === "dark" ? "light" : "dark"), scheme !== "dark") : setOverride(scheme === "dark" ? "light" : "dark"))}>
                <Icon name={scheme === "dark" ? "sun" : "moon"} />
              </button>
            )}
            {d.chrome === "pill" && (
              <a className="pf-btn pf-nav-cta" href="#pf-contact">
                Get in touch
              </a>
            )}
            <button className={"pf-icon-btn pf-menu-btn" + (curtain ? " is-curtain" : "")} aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>

      {curtain && <CurtainMenu open={menuOpen} onClose={() => setMenuOpen(false)} links={navLinks} brand={h.name} cta={{ href: "#pf-contact", label: "Get in touch" }} />}

      <section id="pf-top" className={"pf-hero pf-hero--" + hero}>
        {animated && <Backdrop kind={d.backdrop} />}
        {animated && scene && sceneMode === "backdrop" && sceneEl("pf-scene-backdrop")}
        {renderHero()}
      </section>

      {hero === "cinema" ? <CinemaStrip label="Tools and skills" items={skillsFlat.slice(0, 14)} /> : d.marquee && animated && skillsFlat.length > 3 && <Marquee items={skillsFlat} label="Skills" />}

      {filmOn && <Film src={filmSrc} steps={storySteps} title={"Selected work"} highlights={arr("stats").map((x) => ({ label: x.label, value: (x.value ?? "") + (x.suffix || "") }))} preview={preview} path="hero.videoUrl" kicker={h.name} />}

      {!(filmSrc && filmOn) && showpiece !== "track" && cast && animated && d.castStory !== false && storySteps.length >= 2 && <CastStory character={cast.character} widgets={cast.widgets} ctx={ctx} steps={storySteps} title={arr("process").length >= 2 ? "How I work" : arr("services").length >= 2 ? "What I do" : "Selected work"} />}

      {showpiece === "sphere" && <Sphere props={propsFor("portfolio")} items={spItems} title={"Explore the work"} />}
      {showpiece === "arc" && <Arc props={propsFor("portfolio")} items={spItems} title={"Explore the work"} />}
      {showpiece === "track" && <Track blocks={trackBlocks} title={h.name} mascot={cast ? <CastCharacter def={cast.character} size={180} /> : null} />}

      {visible.map(render)}

      {animated && d.flight !== false && flyTiles.length >= 3 && flySentence.split(" ").length >= 8 && <Flight sentence={flySentence} tiles={flyTiles} title={flySentence} />}

      {d.footer === "wordmark" ? (
        <WordmarkFooter brand={h.name} blurb={h.intro} links={navLinks} contact={contactLinks} />
      ) : (
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
      )}
    </div>
  );
}
