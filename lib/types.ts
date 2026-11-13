// The shapes everything in the app passes around. No AI is involved anywhere:
// questions are fixed lists, content is composed by rules, design systems are generated.

export type SiteKind = "portfolio" | "website";
export type StepId = "start" | "questions" | "design" | "cast" | "motion" | "build" | "deploy";
export type StepStatus = "todo" | "draft" | "approved" | "stale";

export const STEPS: { id: StepId; title: string; hint: string }[] = [
  { id: "start", title: "Start", hint: "Say what you want to build" },
  { id: "questions", title: "Questions", hint: "The details that matter" },
  { id: "design", title: "Design system", hint: "Colour, type and shape" },
  { id: "cast", title: "Scenes and characters", hint: "Scene concepts, characters, widgets" },
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
  backdrop?: "none" | "aurora" | "grid" | "mesh" | "particles" | "silk"; // an id from template/src/motion.js, M-000 is "Still"
  hover: "lift" | "glow" | "line" | "spotlight" | "none";
  progress: boolean; // reading progress bar at the top
  marquee: boolean; // skills, clients or services scroll past in a strip
  heroStyle: "statement" | "portrait" | "split" | "centered" | "stage" | "cinema" | "scatter";
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
  smooth?: boolean; // eased, weighted page scrolling
  grain?: boolean; // film grain and a soft vignette over the page
  loader?: "none" | "line"; // a masked line of text, then a wipe opens the site
  film?: boolean; // the scroll-scrubbed video with pinned story panels
  video?: string; // the film clip: a "media:" reference to a browser-stored upload, or a link
  flight?: boolean; // tiles fly from a tray into a sentence as you scroll
  carousel?: boolean; // the gallery becomes a drag carousel that drifts on its own
  scrollWords?: boolean; // the first about paragraph sharpens word by word
  showpiece?: "none" | "sphere" | "arc" | "track"; // one big interactive set piece
  scramble?: boolean; // section titles resolve out of random symbols
  fogSwitch?: boolean; // a fog bank hides the light and dark theme switch
  pack?: string; // the animation pack last applied, if any
  // Cinema pieces (studied from award-style landing pages, original code)
  plate?: string; // the scene behind a cinema or scatter opening and the glass call to action: a plate id or /real/cinema path
  accentFace?: "none" | "serif" | "glow"; // one or two headline words in an italic serif, or glowing
  chrome?: "bar" | "pill"; // the navigation: a full-width bar or a floating glass pill
  menu?: "drop" | "curtain"; // the menu: a drop-down on phones, or a full-screen curtain that opens as a circle
  footer?: "simple" | "wordmark"; // the footer: one line, or a card with the name set huge underneath
  ctaStyle?: "band" | "glass"; // the call to action: a colour band, or a glass card over a scene
  // Edit on page: what the person changed on single elements, keyed by where the element is
  // (see template/src/edits.js), and exact page colours set by hand for light and dark.
  edits?: Record<string, ElementEdit>;
  colors?: { light?: Partial<PageColors>; dark?: Partial<PageColors> };
}

export interface PageColors {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  onAccent: string;
}

// One element's changes. Every field is optional; an empty edit is removed.
export interface ElementEdit {
  text?: string; // words that are not part of the content (a label, a badge, a widget line)
  href?: string; // where a link or button goes
  color?: string;
  bg?: string; // a colour or a gradient
  bgImage?: string; // a picture behind the element
  bgFit?: "cover" | "contain";
  bgDim?: number; // darkens the picture so words stay readable, 0 to 0.9
  border?: string;
  size?: number; // 1 is the designed size
  weight?: number;
  italic?: boolean;
  underline?: boolean;
  caps?: boolean;
  align?: "left" | "center" | "right";
  spacing?: number;
  radius?: number;
  pad?: number;
  opacity?: number;
  hide?: boolean;
  src?: string; // a different picture for an image that is not one of the content photos
  fit?: "cover" | "contain";
  icon?: string; // an icon from the built-in set, in place of an icon or vector
  iconSrc?: string; // or an uploaded one
  tint?: number; // hue shift in degrees, recolours pictures, vectors and live scenes
  sat?: number;
  bright?: number;
  blur?: number;
}

export interface ScenePick {
  opts?: Record<string, string | number | boolean | string[]>; // settings the person tuned for this scene (for living scenes: look, speed, amount, side, sky, tint, accent)
  id: string;
  type: string;
  group: string;
  palette: string;
  name: string;
  style?: string;
}

export interface CastPick {
  character: { id: string; family: string; name: string; palette: string; accessory: string; expression: string; idle: string; variant: number; src?: string; fits?: string[] };
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
  docName?: string; // the requirements document the answers were read from, if any
  profile: Profile | null;
  input?: PortfolioInput;
  design: Design;
  locks: Partial<Record<DesignPart, boolean>>;
  content: SiteContent | null;
  history: { at: string; label: string; content: SiteContent }[];
}
