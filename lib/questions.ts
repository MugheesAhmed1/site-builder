import type { Question, SiteKind } from "./types";
import { categoryById } from "./categories";

// Fixed question lists. A portfolio gets one list; a website gets a shared list that is
// tailored to the business category (placeholders, suggested answers, and whether it asks
// for opening hours or prices). No AI decides what to ask.

export const TONES = ["Calm and minimal", "Warm and friendly", "Bold and loud", "Classic and editorial", "Modern and technical"];

export const TONE_MOOD: Record<string, "minimal" | "warm" | "bold" | "editorial" | "tech"> = {
  "Calm and minimal": "minimal",
  "Warm and friendly": "warm",
  "Bold and loud": "bold",
  "Classic and editorial": "editorial",
  "Modern and technical": "tech",
};

export const PORTFOLIO_QUESTIONS: Question[] = [
  { id: "name", label: "Your full name", type: "text", required: true, placeholder: "Sara Malik" },
  { id: "role", label: "What do you do, in a few words?", type: "text", required: true, placeholder: "Product manager", help: "This becomes the title under your name." },
  { id: "headline", label: "One line about the value you bring", type: "text", placeholder: "I turn messy payment flows into products people trust", help: "This is the big line at the top of your site. Keep it under 12 words." },
  { id: "location", label: "Where are you based?", type: "text", placeholder: "Lahore, Pakistan" },
  { id: "email", label: "Email for people to reach you", type: "text", required: true, placeholder: "you@example.com" },
  { id: "phone", label: "Phone (optional)", type: "text", placeholder: "+92 300 0000000" },
  { id: "links", label: "Profile links", type: "list", placeholder: "https://linkedin.com/in/you\nhttps://github.com/you", help: "One per line. LinkedIn, GitHub, Behance, Dribbble or your blog." },
  { id: "goal", label: "What should this site help you do?", type: "choice", options: ["Get hired full time", "Win freelance clients", "Both", "Show my work"], suggest: "Get hired full time" },
  { id: "availability", label: "Are you available right now?", type: "choice", options: ["Open to new roles", "Taking freelance projects", "Not looking right now"], suggest: "Open to new roles" },
  { id: "about", label: "Tell visitors about yourself", type: "textarea", placeholder: "Two or three sentences: what you do, who for, and what you care about.", help: "Leave empty to use the summary from your résumé." },
  { id: "results", label: "Your proudest results", type: "list", placeholder: "Grew signups by 40% in 6 months\nLaunched 3 products used by 2M people", help: "One per line. Numbers become the counters at the top of your site." },
  { id: "projects", label: "Projects to feature", type: "list", placeholder: "Payments app | Rebuilt checkout, cut drop off by 30% | https://example.com", help: "One per line: name | what it did | link. Leave empty to use the projects in your résumé." },
  { id: "testimonials", label: "Kind words from people you worked with", type: "list", placeholder: "Sara made the hard calls easy. | Ali Khan | CTO at Paylane", help: "One per line: quote | name | their role." },
  { id: "photoUrl", label: "Link to a photo of you (optional)", type: "text", placeholder: "https://...", help: "Leave empty and the site shows a clean layout without a photo." },
  { id: "resumeUrl", label: "Link to your CV file (optional)", type: "text", placeholder: "https://drive.google.com/...", help: "Adds a Download CV button." },
  { id: "tone", label: "How should it feel?", type: "choice", options: TONES, suggest: "Modern and technical", help: "This picks the starting design system. You can change it next." },
];

const CTA_OPTIONS = ["Call us", "Message on WhatsApp", "Book an appointment", "Book a call", "See the menu", "Get a quote", "Get started", "Shop now", "Get in touch"];

export function websiteQuestions(categoryId: string): Question[] {
  const c = categoryById(categoryId);
  const qs: Question[] = [
    { id: "name", label: "Name of your business or project", type: "text", required: true, placeholder: c.id === "food" ? "Crumb & Co." : "Northside Studio" },
    { id: "what", label: "What do you offer, in a few words?", type: "text", required: true, placeholder: examples[c.id] ?? "Home cleaning", help: "Used in your headline, so keep it short." },
    { id: "city", label: "Which city or area do you serve?", type: "text", placeholder: "Lahore" },
    { id: "audience", label: "Who are your customers?", type: "text", placeholder: audiences[c.id] ?? "families and small businesses" },
    { id: "about", label: "Your story", type: "textarea", placeholder: "How you started, what makes you different, and what customers can expect.", help: "Two or three sentences is plenty." },
    { id: "services", label: c.id === "food" ? "What's on the menu?" : "What do you offer?", type: "list", suggest: c.services.join("\n"), help: "One per line: name | price | short description. Price and description are optional." },
    { id: "highlights", label: "Numbers worth bragging about", type: "list", placeholder: "12 | years in business\n4.9 | Google rating\n3000+ | happy customers", help: "One per line: number | what it means." },
  ];
  if (c.pricing) {
    qs.push({ id: "pricing", label: "Plans or packages", type: "list", placeholder: "Starter | 5,000 | per month | 2 sessions a week, Diet plan", help: "One per line: name | price | period | features separated by commas. Leave empty to skip." });
  }
  if (c.physical) {
    qs.push(
      { id: "address", label: "Address", type: "text", placeholder: "12 Main Boulevard, Gulberg, Lahore" },
      { id: "hours", label: "Opening hours", type: "list", suggest: "Mon to Fri | 9am to 8pm\nSat | 10am to 6pm\nSun | Closed", help: "One per line: days | time." },
    );
  }
  qs.push(
    { id: "testimonials", label: "What customers say", type: "list", placeholder: "Best cake in town. | Ayesha R.", help: "One per line: quote | name." },
    { id: "cta", label: "What should visitors do first?", type: "choice", options: Array.from(new Set([c.primaryCta, ...CTA_OPTIONS])), suggest: c.primaryCta },
    { id: "phone", label: "Phone", type: "text", placeholder: "+92 300 0000000" },
    { id: "whatsapp", label: "WhatsApp number", type: "text", placeholder: "+92 300 0000000" },
    { id: "email", label: "Email", type: "text", placeholder: "hello@yourbusiness.com" },
    { id: "instagram", label: "Instagram link", type: "text", placeholder: "https://instagram.com/yourbusiness" },
    { id: "facebook", label: "Facebook link", type: "text", placeholder: "https://facebook.com/yourbusiness" },
    { id: "imageUrl", label: "Link to a main photo (optional)", type: "text", placeholder: "https://...", help: "Leave empty and the site shows a labelled photo slot." },
    { id: "tone", label: "How should it feel?", type: "choice", options: TONES, suggest: toneFor[c.id] ?? "Warm and friendly", help: "This picks the starting design system. You can change it next." },
  );
  return qs;
}

export function questionsFor(kind: SiteKind, category: string): Question[] {
  return kind === "portfolio" ? PORTFOLIO_QUESTIONS : websiteQuestions(category);
}

// Answers start with the suggested values so people only change what's wrong.
export function defaultAnswers(kind: SiteKind, category: string, hints: { name: string; city: string }): Record<string, string> {
  const a: Record<string, string> = {};
  for (const q of questionsFor(kind, category)) if (q.suggest) a[q.id] = q.suggest;
  if (hints.name) a.name = hints.name;
  if (hints.city) a[kind === "portfolio" ? "location" : "city"] = hints.city;
  return a;
}

const examples: Record<string, string> = {
  food: "Cakes and fresh bread",
  beauty: "Hair and skin care",
  fitness: "Personal training",
  health: "Family dentistry",
  agency: "Branding and websites",
  consulting: "Tax advice",
  photo: "Wedding photography",
  property: "Homes for rent and sale",
  product: "Invoicing for freelancers",
  shop: "Handmade leather bags",
  nonprofit: "Free tutoring",
  events: "Wedding planning",
};

const audiences: Record<string, string> = {
  food: "families and office teams nearby",
  beauty: "women and brides",
  fitness: "busy professionals",
  health: "families",
  agency: "startups and small brands",
  consulting: "small business owners",
  photo: "couples and brands",
  property: "families and investors",
  product: "freelancers",
  shop: "people who like things made well",
  nonprofit: "children in our city",
  events: "couples and companies",
};

const toneFor: Record<string, string> = {
  food: "Warm and friendly",
  beauty: "Calm and minimal",
  fitness: "Bold and loud",
  health: "Calm and minimal",
  agency: "Bold and loud",
  consulting: "Classic and editorial",
  photo: "Classic and editorial",
  property: "Calm and minimal",
  product: "Modern and technical",
  shop: "Classic and editorial",
  nonprofit: "Warm and friendly",
  events: "Classic and editorial",
};

// "a | b | c" lines into arrays of trimmed parts.
export function rows(text: string | undefined): string[][] {
  return (text ?? "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split("|").map((x) => x.trim()));
}
