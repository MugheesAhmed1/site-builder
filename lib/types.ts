// The shapes everything in the app passes around. No AI is involved anywhere:
// questions are fixed lists, content is composed by rules, design systems are generated.

export type SiteKind = "portfolio" | "website";
export type StepId = "start" | "questions" | "design" | "cast" | "motion" | "build" | "deploy";
export type StepStatus = "todo" | "draft" | "approved" | "stale";

export const STEPS: { id: StepId; title: string; hint: string }[] = [
  { id: "start", title: "Start", hint: "Say what you want to build" },
  { id: "questions", title: "Questions", hint: "The details that matter" },
  { id: "design", title: "Design system", hint: "Colour, type and shape" },
  { id: "cast", title: "Characters", hint: "Characters, widgets, live scenes" },
  { id: "motion", title: "Animation", hint: "728 styles to pick from" },
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
  anim: string;
  backdrop?: "none" | "aurora" | "grid" | "mesh" | "particles"; // an id from template/src/motion.js, M-000 is "Still"
  hover: "lift" | "glow" | "line" | "spotlight" | "none";
  progress: boolean; // reading progress bar at the top
  marquee: boolean; // skills, clients or services scroll past in a strip
  heroStyle: "statement" | "portrait" | "split" | "centered" | "stage";
  experienceStyle: "ledger" | "timeline" | "list";
  projectStyle: "grid" | "case" | "index";
  serviceStyle: "menu" | "bento" | "rows";
  cast?: CastPick | null; // the character and widgets the site is built around
  castStory?: boolean; // the pinned scroll scene with the character
  intro?: boolean; // opening counter with a curtain wipe
  magnetic?: boolean; // buttons lean toward the pointer
  cursor?: boolean; // soft custom cursor
  tilt?: boolean; // cards and tiles tilt toward the pointer in 3D
  scene?: ScenePick | null; // a live interactive scene: particles, nature, photo or 3D
  sceneMode?: "backdrop" | "visual"; // behind the opening words, or as the opening visual
}

export interface ScenePick {
  id: string;
  type: string;
  group: string;
  palette: string;
  name: string;
}

export interface CastPick {
  character: { id: string; family: string; name: string; palette: string; accessory: string; expression: string; idle: string; variant: number };
  widgets: { id: string; kind: string; skin: string; name: string }[];
}

export type DesignPart = "colour" | "type" | "shape" | "layout" | "motion";

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
  hero: { kicker: string; headline: string; sub: string; primaryCta: string; primaryHref: string; secondaryCta: string; imageUrl: string };
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
  sections: WebsiteSectionId[];
}

export type SiteContent = PortfolioContent | WebsiteContent;

// Everything the portfolio form collects. Résumé import fills it; the person edits it.
export interface PortfolioInput {
  name: string;
  role: string;
  tagline: string;
  location: string;
  email: string;
  phone: string;
  photoUrl: string;
  resumeUrl: string;
  availability: string;
  goal: string;
  tone: string;
  links: { label: string; url: string }[];
  about: string;
  results: { value: string; label: string }[];
  experience: { company: string; role: string; start: string; end: string; location: string; bullets: string[] }[];
  projects: { name: string; role: string; description: string; outcome: string; tags: string[]; link: string; imageUrl: string }[];
  skills: { group: string; items: string[] }[];
  education: { school: string; degree: string; year: string }[];
  certifications: { name: string; issuer: string; year: string; link: string }[];
  awards: { name: string; issuer: string; year: string }[];
  services: { name: string; description: string; price: string }[];
  testimonials: { quote: string; name: string; role: string }[];
  languages: { name: string; level: string }[];
  custom: { title: string; items: { title: string; text: string }[] }[];
}

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
  input?: PortfolioInput;
  design: Design;
  locks: Partial<Record<DesignPart, boolean>>;
  content: SiteContent | null;
  history: { at: string; label: string; content: SiteContent }[];
}
