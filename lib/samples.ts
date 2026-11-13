import { profileToInput } from "./compose";
import { applyDetails, createProject, portfolioInput } from "./project";
import { parseResume } from "./resume";
import { SAMPLE_RESUME } from "./sample";
import type { Project } from "./types";
import { SCENES } from "@/template/src/scenes.js";

// Four finished example sites for the home page. They are made by the same code as any
// other site: one line, then a few answers. Names and numbers are invented examples.

export interface Sample {
  id: string;
  tab: string;
  query: string;
  answers?: Record<string, string>;
  resume?: boolean;
  scene?: string; // a scene type that suits the site, when the default would not
}

export const SAMPLES: Sample[] = [
  {
    id: "bakery",
    tab: "Bakery",
    scene: "petals",
    query: "Website for my bakery called Crumb House in Lahore",
    answers: {
      what: "Cakes and fresh bread",
      audience: "families and office teams nearby",
      about: "We started in a home kitchen in 2014 and still bake everything the morning you buy it. No premixes, no shortcuts, and a new loaf on the counter every hour.",
      highlights: "11 | years of early mornings\n4.9 | rating on Google\n3000+ | cakes a year",
      address: "12 Main Boulevard, Gulberg, Lahore",
      phone: "+92 300 0000000",
      whatsapp: "+92 300 0000000",
      testimonials: "The sourdough is worth the drive across town. | Ayesha R.\nOur office orders from Crumb House every Friday. | Bilal K.",
    },
  },
  {
    id: "dentist",
    tab: "Dentist",
    scene: "bubbles",
    query: "Site for my dental clinic called Pearl Dental in Karachi",
    answers: {
      what: "Family dentistry and braces",
      audience: "families and children",
      about: "A calm clinic where nobody is rushed. We explain every step before we start, show you the price first, and see emergencies the same day.",
      highlights: "15 | years of care\n12k | smiles looked after\n5.0 | from our patients",
      address: "4 Zamzama Lane, Clifton, Karachi",
      phone: "+92 21 0000000",
      testimonials: "My daughter asks when she can go back. | Sana M.\nPainless, on time and fairly priced. | Omar H.",
    },
  },
  { id: "pm", tab: "Product manager", query: "Portfolio for me, I'm a product manager", resume: true },
  {
    id: "agency",
    tab: "Design agency",
    query: "Website for my design agency called Northside Studio in Dubai",
    answers: {
      what: "Branding and websites",
      audience: "startups and small brands",
      about: "A small studio that takes on six brands a year. You work with the people who do the work, and every project ships with the files, the fonts and a guide your team can follow.",
      highlights: "60+ | brands launched\n9 | design awards\n6 | projects a year",
      email: "hello@northside.example",
      clients: "Lumen, Harbor, Fig & Co, Atlas",
      testimonials: "They gave us a brand we grew into, not out of. | Layla N., founder of Lumen",
    },
  },
];

export function buildSample(s: Sample): Project {
  const scene = s.scene ? SCENES.find((x: { type: string; palette: string }) => x.type === s.scene && x.palette === "brand") ?? SCENES.find((x: { type: string }) => x.type === s.scene) : undefined;
  let p = createProject({ query: s.query, sceneId: scene?.id });
  if (s.answers) p = applyDetails(p, { answers: { ...p.answers, ...s.answers } });
  if (s.resume) {
    const profile = parseResume(SAMPLE_RESUME);
    p = applyDetails(p, { profile, input: { ...portfolioInput(p), ...profileToInput(profile) } });
  }
  return p;
}
