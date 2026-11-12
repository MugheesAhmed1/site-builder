import type { Profile } from "./types";

// Reads a résumé entirely in the browser. PDFs are turned into text with pdf.js;
// the text is then split into sections by recognising common headings and date ranges.
// No file ever leaves the device.

// With headings on, lines set clearly larger than the body text come back as "## " lines,
// which is how the requirements reader finds sections in a PDF.
export async function fileToText(file: File, opts: { headings?: boolean } = {}): Promise<string> {
  if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const out: string[] = [];
    const sizes: number[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      // Group text pieces into lines by their vertical position.
      const lines = new Map<number, { x: number; s: string; h: number }[]>();
      for (const it of tc.items as { str: string; transform: number[]; height?: number }[]) {
        if (!("str" in it) || !it.str.trim()) continue;
        const y = Math.round(it.transform[5] / 3) * 3;
        const arr = lines.get(y) ?? [];
        arr.push({ x: it.transform[4], s: it.str, h: it.height || Math.abs(it.transform[3]) || 0 });
        lines.set(y, arr);
      }
      const ys = [...lines.keys()].sort((a, b) => b - a);
      for (const y of ys) {
        const parts = lines.get(y)!.sort((a, b) => a.x - b.x);
        out.push(parts.map((p) => p.s).join(" ").replace(/\s+/g, " ").trim());
        sizes.push(Math.max(...parts.map((p) => p.h)));
      }
    }
    if (opts.headings && out.length > 3) {
      // The body size is the most common line height, weighted by how much text is set in it.
      const weight = new Map<number, number>();
      out.forEach((l, i) => weight.set(Math.round(sizes[i] * 2) / 2, (weight.get(Math.round(sizes[i] * 2) / 2) ?? 0) + l.length));
      const body = [...weight.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
      if (body > 0) return out.map((l, i) => (sizes[i] >= body * 1.15 && l.length <= 80 && !/^[#•●▪\-*]/.test(l) ? (sizes[i] >= body * 1.6 ? "# " : "## ") + l : l)).join("\n");
    }
    return out.join("\n");
  }
  if (/\.docx$/i.test(file.name) || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const { docxToText } = await import("./docx");
    return docxToText(await file.arrayBuffer());
  }
  if (/\.(doc|pages|odt|rtf)$/i.test(file.name)) {
    throw new Error("That file type can't be read here. Save it as .docx or PDF, or copy the text and paste it.");
  }
  return file.text();
}

const HEADINGS: [keyof typeof SECTION_KEYS, RegExp][] = [
  ["summary", /^(professional\s+)?(summary|profile|about( me)?|objective|career objective|overview)$/i],
  ["experience", /^(work\s+|professional\s+|employment\s+|relevant\s+)?(experience|history|employment)( history)?$|^career( history)?$/i],
  ["education", /^(education|academics?|academic background|qualifications)$/i],
  ["skills", /^((core|key|technical|professional)\s+)?(skills|competencies|expertise|tools|technologies|tech stack)(\s*(&|and)\s*\w+)?$/i],
  ["projects", /^((key|selected|personal|academic)\s+)?projects$/i],
  ["certifications", /^(certifications?|licen[cs]es?( (&|and) certifications)?|courses|training|certificates)$/i],
  ["other", /^(languages|interests|hobbies|references|awards|achievements|volunteer(ing)?|publications)$/i],
];
const SECTION_KEYS = { summary: 1, experience: 1, education: 1, skills: 1, projects: 1, certifications: 1, other: 1 };

const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
const DATE = `(?:${MONTH}\\s*'?\\d{2,4}|\\d{1,2}/\\d{2,4}|\\d{4})`;
const RANGE = new RegExp(`(${DATE})\\s*(?:-|–|—|to|until|till)\\s*(${DATE}|present|current|now|today|ongoing)`, "i");
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE = /(\+?\d[\d\s().-]{7,}\d)/;
const URL_RE = /((?:https?:\/\/)?(?:www\.)?(?:linkedin\.com|github\.com|behance\.net|dribbble\.com|medium\.com|[\w-]+\.(?:dev|io|me|com|net|org|app|co|pk|vercel\.app))\/?[^\s|,]*)/gi;
const BULLET = /^[•●▪◦‣∙*·\-–—>]\s*/;

function cleanHeading(line: string) {
  return line.replace(/^#+\s*/, "").replace(/^\*\*(.+)\*\*$/, "$1").replace(/[:|]+$/, "").replace(/\s+/g, " ").trim();
}

function sectionOf(line: string): keyof typeof SECTION_KEYS | null {
  const l = cleanHeading(line);
  if (l.length > 40) return null;
  for (const [k, re] of HEADINGS) if (re.test(l)) return k;
  return null;
}

function titleCase(s: string) {
  return s === s.toUpperCase() ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : s;
}

function labelFor(url: string) {
  if (/linkedin/i.test(url)) return "LinkedIn";
  if (/github/i.test(url)) return "GitHub";
  if (/behance/i.test(url)) return "Behance";
  if (/dribbble/i.test(url)) return "Dribbble";
  if (/medium/i.test(url)) return "Medium";
  return "Website";
}

export function parseResume(text: string): Profile {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const p: Profile = { name: "", headline: "", location: "", email: "", phone: "", links: [], summary: "", experience: [], projects: [], skills: [], education: [], certifications: [] };

  p.email = EMAIL.exec(text)?.[0] ?? "";
  const phone = lines.map((l) => l.replace(EMAIL, "")).map((l) => PHONE.exec(l)?.[1]).find((m) => m && m.replace(/\D/g, "").length >= 9 && !RANGE.test(m));
  p.phone = phone?.trim() ?? "";
  const urls = new Set<string>();
  // Profile links live in the header; links further down belong to projects.
  for (const m of lines.slice(0, 8).join("\n").matchAll(URL_RE)) {
    const u = m[1].replace(/[).]+$/, "");
    if (EMAIL.test(u) || u.includes("@")) continue;
    if (/^[\w-]+\.(com|net|org)$/.test(u) && p.email.endsWith(u)) continue;
    urls.add(u.startsWith("http") ? u : "https://" + u);
  }
  p.links = [...urls].slice(0, 6).map((url) => ({ label: labelFor(url), url }));

  // Split into sections.
  const sections: Record<string, string[]> = { header: [] };
  let current = "header";
  for (const line of lines) {
    const s = sectionOf(line);
    if (s) {
      current = s;
      sections[s] = sections[s] ?? [];
      continue;
    }
    (sections[current] = sections[current] ?? []).push(line);
  }

  // Header: name, headline, location.
  const isContact = (l: string) => EMAIL.test(l) || /https?:|www\.|linkedin|github/i.test(l) || (PHONE.test(l) && l.replace(/\D/g, "").length >= 9);
  const head = sections.header.filter((l) => !isContact(l) || l.split(/[|•·]/).length > 1);
  const nameLine = head.find((l) => /^[\p{L}.'\- ]{3,40}$/u.test(l) && l.split(" ").length >= 2 && l.split(" ").length <= 5);
  p.name = nameLine ? titleCase(nameLine) : "";
  const rest = head.filter((l) => l !== nameLine);
  const headline = rest.find((l) => !isContact(l) && l.length <= 90 && !/^\d/.test(l) && !/,\s*[A-Z][a-z]+$/.test(l));
  p.headline = headline ? headline.replace(/\s*[|•·]\s*/g, ", ") : "";
  for (const l of sections.header) {
    for (const piece of l.split(/\s*[|•·]\s*/)) {
      if (!p.location && !EMAIL.test(piece) && !/\d{4,}/.test(piece) && /^[A-Z][\p{L} ]+,\s*[A-Z][\p{L} ]+$/u.test(piece) && piece.length < 40) p.location = piece;
    }
  }
  if (!p.headline && rest.length) p.headline = "";

  p.summary = (sections.summary ?? []).join(" ").trim();
  if (!p.summary) {
    const para = rest.filter((l) => l.length > 90).join(" ");
    p.summary = para;
  }

  p.experience = parseExperience(sections.experience ?? []);
  p.education = parseEducation(sections.education ?? []);
  p.skills = parseSkills(sections.skills ?? []);
  p.projects = parseProjects(sections.projects ?? []);
  p.certifications = (sections.certifications ?? [])
    .map((l) => l.replace(BULLET, ""))
    .filter((l) => l.length > 2)
    .slice(0, 10)
    .map((l) => {
      const year = /\b(19|20)\d{2}\b/.exec(l)?.[0] ?? "";
      const [name, issuer = ""] = l.replace(year, "").replace(/[(),]+\s*$/, "").split(/\s+(?:by|from)\s+|\s*[|,]\s*|\s+-\s+/);
      return { name: name.trim(), issuer: issuer.trim(), year };
    });

  if (!p.headline && p.experience[0]) p.headline = p.experience[0].role;
  return p;
}

function splitRoleCompany(lines: string[]): { role: string; company: string; location: string } {
  const parts = lines
    .flatMap((l) => l.split(/\s+(?:at|@)\s+|\s*[|,]\s*|\s+-\s+|\s+–\s+/))
    .map((s) => s.trim())
    .filter((s) => s && !RANGE.test(s));
  const ROLE = /(manager|engineer|developer|designer|lead|head|director|analyst|intern|officer|owner|consultant|specialist|associate|executive|coordinator|founder|architect|scientist|assistant|teacher|writer|editor|accountant|president|vp|cto|ceo|cfo)/i;
  const roleIdx = parts.findIndex((s) => ROLE.test(s));
  const role = roleIdx >= 0 ? parts[roleIdx] : parts[0] ?? "";
  const others = parts.filter((_, i) => i !== (roleIdx >= 0 ? roleIdx : 0));
  const location = others.find((s) => /^(remote|hybrid|on-?site)$/i.test(s) || /^[A-Z][a-z]+(\s[A-Z][a-z]+)?$/.test(s) && others.indexOf(s) > 0) ?? "";
  const company = others.find((s) => s !== location) ?? "";
  return { role, company, location };
}

function parseExperience(lines: string[]): Profile["experience"] {
  const out: Profile["experience"] = [];
  let i = 0;
  const pending: string[] = [];
  while (i < lines.length) {
    const line = lines[i];
    const m = RANGE.exec(line);
    if (m) {
      const before = line.replace(m[0], "").replace(/[|,()\s]+$/, "").replace(/^[|,()\s]+/, "").trim();
      const titleLines = [...pending.slice(-2), ...(before ? [before] : [])].filter((l) => !BULLET.test(l));
      pending.length = 0;
      // Lines right after the date that are short and not bullets often hold the company.
      const after: string[] = [];
      while (i + 1 < lines.length && after.length < 1 && !BULLET.test(lines[i + 1]) && lines[i + 1].length < 60 && !RANGE.test(lines[i + 1]) && titleLines.length < 2) {
        after.push(lines[++i]);
      }
      const { role, company, location } = splitRoleCompany([...titleLines, ...after]);
      const bullets: string[] = [];
      while (i + 1 < lines.length && !RANGE.test(lines[i + 1])) {
        const next = lines[i + 1];
        // Stop when the next two lines look like the next job's title block.
        if (!BULLET.test(next) && next.length < 60 && i + 2 < lines.length && RANGE.test(lines[i + 2])) break;
        if (!BULLET.test(next) && next.length < 60 && i + 3 < lines.length && RANGE.test(lines[i + 3]) && !BULLET.test(lines[i + 2]) && lines[i + 2].length < 60) break;
        i++;
        if (BULLET.test(next) || !bullets.length) bullets.push(next.replace(BULLET, ""));
        else bullets[bullets.length - 1] += " " + next;
      }
      out.push({ role: titleCase(role), company, location, start: tidyDate(m[1]), end: tidyDate(m[2]), bullets: bullets.filter((b) => b.length > 3).slice(0, 6) });
    } else {
      pending.push(line);
    }
    i++;
  }
  return out.slice(0, 8);
}

function tidyDate(s: string) {
  const t = s.trim();
  if (/^(present|current|now|today|ongoing)$/i.test(t)) return "Present";
  return t.replace(/\b\w/, (c) => c.toUpperCase());
}

function parseEducation(lines: string[]): Profile["education"] {
  const out: Profile["education"] = [];
  const SCHOOL = /(university|college|school|institute|academy|lums|nust|fast|iba|polytechnic)/i;
  const DEGREE = /(bachelor|master|b\.?sc|m\.?sc|bs|ms|ba|ma|mba|phd|diploma|b\.?e|b\.?tech|m\.?tech|bba|a.?levels?|o.?levels?|fsc|matric|intermediate|degree)/i;
  let cur: { school: string; degree: string; year: string } | null = null;
  for (const raw of lines) {
    const l = raw.replace(BULLET, "");
    const years = l.match(/\b(19|20)\d{2}\b/g);
    const text = l.replace(RANGE, "").replace(/\b(19|20)\d{2}\b/g, "").replace(/[|,()\s-]+$/, "").trim();
    const pieces = text.split(/\s*[|,]\s*|\s+-\s+/).map((x) => (/\([^)]*$/.test(x) ? x + ")" : x)).filter(Boolean);
    const school = pieces.find((s) => SCHOOL.test(s));
    const degree = pieces.find((s) => DEGREE.test(s) && s !== school);
    if (school || (degree && !cur?.degree === false)) {
      if (cur && (school ? cur.school : cur.degree)) out.push(cur);
      cur = { school: school ?? "", degree: degree ?? "", year: "" };
    }
    if (!cur) cur = { school: "", degree: "", year: "" };
    if (!cur.school && school) cur.school = school;
    if (!cur.degree && degree) cur.degree = degree;
    if (years) cur.year = years[years.length - 1];
  }
  if (cur && (cur.school || cur.degree)) out.push(cur);
  return out.slice(0, 5);
}

function parseSkills(lines: string[]): string[] {
  const items = lines
    .map((l) => l.replace(BULLET, "").replace(/^[\w &/]{2,30}:\s*/, ""))
    .flatMap((l) => l.split(/\s*[,|•·;]\s*|\s{2,}/))
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 40);
  return Array.from(new Set(items)).slice(0, 30);
}

function parseProjects(lines: string[]): Profile["projects"] {
  const out: Profile["projects"] = [];
  for (const raw of lines) {
    const isBullet = BULLET.test(raw);
    const l = raw.replace(BULLET, "");
    const link = /(https?:\/\/\S+|[\w-]+\.(?:com|dev|io|app|vercel\.app)\S*)/.exec(l)?.[1] ?? "";
    const m = /^([^:|–—]{2,50}?)\s*(?::|\||\s-\s|–|—)\s*(.+)$/.exec(l.replace(link, "").trim());
    if (m && (!isBullet || !out.length)) {
      out.push({ name: m[1].trim(), description: m[2].trim().replace(/[,;\s]+$/, ""), tags: [], link: link && !link.startsWith("http") ? "https://" + link : link });
    } else if (!isBullet && l.length < 50 && !out.some((o) => !o.description)) {
      out.push({ name: l.trim(), description: "", tags: [], link });
    } else if (out.length) {
      const last = out[out.length - 1];
      last.description = (last.description ? last.description + " " : "") + l.trim();
      if (!last.link && link) last.link = link;
    }
  }
  return out.filter((p) => p.name).slice(0, 8);
}
