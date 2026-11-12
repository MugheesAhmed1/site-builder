// Cinema plates: wide, film-like scenes that sit behind the opening words of a "cinema"
// or "scatter" hero, and behind the glass call to action. Each one was generated for this
// library with Pollinations.ai (free, no account) from an original prompt, cropped and saved
// as a WebP in public/real/cinema. The sky is kept open in the upper half for the headline.
import { asset } from "./real.js";

export const PLATE_IDS = [
  "general", "food", "beauty", "fitness", "health", "agency", "consulting", "photo", "property", "product", "shop", "nonprofit",
  "events", "dentist", "hospital", "creator", "law", "school", "hotel", "trades", "auto", "pets", "dev", "design", "writer", "silk",
];

// Night or studio-dark plates read best with a dark page.
export const DARK_PLATES = ["agency", "product", "dev", "design", "silk"];

const ALIAS = { portfolio: "writer" };

// Category labels ("Restaurant, café or bakery") as well as ids lead to a plate.
const BY_LABEL = [
  [/dent/, "dentist"], [/hospital|medical cent/, "hospital"], [/clinic|therap|health/, "health"], [/restaurant|caf|bak|food|coffee/, "food"],
  [/salon|spa|beauty/, "beauty"], [/gym|trainer|fitness|yoga/, "fitness"], [/agency|marketing/, "agency"], [/consult|coach|freelanc/, "consulting"],
  [/photo|creative/, "photo"], [/real estate|property/, "property"], [/app|saas|startup|software/, "product"], [/shop|brand|store/, "shop"],
  [/nonprofit|community|charity/, "nonprofit"], [/event|wedding/, "events"], [/creator|influenc|youtub/, "creator"], [/law|legal/, "law"],
  [/school|academy|tutor/, "school"], [/hotel|travel/, "hotel"], [/construct|home service|trade|plumb/, "trades"], [/car |car$|auto|dealer/, "auto"],
  [/vet|pet/, "pets"],
];

/** The raw /real/... path of a plate id, or of the plate that suits a category. */
export function platePath(idOrCategory, role) {
  let id = String(idOrCategory || "").toLowerCase();
  if (id.startsWith("/real/")) return id;
  if (id === "portfolio" && role) {
    const r = String(role).toLowerCase();
    id = /develop|engineer|program|software|data|devops|it\b/.test(r) ? "dev" : /design|artist|illustr|ux|ui\b|brand/.test(r) ? "design" : /photo|film|video/.test(r) ? "photo" : "writer";
  }
  id = ALIAS[id] || id;
  if (!PLATE_IDS.includes(id)) id = (BY_LABEL.find(([re]) => re.test(id)) || [0, "general"])[1];
  return "/real/cinema/" + id + ".webp";
}

/** The plate a site shows: the one picked in the builder, or the one that suits its category. */
export function plateFor(design, category, role) {
  return asset(design && design.plate ? platePath(design.plate) : platePath(category, role));
}
