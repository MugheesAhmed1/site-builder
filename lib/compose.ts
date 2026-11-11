import type { PortfolioContent, PortfolioInput, Profile, SectionId, WebsiteContent, WebsiteSectionId } from "./types";
import { categoryById } from "./categories";
import { rows } from "./questions";
import { hashString } from "./designs";
import { cap, firstSentence, removeDashes, sentences } from "./text";

// Writes every word of the site from the answers and the résumé using fixed rules and
// templates. Same input, same output. Nothing is sent anywhere.

const EMPTY_PROFILE: Profile = { name: "", headline: "", location: "", email: "", phone: "", links: [], summary: "", experience: [], projects: [], skills: [], education: [], certifications: [] };

// ---------------------------------------------------------------- Portfolio

type Family = "product" | "design" | "engineering" | "data" | "marketing" | "general";

function familyOf(role: string): Family {
  const r = role.toLowerCase();
  if (/product|owner|pm\b/.test(r)) return "product";
  if (/design|ux|ui|creative|illustrat|art director/.test(r)) return "design";
  if (/engineer|developer|programmer|devops|architect|software|frontend|backend|full.?stack|mobile/.test(r)) return "engineering";
  if (/data|analyst|scien|machine learning|ml|bi\b/.test(r)) return "data";
  if (/market|growth|seo|content|brand|social|sales/.test(r)) return "marketing";
  return "general";
}

const PROCESS: Record<Family, { title: string; description: string }[]> = {
  product: [
    { title: "Discover", description: "Talk to users until the real problem is obvious." },
    { title: "Decide", description: "Pick the bet with the clearest upside and a way to measure it." },
    { title: "Build", description: "Ship thin slices with engineering and design, behind flags." },
    { title: "Learn", description: "Read the numbers every week and fix the biggest leak first." },
  ],
  design: [
    { title: "Understand", description: "Research the people and the problem before any pixels." },
    { title: "Explore", description: "Sketch many directions fast, then narrow to the strongest." },
    { title: "Prototype", description: "Make it real enough to test with actual users." },
    { title: "Refine", description: "Polish the details that make it feel finished." },
  ],
  engineering: [
    { title: "Understand", description: "Clarify the goal, the constraints and what done looks like." },
    { title: "Design", description: "Choose the simplest architecture that will hold up." },
    { title: "Build", description: "Small, reviewed changes with tests that matter." },
    { title: "Ship", description: "Deploy, watch the metrics and keep it fast." },
  ],
  data: [
    { title: "Frame", description: "Turn a vague question into one that data can answer." },
    { title: "Collect", description: "Find, clean and check the data before trusting it." },
    { title: "Analyse", description: "Model what matters and test the assumptions." },
    { title: "Explain", description: "Share findings in plain language with a clear next step." },
  ],
  marketing: [
    { title: "Research", description: "Learn who the audience is and what moves them." },
    { title: "Plan", description: "Set one goal, the channels and how we'll measure it." },
    { title: "Launch", description: "Ship campaigns quickly and test variations." },
    { title: "Optimise", description: "Double down on what works and cut what doesn't." },
  ],
  general: [
    { title: "Listen", description: "Understand the goal and what success looks like." },
    { title: "Plan", description: "Agree on scope, timing and the first milestone." },
    { title: "Deliver", description: "Do the work, share progress and adjust early." },
    { title: "Improve", description: "Review the result and make the next round better." },
  ],
};

const SKILL_GROUPS: [string, RegExp][] = [
  ["Languages", /^(javascript|typescript|python|java|kotlin|swift|go|golang|rust|c\+\+|c#|php|ruby|dart|sql|r|scala|html|css)$/i],
  ["Frameworks", /(react|next|vue|angular|svelte|node|express|django|flask|laravel|spring|flutter|tailwind|\.net|rails|fastapi)/i],
  ["Tools", /(figma|sketch|jira|notion|git|docker|kubernetes|aws|gcp|azure|firebase|postgres|mysql|mongo|excel|tableau|power bi|looker|amplitude|mixpanel|hubspot|salesforce|adobe|photoshop|illustrator|webflow|framer|confluence|linear|slack)/i],
  ["Design", /(ux|ui|design|prototyp|wirefram|research|usability|visual|typography|branding|motion)/i],
  ["Product", /(product|roadmap|strategy|a\/b|discovery|agile|scrum|okr|stakeholder|prioriti|analytics|growth|go.to.market|pricing)/i],
  ["Data", /(machine learning|ml|statistics|modelling|modeling|pandas|numpy|spark|etl|data)/i],
];

function groupSkills(skills: string[]): { group: string; items: string[] }[] {
  const groups = new Map<string, string[]>();
  for (const s of skills) {
    const g = SKILL_GROUPS.find(([, re]) => re.test(s))?.[0] ?? "Other";
    groups.set(g, [...(groups.get(g) ?? []), s]);
  }
  const out = [...groups.entries()].map(([group, items]) => ({ group, items }));
  if (out.length === 1) out[0].group = "Skills";
  return out.filter((g) => g.items.length).sort((a, b) => (a.group === "Other" ? 1 : b.group === "Other" ? -1 : b.items.length - a.items.length));
}

// "Grew signups by 40% in 6 months" -> { value: 40, suffix: "%", label: "Grew signups" }
function statFrom(line: string): { value: number; suffix: string; label: string } | null {
  const m = /(\d+(?:[.,]\d+)?)\s*(%|k\b|m\b|x\b|\+|million|thousand)?/i.exec(line);
  if (!m) return null;
  let value = parseFloat(m[1].replace(",", "."));
  let suffix = (m[2] ?? "").toUpperCase();
  if (suffix === "MILLION") suffix = "M";
  if (suffix === "THOUSAND") suffix = "K";
  if (suffix === "X") suffix = "x";
  if (/^\d{4}$/.test(m[1]) && !suffix) return null; // a year, not a result
  if (!suffix && value > 999) {
    if (value >= 1e6) [value, suffix] = [Math.round(value / 1e5) / 10, "M"];
    else [value, suffix] = [Math.round(value / 100) / 10, "K"];
  }
  if (!suffix && value < 2) return null;
  const after = line.slice(m.index + m[0].length).replace(/^\s*(\+|plus)?\s*/, "");
  const before = line.slice(0, m.index).replace(/\b(by|to|of|over|than|for|across|with|reaching|at)\s*$/i, "").trim();
  const afterCut = after.split(/\s+(?:in|within|over|for|across|by|with|from|after|during)\s+/i)[0];
  let label = /^(in|within|over|with|by|for|across|from)\b/i.test(after) || afterCut.length < 3 ? before.split(/\s+/).slice(-4).join(" ") : afterCut.split(/\s+/).slice(0, 4).join(" ");
  label = cap(label.replace(/[,.;:]+$/, "").replace(/\b(the|a|an|in|for|of|to|by|with)$/i, "").trim());
  return label ? { value, suffix, label } : null;
}

function yearsOfExperience(p: Profile): number {
  const years = p.experience.map((e) => /\b(19|20)\d{2}\b/.exec(e.start)?.[0]).filter(Boolean).map(Number);
  if (!years.length) {
    const m = /(\d+)\+?\s*years/i.exec(p.summary);
    return m ? Number(m[1]) : 0;
  }
  return new Date().getFullYear() - Math.min(...years);
}

export function mergeProfile(profile: Profile | null, a: Record<string, string>): Profile {
  const p = { ...EMPTY_PROFILE, ...(profile ?? {}) };
  const links = rows(a.links).map((r) => r[0]).filter(Boolean);
  return {
    ...p,
    name: a.name || p.name,
    headline: a.role || p.headline,
    location: a.location || p.location,
    email: a.email || p.email,
    phone: a.phone || p.phone,
    links: links.length ? links.map((url) => ({ label: url, url: url.startsWith("http") ? url : "https://" + url })) : p.links,
    summary: a.about || p.summary,
  };
}

export function emptyInput(): PortfolioInput {
  return {
    name: "", role: "", tagline: "", location: "", email: "", phone: "", photoUrl: "", resumeUrl: "",
    availability: "Open to new roles", goal: "Get hired full time", tone: "Confident and clear",
    links: [], about: "", results: [], experience: [], projects: [], skills: [], education: [], certifications: [],
    awards: [], services: [], testimonials: [], languages: [], custom: [],
  };
}

// Turns a parsed résumé (plus any answers already given) into the portfolio form.
export function profileToInput(profile: Profile | null, a: Record<string, string> = {}): PortfolioInput {
  const p = mergeProfile(profile, a);
  const base = emptyInput();
  return {
    ...base,
    name: p.name,
    role: (a.role || p.headline.split(/[,|]/)[0] || "").trim(),
    tagline: a.headline || "",
    location: p.location,
    email: p.email,
    phone: p.phone,
    photoUrl: a.photoUrl ?? "",
    resumeUrl: a.resumeUrl ?? "",
    availability: a.availability || base.availability,
    goal: a.goal || base.goal,
    tone: a.tone || base.tone,
    links: p.links.map((l) => ({ label: /linkedin/i.test(l.url) ? "LinkedIn" : /github/i.test(l.url) ? "GitHub" : /behance/i.test(l.url) ? "Behance" : /dribbble/i.test(l.url) ? "Dribbble" : "Website", url: l.url })),
    about: p.summary,
    results: rows(a.results).map((r) => ({ value: "", label: r.join(" ") })),
    experience: p.experience.map((e) => ({ company: e.company, role: e.role, start: e.start, end: e.end, location: e.location, bullets: e.bullets })),
    projects: (rows(a.projects).length
      ? rows(a.projects).map(([name, description = "", link = ""]) => ({ name, role: "", description, outcome: "", tags: [], link, imageUrl: "" }))
      : p.projects.map((x) => ({ name: x.name, role: "", description: x.description, outcome: "", tags: x.tags, link: x.link, imageUrl: "" }))),
    skills: groupSkills(p.skills),
    education: p.education,
    certifications: p.certifications.map((c) => ({ ...c, link: "" })),
    testimonials: rows(a.testimonials).map(([quote, name = "", r = ""]) => ({ quote, name, role: r })),
  };
}

export function composePortfolio(profile: Profile | null, a: Record<string, string>): PortfolioContent {
  return composePortfolioFromInput(profileToInput(profile, a));
}

const url = (u: string) => (u && !/^(https?:|mailto:|tel:)/.test(u) ? "https://" + u : u);

// Builds the whole portfolio from the form. Sections only appear when there is something
// to put in them, and their order follows the person's goal.
export function composePortfolioFromInput(inp: PortfolioInput): PortfolioContent {
  const role = inp.role.trim();
  const fam = familyOf(role);
  const goal = inp.goal || "Get hired full time";
  const freelance = /freelance|both|client/i.test(goal);
  const showcase = /show my work/i.test(goal);
  const first = inp.name.split(" ")[0] || "";

  const stats: PortfolioContent["stats"] = [];
  for (const r of inp.results.filter((x) => x.value || x.label)) {
    const s = r.value ? statFrom(r.value + " " + r.label) : statFrom(r.label);
    if (s && stats.length < 4) stats.push(r.value && r.label ? { ...s, label: cap(r.label) } : s);
  }
  for (const line of inp.experience.flatMap((e) => e.bullets)) {
    if (stats.length >= 3) break;
    const s = statFrom(line);
    if (s && !stats.some((x) => x.label === s.label)) stats.push(s);
  }
  const years = inp.experience.map((e) => /\b(19|20)\d{2}\b/.exec(e.start)?.[0]).filter(Boolean).map(Number);
  const yrs = years.length ? new Date().getFullYear() - Math.min(...years) : 0;
  if (yrs >= 2 && stats.length < 4) stats.push({ value: yrs, suffix: "+", label: "Years of experience" });

  const tagline =
    inp.tagline.trim() ||
    (fam === "product" ? "I build products people actually use." : fam === "design" ? "I design things people enjoy using." : fam === "engineering" ? "I build software that works and lasts." : fam === "data" ? "I turn data into decisions." : fam === "marketing" ? "I help good products find their people." : role ? `${cap(role)} who gets things done.` : "Hello, I'm " + (first || "here") + ".");

  const linkOf = (re: RegExp) => inp.links.find((l) => re.test(l.url) || re.test(l.label))?.url ?? "";
  const linkedin = linkOf(/linkedin/i);
  const github = linkOf(/github/i);
  const website = inp.links.find((l) => l.url && l.url !== linkedin && l.url !== github)?.url ?? "";

  const allSkills = inp.skills.flatMap((g) => g.items);
  const projects: PortfolioContent["projects"] = inp.projects
    .filter((x) => x.name)
    .map((x) => {
      let summary = x.description;
      let impact = x.outcome;
      if (!impact) {
        const s = sentences(summary);
        const k = s.findIndex((t) => /\d/.test(t));
        if (k > 0) {
          impact = s[k];
          summary = s.filter((_, i) => i !== k).join(" ");
        }
      }
      const category = x.tags[0] || allSkills.find((sk) => sk.length > 2 && new RegExp("\\b" + sk.replace(/[^\w ]/g, "") + "\\b", "i").test(summary)) || "";
      return { name: x.name, category, summary, impact, tags: x.tags, link: url(x.link), imageUrl: x.imageUrl, role: x.role };
    });

  const experience: PortfolioContent["experience"] = inp.experience
    .filter((x) => x.company || x.role)
    .map((x) => ({
      company: x.company,
      role: x.role,
      start: x.start,
      end: x.end,
      location: x.location,
      summary: "",
      highlights: x.bullets.filter(Boolean).slice(0, 5),
      tags: allSkills.filter((s) => s.length > 2 && x.bullets.some((b) => b.toLowerCase().includes(s.toLowerCase()))).slice(0, 4),
    }));

  const ss = sentences(inp.about);
  const aboutParas = ss.length > 2 ? [ss.slice(0, 2).join(" "), ss.slice(2).join(" ")] : ss.length ? [ss.join(" ")] : [];
  if (aboutParas.length < 2) {
    aboutParas.push(
      freelance
        ? "I take on a small number of projects at a time so each one gets my full attention."
        : showcase
          ? "Below is a selection of the work I'm proudest of and how I got there."
          : `I'm looking for a team where ${fam === "general" ? "good work" : fam + " work"} is taken seriously and shipped often.`,
    );
  }
  const availability = /not looking/i.test(inp.availability) ? "" : inp.availability;

  const content: PortfolioContent = {
    meta: { title: [inp.name, role].filter(Boolean).join(" · "), description: firstSentence(inp.about || tagline, 28) },
    hero: {
      name: inp.name,
      role: cap(role),
      rotatingRoles: allSkills.slice(0, 3),
      tagline,
      intro: firstSentence(inp.about, 22),
      location: inp.location,
      availability,
      photoUrl: inp.photoUrl,
      resumeUrl: url(inp.resumeUrl),
    },
    stats,
    about: { heading: fam === "general" ? "About me" : "How I think about " + (fam === "engineering" ? "building" : fam === "data" ? "data" : fam), paragraphs: aboutParas },
    process: PROCESS[fam],
    experience,
    projects,
    skills: inp.skills.filter((g) => g.items.filter(Boolean).length).map((g) => ({ group: g.group || "Skills", items: g.items.filter(Boolean) })),
    education: inp.education.filter((e) => e.school || e.degree),
    certifications: inp.certifications.filter((c) => c.name).map((c) => ({ ...c, link: url(c.link) })),
    testimonials: inp.testimonials.filter((t) => t.quote),
    services: inp.services.filter((x) => x.name),
    awards: inp.awards.filter((x) => x.name),
    languages: inp.languages.filter((x) => x.name),
    custom: inp.custom.filter((x) => x.title && x.items.some((i) => i.title || i.text)).map((x) => ({ title: x.title, items: x.items.filter((i) => i.title || i.text) })),
    cta: freelance
      ? { heading: "Have a project in mind?", text: "Tell me what you're building and when you need it. I reply within a day.", button: "Start a project" }
      : showcase
        ? { heading: "Like what you see?", text: "I'm always happy to talk about the work and what's next.", button: "Say hello" }
        : { heading: first ? `Hiring? ${first} is ${availability ? availability.toLowerCase() : "worth a chat"}.` : "Hiring? Let's talk.", text: "The fastest way to reach me is email. I reply within a day.", button: inp.resumeUrl ? "Download my CV" : "Get in touch" },
    contact: {
      heading: freelance ? "Let's build something." : "Let's talk.",
      blurb: freelance ? "Share a short brief, a budget range and your timing." : "I'm happy to chat about roles, ideas or anything on this page.",
      email: inp.email,
      phone: inp.phone,
      linkedin,
      github,
      website,
    },
    sections: [],
  };
  // Order follows the goal (landing patterns from ui-ux-pro-max: Portfolio Grid puts work first,
  // Trust & Authority puts proof first, Service pages lead with what's on offer).
  const order: SectionId[] = freelance
    ? ["tiles", "services", "projects", "process", "testimonials", "about", "experience", "skills", "awards", "certifications", "languages", "custom", "cta", "contact"]
    : showcase
      ? ["projects", "tiles", "about", "skills", "experience", "testimonials", "awards", "certifications", "education", "languages", "custom", "cta", "contact"]
      : ["tiles", "about", "experience", "projects", "skills", "testimonials", "awards", "certifications", "education", "languages", "custom", "cta", "contact"];
  content.sections = order.filter((s) => {
    if (s === "tiles") return content.stats.length > 0 || content.skills.length > 0 || !!content.hero.location;
    const v = content[s as keyof PortfolioContent];
    return Array.isArray(v) ? v.length > 0 : true;
  });
  return removeDashes(content);
}

// ---------------------------------------------------------------- Website

function fill(t: string, v: Record<string, string>) {
  return t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");
}

function digits(s: string) {
  return (s || "").replace(/[^\d+]/g, "").replace(/^\+/, "");
}

export function composeWebsite(categoryId: string, a: Record<string, string>): WebsiteContent {
  const c = categoryById(categoryId);
  const name = a.name || "Your business";
  const what = (a.what || c.label).trim();
  const city = (a.city || "").trim();
  const audience = (a.audience || "").trim();
  const vars = { name, what: what.toLowerCase(), city, audience };

  const usable = c.headlines.filter((h) => (city || !h.includes("{city}")) && (a.audience || !h.includes("{audience}")));
  const pool = usable.length ? usable : ["{what}, done right"];
  // Prefer the hashed choice, but keep the headline short enough for two lines.
  const filled = pool.map((t) => cap(fill(t, vars)));
  let headline = filled[hashString(name + what) % filled.length];
  if (headline.length > 40) headline = filled.reduce((a, b) => (b.length < a.length ? b : a));

  const services = (rows(a.services).length ? rows(a.services) : c.services.map((s) => [s])).map(([n, price = "", description = ""]) => {
    // Allow "name | description" with no price.
    if (price && !/\d|free|ask|call|on request/i.test(price) && !description) return { name: n, price: "", description: price };
    return { name: n, price, description };
  });

  const cta = a.cta || c.primaryCta;
  const wa = digits(a.whatsapp || "");
  const tel = digits(a.phone || "");
  const primaryHref = /whatsapp/i.test(cta) && wa
    ? `https://wa.me/${wa}`
    : /call/i.test(cta) && tel
      ? `tel:+${tel}`
      : /menu|listings|shop|see/i.test(cta)
        ? "#services"
        : /book|availability|date|quote|session/i.test(cta) && wa
          ? `https://wa.me/${wa}?text=${encodeURIComponent("Hi " + name + ", I'd like to " + cta.toLowerCase())}`
          : "#contact";

  const hours = rows(a.hours).map(([days, time = ""]) => ({ days, time }));
  const address = a.address ?? "";

  const aboutText = a.about?.trim() || `${name} offers ${vars.what}${city ? " in " + city : ""}${audience ? " for " + audience : ""}. We keep things simple: honest prices, friendly service and work we're proud of.`;
  const aboutS = sentences(aboutText);

  const faq = c.faq.map((f) => ({ question: fill(f.question, { city: city || "the city" }), answer: fill(f.answer, { city: city || "the city" }) }));
  if (hours.length) faq.push({ question: "When are you open?", answer: hours.map((h) => `${h.days}: ${h.time}`).join(". ") + "." });
  if (address) faq.push({ question: "Where can I find you?", answer: address + "." });

  const content: WebsiteContent = {
    meta: { title: `${name}${city ? " · " + cap(vars.what) + " in " + city : " · " + cap(vars.what)}`, description: firstSentence(aboutText, 28) },
    brand: { name, category: c.label },
    hero: {
      kicker: city ? `${c.kicker} in ${city}` : c.kicker,
      headline,
      sub: a.about?.trim() ? firstSentence(aboutText, 22) : `${cap(vars.what)}${audience ? " for " + audience : ""}${city ? " in " + city : ""}. ${c.physical ? "Visit us or get in touch today." : "Get in touch and we'll reply within a day."}`,
      primaryCta: cta,
      primaryHref,
      secondaryCta: c.physical && (address || hours.length) ? "Find us" : "What we do",
      imageUrl: a.imageUrl ?? "",
    },
    highlights: rows(a.highlights).map(([value, label = ""]) => ({ value, label })),
    services,
    about: { heading: "About " + name, paragraphs: aboutS.length > 2 ? [aboutS.slice(0, 2).join(" "), aboutS.slice(2).join(" ")] : [aboutS.join(" ")] },
    process: c.process,
    gallery: services.slice(0, 3).map((s) => ({ caption: s.name, imageUrl: "" })),
    pricing: rows(a.pricing).map(([n, price = "", period = "", features = ""], i, all) => ({ name: n, price, period, features: features.split(/\s*,\s*/).filter(Boolean), featured: all.length > 1 && i === Math.min(1, all.length - 1) })),
    testimonials: rows(a.testimonials).map(([quote, n = "", role = ""]) => ({ quote, name: n, role })),
    faq,
    clients: (a.clients || "").split(/\s*[,\n]\s*/).map((x) => x.trim()).filter(Boolean).slice(0, 16),
    team: rows(a.team).map(([n, r = "", bio = "", photoUrl = ""]) => ({ name: n, role: r, bio, photoUrl })),
    custom: a.customTitle ? [{ title: a.customTitle, items: rows(a.customItems).map(([title, text = ""]) => ({ title, text })) }] : [],
    cta: { heading: c.physical ? `Ready when you are, ${city || "neighbour"}.` : `Ready to get started with ${name}?`, text: wa ? "One message on WhatsApp is all it takes." : "Get in touch and we'll take it from there.", button: cta },
    visit: { address, hours, mapUrl: address ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address) : "" },
    contact: {
      heading: c.physical ? "Come and see us." : "Let's talk.",
      blurb: wa ? "Message us on WhatsApp for the quickest reply." : tel ? "Call us, we pick up." : "Send us a message and we'll reply within a day.",
      email: a.email ?? "",
      phone: a.phone ?? "",
      whatsapp: a.whatsapp ?? "",
      instagram: a.instagram ?? "",
      facebook: a.facebook ?? "",
      linkedin: "",
    },
    sections: [],
  };
  // Section order by business type, after landing patterns in ui-ux-pro-max: places people
  // visit lead with the offer and photos; service firms lead with proof and process.
  const order: WebsiteSectionId[] = c.physical
    ? ["tiles", "services", "gallery", "about", "team", "testimonials", "pricing", "custom", "faq", "cta", "visit", "contact"]
    : ["tiles", "clients", "services", "process", "about", "team", "gallery", "testimonials", "pricing", "custom", "faq", "cta", "visit", "contact"];
  content.sections = order.filter((s) => {
    if (s === "cta") return true;
    if (s === "tiles") return content.highlights.length > 0 || content.services.length > 0;
    if (s === "visit") return !!(address || hours.length);
    if (s === "gallery") return c.id === "photo" || c.id === "food" || c.id === "beauty" || c.id === "events" || c.id === "property" || c.id === "shop";
    const v = content[s as keyof WebsiteContent];
    return Array.isArray(v) ? v.length > 0 : true;
  });
  return removeDashes(content);
}
