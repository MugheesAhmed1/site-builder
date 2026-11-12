import { REAL_PROPS, asset } from "./real.js";

// With no photo, a tile gets a photoreal cut-out from the real-life pack that suits the site.
const PROP_SETS = {
  food: ["croissant", "cupcake", "macaron", "coffee-cup", "donut", "strawberry", "chocolate", "lemon", "cherry", "blueberries", "watermelon", "mint"],
  calm: ["lotus", "orchid", "tulip", "daisy", "monstera", "fern", "palm-leaf", "mint", "shell", "sunflower"],
  party: ["party-balloon", "balloon", "macaron", "paper-plane", "planet", "cupcake", "cherry", "starfish"],
  work: ["paper-plane", "planet", "moon", "monstera", "lotus", "balloon", "shell", "dove", "orchid", "fern", "starfish", "sunflower"],
};
const SET_OF = { food: "food", beauty: "calm", health: "calm", dentist: "calm", hospital: "calm", hotel: "calm", pets: "calm", shop: "party", product: "party", events: "party", nonprofit: "calm" };
function setFor(category) {
  const c = String(category || "").toLowerCase();
  if (SET_OF[c]) return SET_OF[c];
  if (/restaurant|caf|bak|food|coffee|cake|pizza|kitchen|catering/.test(c)) return "food";
  if (/beauty|salon|spa|health|clinic|dent|hotel|pet|yoga|wellness|care/.test(c)) return "calm";
  if (/shop|store|product|event|party|wedding/.test(c)) return "party";
  return "work";
}

/** Raw /real/... paths of the cut-outs a site of this category uses for picture-less tiles. */
export function propPaths(category) {
  return PROP_SETS[setFor(category)].map((k) => REAL_PROPS[k]).filter(Boolean);
}

export function propsFor(category) {
  return propPaths(category).map(asset);
}

