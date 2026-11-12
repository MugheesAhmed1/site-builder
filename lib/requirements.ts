import { CATEGORIES, categoryById, classify } from "./categories";
import { composeWebsite } from "./compose";
import { fromBrandColour, personalDesign } from "./designs";
import { TONE_MOOD, defaultAnswers } from "./questions";
import { keepCast, newProject } from "./store";
import { cap, sentences } from "./text";
import type { Project } from "./types";

// Turns a requirements document (a PRD, a BRD or a plain website brief) into the answers the
// website builder asks for. It is all rules: the text is split into sections by its headings,
// each heading is matched to what it is about (features, pricing, audience and so on), and
// lists, tables and "Key: value" lines are read out of each section. No AI and no network:
// the same document always gives the same site, and everything stays editable afterwards.

type Role =
  | "tagline" | "faq" | "pricing" | "process" | "testimonials" | "tone" | "team" | "clients" | "pages" | "cta" | "stats" | "usp"
  | "stories" | "audience" | "features" | "contact" | "visit" | "goals" | "problem" | "solution" | "about" | "services" | "ignore" | "";

interface Item {
  name: string;
  text: string;
  raw: string;
  subs: string[];
  cells?: string[];
  header?: string[];
}
type Entry = { kind: "item"; item: Item } | { kind: "para"; text: string };
interface Section {
  title: string;
  role: Role;
  level: number;
  entries: Entry[];
}

export interface BriefFinding {
  id: string; // the answer it fills
  label: string;
  value: string; // a short, readable summary of what was read
  from: string; // where in the document it came from
}

export interface Brief {
  fileName: string;
  title: string;
  words: number;
  sections: number;
  category: string;
  answers: Record<string, string>; // every answer: what was read, over the usual suggestions for this kind of business
  read: Record<string, string>; // only what was read from the document
  found: BriefFinding[];
  missing: string[];
  pages: string[];
  brandColour: string;
}

// Order matters: the first match wins, so the narrow meanings come before the broad ones.
const ROLES: [Role, RegExp][] = [
  ["ignore", /\b(out of scope|not in scope|non[- ]?functional|technical|tech(nology)? stack|architecture|risks?|assumptions?|constraints?|dependenc\w+|timeline|milestones?|roadmap|schedule|budget|appendi\w+|revisions?|version history|change ?log|glossary|stakeholders?|approvals?|sign[- ]?off|open (questions|issues)|competit\w+|analytics|tracking|acceptance criteria|release( plan)?|document (control|history|info\w*)|references|security|performance|accessibility|seo|integrations?|hosting|maintenance|testing|table of contents|contents|future( work| enhancements?| phases?)?|phase (2|two|ii))\b/],
  ["tagline", /\b(tag ?line|slogan|value proposition|elevator pitch|one[- ]?liner|headline|positioning( statement)?|hero (message|headline|copy|text)|key message)\b/],
  ["faq", /\b(faqs?|frequently asked|common questions|questions (and|&) answers|q ?& ?a)\b/],
  ["pricing", /\b(pricing|price list|prices|plans?|packages?|monetis\w+|monetiz\w+|revenue model|subscriptions?|tiers|rates|fees|memberships?)\b/],
  ["process", /\b(how it works|user (flow|journey)s?|process|workflow|customer journey|onboarding|getting started|how to (order|book|start|join)|steps)\b/],
  ["testimonials", /\b(testimonials?|reviews?|what (our )?(customers|clients|people|users|patients|guests|members) (say|are saying)|social proof|kind words)\b/],
  ["tone", /\b(tone|voice|brand (personality|guidelines?|identity|voice|feel)|look (and|&) feel|style( guide)?|design (direction|guidelines?|principles|requirements?|language|preferences?|notes)|visual (design|identity|style)|branding|aesthetics?|mood)\b/],
  ["team", /\b(team|founders?|leadership|our people|staff|our doctors|instructors|trainers)\b/],
  ["clients", /\b(clients|partners|trusted by|brands we)\b/],
  ["pages", /\b(pages|site ?map|site structure|navigation|information architecture|page structure|website structure|content (structure|outline|requirements?))\b/],
  ["cta", /\b(calls? to action|cta|conversion goals?|primary action|main action|desired action)\b/],
  ["stats", /\b(key (numbers|stats|figures|facts)|by the numbers|in numbers|traction|achievements|track record|at a glance|our impact|proof points)\b/],
  ["usp", /^why\b|\b(why (us|choose)|unique selling|usps?|differentiat\w+|benefits|what makes us|what sets us|our promise|our values|values|advantages)\b/],
  ["stories", /\buser stor(y|ies)\b/],
  ["audience", /\b(target (audience|users?|market|customers?|segments?)|audience|personas?|who (is it|it'?s|we) (for|serve)|user segments|customer segments|ideal customers?)\b|^(end )?(users|customers)$/],
  ["features", /\b(features?|functional requirements?|functionality|capabilit\w+|modules)\b/],
  ["contact", /\b(contact|get in touch|reach us|social( media)?( links)?)\b/],
  ["visit", /\b(location|address|opening hours|hours|where to find|visit us|find us)\b/],
  ["goals", /\b(goals?|objectives?|success (metrics|criteria)|kpis?|metrics|outcomes)\b/],
  ["problem", /\b(problem|pain points?|challenges?|opportunity|user needs)\b/],
  ["solution", /\b(solution|proposed|approach|the idea|concept)\b/],
  ["about", /\b(overview|summary|introduction|intro|background|about|purpose|vision|mission|description|context|our story|story|who we are)\b/],
  ["services", /\b(services?|offerings?|what we (offer|do)|menu|products?|treatments|classes|programs|programmes|courses|practice areas|rooms|requirements?|scope|deliverables)\b/],
];

// Sections whose lists are things to show one by one.
const ITEM_ROLES = new Set<Role>(["features", "services", "stories", "pricing", "process", "faq", "team", "testimonials", "usp", "stats", "audience", "pages", "clients"]);
// A deeper heading with one of these meanings starts its own section even inside a list section.
const BREAKOUT = new Set<Role>(["ignore", "features", "stories", "faq", "testimonials", "goals", "pages"]);

const KEYS: [string, RegExp][] = [
  ["meta", /^(author|prepared by|written by|owner|document owner|product owner|version|date|status|last updated|updated|reviewers?|approved by|created( by)?|contact person|project manager|pm)$/],
  ["name1", /^(company|business|brand|client|organi[sz]ation|restaurant|clinic|shop|store|studio|agency|firm|practice)( name)?$/],
  ["name2", /^(product|app|application|website|site|service|platform)( name)?$|^name$/],
  ["name3", /^project( name| title)?$/],
  ["tagline", /^(tag ?line|slogan|headline|value proposition|one[- ]?liner|elevator pitch|hero headline)$/],
  ["what", /^(industry|business type|type of business|category|sector|offering|what we (offer|do)|product type|niche)$/],
  ["city", /^(city|location|based in|area|region|service area|areas? served|town)$/],
  ["address", /^(address|street address|office address|headquarters|hq)$/],
  ["audience", /^(target (audience|users?|market|customers?)|audience|customers|users)$/],
  ["tone", /^(tone|tone of voice|voice|style|brand (voice|personality|tone)|look and feel|mood|feel|design style)$/],
  ["cta", /^((primary |main )?(cta|call to action|action)|conversion goal)$/],
  ["email", /^(e-?mail|contact e-?mail|support e-?mail|e-?mail address)$/],
  ["phone", /^(phone|tel|telephone|mobile|contact number|phone number|call)$/],
  ["whatsapp", /^whats ?app( number)?$/],
  ["instagram", /^instagram$/],
  ["facebook", /^facebook$/],
  ["hours", /^(opening hours|hours|open|timings|business hours|working hours)$/],
  ["pages", /^(pages|site ?map|navigation|sections)$/],
  ["colour", /^((primary|brand|accent|main) )?colou?rs?$/],
  ["clients", /^(clients|partners|trusted by)$/],
  ["about", /^(about|description|summary|overview|mission|vision)$/],
];

const BULLET = /^(?:[-*+•●▪◦‣·–—>]|\d{1,2}[.)]|[a-zA-Z][.)]|\[[ xX]?\])\s+(.*)$/;
const PRICE = /(?:(?:rs\.?|pkr|usd|eur|gbp|aed|inr|sar|cad|aud|\$|£|€|₹|₨)\s?\d[\d,.]*\s?k?|\d[\d,.]*\s?k?\s?(?:rs|pkr|usd|eur|gbp|aed|inr|sar|dollars|rupees|euros|pounds)\b|\bfree\b)/i;
const PERIOD = /(?:\b(?:per|a|an|each|every)\s+|\/\s?)(month|mo|year|yr|week|day|session|user|seat|person|hour|night|visit|project|class|order|item|head|guest)\b|\b(monthly|yearly|annually|annual|weekly|one[- ]time|once|lifetime)\b/i;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]*\w/;
const PHONE = /\+?\d[\d\s().-]{7,}\d/;

function clean(s: string): string {
  return s
    .replace(/<[^>]{1,80}>/g, " ")
    .replace(/!?\[([^\]]*)\]\(([^)]*)\)/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(^|[\s(])[*_]([^*_\s][^*_]*?)[*_](?=[\s).,;:!?]|$)/g, "$1$2")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const cell = (s: string) => s.replace(/\s*\|\s*/g, " / ").replace(/\s+/g, " ").trim();
const noStop = (s: string) => s.replace(/[\s.;:,]+$/, "");
const lowerFirst = (s: string) => (s && /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);

function roleOf(title: string): Role {
  const t = title
    .toLowerCase()
    .replace(/^[\d.)\s]+/, "")
    .replace(/[^a-z0-9&' -]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return "";
  for (const [role, re] of ROLES) if (re.test(t)) return role;
  return "";
}

function keyOf(key: string): string {
  const k = key.toLowerCase().replace(/[^a-z0-9 -]+/g, " ").replace(/\s+/g, " ").trim();
  for (const [id, re] of KEYS) if (re.test(k)) return id;
  return "";
}

// "Name: text", "Name - text", "**Name** text" or "Question? answer" into its two halves.
function splitItem(raw: string): { name: string; text: string } {
  const bold = /^(\*\*|__)(.+?)\1\s*[:.–—-]*\s*(.*)$/.exec(raw);
  if (bold && wordCount(bold[2]) <= 10) return { name: noStop(clean(bold[2])), text: clean(bold[3]) };
  const s = clean(raw);
  const q = /^(.{6,160}?\?)\s+(.+)$/.exec(s);
  if (q) return { name: q[1], text: q[2] };
  const m = /^(.{2,80}?)\s*(?:[:：]\s+|\s[-–—]\s+)(.+)$/.exec(s);
  if (m && wordCount(m[1]) <= 9 && !/^https?$/i.test(m[1])) return { name: m[1].trim(), text: m[2].trim() };
  return { name: s, text: "" };
}

interface Heading {
  title: string;
  level: number;
}

function headingOf(l: string, next: string, prevBlank: boolean, prev: string): Heading | null {
  const md = /^(#{1,6})\s+(.+?)\s*#*$/.exec(l);
  if (md) return { title: clean(md[2]).replace(/:$/, ""), level: md[1].length };
  if (l.startsWith("|")) return null;
  const bold = /^(\*\*|__)(.+?)\1:?$/.exec(l);
  if (bold && wordCount(bold[2]) <= 10) return { title: clean(bold[2]).replace(/:$/, ""), level: 7 };
  if (/^={3,}$/.test(next) && l.length <= 90) return { title: clean(l), level: 1 };
  if (/^-{3,}$/.test(next) && l.length <= 90 && !BULLET.test(l)) return { title: clean(l), level: 2 };
  const deep = /^(\d+(?:\.\d+)+)\.?\s+(\S.{1,70})$/.exec(l);
  if (deep && !/[.;,]$/.test(deep[2]) && wordCount(deep[2]) <= 9) return { title: clean(deep[2]).replace(/:$/, ""), level: deep[1].split(".").length + 1 };
  const num = /^(\d{1,2})[.)]\s+(.{2,60})$/.exec(l);
  if (num) {
    const t = clean(num[2]).replace(/:$/, "");
    const listed = /^\d{1,2}[.)]\s/.test(next) || /^\d{1,2}[.)]\s/.test(prev);
    if (!listed && !/[.;,?]$/.test(t) && wordCount(t) <= 6 && roleOf(t)) return { title: t, level: 2 };
    return null;
  }
  if (BULLET.test(l)) return null;
  const plain = clean(l);
  const words = wordCount(plain);
  if (words > 6 || plain.length > 50 || plain.length < 3) return null;
  const caps = /^[A-Z0-9 &/'’-]+$/.test(plain) && /[A-Z]{3}/.test(plain);
  if (caps) return { title: cap(plain.toLowerCase()), level: 2 };
  if (/^[A-Z]/.test(plain) && !/[.;,!?]$/.test(plain) && (plain.endsWith(":") || prevBlank) && roleOf(plain.replace(/:$/, ""))) return { title: plain.replace(/:$/, ""), level: 2 };
  return null;
}

function rowToItem(cells: string[], header: string[] | undefined): Item {
  const col = (re: RegExp) => (header ? header.findIndex((h) => re.test(h.toLowerCase())) : -1);
  const idLike = (s: string) => /^([A-Z]{1,4}[-\s]?)?\d+(\.\d+)*\.?$/.test(s.trim());
  let n = col(/feature|name|requirement|title|item|service|module|plan|package|tier|step|question|page|member|product|dish|treatment|class|course/);
  if (n < 0 || !cells[n]) n = cells.findIndex((c) => c && !idLike(c));
  let d = col(/desc|detail|summary|notes?|what|answer|bio|about|includes?|benefit/);
  if (d < 0 || d === n) d = cells.findIndex((c, i) => i > n && c && !idLike(c) && wordCount(c) > 1);
  const name = cells[n] ?? "";
  const text = d >= 0 ? (cells[d] ?? "") : "";
  return { name: clean(name), text: clean(text), raw: cells.join(" - "), subs: [], cells: cells.map(clean), header: header?.map((h) => clean(h).toLowerCase()) };
}

interface Parsed {
  title: string;
  sections: Section[];
  kv: Record<string, { value: string; from: string }[]>;
  metaText: string;
}

function parse(text: string): Parsed {
  const lines = text.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ").slice(0, 400_000).split("\n");
  const sections: Section[] = [];
  const kv: Parsed["kv"] = {};
  let title = "";
  let metaText = "";
  let cur: Section = { title: "", role: "", level: 0, entries: [] };
  sections.push(cur);
  let openItem: Item | null = null; // a sub-heading that became an item; what follows belongs to it
  let lastItem: Item | null = null;
  let listIndent = 0;
  let prevKind: "blank" | "item" | "para" | "other" = "blank";
  let table: string[][] = [];
  let seenText = false;

  const record = (key: string, value: string) => {
    const id = keyOf(key);
    if (!id) return "";
    if (id === "meta") {
      metaText += " " + value;
      return id;
    }
    (kv[id] ??= []).push({ value: clean(value), from: cur.title || "the top of the document" });
    return id;
  };

  const flushTable = () => {
    if (!table.length) return;
    const rowsIn = table;
    table = [];
    const isRule = (r: string[]) => r.every((c) => /^:?-{2,}:?$/.test(c) || c === "");
    let header: string[] | undefined;
    let body = rowsIn;
    if (rowsIn.length > 1 && isRule(rowsIn[1])) {
      header = rowsIn[0];
      body = rowsIn.slice(2);
    } else if (rowsIn[0].every((c) => wordCount(c) <= 3) && rowsIn[0].some((c) => /^(feature|name|description|priority|price|plan|requirement|id|role|page|question|answer|step|details?|item|service)s?$/i.test(c.trim()))) {
      header = rowsIn[0];
      body = rowsIn.slice(1);
    }
    for (const r of body) {
      if (isRule(r) || !r.some(Boolean)) continue;
      // A two column table with no real header is usually "Key | value".
      if (r.length === 2 && !ITEM_ROLES.has(cur.role) && record(r[0], r[1])) continue;
      const item = rowToItem(r, header);
      if (item.name) cur.entries.push({ kind: "item", item });
    }
    lastItem = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].replace(/\t/g, "    ");
    const l = rawLine.trim();
    const indent = rawLine.length - rawLine.trimStart().length;
    if (!l) {
      flushTable();
      prevKind = "blank";
      continue;
    }
    if (/^(={3,}|-{3,}|_{3,}|\*{3,})$/.test(l)) continue;
    // A line that is only a bracketed prompt, as in an unfilled template, says nothing.
    if (!/[A-Za-z0-9]/.test(l) || (/^[^:]{1,34}:$/.test(l) && keyOf(l.slice(0, -1)))) {
      prevKind = "other";
      continue;
    }
    if (!l.startsWith("#") && /\(.*\)/.test(l) && l.replace(/^[^:(]{1,34}:/, "").replace(/\([^)]*\)/g, "").replace(/[^A-Za-z]/g, "").length < 3) {
      prevKind = "other";
      continue;
    }

    if (l.startsWith("|") && l.indexOf("|", 1) > 0) {
      table.push(l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
      prevKind = "other";
      continue;
    }
    flushTable();

    let next = "";
    for (let j = i + 1; j < lines.length && j < i + 4; j++) if (lines[j].trim()) { next = lines[j].trim(); break; }
    let prev = "";
    for (let j = i - 1; j >= 0 && j > i - 4; j--) if (lines[j].trim()) { prev = lines[j].trim(); break; }
    const h = headingOf(l, next, prevKind === "blank", prev);
    if (h && h.title) {
      const role = roleOf(h.title);
      prevKind = "other";
      lastItem = null;
      if (!seenText && !title && (h.level === 1 || !role || /requirements?|prd|brd|brief|proposal|spec/i.test(h.title))) {
        title = h.title;
        seenText = true;
        continue;
      }
      seenText = true;
      const deeper = h.level > cur.level && cur.level > 0;
      const breakout = BREAKOUT.has(role) && wordCount(h.title) <= 3;
      if (deeper && ITEM_ROLES.has(cur.role) && !breakout) {
        openItem = { name: noStop(h.title), text: "", raw: h.title, subs: [] };
        cur.entries.push({ kind: "item", item: openItem });
        continue;
      }
      if (deeper && !role && cur.role && cur.role !== "ignore") continue; // an unknown sub-heading stays with its parent
      openItem = null;
      cur = { title: h.title, role: deeper && cur.role === "ignore" && !role ? "ignore" : role, level: h.level, entries: [] };
      sections.push(cur);
      continue;
    }

    if (!seenText && !title && wordCount(l) <= 14 && !/[.!?]$/.test(l) && !BULLET.test(l) && !/^[^:]{1,32}:\s+\S/.test(l)) {
      title = clean(l);
      seenText = true;
      prevKind = "other";
      continue;
    }
    seenText = true;

    const b = BULLET.exec(l);
    if (b) {
      const body = b[1].replace(/^\[[ xX]?\]\s+/, "");
      const pair = splitItem(body);
      const id = pair.text ? keyOf(pair.name) : "";
      if (id && !ITEM_ROLES.has(cur.role)) {
        record(pair.name, pair.text);
        prevKind = "other";
        continue;
      }
      if (openItem) {
        openItem.subs.push(clean(body));
      } else if (lastItem && indent > listIndent) {
        lastItem.subs.push(clean(body));
      } else {
        lastItem = { ...pair, raw: body, subs: [] };
        listIndent = indent;
        cur.entries.push({ kind: "item", item: lastItem });
      }
      prevKind = "item";
      continue;
    }

    const pairLine = /^((?:\*\*|__)?[A-Za-z][A-Za-z0-9 /&'()-]{0,34}?(?:\*\*|__)?)\s*[:：](?:\*\*|__)?\s+(\S.*)$/.exec(l);
    if (pairLine) {
      const key = clean(pairLine[1]);
      const id = record(key, pairLine[2]);
      if (id) {
        prevKind = "other";
        continue;
      }
      if (ITEM_ROLES.has(cur.role) && !openItem && wordCount(key) <= 6 && prevKind !== "para") {
        lastItem = { name: key, text: clean(pairLine[2]), raw: l, subs: [] };
        listIndent = -1;
        cur.entries.push({ kind: "item", item: lastItem });
        prevKind = "item";
        continue;
      }
    }

    const t = clean(l);
    if (!t) continue;
    if (openItem) {
      openItem.text = (openItem.text + " " + t).trim();
    } else if (prevKind === "item" && lastItem && !lastItem.cells) {
      // A wrapped line (common in PDFs) continues the list item above it.
      lastItem.raw += " " + l;
      const again = splitItem(lastItem.raw);
      lastItem.name = again.name;
      lastItem.text = again.text;
      continue;
    } else {
      const last = cur.entries[cur.entries.length - 1];
      if (prevKind === "para" && last?.kind === "para" && !/^[“"«]/.test(t)) last.text += " " + t;
      else cur.entries.push({ kind: "para", text: t });
    }
    prevKind = "para";
  }
  flushTable();
  return { title, sections: sections.filter((s) => s.entries.length || s.title), kv, metaText };
}

// ---- Reading values out of the sections ------------------------------------------------

const REQ_LEAD = /^(?:the\s+)?(?:system|site|website|web ?app|app|application|platform|product|solution|page|users?|customers?|visitors?|admins?|administrators?|clients?|members?|patients?|guests?|owners?|staff|buyers?|shoppers?)(?:\s+\w+)?\s+(?:shall|must|should|will|can|may|needs? to|(?:is|are|shall be|must be|should be|will be) able to)(?:\s+be able to)?\s+(?:also\s+)?/i;
const ALLOW_LEAD = /^(?:to\s+)?(?:allow|enable|let|permit|provide|give|offer|support)s?\s+(?:the\s+|a\s+|an\s+)?(?:users?|customers?|visitors?|clients?|members?|patients?|guests?|admins?|owners?|staff|people|shoppers?)\s+(?:with\s+)?(?:(?:the\s+)?ability\s+)?(?:to\s+)?/i;
const ID_LEAD = /^(?:(?:FR|NFR|REQ|RQ|US|UC|F|R|BR|P)[-\s]?\d+(?:\.\d+)*|\d+(?:\.\d+)+)\s*[:.)–-]?\s*/i;
const PRIORITY = /\s*[([](?:p[0-3]|must(?:[- ]have)?|should(?:[- ]have)?|could(?:[- ]have)?|won'?t(?:[- ]have)?|nice[- ]to[- ]have|high|medium|low|mvp|phase\s?\d|v\d)(?:\s+priority)?[)\]]\s*/gi;

function priorityOf(s: string): number {
  const t = s.toLowerCase();
  if (/\b(won'?t|out of scope|not in scope|later|future|phase\s?[2-9]|v[2-9]|p3|backlog)\b/.test(t)) return 3;
  if (/\b(could|nice[- ]to[- ]have|low|p2|optional)\b/.test(t)) return 2;
  if (/\b(should|medium|p1)\b/.test(t)) return 1;
  return 0;
}

// A short title out of a longer sentence: the first two to five words, stopping at a joining word.
function shortName(s: string, max = 5): string {
  const words = noStop(s).split(/\s+/);
  if (words.length <= max) return cap(words.join(" "));
  const out: string[] = [];
  for (const w of words) {
    if (out.length >= 2 && /^(and|with|so|for|by|via|using|through|from|that|which|when|where|while|including|across|without|on|in|at|to|or)$/i.test(w)) break;
    out.push(w);
    if (/[,;:]$/.test(w) || out.length >= max) break;
  }
  return cap(noStop(out.join(" ")));
}

function featureOf(item: Item): { name: string; text: string; price: string; priority: number } {
  const whole = [item.raw, ...(item.cells ?? [])].join(" ");
  const priority = priorityOf(/[([]/.test(whole) || item.cells ? whole : "");
  const strip = (s: string) => clean(s).replace(PRIORITY, " ").replace(ID_LEAD, "").replace(/\s+/g, " ").trim();
  let name = strip(item.name);
  let text = strip(item.text);
  // In a table the priority sits in its own column; keep it out of the description.
  if (item.cells && /^(p[0-3]|must|should|could|won'?t|high|medium|low)\b.{0,12}$/i.test(text)) text = "";
  if (!name && text) [name, text] = [text, ""];
  const story = /^as an?\s+(.+?),?\s+i\s+(?:want|need|would like|wish|can)(?:\s+to)?\s+(.+?)(?:,?\s+so\s+(?:that\s+)?(.+))?$/i.exec(name + (text ? " " + text : ""));
  if (story) {
    name = story[2];
    text = story[3] ? "So " + noStop(story[3]) + "." : "";
  }
  const before = name;
  name = name.replace(REQ_LEAD, "").replace(ALLOW_LEAD, "");
  const sentence = before !== name || wordCount(name) > 7;
  if (!text && item.subs.length) text = item.subs.slice(0, 3).map(noStop).join(". ") + ".";
  if (sentence) {
    const full = cap(noStop(name)) + ".";
    const short = shortName(name);
    if (!text && short.length < full.length - 1) text = full;
    name = short;
  }
  let price = "";
  const pm = PRICE.exec(text) ?? PRICE.exec(name);
  const lead = new RegExp("^(?:from\\s+|starting at\\s+|starts at\\s+)?" + PRICE.source + "(?:\\s*(?:" + PERIOD.source + "))?", "i").exec(text);
  if (lead && wordCount(text) > 6) {
    price = cap(noStop(lead[0]));
    text = text.slice(lead[0].length).replace(/^[\s.,;:–-]+/, "");
  } else if (pm && wordCount(text) <= 6) {
    price = (text.match(new RegExp(PRICE.source + "(?:\\s*(?:" + PERIOD.source + "))?", "i"))?.[0] ?? pm[0]).trim();
    text = noStop(text.replace(price, "").replace(/^[\s,;:–-]+|[\s,;:–-]+$/g, ""));
    name = noStop(name.replace(price, "").replace(/[\s,;:–-]+$/g, ""));
  }
  return { name: cap(noStop(name)), text: text ? cap(text) : "", price, priority };
}

function nameFromTitle(title: string): string {
  const s = title
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(?:product|business|software|website|web|marketing|functional|project)?\s*requirements?\s*(?:document|doc|specification|spec)?s?\b/gi, " | ")
    .replace(/\b(?:PRD|BRD|SRS|MRD|FRD)\b/g, " | ")
    .replace(/\b(?:creative |project |website |design |client |product )?(?:brief|proposal|specification|spec sheet|one[- ]pager)\b/gi, " | ")
    .replace(/\b(?:v|version)\s?\d+(?:\.\d+)*\b/gi, " ")
    .replace(/\b(?:draft|final|document)\b/gi, " ");
  const generic = /(?:\s|^)(?:official |new |company |business |marketing )?(?:website|web ?site|site|web ?app|mobile app|app|application|platform|landing page|portal|mvp|redesign|relaunch|rebuild|launch|project|online presence)$/i;
  const parts = s
    .split(/\s*[:|–—]\s*|\s+-\s+|\bfor\b/i)
    .map((p) => {
      let x = p.replace(/\s+/g, " ").trim().replace(/^(?:the|a|an|new|our)\s+/i, "");
      while (generic.test(x)) x = x.replace(generic, "").trim();
      return x.replace(/[’']s$/, "");
    })
    .filter((p) => p && wordCount(p) <= 6 && /[A-Za-z]/.test(p));
  return parts[parts.length - 1] ?? "";
}

const NOT_A_NAME = /^(this|it|the|our|we|there|here|that|what|who|these|those|each|every|all|any|one|he|she|they|goal|product|website|site|app|platform|project|document|success|pricing|design|content|user|users|customer|customers)$/i;

function join(list: string[]): string {
  return list.length <= 1 ? (list[0] ?? "") : list.slice(0, -1).join(", ") + " and " + list[list.length - 1];
}

const TONE_WORDS: [string, RegExp][] = [
  ["Calm and minimal", /\b(minimal\w*|clean|calm|simple|uncluttered|quiet|soft|serene|airy|white ?space|understated|soothing|spacious)\b/gi],
  ["Warm and friendly", /\b(warm|friendly|welcoming|approachable|playful|fun|cosy|cozy|inviting|homely|cheerful|caring|human|neighbou?rly)\b/gi],
  ["Bold and loud", /\b(bold|loud|energetic|vibrant|punchy|striking|daring|high[- ]energy|edgy|dynamic|powerful|colou?rful|confident)\b/gi],
  ["Classic and editorial", /\b(classic|editorial|elegant|premium|luxur\w+|sophisticated|timeless|refined|high[- ]end|traditional|serif|magazine|authoritative|heritage)\b/gi],
  ["Modern and technical", /\b(modern|technical|tech|sleek|futuristic|innovative|cutting[- ]edge|digital|developer|precise|data[- ]driven|corporate|professional)\b/gi],
];

function toneOf(text: string): string {
  let best = { tone: "", n: 0 };
  for (const [tone, re] of TONE_WORDS) {
    const n = text.match(re)?.length ?? 0;
    if (n > best.n) best = { tone, n };
  }
  return best.tone;
}

const CTAS: [string, RegExp][] = [
  ["Message on WhatsApp", /whats ?app/],
  ["Book a demo", /\bdemo\b/],
  ["Start a free trial", /free trial|start (a |your )?trial/],
  ["Book a call", /book (a |an )?(discovery |intro |free )?call|schedule (a |an )?call/],
  ["Book an appointment", /appointment|book (a |an )?(visit|consultation|table|session|class|slot|room|stay)|reserv|booking/],
  ["Get a quote", /quote|estimate/],
  ["Get started", /sign[- ]?up|register|create (an )?account|get started|wait ?list|\bjoin\b/],
  ["See the menu", /\bmenu\b/],
  ["Shop now", /\b(shop|buy|order|purchase|cart|checkout)\b/],
  ["Call us", /\b(call|phone)\b/],
  ["Get in touch", /contact|enquir|inquir|get in touch|message/],
];

// The action named first in the text wins: "start a free trial, or book a demo" is a trial.
function ctaOf(text: string): string {
  const t = text.toLowerCase();
  let best = { label: "", at: Infinity };
  if (CTAS[0][1].test(t)) return CTAS[0][0];
  for (const [label, re] of CTAS.slice(0, -2)) {
    const at = t.search(re);
    if (at >= 0 && at < best.at) best = { label, at };
  }
  // Calling and getting in touch are the fallback when nothing more specific is asked for.
  return best.label || CTAS.slice(-2).find(([, re]) => re.test(t))?.[0] || "";
}

// Words that say little about the kind of business when they turn up in the body of a
// requirements document ("the product", "the design"), so they only count near the top.
const LOOSE = new Set(["design", "development", "media", "brand", "product", "tool", "platform", "dashboard", "api", "bar", "video", "community", "trust", "event", "events", "lab", "software", "marketing", "seo", "store", "shop", "app", "homes", "interior", "film", "courses", "classes", "travel", "cleaning", "health", "food", "coach", "coaching", "studio", "startup", "car", "cat", "dog", "law", "tour", "tours", "extension", "emergency", "school", "builder", "auto", "legal", "artist", "foundation", "workshop", "dealer", "surgery", "holiday", "painter", "mentor", "advisor", "therapy", "medical", "animal", "pet", "pets", "kitchen", "hair", "trainer", "freelance", "freelancer", "party", "venue", "wedding", "planner", "conference", "decor", "tutor", "institute", "academy", "college", "fashion", "clothing", "furniture"]);

function categoryOf(head: string, body: string, hint: string): string {
  if (hint) {
    const c = classify(hint);
    if (c.kind === "website" && c.category !== "general") return c.category;
  }
  const h = " " + head.toLowerCase() + " ";
  const b = " " + body.toLowerCase() + " ";
  let best = { id: "general", score: 0 };
  for (const c of CATEGORIES) {
    let score = 0;
    for (const k of c.keywords) {
      const re = new RegExp("\\b" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "s?\\b", "g");
      const inHead = h.match(re)?.length ?? 0;
      const inBody = LOOSE.has(k) ? 0 : (b.match(re)?.length ?? 0);
      score += (Math.min(inHead, 3) * 4 + Math.min(inBody, 4)) * Math.sqrt(k.length);
    }
    if (score > best.score) best = { id: c.id, score };
  }
  // Software has its own tells that the keyword list does not cover.
  const soft = new Set(b.match(/\b(saas|sign[- ]?up|log ?in|user accounts?|subscription|free trial|dashboard|mobile app|web app|api|onboarding|notifications?|integrations?)\b/g) ?? []).size;
  if (soft >= 4 && best.score < 14) return "product";
  return best.id;
}

export function parseRequirements(text: string, fileName = ""): Brief {
  const doc = parse(text);
  const { sections, kv } = doc;
  const of = (...roles: Role[]) => sections.filter((s) => roles.includes(s.role));
  const itemsOf = (ss: Section[]) => ss.flatMap((s) => s.entries.flatMap((e) => (e.kind === "item" ? [e.item] : [])));
  const parasOf = (ss: Section[]) => ss.flatMap((s) => s.entries.flatMap((e) => (e.kind === "para" ? [e.text] : [])));
  const textOf = (ss: Section[]) => ss.flatMap((s) => s.entries.map((e) => (e.kind === "para" ? e.text : [e.item.name, e.item.text, ...e.item.subs].filter(Boolean).join(". ")))).join(" ");
  const fromOf = (ss: Section[]) => (ss[0]?.title ? `"${ss[0].title}"` : "the top of the document");
  const k = (id: string) => kv[id]?.[0];

  const found: BriefFinding[] = [];
  const a: Record<string, string> = {};
  const put = (id: string, label: string, value: string, shown: string, from: string) => {
    if (!value.trim()) return;
    a[id] = value.trim();
    found.push({ id, label, value: shown, from });
  };

  // What the business is about: the overview, or failing that whatever opens the document.
  const preamble = sections.filter((s) => s.role === "" && s.level === 0);
  const aboutSecs = [of("about"), of("solution"), preamble, of("problem"), sections.filter((s) => s.role === "")].find((ss) => parasOf(ss).join(" ").length > 40) ?? [];
  const aboutRaw = k("about")?.value || parasOf(aboutSecs).join(" ");
  const aboutSentences = sentences(aboutRaw).filter((s) => !/\b(this (document|prd|brd|brief|spec\w*)|purpose of this|table of contents)\b/i.test(s));
  let about = "";
  for (const s of aboutSentences) {
    if (about && (about.length + s.length > 520 || sentences(about).length >= 4)) break;
    about += (about ? " " : "") + s;
  }

  // The name: a labelled line first, then "Crumb House is a ...", then the title.
  const whole = [doc.title, ...sections.map((s) => s.title + ". " + textOf([s]))].join(" ");
  const labelled = [k("name1"), k("name2"), k("name3")].find((x) => x && wordCount(x.value) <= 6 && !/^(https?:|www\.)|\.\w{2,4}(\/|$)/i.test(x.value));
  const titleName = nameFromTitle(doc.title);
  const isA = /(?:^|[.!?]\s+)((?:[A-Z][\w&'’.-]*)(?:\s+(?:[A-Z&][\w&'’.-]*|of|and|the)){0,4})\s+(?:is|are|will be)\s+(?:an?|the|our)\s+([^.;:()]{3,90})/.exec(aboutRaw);
  let isAName = "";
  if (isA) {
    const cand = isA[1].replace(/\s+(of|and|the)$/i, "");
    const times = text.split(cand).length - 1;
    if (!NOT_A_NAME.test(cand.split(" ")[0]) && (times >= 2 || titleName.toLowerCase().includes(cand.toLowerCase()))) isAName = cand;
  }
  const name = noStop(labelled?.value || isAName || titleName).replace(/^["“']|["”']$/g, "");
  if (name) put("name", "Name", name, name, labelled ? "a labelled line" : isAName ? fromOf(aboutSecs) : "the title");

  // What it offers, in a few words.
  let what = k("what")?.value ?? "";
  let whatFrom = "a labelled line";
  if (!what && isA && isAName) {
    const phrase = /^(.{3,70}?)(?=\s+(?:for|that|which|who|where|designed|built|based|located|in|to|helping|serving|offering|with|run|owned)\b|,|$)/.exec(isA[2]);
    if (phrase && wordCount(phrase[1]) <= 7) {
      what = phrase[1].replace(/^(?:new|simple|small|leading|modern|local)\s+/i, "");
      whatFrom = fromOf(aboutSecs);
    }
  }
  if (what && wordCount(what) <= 8) put("what", "What you offer", cap(noStop(what)), cap(noStop(what)), whatFrom);

  // Where.
  let city = k("city")?.value ?? "";
  let cityFrom = "a labelled line";
  if (!city) {
    const NOT_PLACE = /^(Q[1-4]|January|February|March|April|May|June|July|August|September|October|November|December|Phase|Version|React|Figma|English|Urdu|Arabic|Google|Stripe|Word|Excel|Section|Appendix|Scope|Summary|Addition|Order|Total|General|Particular|Case|Short|Brief|Progress|Development|Production|Advance|Parallel|Real|Time|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Phase|The|This|Our|Their)$/;
    const m = /\b(?:based in|located in|serving|serves|in the heart of|in)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)\b/.exec(aboutRaw);
    if (m && !NOT_PLACE.test(m[1].split(" ")[0]) && m[1] !== name) {
      city = m[1];
      cityFrom = fromOf(aboutSecs);
    }
  }
  if (city && wordCount(city) <= 5) put("city", "City or area", noStop(city), noStop(city), cityFrom);

  // Who it is for.
  const audSecs = of("audience");
  let audience = k("audience")?.value ?? "";
  let audFrom = "a labelled line";
  if (!audience && audSecs.length) {
    audFrom = fromOf(audSecs);
    const names = itemsOf(audSecs)
      .map((i) => noStop(i.name.replace(/^(persona|segment|primary|secondary|tertiary)\s*\d*\s*[:–-]?\s*/i, "")) || noStop(i.text))
      .filter((n) => n && wordCount(n) <= 7 && !/^\d+$/.test(n));
    if (names.length) audience = join(names.slice(0, 3).map(lowerFirst));
    else {
      const first = sentences(parasOf(audSecs).join(" "))[0] ?? "";
      audience = noStop(first.replace(/^(?:our|the)?\s*(?:primary |main |target |ideal )*(?:audience|users?|customers?|market)\s+(?:is|are|includes?|consists? of)\s+/i, ""));
      audience = audience.replace(/\s+(?:who|that|which|looking|wanting)\b.*$/i, "");
      if (wordCount(audience) > 14) audience = "";
    }
  }
  if (!audience && isA) {
    const m = /\bfor\s+([a-z][^.,;:()]{3,60}?)(?=\s+(?:that|which|who|to|in|across|looking|wanting|and need)\b|[.,;:(]|$)/.exec(isA[2]);
    if (m) {
      audience = m[1];
      audFrom = fromOf(aboutSecs);
    }
  }
  if (audience) put("audience", "Customers", lowerFirst(noStop(audience)), lowerFirst(noStop(audience)), audFrom);

  if (about) put("about", "Your story", about, sentences(about).length + (sentences(about).length === 1 ? " sentence" : " sentences"), k("about") ? "a labelled line" : fromOf(aboutSecs));

  // The headline.
  const tagSecs = of("tagline");
  const tagline = (k("tagline")?.value || sentences(parasOf(tagSecs).join(" "))[0] || itemsOf(tagSecs)[0]?.name || "").replace(/^["“'‘]|["”'’]$/g, "").trim();
  if (tagline && tagline.length <= 70) put("headline", "Headline", noStop(tagline), noStop(tagline), k("tagline") ? "a labelled line" : fromOf(tagSecs));

  // Category, from the top of the document first and the rest second.
  const headText = [doc.title, what, aboutRaw.slice(0, 600), k("what")?.value ?? "", name].join(" ");
  const usableSecs = sections.filter((s) => s.role !== "ignore");
  const category = categoryOf(headText, whole, [k("what")?.value ?? "", what].join(" "));
  const c = categoryById(category);

  // Features or services. Must-haves first, then the rest; things marked for later are left out.
  const featSecs = [of("features"), of("services"), of("stories")].find((ss) => itemsOf(ss).length || parasOf(ss).length) ?? [];
  let featItems = itemsOf(featSecs);
  if (!featItems.length) featItems = sentences(parasOf(featSecs).join(" ")).slice(0, 8).map((s) => ({ name: s, text: "", raw: s, subs: [] }));
  let feats = featItems.map(featureOf).filter((f) => f.name && f.name.length > 2);
  const now = feats.filter((f) => f.priority < 3);
  if (now.length >= 3) feats = now;
  feats = feats.map((f, i) => ({ f, i })).sort((x, y) => x.f.priority - y.f.priority || x.i - y.i).map((x) => x.f);
  const seen = new Set<string>();
  feats = feats.filter((f) => (seen.has(f.name.toLowerCase()) ? false : (seen.add(f.name.toLowerCase()), true))).slice(0, 8);
  if (feats.length) put("services", c.id === "food" ? "Menu" : "What you offer", feats.map((f) => [cell(f.name), cell(f.price), cell(f.text)].join(" | ").replace(/(\s\|\s)+$/, "")).join("\n"), feats.length + (feats.length === 1 ? " item: " : " items: ") + feats.slice(0, 3).map((f) => f.name).join(", ") + (feats.length > 3 ? " and more" : ""), fromOf(featSecs));

  // Plans and prices.
  const priceSecs = of("pricing");
  const plans = itemsOf(priceSecs)
    .map((i) => {
      const hcol = (re: RegExp) => (i.header ? i.header.findIndex((h) => re.test(h)) : -1);
      const all = [i.name, i.text, ...i.subs, ...(i.cells ?? [])].join(" ; ");
      const pc = hcol(/price|cost|fee|rate|amount/);
      const price = (pc >= 0 && i.cells?.[pc]) || PRICE.exec(all)?.[0] || "";
      const at = price ? all.indexOf(price) : -1;
      const per = at >= 0 ? new RegExp("^\\s*(?:" + PERIOD.source + ")", "i").exec(all.slice(at + price.length)) : null;
      const period = per ? (per[2] ? per[2].toLowerCase() : "per " + per[1].toLowerCase().replace(/^mo$/, "month").replace(/^yr$/, "year")) : "";
      const fc = hcol(/feature|include|benefit|detail|desc|what/);
      const rest0 = (fc >= 0 && i.cells?.[fc] ? i.cells[fc] : i.text);
      const esc = price.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const restText = price ? rest0.replace(new RegExp(esc + "(?:\\s*(?:" + PERIOD.source + "))?", "i"), " ") : rest0;
      const features = [...restText.split(/\s*[,;•]\s*|\s+\+\s+/), ...i.subs.filter((s) => !PRICE.test(s) || wordCount(s) > 4)]
        .map((f) => noStop(f.replace(/^[\s:–-]+/, "").replace(/^(?:and|includes?|including|with)\s+/i, "")))
        .filter((f) => f.length > 2 && wordCount(f) <= 12);
      const planName = noStop(i.name.replace(new RegExp("(?:" + PRICE.source + ")(?:\\s*(?:" + PERIOD.source + "))?", "i"), "").replace(/\s*(plan|package|tier)$/i, "").replace(/[\s(:–-]+$/, ""));
      return { name: planName, price: price.trim(), period, features: features.slice(0, 6) };
    })
    .filter((p) => p.name && wordCount(p.name) <= 5 && p.price)
    .slice(0, 4);
  if (plans.length) put("pricing", "Plans or packages", plans.map((p) => [cell(p.name), cell(p.price), cell(p.period), p.features.map((f) => cell(f).replace(/,/g, "")).join(", ")].join(" | ")).join("\n"), plans.length + (plans.length === 1 ? " plan: " : " plans: ") + plans.map((p) => p.name).join(", "), fromOf(priceSecs));

  // How it works.
  const procSecs = of("process");
  const steps = itemsOf(procSecs)
    .map((i) => {
      const f = featureOf(i);
      return { title: shortName(f.name, 4), text: f.text || (wordCount(i.name) > 4 ? cap(noStop(clean(i.name))) + "." : "") };
    })
    .filter((s) => s.title)
    .slice(0, 5);
  if (steps.length >= 2) put("process", "How it works", steps.map((s) => cell(s.title) + " | " + cell(s.text)).join("\n"), steps.length + " steps: " + steps.map((s) => s.title).join(", "), fromOf(procSecs));

  // Common questions.
  const faqSecs = of("faq");
  const faqs: { q: string; a: string }[] = [];
  for (const s of faqSecs) {
    let open: { q: string; a: string } | null = null;
    for (const e of s.entries) {
      const strip = (t: string) => t.replace(/^(?:q(?:uestion)?|a(?:nswer)?)\s*\d*\s*[:.)]\s*/i, "").trim();
      if (e.kind === "item") {
        const label = /^(?:q(?:uestion)?|a(?:nswer)?)\s*\d*$/i.test(e.item.name);
        const nm = label ? strip(e.item.text) : strip(e.item.name);
        const tx = label ? "" : strip([e.item.text, ...e.item.subs].filter(Boolean).join(" "));
        if (nm.endsWith("?")) {
          open = { q: nm, a: tx };
          faqs.push(open);
        } else if (open && !open.a) open.a = [nm, tx].filter(Boolean).join(" ");
      } else {
        const m = /^(.{6,200}?\?)\s*(.*)$/.exec(strip(e.text));
        if (m) {
          open = { q: m[1], a: strip(m[2]) };
          faqs.push(open);
        } else if (open && !open.a) open.a = strip(e.text);
      }
    }
  }
  const goodFaqs = faqs.filter((f) => f.a).slice(0, 8);
  if (goodFaqs.length) put("faq", "Common questions", goodFaqs.map((f) => cell(f.q) + " | " + cell(f.a)).join("\n"), goodFaqs.length + (goodFaqs.length === 1 ? " question" : " questions"), fromOf(faqSecs));

  // Numbers, only when the document presents them as facts. Targets and goals are not used:
  // a site should not claim numbers the business has not reached yet.
  const statSecs = of("stats");
  const stats = itemsOf(statSecs)
    .map((i) => {
      const NUM = /((?:[$£€₹]|rs\.?\s?)?\d[\d,.]*\s?(?:k|m|bn|million|thousand|billion)?\s?[+%x]?(?:\/\d+)?\+?)/i;
      const whole2 = [i.name, i.text].filter(Boolean).join(" ");
      const lead = new RegExp("^(?:over |more than |about |~|nearly )?" + NUM.source + "\\s+(.{2,60})$", "i").exec(whole2);
      if (lead) return { value: lead[1].trim(), label: noStop(lead[2]) };
      const tail = NUM.exec(i.text);
      if (tail && i.name) return { value: tail[1].trim(), label: noStop([i.text.replace(tail[1], "").trim(), lowerFirst(i.name)].filter(Boolean).join(" ")) };
      return null;
    })
    .filter((x): x is { value: string; label: string } => !!x && x.label.length > 1)
    .slice(0, 4);
  if (stats.length) put("highlights", "Numbers worth showing", stats.map((s) => cell(s.value) + " | " + cell(s.label)).join("\n"), stats.map((s) => s.value + " " + s.label).join(", "), fromOf(statSecs));

  // Kind words.
  const testSecs = of("testimonials");
  const quotes: { quote: string; name: string; role: string }[] = [];
  for (const s of testSecs) {
    for (const e of s.entries) {
      const raw = clean(e.kind === "item" ? e.item.raw : e.text);
      const last = quotes[quotes.length - 1];
      const q = /[“"«‘]([^”"»]{8,400})[”"»’]\s*(.*)$/.exec(raw);
      const who = (t: string) => {
        const [n = "", ...r] = t.replace(/^[\s,–—~-]+/, "").split(/\s*,\s*|\s+[–—-]\s+|\s+\|\s+/);
        return { name: noStop(n), role: noStop(r.join(", ")) };
      };
      if (q) quotes.push({ quote: q[1].trim(), ...who(q[2]) });
      else if (last && !last.name && wordCount(raw) <= 9) Object.assign(last, who(raw));
      else {
        const m = /^(.{12,400}?)\s+[–—-]\s+([^–—-]{2,60})$/.exec(raw);
        if (m) quotes.push({ quote: m[1].trim(), ...who(m[2]) });
        else if (wordCount(raw) > 4) quotes.push({ quote: raw, name: "", role: "" });
      }
    }
  }
  if (quotes.length) put("testimonials", "What customers say", quotes.slice(0, 6).map((q) => [cell(q.quote), cell(q.name), cell(q.role)].join(" | ").replace(/(\s\|\s?)+$/, "")).join("\n"), quotes.length + (quotes.length === 1 ? " quote" : " quotes"), fromOf(testSecs));

  // The people.
  const teamSecs = of("team");
  const team = itemsOf(teamSecs)
    .map((i) => {
      const hcol = (re: RegExp) => (i.header ? i.header.findIndex((h) => re.test(h)) : -1);
      const rc = hcol(/role|title|position/);
      const [roleGuess = "", ...bio] = i.text.split(/\s+[–—-]\s+|\.\s+|;\s+/);
      const role = rc >= 0 && i.cells?.[rc] ? i.cells[rc] : roleGuess;
      return { name: noStop(i.name), role: noStop(role), bio: rc >= 0 ? (i.text === role ? "" : i.text) : bio.join(". ") };
    })
    .filter((m) => m.name && wordCount(m.name) <= 4 && /^[A-Z]/.test(m.name) && wordCount(m.role) <= 8)
    .slice(0, 8);
  if (team.length) put("team", "The people behind it", team.map((m) => [cell(m.name), cell(m.role), cell(m.bio)].join(" | ").replace(/(\s\|\s?)+$/, "")).join("\n"), team.map((m) => m.name).join(", "), fromOf(teamSecs));

  // Clients and partners.
  const clientSecs = of("clients");
  const clientList = (k("clients")?.value ? k("clients")!.value.split(/\s*[,;]\s*/) : itemsOf(clientSecs).length ? itemsOf(clientSecs).map((i) => i.name) : parasOf(clientSecs).join(", ").split(/\s*[,;]\s*|\s+and\s+/))
    .map(noStop)
    .filter((x) => x && wordCount(x) <= 4)
    .slice(0, 12);
  if (clientList.length >= 2) put("clients", "Clients or partners", clientList.join(", "), clientList.join(", "), k("clients") ? "a labelled line" : fromOf(clientSecs));

  // A section of their own: why us, benefits, values.
  const uspSecs = of("usp");
  const usps = itemsOf(uspSecs)
    .map((i) => {
      const f = featureOf(i);
      return { title: f.name, text: f.text };
    })
    .filter((u) => u.title)
    .slice(0, 6);
  if (usps.length >= 2) {
    a.customTitle = cap(uspSecs[0].title.replace(/^[\d.)\s]+/, ""));
    put("customItems", a.customTitle, usps.map((u) => cell(u.title) + " | " + cell(u.text)).join("\n"), usps.length + " points", fromOf(uspSecs));
  }

  // How it should feel, and a brand colour if one is written down.
  const toneSecs = of("tone");
  const toneText = [k("tone")?.value ?? "", textOf(toneSecs)].join(" ");
  const toneLoose = sentences(aboutRaw + " " + textOf(of("goals"))).filter((x) => /\b(website|site|design|look|feel|brand|style)\b/i.test(x)).join(" ");
  const tone = toneOf(toneText) || ((TONE_WORDS.reduce((n, [, re]) => Math.max(n, toneLoose.match(re)?.length ?? 0), 0) >= 2 && toneOf(toneLoose)) || "");
  if (tone) put("tone", "How it should feel", tone, tone, k("tone") ? "a labelled line" : toneSecs.length ? fromOf(toneSecs) : fromOf(aboutSecs));
  const hexIn = (s: string) => /#[0-9a-f]{6}\b/i.exec(s)?.[0] ?? "";
  const colourLine = text.replace(/\([^)]*\)/g, "").split("\n").find((l) => /colou?r|brand|accent|primary/i.test(l) && hexIn(l)) ?? "";
  const brandColour = (hexIn(k("colour")?.value ?? "") || hexIn(toneText) || hexIn(colourLine)).toUpperCase();
  if (brandColour) found.push({ id: "colour", label: "Brand colour", value: brandColour, from: k("colour") ? "a labelled line" : toneSecs.length ? fromOf(toneSecs) : "a line about colour" });

  // What visitors should do first.
  const ctaSecs = of("cta");
  const cta = ctaOf([k("cta")?.value ?? "", textOf(ctaSecs)].join(" ")) || ctaOf(textOf(of("goals")));
  if (cta) put("cta", "What visitors do first", cta, cta, k("cta") ? "a labelled line" : fromOf(ctaSecs.length ? ctaSecs : of("goals")));

  // Contact details. Lines about who wrote the document are left out.
  const contactSecs = of("contact", "visit");
  const contactText = textOf(contactSecs);
  const usable = textOf(usableSecs);
  const email = EMAIL.exec(k("email")?.value ?? "")?.[0] || EMAIL.exec(contactText)?.[0] || (doc.metaText ? "" : EMAIL.exec(usable)?.[0]) || "";
  if (email) put("email", "Email", email, email, k("email") ? "a labelled line" : contactSecs.length ? fromOf(contactSecs) : "the document");
  const phone = PHONE.exec(k("phone")?.value ?? "")?.[0] || PHONE.exec(contactText)?.[0] || "";
  if (phone) put("phone", "Phone", phone.trim(), phone.trim(), k("phone") ? "a labelled line" : fromOf(contactSecs));
  const wa = PHONE.exec(k("whatsapp")?.value ?? "")?.[0] ?? "";
  if (wa) put("whatsapp", "WhatsApp", wa.trim(), wa.trim(), "a labelled line");
  const social = (host: string) => new RegExp("(?:https?://)?(?:www\\.)?" + host + "\\.com/[\\w.\\-/]+", "i").exec(text)?.[0] ?? "";
  for (const [id, host, label] of [["instagram", "instagram", "Instagram"], ["facebook", "facebook", "Facebook"]] as const) {
    const handle = k(id)?.value ?? "";
    const url = social(host) || (/^@?[\w.]{2,30}$/.test(handle) ? host + ".com/" + handle.replace(/^@/, "") : "");
    if (url) put(id, label, /^https?:/i.test(url) ? url : "https://" + url, url.replace(/^https?:\/\/(www\.)?/, ""), "the document");
  }
  if (c.physical) {
    const address = k("address")?.value ?? "";
    if (address) put("address", "Address", noStop(address), noStop(address), "a labelled line");
    const DAY = /\b(mon|tue|wed|thu|fri|sat|sun|daily|weekdays?|weekends?|every ?day)/i;
    const hourRows = [
      ...(k("hours")?.value ?? "").split(/\s*;\s*|,\s*(?=[A-Za-z])/).map((x) => {
        const m = /^(.*?[a-z])[\s:,-]+(\d.*|closed.*)$/i.exec(x.trim());
        return m ? [m[1], m[2]] : [x.trim(), ""];
      }),
      ...itemsOf(of("visit")).map((i) => [i.name, i.text]),
    ].filter(([d, t]) => d && t && DAY.test(d) && wordCount(d) <= 6);
    if (hourRows.length) put("hours", "Opening hours", hourRows.map(([d, t]) => cell(d) + " | " + cell(t)).join("\n"), hourRows.length + (hourRows.length === 1 ? " line" : " lines"), k("hours") ? "a labelled line" : fromOf(of("visit")));
  }

  // The pages the document asks for. The site is one page, so these become its sections.
  const pageSecs = of("pages");
  const pages = Array.from(
    new Set(
      [...(k("pages")?.value ?? "").split(/\s*[,;/]\s*/), ...itemsOf(pageSecs).map((i) => i.name), ...sections.filter((s) => /\bpage$/i.test(s.title)).map((s) => s.title)]
        .map((p) => cap(noStop(p.replace(/\s+page$/i, "").replace(/^[\d.)\s]+/, ""))))
        .filter((p) => p && wordCount(p) <= 4),
    ),
  ).slice(0, 12);

  const answers = { ...defaultAnswers("website", category, { name: a.name ?? "", city: a.city ?? "" }), ...a };
  const missing: string[] = [];
  if (!a.name) missing.push("the name");
  if (!a.what) missing.push("what you offer in a few words");
  if (!a.services) missing.push("a list of features or services");
  if (!a.about) missing.push("a short description");
  if (!a.email && !a.phone && !a.whatsapp) missing.push("contact details");

  return {
    fileName,
    title: doc.title,
    words: wordCount(text),
    sections: sections.filter((s) => s.title).length,
    category,
    answers,
    read: a,
    found,
    missing,
    pages,
    brandColour,
  };
}

// A ready project from what was read. "build" approves the steps up to the preview and writes
// the site straight away; "check" stops at the questions so the answers can be looked over.
// The same brief after the person corrected the basics or the kind of business.
export function reviseBrief(brief: Brief, category: string, read: Record<string, string>): Brief {
  const kept = Object.fromEntries(Object.entries(read).filter(([, v]) => v.trim()));
  return { ...brief, category, read: kept, answers: { ...defaultAnswers("website", category, { name: kept.name ?? "", city: kept.city ?? "" }), ...kept } };
}

export function projectFromBrief(brief: Brief, mode: "build" | "check" = "build"): Project {
  const a = brief.answers;
  const name = a.name ?? "";
  const query = `Website for ${name || "my business"}${a.what ? ", " + a.what.toLowerCase() : ""}${a.city ? " in " + a.city : ""}`;
  const p = newProject(query, "website", brief.category, name);
  p.answers = { ...a };
  p.docName = brief.fileName || "pasted text";
  let design = keepCast(p.design, personalDesign(name || query, query, TONE_MOOD[a.tone ?? ""], brief.category));
  if (brief.brandColour) design = fromBrandColour(design, brief.brandColour);
  p.design = design;
  if (mode === "build") {
    p.content = composeWebsite(brief.category, p.answers);
    p.steps = { ...p.steps, start: "approved", questions: "approved", design: "approved", cast: "approved", motion: "approved", build: "draft" };
  } else {
    p.steps = { ...p.steps, start: "approved", questions: "draft" };
  }
  return p;
}
