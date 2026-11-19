import { classify, extractHints } from "./categories";
import { cap } from "./text";
import type { BlockRequirement, DirectorId, HeroAssetType, Layout, SectionAnimation, BackgroundType, Widget } from "@/template/src/content/blocks";
import { DIRECTOR_IDS, isDirector } from "@/template/src/director";
import type { WebsiteContent } from "@/template/src/content/types";

// The PRD (product requirements document) every site is now built from. The journey:
//   1. the person says in one line what to make,
//   2. Gemini drafts this PRD (rules draft it when Gemini is not available),
//   3. the person edits it: sections, words and requirements,
//   4. they submit it, and the site is generated from it (lib/prd-build.ts),
//   5. the coverage check (lib/prd-coverage.ts) proves every requirement is on the page.
// The PRD stays on the project, so the person can change it and rebuild at any time.

export interface PrdRequirement {
  /** Stable id: R1, R2... Kept when the text changes, so coverage follows it. */
  id: string;
  kind: "content" | "functional";
  text: string;
}

export interface PrdVisual {
  /** What the section shows, in words ("realistic human heart"). */
  subject: string;
  asset: HeroAssetType;
  director: DirectorId;
  secondary?: DirectorId;
  layout?: Layout;
  background?: BackgroundType;
  animation?: SectionAnimation;
}

export interface PrdItem {
  title: string;
  text: string;
  value?: string;
}

export interface PrdSection {
  id: string;
  title: string;
  /** Why the section exists, for the person; also its kicker on the page. */
  purpose: string;
  /** The words the section says. */
  content: string;
  items: PrdItem[];
  requirements: PrdRequirement[];
  visual: PrdVisual;
}

export interface Prd {
  version: 1;
  /** The person's one line. */
  idea: string;
  title: string;
  name: string;
  summary: string;
  audience: string;
  goals: string[];
  tone: string;
  /** The look the whole site leans to; each section can pick its own. */
  director: DirectorId;
  accent: string;
  cta: { label: string; href: string };
  contact: { email: string; phone: string; address: string };
  sections: PrdSection[];
  status: "draft" | "submitted";
  submittedAt?: string;
  /** Who wrote the first draft. */
  source: "gemini" | "rules" | "document";
  model?: string;
}

export const MAX_SECTIONS = 14;
export const MAX_REQS = 12;

const str = (v: unknown, max = 600) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "section";

/** Unique, readable section ids. */
export function sectionId(title: string, taken: Set<string>): string {
  const base = slug(title);
  let id = base;
  for (let n = 2; taken.has(id); n++) id = base + "-" + n;
  taken.add(id);
  return id;
}

/** The next requirement id not yet used anywhere in the PRD. */
export function nextReqId(prd: Pick<Prd, "sections">): string {
  let max = 0;
  for (const s of prd.sections) for (const r of s.requirements) max = Math.max(max, Number(r.id.replace(/^R/, "")) || 0);
  return "R" + (max + 1);
}

export function allRequirements(prd: Pick<Prd, "sections">): (PrdRequirement & { section: string })[] {
  return prd.sections.flatMap((s) => s.requirements.map((r) => ({ ...r, section: s.id })));
}

// ------------------------------------------------------------------ functional requirements become widgets

const FUNCTIONAL = /\b(users?|visitors?|customers?|patients?|guests?|members?|people|students?|readers?|clients?)\s+(can|could|should|must|will|may|are able to|need to)\b|\b(allow|enable|let|lets|support|provide)s?\b|\b(form|book(ing)?|appointment|reserve|reservation|sign ?up|subscribe|newsletter|register|apply|quote|search|filter|faq|accordion|pricing|price table|gallery|map|directions|video|download|compare|calculator|quiz|interactive|explore|tabs?|button|link|contact (us|form)|enquir|inquir|rsvp|waitlist|order|checkout)\b/i;

export function looksFunctional(text: string): boolean {
  return FUNCTIONAL.test(text);
}

/** How a functional requirement works on the page: the widget, its form fields and its button words. */
export function widgetFor(text: string): Pick<BlockRequirement, "widget" | "fields" | "action"> {
  const t = text.toLowerCase();
  if (/\b(a|the|main|one)\s+(\w+\s+)?button\b/.test(t) && !/\bform\b/.test(t)) return { widget: "button" };
  if (/\b(book|booking|appointment|reserv\w*|schedule a|rsvp)\b/.test(t)) return { widget: "form", fields: ["Name", "Email", "Phone", "Date", /table|guest|restaurant/.test(t) ? "Guests" : "Time", "Notes"], action: /table|reserv/.test(t) ? "Reserve" : "Book now" };
  if (/\b(newsletter|subscribe|waitlist|wait list|updates by email|mailing list|early access)\b/.test(t)) return { widget: "form", fields: ["Email"], action: /waitlist|early/.test(t) ? "Join the waitlist" : "Subscribe" };
  if (/\b(sign ?up|register|create an account|join|apply|application|enrol|enroll)\b/.test(t)) return { widget: "form", fields: ["Name", "Email", "Phone", "Message"], action: /apply|application/.test(t) ? "Apply" : "Sign up" };
  if (/\b(quote|estimate)\b/.test(t)) return { widget: "form", fields: ["Name", "Email", "Phone", "Details"], action: "Get a quote" };
  if (/\b(order|checkout|buy|purchase)\b/.test(t)) return { widget: "form", fields: ["Name", "Email", "Phone", "Order details"], action: "Place order" };
  if (/\b(contact|enquir|inquir|message|get in touch|reach)\w*\b/.test(t) && /\b(form|send|submit|message|contact)\b/.test(t)) return { widget: "form", fields: ["Name", "Email", "Message"], action: "Send message" };
  if (/\b(faqs?|frequently asked|questions|accordion)\b/.test(t)) return { widget: "faq" };
  if (/\b(pric\w*|plans?|tiers?|packages?|subscriptions?)\b/.test(t)) return { widget: "pricing", action: "Choose plan" };
  if (/\b(gallery|photos?|portfolio|showcase|images?|pictures?)\b/.test(t)) return { widget: "gallery" };
  if (/\b(map|directions?|location|find us|address)\b/.test(t)) return { widget: "map", action: "Open the map" };
  if (/\b(search|filter|find|look up|browse)\b/.test(t)) return { widget: "search" };
  if (/\b(video|watch|film|clip)\b/.test(t)) return { widget: "video" };
  if (/\b(stats?|statistics|numbers|metrics|counters?|figures)\b/.test(t)) return { widget: "stats" };
  if (/\b(compar\w*|versus|vs\.?|table)\b/.test(t)) return { widget: "compare" };
  if (/\b(explore|interactive|hotspots?|tabs?|step through|click (on|through|each|any|a|an|the)|tap (each|any|a|the)|quiz|label(led|ed)? parts?|learn about (each|it|them))\b/.test(t)) return { widget: "explore" };
  if (/\b(download|pdf|brochure|guide|ebook)\b/.test(t)) return { widget: "download", action: "Download" };
  if (/\b(button|call to action|cta|link|navigate|go to|start|get started|try)\b/.test(t)) return { widget: "button" };
  if (/\b(contact|call|whatsapp|email)\b/.test(t)) return { widget: "form", fields: ["Name", "Email", "Message"], action: "Send message" };
  return { widget: "list" };
}

// ------------------------------------------------------------------ cleaning what Gemini or a backup gives

const ASSETS: HeroAssetType[] = ["glb", "image", "video", "illustration", "particles", "none"];

function cleanVisual(v: unknown, fallback: PrdVisual): PrdVisual {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const asset = typeof o.asset === "string" && (ASSETS as string[]).includes(o.asset) ? (o.asset as HeroAssetType) : fallback.asset;
  return {
    subject: str(o.subject, 120) || fallback.subject,
    asset,
    director: isDirector(o.director) ? o.director : fallback.director,
    secondary: isDirector(o.secondary) && o.secondary !== o.director ? o.secondary : undefined,
    layout: typeof o.layout === "string" && ["fullscreen", "split", "centered", "asymmetric", "editorial"].includes(o.layout) ? (o.layout as Layout) : undefined,
    background: typeof o.background === "string" && ["solid", "gradient", "image", "video", "environment", "particles"].includes(o.background) ? (o.background as BackgroundType) : undefined,
    animation: typeof o.animation === "string" && ["float", "reveal", "orbit", "scroll", "parallax", "morph", "particles"].includes(o.animation) ? (o.animation as SectionAnimation) : undefined,
  };
}

/** Any PRD-shaped value (Gemini's answer, a saved project, an edit) as a valid PRD. */
export function normalizePrd(raw: unknown, idea: string, source: Prd["source"] = "rules"): Prd {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const fallback = localDraft(idea);
  const director = isDirector(o.director) ? o.director : fallback.director;
  const taken = new Set<string>();
  const reqIds = new Set<string>();
  let n = 0;
  const sections: PrdSection[] = [];
  for (const [i, s0] of arr(o.sections).slice(0, MAX_SECTIONS).entries()) {
    const s = (s0 && typeof s0 === "object" ? s0 : {}) as Record<string, unknown>;
    const title = str(s.title, 90);
    if (!title) continue;
    const id = typeof s.id === "string" && /^[a-z0-9-]{1,40}$/.test(s.id) && !taken.has(s.id) ? (taken.add(s.id), s.id) : sectionId(title, taken);
    const requirements: PrdRequirement[] = [];
    for (const r0 of arr(s.requirements).slice(0, MAX_REQS)) {
      const r = (typeof r0 === "string" ? { text: r0 } : r0 && typeof r0 === "object" ? r0 : {}) as Record<string, unknown>;
      const text = str(r.text, 300);
      if (!text) continue;
      let rid = typeof r.id === "string" && /^R\d{1,4}$/.test(r.id) && !reqIds.has(r.id) ? r.id : "";
      if (!rid) {
        do rid = "R" + ++n;
        while (reqIds.has(rid));
      }
      reqIds.add(rid);
      n = Math.max(n, Number(rid.slice(1)));
      const kind = r.kind === "functional" || r.kind === "content" ? r.kind : looksFunctional(text) ? "functional" : "content";
      requirements.push({ id: rid, kind, text });
    }
    const items = arr(s.items)
      .slice(0, 12)
      .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : { title: x }))
      .map((x) => ({ title: str(x.title, 90), text: str(x.text, 400), value: str(x.value, 40) || undefined }))
      .filter((x) => x.title || x.text);
    const fb = fallback.sections[Math.min(i, fallback.sections.length - 1)].visual;
    sections.push({
      id,
      title,
      purpose: str(s.purpose, 200),
      content: str(s.content, 1200),
      items,
      requirements,
      visual: cleanVisual(s.visual, { ...fb, director: i === 0 ? director : fb.director, asset: i === 0 ? fb.asset : "none", subject: fb.subject }),
    });
  }
  const contact = (o.contact && typeof o.contact === "object" ? o.contact : {}) as Record<string, unknown>;
  const cta = (o.cta && typeof o.cta === "object" ? o.cta : {}) as Record<string, unknown>;
  const accent = typeof o.accent === "string" && /^#[0-9a-f]{6}$/i.test(o.accent.trim()) ? o.accent.trim() : fallback.accent;
  const href = str(cta.href, 200);
  return {
    version: 1,
    idea: str(o.idea, 300) || idea,
    title: str(o.title, 120) || fallback.title,
    name: str(o.name, 60) || fallback.name,
    summary: str(o.summary, 900) || fallback.summary,
    audience: str(o.audience, 400) || fallback.audience,
    goals: arr(o.goals).map((g) => str(g, 200)).filter(Boolean).slice(0, 8),
    tone: str(o.tone, 120) || fallback.tone,
    director,
    accent,
    cta: { label: str(cta.label, 40) || fallback.cta.label, href: /^(#|https?:|mailto:|tel:)/.test(href) ? href : "#pf-b-" + (sections[sections.length - 1]?.id ?? "contact") },
    contact: { email: str(contact.email, 120), phone: str(contact.phone, 40), address: str(contact.address, 200) },
    sections: sections.length ? sections : fallback.sections,
    status: o.status === "submitted" ? "submitted" : "draft",
    submittedAt: typeof o.submittedAt === "string" ? o.submittedAt : undefined,
    source: o.source === "gemini" || o.source === "document" || o.source === "rules" ? o.source : source,
    model: str(o.model, 60) || undefined,
  };
}

// ------------------------------------------------------------------ the rules draft (no Gemini)

const ACCENTS = ["#2563EB", "#7C3AED", "#0D9488", "#DB2777", "#EA580C", "#16A34A", "#0284C7", "#C2410C"];

function directorFor(t: string): DirectorId {
  if (/\b(heart|anatomy|biology|science|scientific|lab|research|medical|medicine|physics|chemistry|space|astronomy|dna|cell|brain|clinic|hospital|dentist)\b/.test(t)) return "scientific";
  if (/\b(luxury|jewel\w*|watch(es)?|perfume|fashion|boutique|villa|spa|hotel|wine)\b/.test(t)) return "luxury";
  if (/\b(magazine|blog|journal|news|story|stories|writer|author|book|museum|history)\b/.test(t)) return "editorial";
  if (/\b(documentary|charity|nonprofit|ngo|community|travel|photograph\w*)\b/.test(t)) return "documentary";
  if (/\b(ai|saas|crypto|web3|robot\w*|tech|software|app|startup|game|gaming|vr|ar)\b/.test(t)) return "futuristic";
  if (/\b(kids?|toy|toys|school|candy|bakery|cafe|ice cream|pet|party|playful|fun)\b/.test(t)) return "playful";
  if (/\b(product|shoe|sneaker|bottle|gadget|headphones?|phone|car|bike|furniture|launch)\b/.test(t)) return "product";
  if (/\b(film|cinema|movie|music|band|artist|concert|event)\b/.test(t)) return "cinematic";
  if (/\b(experience|journey|world|explore|ocean|forest|adventure)\b/.test(t)) return "immersive";
  if (/\b(architect\w*|studio|design|portfolio|minimal)\b/.test(t)) return "minimal";
  return "editorial";
}

/** What the one line is about, as a short subject ("the human heart"). */
function subjectOf(idea: string): string {
  const t = idea
    .replace(/^(a|an|the)\s+/i, "")
    .replace(/^(website|site|landing page|web page|page|portfolio|app)\s+(for|about|on|explaining|that explains|showing)\s+/i, "")
    .replace(/\s+(website|site|landing page|page)$/i, "")
    .replace(/^(how|what|why)\s+/i, (m) => m.toLowerCase())
    .trim();
  return t || idea.trim();
}

function educational(idea: string) {
  return /^(how|what|why|the science|learn|explain|guide to|introduction to)\b/i.test(idea.trim()) || /\b(works|explained|anatomy|science of|guide|course|lesson|tutorial|education|learn)\b/i.test(idea);
}

let draftN = 0;
const R = () => "R" + ++draftN;

function sec(title: string, purpose: string, content: string, reqs: [PrdRequirement["kind"], string][], visual: Partial<PrdVisual> & { director: DirectorId }, items: PrdItem[] = []): PrdSection {
  return {
    id: slug(title),
    title,
    purpose,
    content,
    items,
    requirements: reqs.map(([kind, text]) => ({ id: R(), kind, text })),
    visual: { subject: "", asset: "none", ...visual },
  };
}

/** A complete first PRD from one line, by rules. Gemini writes a better one when it is available. */
export function localDraft(idea0: string): Prd {
  draftN = 0;
  const idea = idea0.trim() || "A website for my business";
  const t = idea.toLowerCase();
  const hints = extractHints(idea);
  const found = classify(idea);
  const subject = subjectOf(idea);
  const Subject = cap(subject);
  const director = directorFor(t);
  const name = hints.name || (educational(idea) ? Subject.split(/\s+/).slice(0, 4).join(" ") : Subject.split(/\s+/).slice(0, 3).map(cap).join(" "));
  const accent = ACCENTS[[...idea].reduce((a, c) => a + c.charCodeAt(0), 0) % ACCENTS.length];
  const city = hints.city ? " in " + hints.city : "";
  const lead3d = /\b(heart|brain|product|shoe|car|planet|watch|bottle|robot|model|3d|object|device|machine|engine|cell|dna|tooth|sculpture)\b/.test(t);
  let sections: PrdSection[];
  if (educational(idea)) {
    sections = [
      sec(Subject, "Open with the big question and a striking view of the subject.", `A clear, visual introduction to ${subject}, for anyone curious enough to scroll.`, [["content", `State what ${subject} is in one sentence`], ["functional", "A button takes visitors to the first chapter"]], { director, secondary: "cinematic", asset: lead3d ? "glb" : "illustration", subject, layout: "fullscreen", background: "environment", animation: "orbit" }),
      sec("The big picture", "Explain the whole idea before the details.", `Before the parts, the whole: what ${subject} does and why it matters.`, [["content", "Explain the core idea in plain words"], ["content", "Give one fact that surprises people"]], { director, asset: "illustration", layout: "split", animation: "reveal" }),
      sec("How it works, step by step", "Walk through the process in order.", `Each step of ${subject}, one at a time.`, [["content", "Show every step in order"], ["functional", "Visitors can click each step to learn about it"]], { director, asset: lead3d ? "glb" : "illustration", subject, layout: "asymmetric", animation: "scroll" }, [
        { title: "Step one", text: "Where it begins." },
        { title: "Step two", text: "What happens next." },
        { title: "Step three", text: "How it comes together." },
        { title: "Step four", text: "The result." },
      ]),
      sec("Key numbers", "Make the scale of it tangible.", "The numbers that make it real.", [["functional", "Show key statistics as large numbers"]], { director: "editorial", asset: "none", layout: "centered", animation: "reveal" }, [
        { title: "A number that matters", text: "", value: "100" },
        { title: "Another one", text: "", value: "24/7" },
        { title: "And one more", text: "", value: "1st" },
      ]),
      sec("Common questions", "Answer what people usually ask.", `What people often ask about ${subject}.`, [["functional", "An FAQ where each answer opens on click"]], { director: "minimal", asset: "none", layout: "editorial", animation: "reveal" }, [
        { title: "Why does it matter?", text: "A short, clear answer." },
        { title: "What can go wrong?", text: "A short, clear answer." },
        { title: "Where can I learn more?", text: "A short, clear answer." },
      ]),
      sec("Keep exploring", "Close with a next step.", "Want to go deeper? Get the full guide.", [["functional", "Visitors can subscribe to updates by email"]], { director, asset: "particles", layout: "centered", background: "gradient", animation: "particles" }),
    ];
  } else {
    const what = found.kind === "website" ? subject : subject;
    sections = [
      sec(name, "Say who this is and what they offer in the first screen.", `${cap(what)}${city}. A clear promise and one main action.`, [["content", "State the main promise in one line"], ["functional", "A main button leads to contact or booking"]], { director, asset: lead3d ? "glb" : director === "documentary" ? "image" : "illustration", subject: what, layout: director === "product" ? "split" : "fullscreen", background: director === "minimal" || director === "editorial" ? "solid" : "environment", animation: lead3d ? "orbit" : "float" }),
      sec("About", "Build trust: who is behind it and why.", `Who we are, what we care about and why people choose us.`, [["content", "Explain who is behind the business"], ["content", "Say what makes it different"]], { director, asset: "image", layout: "split", animation: "parallax" }),
      sec("What we offer", "List the main services or products.", "Everything we offer, at a glance.", [["content", "List each main service or product with a short description"]], { director, asset: "none", layout: "editorial", animation: "reveal" }, [
        { title: "First offer", text: "A short description." },
        { title: "Second offer", text: "A short description." },
        { title: "Third offer", text: "A short description." },
      ]),
      sec("How it works", "Make the first step feel easy.", "Three simple steps from hello to done.", [["content", "Show the process in three steps"]], { director, asset: "illustration", layout: "asymmetric", animation: "scroll" }, [
        { title: "Get in touch", text: "Tell us what you need." },
        { title: "We plan it", text: "A clear plan and price." },
        { title: "It's done", text: "Delivered with care." },
      ]),
      sec("What people say", "Social proof.", "Kind words from people we have worked with.", [["content", "Show at least two customer testimonials"]], { director: "editorial", asset: "none", layout: "centered", animation: "reveal" }, [
        { title: "A happy customer", text: "“A short, honest quote.”" },
        { title: "Another customer", text: "“Another short quote.”" },
      ]),
      sec("Questions", "Remove doubts before they contact you.", "Answers to what people ask most.", [["functional", "An FAQ where each answer opens on click"]], { director: "minimal", asset: "none", layout: "editorial", animation: "reveal" }, [
        { title: "How much does it cost?", text: "A short, clear answer." },
        { title: "How long does it take?", text: "A short, clear answer." },
      ]),
      sec("Contact", "Turn interest into a message or booking.", "Tell us what you need and we will get back to you.", [["functional", /\b(clinic|dentist|salon|spa|restaurant|hotel|doctor|gym|coach|tutor)\b/.test(t) ? "Visitors can book an appointment with a form" : "A contact form sends a message"], ["content", "Show the phone number, email and address"]], { director, asset: "none", layout: "split", background: "gradient", animation: "reveal" }),
    ];
  }
  const taken = new Set<string>();
  for (const s of sections) s.id = sectionId(s.title, taken);
  const last = sections[sections.length - 1];
  return {
    version: 1,
    idea,
    title: (educational(idea) ? Subject : name) + " website",
    name,
    summary: educational(idea) ? `An interactive, visual explainer of ${subject}: one idea per section, from the big picture to the details, with a 3D view of the subject.` : `A website for ${what0(subject)}${city} that explains the offer, builds trust and turns visitors into enquiries.`,
    audience: educational(idea) ? "Curious visitors, students and anyone who wants a clear, visual explanation." : "People looking for this service" + city + ", comparing options before they get in touch.",
    goals: educational(idea) ? ["Explain the subject clearly", "Keep visitors scrolling to the end", "Grow an email list"] : ["Explain the offer in seconds", "Build trust", "Get enquiries and bookings"],
    tone: director === "playful" ? "Friendly and bright" : director === "luxury" ? "Calm and refined" : director === "scientific" ? "Clear, precise and curious" : "Warm and confident",
    director,
    accent,
    cta: { label: educational(idea) ? "Start exploring" : "Get in touch", href: educational(idea) ? "#pf-b-" + (sections[1]?.id ?? last.id) : "#pf-b-" + last.id },
    contact: { email: "", phone: "", address: hints.city || "" },
    sections,
    status: "draft",
    source: "rules",
  };
}

const what0 = (s: string) => s.replace(/^(my|our)\s+/i, "");

// ------------------------------------------------------------------ a document becomes a PRD

/** Reads a written PRD, BRD or brief (headings, bullets, paragraphs) into the PRD shape. */
export function prdFromText(text: string, fileName = ""): Prd {
  const lines = text.replace(/\r/g, "").split("\n");
  const out: { title: string; paras: string[]; bullets: string[] }[] = [];
  let title = "";
  let cur: (typeof out)[number] | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const h = /^(#{1,6})\s+(.*)$/.exec(line) || (/^([A-Z0-9][^.!?]{2,70})$/.test(line) && line.split(/\s+/).length <= 8 && !/[,;]$/.test(line) ? [line, "##", line] : null);
    if (h) {
      const t = h[2].replace(/^[\d.)\s]+/, "").replace(/[:*_]+$/g, "").trim();
      if (!title && (h[1] === "#" || !out.length)) {
        title = t;
        if (h[1] === "#") continue;
      }
      if (/\b(table of contents|contents|revision|version history|appendix|glossary|sign[- ]?off|approvals?)\b/i.test(t)) {
        cur = null;
        continue;
      }
      cur = { title: t, paras: [], bullets: [] };
      out.push(cur);
      continue;
    }
    if (!cur) {
      cur = { title: "Overview", paras: [], bullets: [] };
      out.push(cur);
    }
    const b = /^(?:[-*+•●▪◦‣·–—>]|\d{1,2}[.)]|\[[ xX]?\])\s+(.*)$/.exec(line);
    if (b) cur.bullets.push(b[1].replace(/\*\*/g, "").trim());
    else cur.paras.push(line.replace(/\*\*/g, ""));
  }
  const idea = title || fileName.replace(/\.[a-z0-9]+$/i, "") || "Website";
  const base = localDraft(idea);
  const sections = out
    .filter((s) => s.paras.length || s.bullets.length)
    .slice(0, MAX_SECTIONS)
    .map((s, i) => ({
      title: s.title,
      purpose: "",
      content: s.paras.join(" ").slice(0, 1200),
      items: s.bullets.filter((b) => /^[^:]{2,60}:\s+\S/.test(b)).map((b) => ({ title: b.split(":")[0].trim(), text: b.slice(b.indexOf(":") + 1).trim() })),
      requirements: s.bullets.map((b) => ({ text: b, kind: looksFunctional(b) ? "functional" : "content" })),
      visual: { ...base.sections[Math.min(i, base.sections.length - 1)].visual, asset: i === 0 ? base.sections[0].visual.asset : "none" },
    }));
  const email = /[\w.+-]+@[\w-]+\.[\w.-]*\w/.exec(text)?.[0] ?? "";
  const phone = /\+?\d[\d\s().-]{7,}\d/.exec(text)?.[0] ?? "";
  return normalizePrd({ ...base, title: idea, idea, sections: sections.length ? sections : base.sections, contact: { ...base.contact, email, phone }, source: "document" }, idea, "document");
}

/** Words changed on the page flow back into the PRD, so the PRD stays the single source of truth. */
export function syncPrd(prd: Prd, content: WebsiteContent): Prd {
  const blocks = new Map((content.blocks ?? []).map((b) => [b.prd, b]));
  let changed = false;
  const sections = prd.sections.map((s) => {
    const b = blocks.get(s.id);
    if (!b) return s;
    const reqText = new Map(b.reqs.map((r) => [r.id, r.text]));
    const next: PrdSection = {
      ...s,
      title: b.heading || s.title,
      content: b.body,
      items: b.items.map((x) => ({ title: x.title, text: x.text, value: x.value })),
      requirements: s.requirements.map((r) => (reqText.get(r.id) && reqText.get(r.id) !== r.text ? { ...r, text: reqText.get(r.id)! } : r)),
      visual: { ...s.visual, asset: b.spec.hero.type, director: b.spec.director, secondary: b.spec.secondary, layout: b.spec.layout, background: b.spec.background.type, animation: b.spec.animation, subject: b.spec.hero.subject || s.visual.subject },
    };
    if (JSON.stringify(next) !== JSON.stringify(s)) changed = true;
    return next;
  });
  // The order on the page (reordered in the Page panel) is the PRD's order too.
  const order = ((content.sections ?? []) as string[]).filter((x) => x.startsWith("b-")).map((x) => x.slice(2));
  const ranked = order.length ? [...sections].sort((a, b) => (order.indexOf(a.id) < 0 ? 999 : order.indexOf(a.id)) - (order.indexOf(b.id) < 0 ? 999 : order.indexOf(b.id))) : sections;
  if (ranked.some((s, i) => s !== sections[i])) changed = true;
  return changed ? { ...prd, sections: ranked } : prd;
}

export { DIRECTOR_IDS };
