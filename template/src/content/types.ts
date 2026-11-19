import type { Block } from "./blocks";

// The content model (PRD section 45): every word, picture and contact detail of a site,
// kept apart from how it is presented. The builder writes it; the renderer only reads it.

export type SectionId =
  | "stats"
  | "tiles"
  | "services"
  | "awards"
  | "languages"
  | "custom"
  | "cta"
  | "about"
  | "process"
  | "experience"
  | "projects"
  | "skills"
  | "education"
  | "certifications"
  | "testimonials"
  | "contact";

export interface PortfolioContent {
  meta: { title: string; description: string };
  hero: {
    name: string;
    role: string;
    rotatingRoles: string[];
    tagline: string;
    intro: string;
    location: string;
    availability: string;
    photoUrl: string;
    resumeUrl: string;
    videoUrl?: string;
  };
  stats: { value: number; suffix: string; label: string }[];
  about: { heading: string; paragraphs: string[] };
  process: { title: string; description: string }[];
  experience: { company: string; role: string; start: string; end: string; location: string; summary: string; highlights: string[]; tags: string[] }[];
  projects: { name: string; category: string; summary: string; impact: string; tags: string[]; link: string; imageUrl?: string; role?: string }[];
  skills: { group: string; items: string[] }[];
  education: { school: string; degree: string; year: string }[];
  certifications: { name: string; issuer: string; year: string; link: string }[];
  testimonials: { quote: string; name: string; role: string }[];
  services: { name: string; description: string; price: string }[];
  awards: { name: string; issuer: string; year: string }[];
  languages: { name: string; level: string }[];
  custom: { title: string; items: { title: string; text: string }[] }[];
  cta: { heading: string; text: string; button: string };
  contact: { heading: string; blurb: string; email: string; phone: string; linkedin: string; github: string; website: string };
  sections: SectionId[];
}

export type WebsiteSectionId = "tiles" | "highlights" | "clients" | "services" | "about" | "process" | "gallery" | "team" | "pricing" | "testimonials" | "faq" | "cta" | "visit" | "custom" | "contact";

export interface WebsiteContent {
  meta: { title: string; description: string };
  brand: { name: string; category: string };
  hero: { kicker: string; headline: string; sub: string; primaryCta: string; primaryHref: string; secondaryCta: string; imageUrl: string; videoUrl?: string };
  highlights: { value: string; label: string }[];
  services: { name: string; description: string; price: string }[];
  about: { heading: string; paragraphs: string[] };
  process: { title: string; description: string }[];
  gallery: { caption: string; imageUrl: string }[];
  pricing: { name: string; price: string; period: string; features: string[]; featured: boolean }[];
  testimonials: { quote: string; name: string; role: string }[];
  faq: { question: string; answer: string }[];
  clients: string[];
  team: { name: string; role: string; bio: string; photoUrl: string }[];
  custom: { title: string; items: { title: string; text: string }[] }[];
  cta: { heading: string; text: string; button: string };
  visit: { address: string; hours: { days: string; time: string }[]; mapUrl: string };
  contact: { heading: string; blurb: string; email: string; phone: string; whatsapp: string; instagram: string; facebook: string; linkedin: string };
  /** Dynamic sections made from an approved PRD (content/blocks.ts); their section ids are "b-<id>". */
  blocks?: Block[];
  sections: (WebsiteSectionId | `b-${string}`)[];
}

export type SiteContent = PortfolioContent | WebsiteContent;
