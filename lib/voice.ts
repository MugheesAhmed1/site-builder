// The words the rules write when no AI writer is free (no key, or the free tier is busy). A person's
// portfolio speaks as "I" about their own craft; a business speaks as "we" from its category. Only
// slots most templates share are written here (hero, nav, features, about, contact); everything else
// keeps the template's own words with the new name. Shared by the browser, the server and tests.

/** "a" or "an", by how the word sounds: "a UX designer", "an illustrator", "a 3D artist", "an SEO expert". */
export function article(word: string): "a" | "an" {
  return /^(?:[aeio]|u(?![nsr]i|se|x|i\b|ro)|8|11\b|18\b|hour|honest|heir|mba|seo|ngo|mri|fx|sfx|vfx|rn\b)/i.test(word.trim()) ? "an" : "a";
}

const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/** Crafts people name by their field ("photography portfolio") turned into the person. */
const FIELD_TO_PERSON: Record<string, string> = {
  photography: "photographer",
  illustration: "illustrator",
  animation: "animator",
  architecture: "architect",
  design: "designer",
  development: "developer",
  writing: "writer",
  music: "musician",
  art: "artist",
  modelling: "model",
  modeling: "model",
  videography: "videographer",
  filmmaking: "filmmaker",
};

const LEAD =
  /^(?:(?:my|our|a|an|the|new|personal|online|simple|modern|professional|creative|one[- ]page)\s+)*(?:portfolio|website|web\s?site|site|page|landing page|cv|resume|résumé|showcase)s?(?:\s+(?:website|site|page))?\s*(?:for|of|as|about|showing)?\s*(?:me\s*,?\s*)?(?:(?:a|an|the|my)\s+)?/i;

/**
 * The role a portfolio is for, in the person's own words: "Portfolio for a 3D motion designer called
 * Sara" gives "3D motion designer"; "my photography portfolio" gives "photographer". Empty if the
 * line names no role.
 */
export function roleOf(query: string): string {
  let s = query
    .trim()
    .replace(/\s*\b(?:called|named)\b.*$/i, "")
    .replace(/\s*,?\s*\b(?:in|at|from|near|based in)\s+[A-Z][\w-]*(?:\s+[A-Z][\w-]*)?\s*$/, "")
    .replace(LEAD, "")
    .replace(/^[A-Z][\w-]*'s\s+/, "")
    .replace(/\s+(?:portfolio|website|site|page|showcase)\s*$/i, "")
    .replace(/^(?:(?:a|an|the|my|i am|i'm)\s+)+/i, "")
    .replace(/[.!?]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (/^(?:me|myself|portfolio|personal|website|site)?$/i.test(s)) return "";
  const words = s.split(" ");
  const last = words[words.length - 1].toLowerCase();
  if (FIELD_TO_PERSON[last]) words[words.length - 1] = FIELD_TO_PERSON[last];
  s = words.join(" ");
  return s.length > 60 ? "" : s;
}

const FIRST_PERSON: [RegExp, string][] = [
  [/\b[Ww]e are\b/g, "I am"],
  [/\b[Ww]e were\b/g, "I was"],
  [/\b[Ww]e[’']re\b/g, "I'm"],
  [/\b[Ww]e[’']ve\b/g, "I've"],
  [/\b[Ww]e[’']ll\b/g, "I'll"],
  [/\b[Ww]e[’']d\b/g, "I'd"],
  [/\b[Ww]e\b/g, "I"],
  [/\bourselves\b/g, "myself"],
  [/\bOurs\b/g, "Mine"],
  [/\bours\b/g, "mine"],
  [/\bOur\b/g, "My"],
  [/\bour\b/g, "my"],
  [/\bUs\b/g, "Me"],
  [/\bus\b/g, "me"],
];

/**
 * A line written by a company ("Tell us what you need and we will reply") in one person's voice
 * ("Tell me what you need and I will reply"). "US" in capitals (the country) is left alone.
 */
export function firstPerson(s: string): string {
  return FIRST_PERSON.reduce((out, [re, to]) => out.replace(re, to), s);
}

/** The business type a portfolio borrows its colours, motion and template order from. */
export function portfolioBusiness(role: string): string {
  if (/youtub|influenc|stream|podcast|tiktok|vlog|blogger|newsletter|content creator/i.test(role)) return "creator";
  if (/develop|engineer|program|coder|stack|data|analyst|consult|coach|mentor|tutor|writer|copy|translat|account|market|lawyer|advis|manager|researcher/i.test(role)) return "consulting";
  return "photo";
}

interface Craft {
  re: RegExp;
  /** One plain line about the work, in the first person. */
  line: string;
  work: [string, string][];
}

/** What a few common crafts do, in plain words, for the "what I do" parts of a portfolio. */
const CRAFTS: Craft[] = [
  {
    re: /motion|animat|3d|vfx|cgi|blender|cinema 4d/i,
    line: "I make characters, products and ideas move, so people stop scrolling and look.",
    work: [
      ["3D animation", "Characters, products and little worlds that move with purpose."],
      ["Motion design", "Titles, explainers and loops for launches and brands."],
      ["Product visuals", "Clean renders and turntables that show every detail."],
    ],
  },
  {
    re: /\bux\b|\bui\b|product design|interaction|user experience/i,
    line: "I design products people understand at first glance and enjoy coming back to.",
    work: [
      ["Research", "Talking to real people before drawing a single screen."],
      ["Interface design", "Clear, accessible screens and the design systems behind them."],
      ["Prototyping", "Clickable flows to test an idea before it is built."],
    ],
  },
  {
    re: /develop|engineer|programm|coder|full.?stack|front.?end|back.?end|software/i,
    line: "I build fast, reliable software and explain it in plain words.",
    work: [
      ["Web apps", "Fast, accessible apps built with modern tools."],
      ["APIs and back ends", "Clean services that scale and stay simple."],
      ["Performance", "Pages that load fast on every phone."],
    ],
  },
  {
    re: /photo/i,
    line: "I take honest pictures of people, places and products, with light doing most of the work.",
    work: [
      ["Portraits", "Natural portraits for people and brands."],
      ["Events", "Candid pictures of the moments that matter."],
      ["Editing", "A consistent, timeless finish on every picture."],
    ],
  },
  {
    re: /video|film|cinemat|editor/i,
    line: "I make short films that tell one clear story and keep people watching.",
    work: [
      ["Brand films", "Short films with one clear idea at their heart."],
      ["Editing", "Pace, sound and colour that hold attention."],
      ["Social cuts", "Vertical edits made for every platform."],
    ],
  },
  {
    re: /illustrat|artist|painter|comic|character design/i,
    line: "I draw characters and worlds with a little wonder in them.",
    work: [
      ["Illustration", "Editorial, book and brand illustration."],
      ["Character design", "Characters with personality, ready to animate."],
      ["Commissions", "Original pieces, made to order."],
    ],
  },
  {
    re: /writ|copy|author|journalist|editor/i,
    line: "I write words that are clear, warm and hard to stop reading.",
    work: [
      ["Copywriting", "Words for sites, launches and campaigns."],
      ["Editing", "Sharper, shorter and clearer drafts."],
      ["Content strategy", "What to say, where and when."],
    ],
  },
  {
    re: /architect|interior/i,
    line: "I design spaces around how people really live and work.",
    work: [
      ["Concept design", "Ideas sketched, tested and refined."],
      ["Interiors", "Rooms planned around light, flow and use."],
      ["3D visualisation", "See it before it is built."],
    ],
  },
  {
    re: /brand|graphic|visual|logo|design/i,
    line: "I give ideas a clear, memorable look, from the logo to the last screen.",
    work: [
      ["Brand identity", "Logos, colour and type that belong together."],
      ["Campaigns", "Launch visuals for print, web and social."],
      ["Art direction", "One clear look, from idea to delivery."],
    ],
  },
  {
    re: /market|seo|growth|social media|ads/i,
    line: "I help good products find the people who need them.",
    work: [
      ["Strategy", "A plan with clear goals and simple numbers."],
      ["Campaigns", "Ads and content that earn attention."],
      ["Reporting", "What worked, what didn't, and what's next."],
    ],
  },
  {
    re: /coach|consult|mentor|tutor|teacher|trainer|advis/i,
    line: "I help people get unstuck, with honest advice and a clear plan.",
    work: [
      ["One-to-one sessions", "Focused time on what matters most to you."],
      ["Workshops", "Practical sessions for teams."],
      ["Reviews", "An honest look and a clear list of next steps."],
    ],
  },
];

const ANY_CRAFT: Craft = {
  re: /./,
  line: "I take on a few projects at a time and give each one my full attention.",
  work: [
    ["Selected work", "A few projects I'm proud of, with the story behind each."],
    ["Collaborations", "Working closely with teams, founders and other makers."],
    ["New projects", "Open to work that is ambitious, useful and kind."],
  ],
};

export const craftOf = (role: string): Craft => CRAFTS.find((c) => c.re.test(role)) || ANY_CRAFT;

export interface VoiceInput {
  kind: "website" | "portfolio";
  name: string;
  /** A portfolio's role ("3D motion designer"), or what the business is ("cosy bakery"). */
  what: string;
  city: string;
  audience: string;
  /** The main action the person chose. */
  cta: string;
  kicker: string;
  services: string[];
  process: { title: string; description: string }[];
  physical: boolean;
}

/** Words for one slot, or undefined to leave the slot to the other rules (and the template). */
export function voiceFor(key: string, example: string, v: VoiceInput): string | undefined {
  const where = v.city ? ` in ${v.city}` : "";
  const first = v.name.split(/\s+/)[0] || v.name;
  if (v.kind === "portfolio") {
    const role = v.what || "creative";
    const craft = craftOf(role);
    const a = `${article(role)} ${lowerFirst(role)}`;
    const item = /\.(\d+)\./.exec(key);
    const n = item ? Number(item[1]) : -1;
    if (key === "seo.title") return `${v.name} | ${upperFirst(role)}`;
    if (key === "seo.description") return `${v.name}, ${a}${where}. Selected work, a little about me and how to start a project together.`;
    if (/^hero\.(?:title|headline)$/.test(key)) return `${v.name}, ${lowerFirst(role)}.`;
    if (key === "hero.line1") return `${v.name}.`;
    if (key === "hero.line2") return `${upperFirst(role)}.`;
    if (/^hero\.(?:kicker|eyebrow|label)$/.test(key) || /^(?:brand\.)?tagline$/.test(key)) return `Portfolio${v.city ? ` · ${v.city}` : ""}`;
    if (/^hero\.(?:text|sub|caption1?|description|intro)$/.test(key)) return `I'm ${a}${where}. ${craft.line}`;
    if (/^hero\.(?:button|cta)$/.test(key) || key === "nav.cta") return v.cta || "Work with me";
    if (/^hero\.(?:cta2|secondary|button2)$/.test(key)) return "See my work";
    if (key === "hero.tags") return craft.work.map(([w]) => w).join(", ");
    if (/^nav\.links\.\d+\.label$/.test(key)) {
      if (/what we do|services|our work|work|projects|portfolio|case|showcase|gallery/i.test(example)) return "Work";
      if (/about|story|studio|team|who/i.test(example)) return "About";
      if (/contact|touch|hello|book|enquir/i.test(example)) return "Contact";
      return undefined;
    }
    if (key === "intro.text") return `I'm ${first}. ${craft.line}`;
    if (/^(?:features|services|work)\.kicker$/.test(key)) return "What I do";
    if (/^(?:features|services|work)\.title$/.test(key)) return `${upperFirst(role)}, start to finish`;
    if (n >= 0 && n < craft.work.length && /^(?:features|services)\.items\.\d+\.(?:title|name)$/.test(key)) return craft.work[n][0];
    if (n >= 0 && n < craft.work.length && /^(?:features|services)\.items\.\d+\.(?:text|description|summary)$/.test(key)) return craft.work[n][1];
    if (key === "about.kicker") return "About me";
    if (key === "about.title") return `Hi, I'm ${first}`;
    if (key === "about.text") return `I'm ${v.name}, ${a}${where}. ${ANY_CRAFT.line} I care about the details nobody asks for.`;
    if (key === "contact.kicker") return "Contact";
    if (key === "contact.title") return "Let's work together";
    if (key === "contact.text") return "Tell me about your project, your timeline and your budget. I read every message myself.";
    if (key === "contact.button") return "Write to me";
    return undefined;
  }

  // A business: only the slots whose example would read wrong for someone else.
  const what = lowerFirst(v.what);
  const item = /\.(\d+)\./.exec(key);
  const n = item ? Number(item[1]) : -1;
  if (key === "nav.cta" && v.cta) return v.cta;
  if (key === "intro.text") return `${upperFirst(v.kicker.replace(/\.$/, ""))}, for ${lowerFirst(v.audience.replace(/\.$/, ""))}.`;
  if (key === "hero.tags" && v.services.length) return v.services.slice(0, 4).map((x) => x.split(/\s+(?:and|or|for|&)\s+/)[0]).join(", ");
  if (/^features\.kicker$/.test(key) && v.process.length >= 3) return "How it works";
  if (/^features\.title$/.test(key) && v.process.length >= 3) return "Three simple steps";
  if (n >= 0 && n < Math.min(3, v.process.length) && /^features\.items\.\d+\.title$/.test(key)) return v.process[n].title;
  if (n >= 0 && n < Math.min(3, v.process.length) && /^features\.items\.\d+\.text$/.test(key)) return v.process[n].description;
  if (key === "about.title") return `About ${v.name}`;
  if (key === "about.text" && v.services.length >= 3)
    return `${v.name} is ${article(what)} ${what}${where}. We focus on ${v.services.slice(0, 3).map(lowerFirst).join(", ").replace(/, ([^,]*)$/, " and $1")}, and we do them properly.`;
  if (key === "contact.title") return v.physical ? `Visit or write to ${v.name}` : `Talk to ${v.name}`;
  if (key === "contact.text") return "Tell us what you need and we'll get back to you soon.";
  return undefined;
}
