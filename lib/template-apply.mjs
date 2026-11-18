// Personalising an imported template (docs/TEMPLATES.md). A template keeps its own code; what
// a person changes are its slots: each slot is a piece of text (or a picture's address) that
// appears literally in the template's files. Applying a slot replaces every occurrence, with
// the escaping each file and position needs, so the result is still valid HTML, JSX or JS.
//
// Plain JavaScript so the build script (Node) and the builder (TypeScript) share one copy.

/** File kinds a slot may be written into. Anything else (pictures, fonts) is left alone. */
export function fileKind(path) {
  const p = path.toLowerCase();
  if (p.endsWith(".html") || p.endsWith(".htm")) return "html";
  if (/\.(m?js|cjs)$/.test(p)) return "js";
  if (/\.(jsx|tsx)$/.test(p)) return "jsx";
  if (/\.(ts|mts|cts)$/.test(p)) return "js";
  if (p.endsWith(".css")) return "css";
  if (p.endsWith(".json")) return "json";
  if (p.endsWith(".md") || p.endsWith(".txt")) return "text";
  return null;
}

const QUOTES = new Set(["'", '"', "`"]);

const htmlEscape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
// Safe in '…', "…" and `…` alike: every character that could end or open something is a \u escape.
const jsEscape = (s) => s.replace(/[\\'"`$<>\n\r\u2028\u2029{}]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
// JSX text: entities work there, braces and angle brackets would not.
const jsxTextEscape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\{/g, "&#123;").replace(/\}/g, "&#125;");
const jsonEscape = (s) => JSON.stringify(s).slice(1, -1);

/** A picture address a person typed: only plain https (or a site-relative path) is accepted. */
export function cleanUrl(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (/^\.{0,2}\/[^\s]*$/.test(s) && !s.startsWith("//")) return encodeURI(s).replace(/['"()]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return "";
    return u.href.replace(/['"()]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
  } catch {
    return "";
  }
}

/** Is the text at `i` inside a JS string literal or JSX text, judging by the character before it? */
function contextAt(text, i, kind) {
  const before = text[i - 1];
  if (kind === "js") return "js";
  if (kind === "jsx") {
    const q = QUOTES.has(before) ? i - 1 : quoteStart(text, i);
    if (q < 0) return jsxTextAt(text, i) ? "jsxText" : "js";
    // name="…" in JSX takes entities, not JS escapes.
    return text[q - 1] === "=" && /[A-Za-z-]/.test(text[q - 2] || "") ? "html" : "js";
  }
  if (kind === "html") {
    const low = text.slice(0, i).toLowerCase();
    if (low.lastIndexOf("<script") > low.lastIndexOf("</script")) return "js";
  }
  return kind;
}

function escapeFor(ctx, value) {
  switch (ctx) {
    case "html":
      return htmlEscape(value);
    case "js":
      return jsEscape(value);
    case "jsxText":
      return jsxTextEscape(value);
    case "json":
      return jsonEscape(value);
    default:
      return value;
  }
}

/**
 * The replacements a set of values asks for: only slots whose value differs from the default,
 * longest default first so a slot inside a longer one never cuts it up.
 */
export function plan(slots, values) {
  const out = [];
  for (const s of slots) {
    const raw = values?.[s.key];
    if (raw == null) continue;
    const to = s.type === "image" ? cleanUrl(raw) : String(raw).replace(/\s+/g, " ").trim();
    if (!to || to === s.default) continue;
    out.push({ key: s.key, type: s.type || "text", from: s.default, to });
  }
  return out.sort((a, b) => b.from.length - a.from.length);
}

// A default written on one line still matches the same words wrapped over several lines (JSX).
function pattern(from) {
  return new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"), "g");
}

/** Apply replacements to one file's text. Image addresses are never escaped beyond cleanUrl. */
export function applyToText(path, text, replacements) {
  const kind = fileKind(path);
  if (!kind || !replacements.length) return text;
  let out = text;
  for (const r of replacements) {
    out = out.replace(pattern(r.from), (_m, i, whole) => {
      if (r.type === "image") return kind === "html" ? r.to.replace(/&/g, "&amp;") : r.to;
      return escapeFor(contextAt(whole, i, kind), r.to);
    });
  }
  return out;
}

/** Where a default text occurs in a file: the checks the build runs before a template ships. */
export function occurrences(text, needle) {
  return [...text.matchAll(pattern(needle))].map((m) => ({ index: m.index, length: m[0].length }));
}

// Where the quoted string around position i opens on its line, or -1. Counts unescaped quotes.
function quoteStart(text, i) {
  const start = text.lastIndexOf("\n", i) + 1;
  let cur = null;
  let at = -1;
  for (let j = start; j < i; j++) {
    const c = text[j];
    if (c === "\\") {
      j++;
      continue;
    }
    if (cur) {
      if (c === cur) cur = null;
    } else if (QUOTES.has(c)) (cur = c), (at = j);
  }
  return cur ? at : -1;
}

// JSX text: the nearest tag or brace before i is the end of an opening tag.
function jsxTextAt(text, i) {
  for (let j = i - 1; j >= 0 && j > i - 4000; j--) {
    const c = text[j];
    if (c === "<" || c === "{" || c === "}") return false;
    if (c === ">") return text[j - 1] !== "=";
  }
  return false;
}

/**
 * Problems with a slot in a code file: an occurrence that could be a name in the code rather
 * than words. Several words cannot be a name; one word must sit in a string or in JSX text.
 */
export function slotProblems(path, text, slot) {
  const kind = fileKind(path);
  if (kind !== "js" && kind !== "jsx") return [];
  if (/\s/.test(slot.default.trim())) return [];
  const out = [];
  for (const { index: i, length } of occurrences(text, slot.default)) {
    const b = text[i - 1];
    const a = text[i + length];
    const wordEdge = !/[A-Za-z0-9_$]/.test(b || "") && !/[A-Za-z0-9_$]/.test(a || "");
    const ok = wordEdge && (QUOTES.has(b) || quoteStart(text, i) >= 0 || (kind === "jsx" && jsxTextAt(text, i)));
    if (!ok) out.push(`${path}: "${slot.default}" at ${i} may be a name in the code, not words`);
  }
  return out;
}
