import { type CSSProperties, type ReactNode } from "react";
import type { PortfolioContent, WebsiteContent } from "../content/types";
import { digits, initials } from "../content/clean";
import { Headline } from "./Text";
import { BlockBody } from "./Block";
import type { Block } from "../content/blocks";
import { blockOf } from "../content/sections";

// The content of each scene. A scene is the moment; these are the words, pictures and
// details it presents. Every block carries data-enter so the scene's entrance primitive
// plays on it, and every picture carries data-img with its content path so Edit on page can
// swap it. Ids stay pf-<section> so links, the editor and saved edits keep working.

export interface Ctx {
  kind: "website" | "portfolio";
  c: any;
  preview: boolean;
  editing: boolean;
  /** The scene's entrance primitive, without the category ("rise", "mask"...). */
  enter: string;
  /** The scene's headline primitive ("text.words"...). */
  text: string;
}

const iv = (i: number) => ({ ["--i" as string]: i }) as CSSProperties;

export function Enter({ ctx, i = 0, as: Tag = "div", className, children, style, ...rest }: { ctx: Ctx; i?: number; as?: any; className?: string; children: ReactNode; style?: CSSProperties; href?: string; target?: string; rel?: string }) {
  return (
    <Tag className={className} data-enter={ctx.enter} style={{ ...iv(i), ...style }} {...rest}>
      {children}
    </Tag>
  );
}

function Title({ ctx, kicker, title, intro }: { ctx: Ctx; kicker?: string; title: string; intro?: string }) {
  return (
    <header className="xp-head">
      {kicker && (
        <Enter ctx={ctx} as="p" className="xp-kicker">
          {kicker}
        </Enter>
      )}
      <Headline as="h2" className="xp-h2" text={title} primitive={ctx.text} />
      {intro && (
        <Enter ctx={ctx} i={1} as="p" className="xp-lead">
          {intro}
        </Enter>
      )}
    </header>
  );
}

function Picture({ path, src, alt, ctx, className, label }: { path: string; src?: string; alt: string; ctx: Ctx; className?: string; label: string }) {
  if (src)
    return (
      <div className={"xp-pic " + (className || "")} data-img={path}>
        <img src={src} alt={alt} loading="lazy" decoding="async" />
      </div>
    );
  if (!ctx.preview) return null;
  return (
    <div className={"xp-pic xp-pic-empty " + (className || "")} data-img={path} data-img-empty="">
      <span>{label}</span>
    </div>
  );
}

// ------------------------------------------------------------------ hero

export function Hero({ ctx }: { ctx: Ctx }) {
  if (ctx.kind === "website") {
    const c = ctx.c as WebsiteContent;
    const h = c.hero;
    return (
      <div className="xp-hero">
        {h.kicker && (
          <Enter ctx={ctx} as="p" className="xp-kicker">
            {h.kicker}
          </Enter>
        )}
        <Headline as="h1" className="xp-h1" text={h.headline || c.brand.name} primitive={ctx.text} />
        {h.sub && (
          <Enter ctx={ctx} i={2} as="p" className="xp-lead">
            {h.sub}
          </Enter>
        )}
        <Enter ctx={ctx} i={3} className="xp-actions">
          {h.primaryCta && (
            <a className="xp-btn xp-btn-main" data-magnetic="" href={h.primaryHref || "#pf-contact"}>
              {h.primaryCta}
            </a>
          )}
          {h.secondaryCta && (
            <a className="xp-btn xp-btn-ghost" href="#pf-services">
              {h.secondaryCta}
            </a>
          )}
        </Enter>
        {(h.imageUrl || (ctx.preview && ctx.editing)) && (
          <Enter ctx={ctx} i={4}>
            <Picture ctx={ctx} path="hero.imageUrl" src={h.imageUrl} alt={c.brand.name} className="xp-hero-pic" label="Opening photo" />
          </Enter>
        )}
      </div>
    );
  }
  const c = ctx.c as PortfolioContent;
  const h = c.hero;
  return (
    <div className="xp-hero">
      {(h.role || h.location) && (
        <Enter ctx={ctx} as="p" className="xp-kicker">
          {[h.role, h.location].filter(Boolean).join(" · ")}
        </Enter>
      )}
      <Headline as="h1" className="xp-h1" text={h.tagline || h.name} primitive={ctx.text} />
      {h.intro && (
        <Enter ctx={ctx} i={2} as="p" className="xp-lead">
          {h.intro}
        </Enter>
      )}
      <Enter ctx={ctx} i={3} className="xp-actions">
        <a className="xp-btn xp-btn-main" data-magnetic="" href="#pf-contact">
          {c.cta?.button || "Get in touch"}
        </a>
        {c.projects?.length > 0 && (
          <a className="xp-btn xp-btn-ghost" href="#pf-projects">
            See the work
          </a>
        )}
        {h.resumeUrl && (
          <a className="xp-btn xp-btn-ghost" href={h.resumeUrl} target="_blank" rel="noreferrer">
            Résumé
          </a>
        )}
      </Enter>
      {h.availability && (
        <Enter ctx={ctx} i={4} as="p" className="xp-status">
          <span aria-hidden="true" /> {h.availability}
        </Enter>
      )}
      {(h.photoUrl || (ctx.preview && ctx.editing)) && (
        <Enter ctx={ctx} i={4}>
          <Picture ctx={ctx} path="hero.photoUrl" src={h.photoUrl} alt={h.name} className="xp-hero-pic is-round" label="Your photo" />
        </Enter>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ sections

function Tiles({ ctx }: { ctx: Ctx }) {
  const items: { value: string; label: string }[] =
    ctx.kind === "website" ? (ctx.c as WebsiteContent).highlights : (ctx.c as PortfolioContent).stats.map((s) => ({ value: String(s.value) + (s.suffix || ""), label: s.label }));
  return (
    <div className="xp-tiles">
      {items.map((t, i) => (
        <Enter ctx={ctx} i={i} key={i} className="xp-tile">
          <strong data-count={t.value}>{t.value}</strong>
          <span>{t.label}</span>
        </Enter>
      ))}
    </div>
  );
}

function Services({ ctx }: { ctx: Ctx }) {
  const items = (ctx.c.services || []) as WebsiteContent["services"];
  return (
    <>
      <Title ctx={ctx} kicker={ctx.kind === "website" ? "What we do" : "Services"} title={ctx.kind === "website" ? "What we offer" : "How I can help"} />
      <div className="xp-grid">
        {items.map((x, i) => (
          <Enter ctx={ctx} i={i} key={i} as="article" className="xp-card">
            <span className="xp-num">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="xp-h3">{x.name}</h3>
            {x.description && <p>{x.description}</p>}
            {x.price && <p className="xp-price">{x.price}</p>}
          </Enter>
        ))}
      </div>
    </>
  );
}

function About({ ctx }: { ctx: Ctx }) {
  const a = ctx.c.about as WebsiteContent["about"];
  return (
    <>
      <Title ctx={ctx} kicker="About" title={a.heading || "Our story"} />
      <div className="xp-prose">
        {a.paragraphs.filter(Boolean).map((p, i) => (
          <Enter ctx={ctx} i={i + 1} as="p" key={i}>
            {p}
          </Enter>
        ))}
      </div>
    </>
  );
}

function Process({ ctx }: { ctx: Ctx }) {
  const steps = ctx.c.process as WebsiteContent["process"];
  return (
    <>
      <Title ctx={ctx} kicker="How it works" title={ctx.kind === "website" ? "How it works" : "How I work"} />
      <ol className="xp-steps">
        {steps.map((s, i) => (
          <Enter ctx={ctx} i={i} as="li" key={i} className="xp-step">
            <span className="xp-num">{i + 1}</span>
            <div>
              <h3 className="xp-h3">{s.title}</h3>
              {s.description && <p>{s.description}</p>}
            </div>
          </Enter>
        ))}
      </ol>
    </>
  );
}

function Gallery({ ctx }: { ctx: Ctx }) {
  const items = (ctx.c as WebsiteContent).gallery;
  return (
    <>
      <Title ctx={ctx} kicker="Gallery" title="Take a look" />
      <div className="xp-gallery">
        {items.map((g, i) => (
          <Enter ctx={ctx} i={i} as="figure" key={i} className="xp-figure">
            <Picture ctx={ctx} path={"gallery." + i + ".imageUrl"} src={g.imageUrl} alt={g.caption || "Gallery photo " + (i + 1)} label={"Photo: " + (g.caption || i + 1)} />
            {g.caption && <figcaption>{g.caption}</figcaption>}
          </Enter>
        ))}
      </div>
    </>
  );
}

function Team({ ctx }: { ctx: Ctx }) {
  const items = (ctx.c as WebsiteContent).team;
  return (
    <>
      <Title ctx={ctx} kicker="Team" title="The people" />
      <div className="xp-grid">
        {items.map((m, i) => (
          <Enter ctx={ctx} i={i} as="article" key={i} className="xp-card xp-person">
            {m.photoUrl || ctx.preview ? (
              <Picture ctx={ctx} path={"team." + i + ".photoUrl"} src={m.photoUrl} alt={m.name} className="is-round" label={initials(m.name)} />
            ) : (
              <span className="xp-avatar" aria-hidden="true">
                {initials(m.name)}
              </span>
            )}
            <h3 className="xp-h3">{m.name}</h3>
            {m.role && <p className="xp-muted">{m.role}</p>}
            {m.bio && <p>{m.bio}</p>}
          </Enter>
        ))}
      </div>
    </>
  );
}

function Pricing({ ctx }: { ctx: Ctx }) {
  const plans = (ctx.c as WebsiteContent).pricing;
  return (
    <>
      <Title ctx={ctx} kicker="Prices" title="Simple prices" />
      <div className="xp-grid">
        {plans.map((p, i) => (
          <Enter ctx={ctx} i={i} as="article" key={i} className={"xp-card xp-plan" + (p.featured ? " is-featured" : "")}>
            <h3 className="xp-h3">{p.name}</h3>
            <p className="xp-plan-price">
              <strong>{p.price}</strong> {p.period && <span>{p.period}</span>}
            </p>
            <ul>
              {p.features.map((f, k) => (
                <li key={k}>{f}</li>
              ))}
            </ul>
            <a className={"xp-btn " + (p.featured ? "xp-btn-main" : "xp-btn-ghost")} href="#pf-contact">
              Choose {p.name}
            </a>
          </Enter>
        ))}
      </div>
    </>
  );
}

function Testimonials({ ctx }: { ctx: Ctx }) {
  const items = ctx.c.testimonials as WebsiteContent["testimonials"];
  return (
    <>
      <Title ctx={ctx} kicker="Kind words" title={ctx.kind === "website" ? "What people say" : "What people say about working with me"} />
      <div className="xp-quotes">
        {items.map((q, i) => (
          <Enter ctx={ctx} i={i} as="figure" key={i} className="xp-quote">
            <blockquote>{q.quote}</blockquote>
            <figcaption>
              <strong>{q.name}</strong>
              {q.role && <span> · {q.role}</span>}
            </figcaption>
          </Enter>
        ))}
      </div>
    </>
  );
}

function Faq({ ctx }: { ctx: Ctx }) {
  const items = (ctx.c as WebsiteContent).faq;
  return (
    <>
      <Title ctx={ctx} kicker="Questions" title="Good to know" />
      <div className="xp-faq">
        {items.map((f, i) => (
          <Enter ctx={ctx} i={i} as="details" key={i} className="xp-faq-item">
            <summary>{f.question}</summary>
            <p>{f.answer}</p>
          </Enter>
        ))}
      </div>
    </>
  );
}

function Clients({ ctx }: { ctx: Ctx }) {
  const items = (ctx.c as WebsiteContent).clients;
  const row = [...items, ...items];
  return (
    <>
      <Title ctx={ctx} kicker="Trusted by" title="Who we work with" />
      <Enter ctx={ctx} i={1} className="xp-marquee">
        <div>
          {row.map((n, i) => (
            <span key={i} aria-hidden={i >= items.length ? "true" : undefined}>
              {n}
            </span>
          ))}
        </div>
      </Enter>
    </>
  );
}

function Custom({ ctx }: { ctx: Ctx }) {
  const groups = (ctx.c.custom || []) as WebsiteContent["custom"];
  return (
    <>
      {groups
        .filter((g) => g.items.length)
        .map((g, gi) => (
          <div key={gi} className="xp-group">
            <Title ctx={ctx} title={g.title || "More"} />
            <div className="xp-grid">
              {g.items.map((x, i) => (
                <Enter ctx={ctx} i={i} as="article" key={i} className="xp-card">
                  <h3 className="xp-h3">{x.title}</h3>
                  {x.text && <p>{x.text}</p>}
                </Enter>
              ))}
            </div>
          </div>
        ))}
    </>
  );
}

function Cta({ ctx }: { ctx: Ctx }) {
  const c = ctx.c.cta as WebsiteContent["cta"];
  return (
    <div className="xp-cta">
      <Headline as="h2" className="xp-h1 xp-cta-title" text={c.heading} primitive={ctx.text} />
      {c.text && (
        <Enter ctx={ctx} i={1} as="p" className="xp-lead">
          {c.text}
        </Enter>
      )}
      {c.button && (
        <Enter ctx={ctx} i={2} className="xp-actions">
          <a className="xp-btn xp-btn-main xp-btn-big" data-magnetic="" href="#pf-contact">
            {c.button}
          </a>
        </Enter>
      )}
    </div>
  );
}

function Visit({ ctx }: { ctx: Ctx }) {
  const v = (ctx.c as WebsiteContent).visit;
  return (
    <>
      <Title ctx={ctx} kicker="Visit" title="Come and see us" />
      <div className="xp-visit">
        {v.address && (
          <Enter ctx={ctx} i={1} className="xp-card">
            <h3 className="xp-h3">Where</h3>
            <p>{v.address}</p>
            <a className="xp-link" href={v.mapUrl || "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(v.address)} target="_blank" rel="noreferrer">
              Open the map
            </a>
          </Enter>
        )}
        {v.hours.length > 0 && (
          <Enter ctx={ctx} i={2} className="xp-card">
            <h3 className="xp-h3">Opening hours</h3>
            <dl className="xp-hours">
              {v.hours.map((h, i) => (
                <div key={i}>
                  <dt>{h.days}</dt>
                  <dd>{h.time}</dd>
                </div>
              ))}
            </dl>
          </Enter>
        )}
      </div>
    </>
  );
}

function Contact({ ctx }: { ctx: Ctx }) {
  const ct = ctx.c.contact as WebsiteContent["contact"] & PortfolioContent["contact"];
  const links: [string, string, string][] = [];
  if (ct.email) links.push(["Email", ct.email, "mailto:" + ct.email]);
  if (ct.phone) links.push(["Phone", ct.phone, "tel:" + ct.phone.replace(/[^\d+]/g, "")]);
  if (ct.whatsapp) links.push(["WhatsApp", ct.whatsapp, "https://wa.me/" + digits(ct.whatsapp)]);
  if (ct.instagram) links.push(["Instagram", ct.instagram.replace(/^https?:\/\/(www\.)?/, ""), ct.instagram.startsWith("http") ? ct.instagram : "https://instagram.com/" + ct.instagram.replace(/^@/, "")]);
  if (ct.facebook) links.push(["Facebook", ct.facebook.replace(/^https?:\/\/(www\.)?/, ""), ct.facebook.startsWith("http") ? ct.facebook : "https://facebook.com/" + ct.facebook]);
  if (ct.linkedin) links.push(["LinkedIn", ct.linkedin.replace(/^https?:\/\/(www\.)?/, ""), ct.linkedin.startsWith("http") ? ct.linkedin : "https://" + ct.linkedin]);
  if (ct.github) links.push(["GitHub", ct.github.replace(/^https?:\/\/(www\.)?/, ""), ct.github.startsWith("http") ? ct.github : "https://" + ct.github]);
  if (ct.website) links.push(["Website", ct.website.replace(/^https?:\/\/(www\.)?/, ""), ct.website.startsWith("http") ? ct.website : "https://" + ct.website]);
  return (
    <>
      <Title ctx={ctx} kicker="Contact" title={ct.heading || "Get in touch"} intro={ct.blurb} />
      <div className="xp-contact">
        {links.map(([label, text, href], i) => (
          <Enter ctx={ctx} i={i + 1} as="a" key={label} className="xp-contact-link" href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined}>
            <span>{label}</span>
            <strong>{text}</strong>
          </Enter>
        ))}
        {!links.length && ctx.preview && <p className="xp-muted">Add an email or phone number and it shows here.</p>}
      </div>
    </>
  );
}

// ------------------------------------------------------------------ portfolio sections

function Experience({ ctx }: { ctx: Ctx }) {
  const items = (ctx.c as PortfolioContent).experience;
  return (
    <>
      <Title ctx={ctx} kicker="Experience" title="Where I have worked" />
      <ol className="xp-timeline">
        {items.map((x, i) => (
          <Enter ctx={ctx} i={i} as="li" key={i} className="xp-job">
            <p className="xp-when">{[x.start, x.end].filter(Boolean).join(" to ")}</p>
            <div>
              <h3 className="xp-h3">
                {x.role}
                {x.company && <span className="xp-muted"> · {x.company}</span>}
              </h3>
              {x.summary && <p>{x.summary}</p>}
              {x.highlights.length > 0 && (
                <ul>
                  {x.highlights.map((h, k) => (
                    <li key={k}>{h}</li>
                  ))}
                </ul>
              )}
              {x.tags.length > 0 && (
                <p className="xp-chips">
                  {x.tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </p>
              )}
            </div>
          </Enter>
        ))}
      </ol>
    </>
  );
}

function Projects({ ctx }: { ctx: Ctx }) {
  const items = (ctx.c as PortfolioContent).projects;
  return (
    <>
      <Title ctx={ctx} kicker="Selected work" title="Projects" />
      <div className="xp-grid xp-projects">
        {items.map((p, i) => (
          <Enter ctx={ctx} i={i} as="article" key={i} className="xp-card xp-project">
            <Picture ctx={ctx} path={"projects." + i + ".imageUrl"} src={p.imageUrl} alt={p.name} label={"Picture: " + p.name} />
            {p.category && <p className="xp-kicker">{p.category}</p>}
            <h3 className="xp-h3">{p.name}</h3>
            {p.summary && <p>{p.summary}</p>}
            {p.impact && <p className="xp-impact">{p.impact}</p>}
            {p.tags.length > 0 && (
              <p className="xp-chips">
                {p.tags.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </p>
            )}
            {p.link && (
              <a className="xp-link" href={p.link} target="_blank" rel="noreferrer">
                View project
              </a>
            )}
          </Enter>
        ))}
      </div>
    </>
  );
}

function Skills({ ctx }: { ctx: Ctx }) {
  const groups = (ctx.c as PortfolioContent).skills;
  return (
    <>
      <Title ctx={ctx} kicker="Skills" title="What I bring" />
      <div className="xp-grid">
        {groups.map((g, i) => (
          <Enter ctx={ctx} i={i} key={i} className="xp-card">
            <h3 className="xp-h3">{g.group}</h3>
            <p className="xp-chips">
              {g.items.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </p>
          </Enter>
        ))}
      </div>
    </>
  );
}

function Rows({ ctx, kicker, title, rows }: { ctx: Ctx; kicker: string; title: string; rows: { a: string; b: string; c?: string; href?: string }[] }) {
  return (
    <>
      <Title ctx={ctx} kicker={kicker} title={title} />
      <ul className="xp-rows">
        {rows.map((r, i) => (
          <Enter ctx={ctx} i={i} as="li" key={i}>
            <strong>{r.href ? <a href={r.href} target="_blank" rel="noreferrer">{r.a}</a> : r.a}</strong>
            <span>{r.b}</span>
            {r.c && <em>{r.c}</em>}
          </Enter>
        ))}
      </ul>
    </>
  );
}

export const SECTION_NAV: Record<string, string> = {
  services: "Services",
  about: "About",
  projects: "Work",
  experience: "Experience",
  gallery: "Gallery",
  team: "Team",
  pricing: "Prices",
  faq: "FAQ",
  visit: "Visit",
  contact: "Contact",
};

/** The menu label of a section: the standard ones by name, a PRD block by its kicker or heading. */
export function navLabel(id: string, c: any): string {
  const hit = blockOf(c || {}, id);
  if (hit) {
    if (hit.b.lead) return "";
    const t = String(hit.b.heading || hit.b.kicker || "").replace(/[,.:;!?].*$/, "").trim();
    if (t.length <= 18) return t;
    const words = t.split(/\s+/);
    let out = "";
    for (const w of words) {
      if ((out + " " + w).trim().length > 18) break;
      out = (out + " " + w).trim();
    }
    return (out || words[0]).replace(/\s+(a|an|the|and|of|to|in|for|with|your|our|how|what)$/i, "");
  }
  return SECTION_NAV[id] || "";
}

export function SectionBody({ id, ctx }: { id: string; ctx: Ctx }) {
  const c = ctx.c as PortfolioContent;
  const hit = blockOf(ctx.c || {}, id);
  if (hit) return <BlockBody b={hit.b as Block} i={hit.i} ctx={ctx} />;
  switch (id) {
    case "hero":
      return <Hero ctx={ctx} />;
    case "tiles":
    case "highlights":
    case "stats":
      return <Tiles ctx={ctx} />;
    case "services":
      return <Services ctx={ctx} />;
    case "about":
      return <About ctx={ctx} />;
    case "process":
      return <Process ctx={ctx} />;
    case "gallery":
      return <Gallery ctx={ctx} />;
    case "team":
      return <Team ctx={ctx} />;
    case "pricing":
      return <Pricing ctx={ctx} />;
    case "testimonials":
      return <Testimonials ctx={ctx} />;
    case "faq":
      return <Faq ctx={ctx} />;
    case "clients":
      return <Clients ctx={ctx} />;
    case "custom":
      return <Custom ctx={ctx} />;
    case "cta":
      return <Cta ctx={ctx} />;
    case "visit":
      return <Visit ctx={ctx} />;
    case "contact":
      return <Contact ctx={ctx} />;
    case "experience":
      return <Experience ctx={ctx} />;
    case "projects":
      return <Projects ctx={ctx} />;
    case "skills":
      return <Skills ctx={ctx} />;
    case "education":
      return <Rows ctx={ctx} kicker="Education" title="Education" rows={c.education.map((x) => ({ a: x.degree, b: x.school, c: x.year }))} />;
    case "certifications":
      return <Rows ctx={ctx} kicker="Certifications" title="Certifications" rows={c.certifications.map((x) => ({ a: x.name, b: x.issuer, c: x.year, href: x.link || undefined }))} />;
    case "awards":
      return <Rows ctx={ctx} kicker="Recognition" title="Awards" rows={c.awards.map((x) => ({ a: x.name, b: x.issuer, c: x.year }))} />;
    case "languages":
      return <Rows ctx={ctx} kicker="Languages" title="Languages" rows={c.languages.map((x) => ({ a: x.name, b: x.level }))} />;
    default:
      return null;
  }
}
