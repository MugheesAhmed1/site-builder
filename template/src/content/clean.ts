// Words and links come from a form or a backup file, so a link is only kept when a visitor
// can safely open it: web, mail, phone, WhatsApp, a page anchor, a relative file or a picture.
// Anything else ("javascript:", "data:text/html", ...) is dropped.

const SAFE_LINK = /^(https?:|mailto:|tel:|sms:|whatsapp:|#|\/|\.\/|\.\.\/)/i;
const NO_SCHEME = /^[^:]*$/;
const LINK_KEY = /(url|href|link|linkedin|github|website|instagram|facebook|twitter|whatsapp|map)s?$/i;
const IMAGE_KEY = /(photo|image|img|avatar|logo|poster)/i;

export function safeUrl(v: string, image = false): string {
  const t = v.trim();
  if (!t) return v;
  if (image && /^data:image\/(png|jpe?g|webp|gif|avif);base64,/i.test(t)) return v;
  return SAFE_LINK.test(t) || NO_SCHEME.test(t) ? v : "";
}

export function cleanContent<T>(node: T, key?: string): T {
  if (Array.isArray(node)) return node.map((x) => cleanContent(x, key)) as T;
  if (node && typeof node === "object") return Object.fromEntries(Object.entries(node as Record<string, unknown>).map(([k, v]) => [k, cleanContent(v, k)])) as T;
  if (typeof node === "string" && key && LINK_KEY.test(key)) return safeUrl(node, IMAGE_KEY.test(key)) as T;
  return node;
}

export const digits = (s: string | undefined) => (s || "").replace(/[^\d]/g, "");

export function initials(name: string) {
  const w = (name || "S").trim().split(/\s+/).filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] || "S").slice(0, 2)).toUpperCase();
}

export function fontsHref(fonts: { display: string; body: string; mono: string }) {
  const fams = Array.from(new Set([fonts.display, fonts.body, fonts.mono])).filter(Boolean);
  const q = fams.map((f) => "family=" + encodeURIComponent(f).replace(/%20/g, "+") + ":wght@400;500;600;700").join("&");
  return "https://fonts.googleapis.com/css2?" + q + "&display=swap";
}
