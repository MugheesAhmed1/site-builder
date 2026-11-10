// The shapes everything in the app passes around.
// A portfolio is just two JSON objects: `design` (how it looks) and `content` (what it says).

export type StepId = "resume" | "design" | "questions" | "build" | "deploy";
export type StepStatus = "todo" | "draft" | "approved" | "stale";

export const STEPS: { id: StepId; title: string; hint: string }[] = [
  { id: "resume", title: "Resume", hint: "Upload a PDF or paste text" },
  { id: "design", title: "Design system", hint: "Colour, type and motion" },
  { id: "questions", title: "Questions", hint: "A few questions about you" },
  { id: "build", title: "Portfolio", hint: "Preview and edit" },
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

// How the portfolio looks. Colours come from just a neutral hue and one accent;
// template/src/theme.js derives a full light and dark palette from them.
export interface Design {
  preset: string;
  mode: "auto" | "light" | "dark";
  hue: number;
  tint: number;
  accent: string;
  fonts: { display: string; body: string; mono: string };
  radius: number;
  motion: "none" | "subtle" | "expressive";
  heroStyle: "statement" | "portrait";
  experienceStyle: "ledger" | "timeline" | "list";
}

export interface Question {
  id: string;
  question: string;
  why: string;
  suggested: string;
  answer: string;
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
  experience: {
    company: string;
    role: string;
    start: string;
    end: string;
    location: string;
    summary: string;
    highlights: string[];
    tags: string[];
  }[];
  projects: { name: string; category: string; summary: string; impact: string; tags: string[]; link: string }[];
  skills: { group: string; items: string[] }[];
  education: { school: string; degree: string; year: string }[];
  certifications: { name: string; issuer: string; year: string; link: string }[];
  testimonials: { quote: string; name: string; role: string }[];
  contact: {
    heading: string;
    blurb: string;
    email: string;
    phone: string;
    linkedin: string;
    github: string;
    website: string;
  };
  sections: SectionId[];
}

export interface PortfolioProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  steps: Record<StepId, StepStatus>;
  resumeText: string;
  resumeFileName: string;
  profile: Profile | null;
  design: Design;
  questions: Question[];
  content: PortfolioContent | null;
  history: { at: string; label: string; content: PortfolioContent }[];
}

export type AiRequest =
  | { task: "extract"; resumeText?: string; pdfBase64?: string }
  | { task: "questions"; profile: Profile; design: Design }
  | { task: "build"; profile: Profile; design: Design; questions: Question[] }
  | { task: "revise"; profile: Profile; design: Design; content: PortfolioContent; instruction: string }
  | { task: "design"; profile: Profile | null; design: Design; instruction: string };
