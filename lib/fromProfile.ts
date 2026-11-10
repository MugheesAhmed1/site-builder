import type { PortfolioContent, Profile } from "./types";

// A quick, no-AI first draft from the résumé, used to preview the design system
// with the person's own details before Claude writes the real content.

export function contentFromProfile(p: Profile): PortfolioContent {
  const linkedin = p.links.find((l) => /linkedin/i.test(l.url) || /linkedin/i.test(l.label))?.url ?? "";
  const github = p.links.find((l) => /github/i.test(l.url) || /github/i.test(l.label))?.url ?? "";
  const website = p.links.find((l) => l.url !== linkedin && l.url !== github)?.url ?? "";
  const content: PortfolioContent = {
    meta: { title: `${p.name} · ${p.headline}`, description: p.summary },
    hero: {
      name: p.name,
      role: p.headline,
      rotatingRoles: [p.headline],
      tagline: p.summary.split(/(?<=\.)\s/)[0] || p.headline,
      intro: "",
      location: p.location,
      availability: "",
      photoUrl: "",
      resumeUrl: "",
    },
    stats: [],
    about: { heading: "About me", paragraphs: p.summary ? [p.summary] : [] },
    process: [],
    experience: p.experience.map((x) => ({
      company: x.company,
      role: x.role,
      start: x.start,
      end: x.end,
      location: x.location,
      summary: "",
      highlights: x.bullets.slice(0, 4),
      tags: [],
    })),
    projects: p.projects.map((x) => ({
      name: x.name,
      category: x.tags[0] ?? "",
      summary: x.description,
      impact: "",
      tags: x.tags,
      link: x.link,
    })),
    skills: p.skills.length ? [{ group: "Skills", items: p.skills }] : [],
    education: p.education,
    certifications: p.certifications.map((c) => ({ ...c, link: "" })),
    testimonials: [],
    contact: {
      heading: "Let's talk.",
      blurb: "The fastest way to reach me is email.",
      email: p.email,
      phone: p.phone,
      linkedin,
      github,
      website,
    },
    sections: ["about", "experience", "projects", "skills", "certifications", "education", "contact"],
  };
  return content;
}
