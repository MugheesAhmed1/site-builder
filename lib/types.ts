// The shapes everything in the app passes around. No AI is involved anywhere:
// questions are fixed lists, content is composed by rules, design systems are generated.

export type SiteKind = "portfolio" | "website";
export type StepId = "start" | "questions" | "design" | "build" | "deploy";
export type StepStatus = "todo" | "draft" | "approved" | "stale";

export const STEPS: { id: StepId; title: string; hint: string }[] = [
  { id: "start", title: "Start", hint: "Say what you want to build" },
  { id: "questions", title: "Questions", hint: "The details that matter" },
  { id: "design", title: "Design system", hint: "Colour, type and shape" },
  { id: "build", title: "Your site", hint: "Preview and edit" },
  { id: "deploy", title: "Deploy", hint: "Download and publish" },
];

export interface Profile {
  name: string;
  headline: string;
  location: string;
  email: string;
  phone: string;
  links: { label: string; url: string }[];
  summary: string;
  experience: { company: string; role: string; start: string; end: string; location: string; bullets: string[] }[];
  projects: { name: string; description: string; tags: string[]; link: string }[];
  skills: string[];
  education: { school: string; degree: string; year: string }[];
  certifications: { name: string; issuer: string; year: string }[];
}

// How the site looks. Colours come from a neutral hue and one accent;
// template/src/theme.js derives full light and dark palettes from them.
export interface Design {
  id: string;
  preset: string;
  mode: "auto" | "light" | "dark";
  hue: number;
  tint: number;
  accent: string;
  fonts: { display: string; body: string; mono: string };
  radius: number;
  density: "compact" | "regular" | "airy";
  motion: "none" | "subtle" | "expressive";
  heroStyle: "statement" | "portrait";
  experienceStyle: "ledger" | "timeline" | "list";
}

export type DesignPart = "colour" | "type" | "shape" | "layout";

export interface Question {
  id: string;
  label: string;
  help?: string;
  type: "text" | "textarea" | "list" | "choice" | "multi";
  placeholder?: string;
  options?: string[];
  required?: boolean;
  suggest?: string;
}

export type SectionId =
  | "stats"
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
  };
  stats: { value: number; suffix: string; label: string }[];
  about: { heading: string; paragraphs: string[] };
  process: { title: string; description: string }[];
  experience: { company: string; role: string; start: string; end: string; location: string; summary: string; highlights: string[]; tags: string[] }[];
  projects: { name: string; category: string; summary: string; impact: string; tags: string[]; link: string }[];
  skills: { group: string; items: string[] }[];
  education: { school: string; degree: string; year: string }[];
  certifications: { name: string; issuer: string; year: string; link: string }[];
  testimonials: { quote: string; name: string; role: string }[];
  contact: { heading: string; blurb: string; email: string; phone: string; linkedin: string; github: string; website: string };
  sections: SectionId[];
}

export type WebsiteSectionId = "highlights" | "services" | "about" | "process" | "gallery" | "pricing" | "testimonials" | "faq" | "visit" | "contact";

export interface WebsiteContent {
  meta: { title: string; description: string };
  brand: { name: string; category: string };
  hero: { kicker: string; headline: string; sub: string; primaryCta: string; primaryHref: string; secondaryCta: string; imageUrl: string };
  highlights: { value: string; label: string }[];
  services: { name: string; description: string; price: string }[];
  about: { heading: string; paragraphs: string[] };
  process: { title: string; description: string }[];
  gallery: { caption: string; imageUrl: string }[];
  pricing: { name: string; price: string; period: string; features: string[]; featured: boolean }[];
  testimonials: { quote: string; name: string; role: string }[];
  faq: { question: string; answer: string }[];
  visit: { address: string; hours: { days: string; time: string }[]; mapUrl: string };
  contact: { heading: string; blurb: string; email: string; phone: string; whatsapp: string; instagram: string; facebook: string; linkedin: string };
  sections: WebsiteSectionId[];
}

export type SiteContent = PortfolioContent | WebsiteContent;

export interface Project {
  id: string;
  kind: SiteKind;
  category: string;
  query: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  steps: Record<StepId, StepStatus>;
  answers: Record<string, string>;
  resumeText: string;
  resumeFileName: string;
  profile: Profile | null;
  design: Design;
  locks: Partial<Record<DesignPart, boolean>>;
  content: SiteContent | null;
  history: { at: string; label: string; content: SiteContent }[];
}
