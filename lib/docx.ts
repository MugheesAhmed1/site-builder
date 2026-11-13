// Reads a Word (.docx) file in the browser. A .docx is a zip; the words live in
// word/document.xml. The XML is turned into plain text that keeps the structure the
// document readers look for: headings become "# ", list items "- " and tables "| a | b |".
// Nothing is uploaded.

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decode(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x10ffff ? String.fromCodePoint(n) : "";
    }
    return ENTITIES[e] ?? m;
  });
}

// The words of one paragraph, with tabs and line breaks kept as spaces.
function runsText(p: string) {
  let out = "";
  const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/>|<w:br\b[^>]*\/>|<w:cr\b[^>]*\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(p))) out += m[1] !== undefined ? decode(m[1]) : " ";
  return out.replace(/[ \t ]+/g, " ").trim();
}

function paragraph(p: string): string {
  const text = runsText(p);
  if (!text) return "";
  const style = /<w:pStyle\b[^>]*w:val="([^"]+)"/.exec(p)?.[1] ?? "";
  const heading = /^(?:heading|berschrift|titre|ttulo)\s*(\d)$/i.exec(style.replace(/[^\w\s]/g, "")) ?? /^Heading(\d)/i.exec(style);
  if (/^title$/i.test(style)) return "# " + text;
  if (/^subtitle$/i.test(style)) return text;
  if (heading) return "#".repeat(Math.min(6, Math.max(1, Number(heading[1])))) + " " + text;
  const outline = /<w:outlineLvl\b[^>]*w:val="(\d)"/.exec(p);
  if (outline && Number(outline[1]) < 6) return "#".repeat(Number(outline[1]) + 1) + " " + text;
  if (/<w:numPr\b/.test(p) || /^list/i.test(style)) {
    const level = Number(/<w:ilvl\b[^>]*w:val="(\d+)"/.exec(p)?.[1] ?? 0);
    return "  ".repeat(Math.min(level, 4)) + "- " + text;
  }
  // Many documents use a short bold line as a heading without a heading style.
  const runs = p.match(/<w:r\b[\s\S]*?<\/w:r>/g) ?? [];
  const worded = runs.filter((r) => /<w:t[\s>]/.test(r));
  const bold = (r: string) => /<w:b\b(?![^>]*w:val="(?:0|false)")[^>]*\/?>/.test(r);
  if (worded.length && worded.every(bold) && text.length <= 70 && !/[.;,]$/.test(text)) return "**" + text + "**";
  return text;
}

function table(t: string): string[] {
  const out: string[] = [];
  const rows = t.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) ?? [];
  rows.forEach((r, i) => {
    const cells = (r.match(/<w:tc\b[\s\S]*?<\/w:tc>/g) ?? []).map((c) =>
      (c.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? [])
        .map(runsText)
        .filter(Boolean)
        .join("; ")
        .replace(/\|/g, "/"),
    );
    if (!cells.some(Boolean)) return;
    out.push("| " + cells.join(" | ") + " |");
    if (i === 0) out.push("| " + cells.map(() => "---").join(" | ") + " |");
  });
  return out;
}

export function docxXmlToText(xml: string): string {
  const body = /<w:body\b[^>]*>([\s\S]*)<\/w:body>/.exec(xml)?.[1] ?? xml;
  const out: string[] = [];
  const re = /<w:tbl\b[\s\S]*?<\/w:tbl>|<w:p[ >][\s\S]*?<\/w:p>|<w:p\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    if (m[0].startsWith("<w:tbl")) out.push("", ...table(m[0]), "");
    else out.push(paragraph(m[0]));
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function docxToText(data: ArrayBuffer | Uint8Array): Promise<string> {
  const JSZip = (await import("jszip")).default;
  let zip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new Error("That Word file couldn't be opened. Save it again as .docx or PDF, or paste the text.");
  }
  const doc = zip.file("word/document.xml");
  if (!doc) throw new Error("That file isn't a Word document we can read. Save it as .docx or PDF, or paste the text.");
  return docxXmlToText(await doc.async("string"));
}
