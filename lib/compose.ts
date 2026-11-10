import type { PortfolioContent, Profile, SectionId, WebsiteContent, WebsiteSectionId } from "./types";
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

export function composePortfolio(profile: Profile | null, a: Record<string, string>): PortfolioContent {
  const p = mergeProfile(profile, a);
  const role = (a.role || p.headline.split(/[,|]/)[0] || "").trim();
  const fam = familyOf(role);
  const goal = a.goal || "Get hired full time";
  const freelance = /freelance|both/i.test(goal);

  const results = rows(a.results).map((r) => r.join(" "));
  const bullets = p.experience.flatMap((e) => e.bullets);
  const stats: PortfolioContent["stats"] = [];
  for (const line of [...results, ...bullets]) {
    const s = statFrom(line);
    if (s && stats.length < 3 && !stats.some((x) => x.label === s.label)) stats.push(s);
  }
  const yrs = yearsOfExperience(p);
  if (yrs >= 2) stats.push({ value: yrs, suffix: "+", label: "Years of experience" });

  const tagline =
    a.headline ||
    (fam === "product" ? "I build products people actually use." : fam === "design" ? "I design things people enjoy using." : fam === "engineering" ? "I build software that works and lasts." : fam === "data" ? "I turn data into decisions." : fam === "marketing" ? "I help good products find their people." : role ? `${cap(role)} who gets things done.` : "Hello, I'm " + (p.name.split(" ")[0] || "here") + ".");

  const summarySentences = sentences(p.summary);
  const linkedin = p.links.find((l) => /linkedin/i.test(l.url))?.url ?? "";
  const github = p.links.find((l) => /github/i.test(l.url))?.url ?? "";
  const website = p.links.find((l) => l.url !== linkedin && l.url !== github)?.url ?? "";

  const projectRows = rows(a.projects);
  const projects: PortfolioContent["projects"] = projectRows.length
    ? projectRows.map(([name, summary = "", link = ""]) => ({ name, category: "", summary, impact: "", tags: [], link: link && !link.startsWith("http") ? "https://" + link : link }))
    : p.projects.map((x) => ({ name: x.name, category: x.tags[0] ?? "", summary: x.description, impact: "", tags: x.tags, link: x.link }));
  for (const pr of projects) {
    const s = sentences(pr.summary);
    const withNumber = s.findIndex((x) => /\d/.test(x));
    if (withNumber > 0) {
      pr.impact = s[withNumber];
      pr.summary = s.filter((_, i) => i !== withNumber).join(" ");
    }
    if (!pr.category) pr.category = p.skills.find((sk) => new RegExp("\\b" + sk.replace(/[^\w ]/g, "") + "\\b", "i").test(pr.summary)) ?? "";
  }

  const skillGroups = groupSkills(p.skills);
  const experience: PortfolioContent["experience"] = p.experience.map((x) => ({
    company: x.company,
    role: x.role,
    start: x.start,
    end: x.end,
    location: x.location,
    summary: "",
    highlights: x.bullets.slice(0, 4),
    tags: p.skills.filter((s) => s.length > 2 && x.bullets.some((b) => b.toLowerCase().includes(s.toLowerCase()))).slice(0, 4),
  }));

  const testimonials = rows(a.testimonials).map(([quote, name = "", r = ""]) => ({ quote, name, role: r }));
  const availability = /not looking/i.test(a.availability ?? "") ? "" : a.availability || "Open to new roles";

  const aboutParas = summarySentences.length > 2 ? [summarySentences.slice(0, 2).join(" "), summarySentences.slice(2).join(" ")] : summarySentences.length ? [summarySentences.join(" ")] : [];
  if (aboutParas.length < 2) {
    aboutParas.push(
      freelance
        ? "I take on a small number of projects at a time so each one gets my full attention."
        : goal === "Show my work"
          ? "Below is a selection of the work I'm proudest of and how I got there."
          : `I'm looking for a team where ${fam === "general" ? "good work" : fam + " work"} is taken seriously and shipped often.`,
    );
  }

  const content: PortfolioContent = {
    meta: { title: [p.name, role].filter(Boolean).join(" · "), description: firstSentence(p.summary || tagline, 28) },
    hero: {
      name: p.name,
      role: cap(role),
      rotatingRoles: skillGroups.flatMap((g) => g.items).slice(0, 3),
      tagline,
      intro: firstSentence(p.summary, 22),
      location: p.location,
      availability,
      photoUrl: a.photoUrl ?? "",
      resumeUrl: a.resumeUrl ?? "",
    },
    stats,
    about: { heading: fam === "general" ? "About me" : "How I think about " + (fam === "engineering" ? "building" : fam === "data" ? "data" : fam), paragraphs: aboutParas },
    process: PROCESS[fam],
    experience,
    projects,
    skills: skillGroups,
    education: p.education,
    certifications: p.certifications.map((c) => ({ ...c, link: "" })),
    testimonials,
    contact: {
      heading: freelance ? "Have a project in mind?" : "Let's talk.",
      blurb: freelance ? "Tell me what you're building and when you need it. I reply within a day." : "I'm happy to chat about roles, ideas or anything on this page. Email is the fastest way to reach me.",
      email: p.email,
      phone: p.phone,
      linkedin,
      github,
      website,
    },
    sections: [],
  };
  const order: SectionId[] = ["stats", "about", "process", "experience", "projects", "skills", "testimonials", "certifications", "education", "contact"];
  content.sections = order.filter((s) => {
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
  const order: WebsiteSectionId[] = ["highlights", "services", "about", "process", "gallery", "pricing", "testimonials", "faq", "visit", "contact"];
  content.sections = order.filter((s) => {
    if (s === "visit") return !!(address || hours.length);
    if (s === "gallery") return c.id === "photo" || c.id === "food" || c.id === "beauty" || c.id === "events" || c.id === "property" || c.id === "shop";
    const v = content[s as keyof WebsiteContent];
    return Array.isArray(v) ? v.length > 0 : true;
  });
  return removeDashes(content);
}
